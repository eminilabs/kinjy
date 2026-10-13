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


def grant(db: OrmSession, user_id: str, person_id: str, role: str, granted_by: str | None, branch_root_id: str | None = None) -> None:
    """Give ``user_id`` a role anchored on ``person_id``; an existing row is raised, never lowered."""
    row = db.scalar(
        select(models.Membership).where(models.Membership.user_id == user_id, models.Membership.person_id == person_id)
    )
    if row is None:
        db.add(models.Membership(user_id=user_id, person_id=person_id, role=role, granted_by=granted_by, branch_root_id=branch_root_id if role == "viewer" else None))
    elif RANK[role] > RANK[row.role]:
        row.role = role
        row.branch_root_id = None  # more than a viewer is never limited to a branch


KEEP_ACCESS_EVENTS_DAYS = 365


def record(db: OrmSession, kind: str, actor: str | None, subject: str | None, person_id: str | None, detail: str | None = None) -> None:
    """Write one line of the access audit (call inside the transaction that makes the change)."""
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import delete

    db.execute(delete(models.AccessEvent).where(models.AccessEvent.at < datetime.now(timezone.utc) - timedelta(days=KEEP_ACCESS_EVENTS_DAYS)))
    db.add(models.AccessEvent(actor_id=actor, subject_id=subject, person_id=person_id, kind=kind, detail=detail))


def invitable_roles(role: str | None) -> list[str]:
    """What someone in ``role`` may invite others as: owners hand out both, contributors only view."""
    return {"owner": ["viewer", "contributor"], "contributor": ["viewer"]}.get(role or "", [])
