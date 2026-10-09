"""Who may see and who may change a family tree.

The rules live here, once, so that no endpoint has to remember them.

**Reading.** /family promises "Family-only by default. Trees are private." The
plain reading: you may read a tree you belong to, and the owner decides whether
anyone else may (their `who_can_see_family` and `family_tree_shared` settings,
held by user-service). You *belong* to a tree if one of its people was added by
you or is linked to your account.

**Writing.** Reading and writing are different. A tree open to "everyone" can be
read by everyone and changed by nobody who is not in it. To add, link, confirm or
dispute you must belong to the tree, and a person who is a Kinjy member can only
be linked by someone their own `who_can_add_family` setting lets in.

**Editing and deleting a person.** The author of the node, the member the node
is, or an administrator. A node tied to a member's account can only be deleted by
that member or an administrator: someone who happened to type their name into a
tree does not get to remove them from it.

A stranger is always told 404, never 403: confirming that a person id exists
would itself reveal the family they were looking for.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx
from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session as OrmSession

from common import permissions

import graph
import models

log = logging.getLogger("family-service")

USER_URL = "http://user-service:8000"

NOT_FOUND = "Person not found"


def not_found() -> HTTPException:
    return HTTPException(status_code=404, detail=NOT_FOUND)


def my_person_ids(db: OrmSession, user_id: str) -> set[str]:
    """Person nodes this member owns: the one that is them, and any they added."""
    return set(
        db.scalars(
            select(models.Person.id).where(
                or_(models.Person.user_id == user_id, models.Person.created_by == user_id)
            )
        ).all()
    )


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

    @property
    def viewer_belongs(self) -> bool:
        """Does the caller have a person of their own in this family?"""
        return bool(self.people & self.mine)


def load_family(db: OrmSession, user_id: str, person_id: str) -> Family:
    edges, people, _rows = graph.load_component(db, {person_id})
    return Family(person_id, edges, people, my_person_ids(db, user_id))


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

    # Your own people are always yours to read, whatever anyone else has set.
    if family.root in family.mine:
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
    """Writing needs a place in the tree. Reading it, even in public, is not enough."""
    if not family.viewer_belongs:
        raise not_found()


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


def can_edit(principal, person: models.Person) -> bool:
    return (
        person.created_by == principal.user_id
        or person.user_id == principal.user_id
        or bool(principal.is_admin)
    )


def can_delete(principal, person: models.Person) -> bool:
    if principal.is_admin or person.user_id == principal.user_id:
        return True
    # A node tied to someone's account is theirs to remove, not its author's.
    return person.user_id is None and person.created_by == principal.user_id
