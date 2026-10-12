"""Who may see and who may change a family tree.

The rules live here, once, so that no endpoint has to remember them.

**Reading.** /family promises "Family-only by default. Trees are private." The
plain reading: you may read a tree you belong to, and the owner decides whether
anyone else may (their `who_can_see_family` and `family_tree_shared` settings,
held by user-service). You *belong* to a tree
only through a membership (memberships.py): a role held by your account, anchored on
your place in it. Being related to someone in the tree gives nothing.

**Writing.** Reading and writing are different. A tree open to "everyone" can be
read by everyone and changed by nobody who is not in it. To add, link, confirm or
dispute you must be a contributor or an owner; a viewer only reads. A person who is a
Kinjy member can only be linked by someone their own `who_can_add_family` setting lets in.

**Editing and deleting a person.** An owner may change any node of the tree; a
contributor the nodes they added; the member a node is may change it and remove it
(personal data), and an administrator of the platform keeps the access they had. A node
tied to a member's account can only be deleted by that member or an administrator:
someone who happened to type their name into a tree does not get to remove them from it.

A stranger is always told 404, never 403: confirming that a person id exists
would itself reveal the family they were looking for.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from common import permissions

import graph
import roles
import models

log = logging.getLogger("family-service")

USER_URL = "http://user-service:8000"

NOT_FOUND = "Person not found"


def not_found() -> HTTPException:
    return HTTPException(status_code=404, detail=NOT_FOUND)


def my_person_ids(db: OrmSession, user_id: str) -> set[str]:
    """The places this member holds a role from: one anchor person per membership."""
    return set(db.scalars(select(models.Membership.person_id).where(models.Membership.user_id == user_id)).all())


def my_person(db: OrmSession, user_id: str) -> models.Person | None:
    return db.scalar(select(models.Person).where(models.Person.user_id == user_id))


def person_or_404(db: OrmSession, person_id: str) -> models.Person:
    person = db.get(models.Person, person_id)
    if person is None:
        raise not_found()
    return person


@dataclass
class Family:
    """One person's family as the request sees it: loaded once, asked many times."""

    root: str
    edges: graph.Edges
    people: set[str]
    mine: set[str]
    #: The caller's role in this tree ("viewer" | "contributor" | "owner"), None when they hold none.
    role: str | None = None
    #: True when the caller was given a branch only: `people` and `edges` are then that branch, nothing more.
    scoped: bool = False

    @property
    def viewer_belongs(self) -> bool:
        """Does the caller hold a role in this tree?"""
        return self.role is not None

    def can(self, minimum: str) -> bool:
        return self.role is not None and roles.RANK[self.role] >= roles.RANK[minimum]


def _descent(edges: graph.Edges, root: str) -> set[str]:
    """``root``, everyone descended from them, and the partners of those; never anyone's parents or other relatives."""
    stack, branch = [root], {root}
    while stack:
        for child in edges.children.get(stack.pop(), set()):
            if child not in branch:
                branch.add(child)
                stack.append(child)
    for person in list(branch):
        branch |= edges.spouses.get(person, set())
    return branch


def in_branch(edges: graph.Edges, people: set[str], root: str, person: str) -> bool:
    return root in people and person in _descent(edges, root)


def branch_of(edges: graph.Edges, people: set[str], root: str | None, anchor: str) -> set[str]:
    """What a member limited to ``root``'s branch sees: that branch, plus their own place.

    Fails closed: a root that is not in the tree gives only the member's own place.
    """
    if not root or root not in people:
        return {anchor}
    return (_descent(edges, root) & people) | {anchor}


def load_family(db: OrmSession, user_id: str, person_id: str) -> Family:
    edges, people, rows = graph.load_component(db, {person_id})
    mine = my_person_ids(db, user_id)
    held = db.scalars(
        select(models.Membership).where(models.Membership.user_id == user_id, models.Membership.person_id.in_(people))
    ).all() if people else []
    role = roles.best(m.role for m in held)
    if held and all(m.branch_root_id for m in held):
        visible: set[str] = set()
        for m in held:
            visible |= branch_of(edges, people, m.branch_root_id, m.person_id)
        kept = [r for r in rows if r.from_person_id in visible and r.to_person_id in visible]
        return Family(person_id, graph.edges_from_rows(kept), visible, mine, role, scoped=True)
    return Family(person_id, edges, people, mine, role)


