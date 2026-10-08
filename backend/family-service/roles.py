"""Role arithmetic: what a role is worth and who holds which. No endpoints, no access rules."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

import models

RANK = {"viewer": 1, "contributor": 2, "owner": 3}

def best(roles) -> str | None:
    found = [r for r in roles if r in RANK]
    return max(found, key=RANK.__getitem__) if found else None


def role_in(db: OrmSession, user_id: str, people: set[str]) -> str | None:
    """The strongest role this user holds in the tree made of ``people``; None when they hold none."""
    if not people or not user_id:
        return None
    return best(
        db.scalars(
            select(models.Membership.role).where(
                models.Membership.user_id == user_id, models.Membership.person_id.in_(people)
            )
        ).all()
    )


def owners_in(db: OrmSession, people: set[str]) -> set[str]:
    return set(
        db.scalars(
            select(models.Membership.user_id).where(
                models.Membership.role == "owner", models.Membership.person_id.in_(people)
            )
        ).all()
    )


def grant(db: OrmSession, user_id: str, person_id: str, role: str, granted_by: str | None) -> None:
    """Give ``user_id`` a role anchored on ``person_id``; an existing row is raised, never lowered."""
    row = db.scalar(
        select(models.Membership).where(models.Membership.user_id == user_id, models.Membership.person_id == person_id)
    )
    if row is None:
        db.add(models.Membership(user_id=user_id, person_id=person_id, role=role, granted_by=granted_by))
    elif RANK[role] > RANK[row.role]:
        row.role = role


def invitable_roles(role: str | None) -> list[str]:
    """What someone in ``role`` may invite others as: owners hand out both, contributors only view."""
    return {"owner": ["viewer", "contributor"], "contributor": ["viewer"]}.get(role or "", [])
