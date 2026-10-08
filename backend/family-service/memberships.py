"""Who holds which role in a tree, and how that is managed.

Roles are stored here and decided here; access.py only asks. Three rules everything
below protects: a family tie gives no role, a tree always keeps an owner, and nobody
is made an owner by a guess.
"""
from __future__ import annotations

import logging
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

import access
import graph
import models
from common.auth import CurrentUser
from common.database import SessionLocal, get_db
from roles import best, owners_in, role_in

log = logging.getLogger("family-service")
router = APIRouter(tags=["members"])

MARKER = "memberships_v1"


# --- the one-time move from "belonging" to roles ---------------------------------------------

def backfill(session: OrmSession | None = None, only: set[str] | None = None) -> dict:
    """Give every tree that existed before roles its members, without inventing an owner.

    Before roles, someone belonged to a tree if one of its people was their own account
    or was added by them, and could then write. Those people keep that: they become
    contributors. An owner is named only when the history shows one beyond doubt: exactly
    one member in the tree who added their *own* place themselves (so they started it).
    Any other tree is written to ``ownership_reviews`` and left without an owner.
    People without an account (no ``user_id``, no author) are never members, and a tree that
    already has a membership is left alone, so running it twice changes nothing.

    With no arguments it is the one-time startup move (guarded by a marker). ``only`` (person
    ids) and ``session`` exist so the rule can be tested on made-up data without touching the rest.
    """
    if session is None:
        with SessionLocal() as db:
            return backfill(db, only)
    db = session
    if only is None and db.get(models.Marker, MARKER):
        return {}
    persons = {p.id: p for p in db.scalars(select(models.Person)).all()}
    parent: dict[str, str] = {pid: pid for pid in persons}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for e in db.scalars(select(models.Relationship).where(models.Relationship.status != "disputed")).all():
        if e.from_person_id in parent and e.to_person_id in parent:
            parent[find(e.from_person_id)] = find(e.to_person_id)
    trees: dict[str, list[models.Person]] = defaultdict(list)
    for pid, p in persons.items():
        trees[find(pid)].append(p)
    anchored = set(db.scalars(select(models.Membership.person_id)).all())

    result = {"owners": 0, "contributors": 0, "reviews": 0}
    for members in trees.values():
        members.sort(key=lambda p: p.id)
        if only is not None and not any(p.id in only for p in members):
            continue
        if any(p.id in anchored for p in members):
            continue
        own = {p.user_id: p for p in members if p.user_id}
        users: dict[str, models.Person] = dict(own)
        for p in members:
            if p.created_by and p.created_by not in users:
                users[p.created_by] = p  # a node they added: their anchor
        if not users:
            continue
        founders = [u for u, p in own.items() if p.created_by == u]
        owner = founders[0] if len(founders) == 1 else None
        for user_id, anchor in sorted(users.items()):
            role = "owner" if user_id == owner else "contributor"
            db.add(models.Membership(user_id=user_id, person_id=anchor.id, role=role, granted_by=None))
            result["owners" if role == "owner" else "contributors"] += 1
        if owner is None:
            reason = "no member added their own place" if not founders else "several members added their own place"
            db.add(models.OwnershipReview(person_id=members[0].id, people=len(members), reason=reason))
            result["reviews"] += 1
    if only is None:
        db.add(models.Marker(name=MARKER))
    db.commit()
    log.warning(
        "memberships backfilled: %(owners)d owners, %(contributors)d contributors, %(reviews)d trees left without an owner "
        "(see family.ownership_reviews)", result,
    )
    return result


# --- managing members (owners only) ----------------------------------------------------------

class RoleIn(BaseModel):
    role: str = Field(pattern="^(viewer|contributor|owner)$")


def _tree_of(db: OrmSession, membership: models.Membership) -> set[str]:
    _edges, people, _rows = graph.load_component(db, {membership.person_id})
    return people


@router.get("/family/persons/{person_id}/members")
def list_members(person_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_role(family, "owner")
    rows = db.scalars(
        select(models.Membership).where(models.Membership.person_id.in_(family.people)).order_by(models.Membership.created_at)
    ).all()
    persons = {p.id: p for p in db.scalars(select(models.Person).where(models.Person.id.in_({r.person_id for r in rows}))).all()}
    return {
        "items": [
            {
                "id": r.id,
                "role": r.role,
                "since": r.created_at,
                "is_me": r.user_id == principal.user_id,
                # Only their own place names them; a node someone merely added says nothing about the member.
                "name": persons[r.person_id].given_name if persons[r.person_id].user_id == r.user_id else None,
                "person_id": r.person_id,
            }
            for r in rows
        ]
    }


def _rows_of(db: OrmSession, user_id: str, people: set[str]) -> list[models.Membership]:
    """All of one member's rows in this tree (old data may hold more than one)."""
    return list(
        db.scalars(select(models.Membership).where(models.Membership.user_id == user_id, models.Membership.person_id.in_(people))).all()
    )


def _guard_last_owner(db: OrmSession, user_id: str, people: set[str]) -> None:
    if owners_in(db, people) <= {user_id}:
        raise HTTPException(status_code=409, detail="A tree always keeps an owner: make someone else an owner first")


@router.patch("/family/members/{membership_id}")
def change_role(membership_id: str, payload: RoleIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    row = db.get(models.Membership, membership_id)
    if row is None:
        raise access.not_found()
    people = _tree_of(db, row)
    if role_in(db, principal.user_id, people) != "owner":
        raise access.not_found()
    rows = _rows_of(db, row.user_id, people)
    if payload.role != "owner" and best(r.role for r in rows) == "owner":
        _guard_last_owner(db, row.user_id, people)
    for r in rows:
        r.role = payload.role
    db.commit()
    return {"id": row.id, "role": payload.role}


@router.delete("/family/members/{membership_id}", status_code=204)
def remove_member(membership_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """An owner removes a member, or a member leaves. Their place in the tree stays: a person is not an account."""
    row = db.get(models.Membership, membership_id)
    if row is None:
        raise access.not_found()
    people = _tree_of(db, row)
    if row.user_id != principal.user_id and role_in(db, principal.user_id, people) != "owner":
        raise access.not_found()
    rows = _rows_of(db, row.user_id, people)
    if best(r.role for r in rows) == "owner":
        _guard_last_owner(db, row.user_id, people)
    for r in rows:
        db.delete(r)
    db.commit()