def reachable(db: OrmSession, user_id: str) -> set[str]:
    """Everyone the caller may see through the roles they hold: whole trees, or only the branches they were given."""
    held = db.scalars(select(models.Membership).where(models.Membership.user_id == user_id)).all()
    if not held:
        return set()
    whole = {m.person_id for m in held if not m.branch_root_id}
    out: set[str] = set()
    if whole:
        _e, people, _r = graph.load_component(db, whole)
        out |= people
    for m in held:
        if m.branch_root_id:
            edges, people, _r = graph.load_component(db, {m.person_id})
            if m.person_id not in out:
                out |= branch_of(edges, people, m.branch_root_id, m.person_id)
    return out


def owner_preferences(db: OrmSession, person_id: str) -> dict:
    """The settings of whoever this tree belongs to.

    Fails **closed**: if user-service cannot be reached we assume the strictest
    choice the owner might have made, because guessing "open to everyone" on an
    outage is exactly the wrong way to be wrong about a family tree.
    """
    person = db.get(models.Person, person_id)
    owner = (person.user_id or person.created_by) if person else None
    if not owner:
        return {"who_can_see_family": "family", "family_tree_shared": True}
    try:
        response = httpx.get(f"{USER_URL}/internal/preferences/{owner}", timeout=4)
        response.raise_for_status()
        data = response.json()
        return {
            "who_can_see_family": data.get("who_can_see_family", "family"),
            "family_tree_shared": data.get("family_tree_shared", True),
            "owner": owner,
        }
    except Exception as exc:
        log.warning("family preferences lookup failed for %s: %s", owner, exc)
        return {"who_can_see_family": "family", "family_tree_shared": True, "owner": owner}


def require_can_read(db: OrmSession, principal, family: Family) -> None:
    """Refuse a tree the caller is not entitled to (404, never 403)."""
    if principal is None:
        raise not_found()

    # A member reads the tree they hold a role in, whatever anyone else has set.
    if family.role is not None:
        if family.scoped and family.root not in family.people:
            raise not_found()  # outside the branch they were given
        return

    prefs = owner_preferences(db, family.root)
    owner = prefs.get("owner")

    if not prefs.get("family_tree_shared", True):
        raise not_found()

    audience = prefs.get("who_can_see_family", "family")
    if audience == "everyone":
        return

    if audience == "connections" and owner:
        # An accepted connection, decided by user-service - the same authority
        # that owns every other "who may reach me" rule.
        allowed, _reason = permissions.check(
            principal.user_id, owner, "can_message", "see this family tree"
        )
        if allowed:
            return

    # "family": you may read a tree you share a graph with.
    if family.viewer_belongs:
        return

    raise not_found()


def require_belongs(family: Family) -> None:
    """Holding any role in the tree. Reading it, even in public, is not enough."""
    if not family.viewer_belongs:
        raise not_found()


def require_role(family: Family, minimum: str) -> None:
    """A stranger is told 404; a member whose role is too low is told so (403)."""
    if not family.viewer_belongs:
        raise not_found()
    if not family.can(minimum):
        raise HTTPException(
            status_code=403,
            detail=f"Your role in this tree is {family.role}: this needs {minimum}",
        )


def may_link_member(principal, member_id: str | None) -> None:
    """A person who is a Kinjy member consents, through their own setting, to being linked.

    Linking a node that belongs to a member is a claim about *them*. Their
    `who_can_add_family` decides whether this caller may make it - the same
    authority messaging asks, so the rule cannot drift between the two.
    """
    if not member_id or member_id == principal.user_id:
        return
    allowed, reason = permissions.check(
        principal.user_id, member_id, "can_add_family", "add this member to a family tree"
    )
    if not allowed:
        raise HTTPException(status_code=403, detail=reason)


def can_edit(principal, person: models.Person, family: Family | None = None) -> bool:
    if principal.is_admin or person.user_id == principal.user_id:
        return True
    if family is None:
        return False
    return family.can("owner") or (family.can("contributor") and person.created_by == principal.user_id)


def can_delete(principal, person: models.Person, family: Family | None = None) -> bool:
    if principal.is_admin:
        return True
    if person.user_id == principal.user_id:
        # A viewer only reads: they may correct their own details but not remove their place.
        return family is None or family.role != "viewer"
    # A node tied to someone's account is theirs to remove, not its author's.
    if person.user_id is not None or family is None:
        return False
    return family.can("owner") or (family.can("contributor") and person.created_by == principal.user_id)
