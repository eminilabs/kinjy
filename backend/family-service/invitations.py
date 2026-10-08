"""Invite someone to claim their own place in the family tree.

The inviter makes a link and passes it on themselves (Kinjy sends nothing). The link
is a secret that works once: whoever holds it, signed in and adult, may *offer to be*
the person it names, and the node is attached to their account only when they say so.

What this deliberately does not do:

* it gives nobody access to a tree - the link opens nothing; a member sees a tree only
  by the rules that already apply once they belong to it;
* it never merges: a member who already has a node is told so and nothing is changed;
* it never says why a link is not valid - unknown, expired, used, revoked and declined
  all read the same, so the endpoint cannot be used to find out which links exist.
"""
from __future__ import annotations

import hashlib
import secrets
import time
from collections import defaultdict, deque
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as OrmSession

import access
import models
import roles
from common import ageclient, events, notify
from common.auth import CurrentUser, MaybeUser
from common.database import get_db

router = APIRouter(tags=["invitations"])

TTL_DAYS = 7
MAX_ACTIVE_PER_MEMBER = 20
# Terminal invitations and their audit trail are not kept for ever.
KEEP_INVITATIONS_DAYS = 90
KEEP_EVENTS_DAYS = 365
ADULT_AGE = 18


def _now() -> datetime:
    return datetime.now(timezone.utc)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# --- rate limiting ---------------------------------------------------------
# In-process and per replica: enough to make guessing a 256-bit token and hammering the
# endpoints pointless, and it fails open only by being per process (never by trusting input).
_hits: dict[str, deque[float]] = defaultdict(deque)


def _limit(key: str, maximum: int, window: float) -> None:
    now = time.monotonic()
    q = _hits[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= maximum:
        raise HTTPException(status_code=429, detail="Too many attempts, try again later")
    q.append(now)
    if len(_hits) > 50_000:  # never grows without bound
        for k in [k for k, v in _hits.items() if not v][:10_000]:
            _hits.pop(k, None)


def _ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _invalid() -> HTTPException:
    return HTTPException(status_code=404, detail="This invitation is not valid")


def _audit(db: OrmSession, invitation_id: str, kind: str, actor: str | None, person_id: str | None) -> None:
    db.add(models.InvitationEvent(invitation_id=invitation_id, kind=kind, actor_id=actor, person_id=person_id))


def status_of(inv: models.Invitation, now: datetime | None = None) -> str:
    now = now or _now()
    if inv.used_at:
        return "accepted"
    if inv.revoked_at:
        return "revoked"
    if inv.declined_at:
        return "declined"
    if inv.expires_at <= now:
        return "expired"
    return "active"


def _is_minor_by_birth(person: models.Person) -> bool:
    born = person.birth_date
    if not born:
        return False
    today = date.today()
    age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    return age < ADULT_AGE


def can_invite(principal, person: models.Person, family: access.Family) -> bool:
    """Who may offer this node to someone: an owner of the tree, or a contributor for a node they added.

    Only for a living adult nobody has claimed yet. A viewer invites nobody, and platform staff
    do not mint access to a family's tree.
    """
    return (
        person.user_id is None
        and not person.deceased
        and not _is_minor_by_birth(person)
        and (family.can("owner") or (family.can("contributor") and person.created_by == principal.user_id))
    )


def _active_for_token(db: OrmSession, token: str) -> models.Invitation | None:
    inv = db.scalar(select(models.Invitation).where(models.Invitation.token_hash == hash_token(token)))
    if inv is None or status_of(inv) != "active":
        return None
    return inv


def _purge(db: OrmSession) -> None:
    now = _now()
    db.execute(
        delete(models.Invitation).where(
            models.Invitation.expires_at < now - timedelta(days=KEEP_INVITATIONS_DAYS)
        )
    )
    db.execute(delete(models.InvitationEvent).where(models.InvitationEvent.at < now - timedelta(days=KEEP_EVENTS_DAYS)))


# --- schemas ---------------------------------------------------------------

class TokenIn(BaseModel):
    token: str = Field(min_length=20, max_length=128)


class InviteIn(BaseModel):
    """What the invitee becomes. Viewer unless the inviter, being an owner, says contributor."""

    role: str = Field(default="viewer", pattern="^(viewer|contributor)$")


# --- the inviter's side ----------------------------------------------------

@router.post("/family/persons/{person_id}/invitations", status_code=201)
def create_invitation(
    person_id: str,
    principal: CurrentUser,
    request: Request,
    payload: InviteIn = Body(default_factory=InviteIn),
    db: OrmSession = Depends(get_db),
):
    person = access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_role(family, "contributor")
    if payload.role not in roles.invitable_roles(family.role):
        raise HTTPException(status_code=403, detail="With your role you can invite people only to view this tree")
    _limit(f"inv:create:{principal.user_id}", 10, 3600)

    if person.user_id is not None:
        raise HTTPException(status_code=409, detail="This person already has a Kinjy account attached")
    if person.deceased:
        raise HTTPException(status_code=400, detail="A deceased person cannot be invited")
    if _is_minor_by_birth(person):
        raise HTTPException(status_code=403, detail="A person under 18 cannot be invited from the tree")
    if not can_invite(principal, person, family):
        raise HTTPException(status_code=403, detail="Only an owner, or the contributor who added them, can invite them")

    now = _now()
    _purge(db)
    mine = db.scalars(
        select(models.Invitation).where(models.Invitation.created_by == principal.user_id)
    ).all()
    if sum(1 for i in mine if status_of(i, now) == "active") >= MAX_ACTIVE_PER_MEMBER:
        raise HTTPException(status_code=429, detail="Too many invitations are still open; revoke some first")

    # One live link per person: a new one retires the old, so a forgotten link stops working.
    for old in db.scalars(select(models.Invitation).where(models.Invitation.person_id == person.id)).all():
        if status_of(old, now) == "active":
            old.revoked_at = now
            _audit(db, old.id, "superseded", principal.user_id, person.id)

    token = secrets.token_urlsafe(32)
    inv = models.Invitation(
        person_id=person.id,
        created_by=principal.user_id,
        token_hash=hash_token(token),
        expires_at=now + timedelta(days=TTL_DAYS),
        role=payload.role,
    )
    db.add(inv)
    db.flush()
    _audit(db, inv.id, "created", principal.user_id, person.id)
    db.commit()
    # The only time the token exists outside the invitee's copy.
    return {"id": inv.id, "token": token, "role": inv.role, "expires_at": inv.expires_at, "path": f"/tree/invite#t={token}"}


@router.get("/family/persons/{person_id}/invitations")
def list_invitations(person_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    person = access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_belongs(family)
    if not (family.can("owner") or (family.can("contributor") and person.created_by == principal.user_id)):
        raise access.not_found()
    rows = db.scalars(
        select(models.Invitation)
        .where(models.Invitation.person_id == person.id)
        .order_by(models.Invitation.created_at.desc())
        .limit(20)
    ).all()
    return {"items": [{"id": r.id, "role": r.role, "status": status_of(r), "created_at": r.created_at, "expires_at": r.expires_at} for r in rows]}


@router.delete("/family/invitations/{invitation_id}", status_code=204)
def revoke_invitation(invitation_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    inv = db.get(models.Invitation, invitation_id)
    # Someone else's invitation is not found, not forbidden: its existence is not theirs to learn.
    if inv is None:
        raise access.not_found()
    # The one who made it, or an owner of the tree it opens a place in.
    if inv.created_by != principal.user_id:
        family = access.load_family(db, principal.user_id, inv.person_id)
        if not family.can("owner"):
            raise access.not_found()
    if status_of(inv) == "active":
        inv.revoked_at = _now()
        _audit(db, inv.id, "revoked", principal.user_id, inv.person_id)
        db.commit()


# --- the invitee's side ----------------------------------------------------

@router.post("/family/invitations/lookup")
def lookup_invitation(payload: TokenIn, request: Request, principal: MaybeUser, db: OrmSession = Depends(get_db)):
    """Is this link good? A visitor learns only yes; a signed-in member also learns whom it offers."""
    _limit(f"inv:bad:{_ip(request)}", 20, 600)  # counted whatever the outcome: a guess costs the same as a hit
    inv = _active_for_token(db, payload.token)
    if inv is None:
        raise _invalid()
    result: dict = {"valid": True, "role": inv.role}
    if principal is not None:
        person = db.get(models.Person, inv.person_id)
        if person is None or person.user_id is not None:
            raise _invalid()
        result["person_given_name"] = person.given_name
        result["already_has_node"] = access.my_person(db, principal.user_id) is not None
        result["own"] = inv.created_by == principal.user_id
    return result


@router.post("/family/invitations/decline", status_code=204)
def decline_invitation(payload: TokenIn, request: Request, db: OrmSession = Depends(get_db)):
    _limit(f"inv:bad:{_ip(request)}", 20, 600)
    inv = _active_for_token(db, payload.token)
    if inv is None:
        raise _invalid()
    inv.declined_at = _now()
    _audit(db, inv.id, "declined", None, inv.person_id)
    db.commit()


@router.post("/family/invitations/accept")
async def accept_invitation(payload: TokenIn, request: Request, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Attach the caller's account to the node the link offers - only because they asked to."""
    _limit(f"inv:bad:{_ip(request)}", 20, 600)
    _limit(f"inv:accept:{principal.user_id}", 10, 3600)
    inv = _active_for_token(db, payload.token)
    if inv is None:
        raise _invalid()
    person = db.get(models.Person, inv.person_id)
    if person is None or person.user_id is not None or person.deceased:
        raise _invalid()

    # The link carries its inviter's authority, so it stops working when they lose it (removed, demoted).
    family = access.load_family(db, inv.created_by, person.id)
    if inv.role not in roles.invitable_roles(family.role):
        raise _invalid()

    # A minor cannot be attached through a link; unknown age is treated as a minor.
    if ageclient.age_profile(principal.user_id).is_minor:
        _audit(db, inv.id, "refused_minor", principal.user_id, person.id)
        db.commit()
        raise HTTPException(status_code=403, detail="This is not available for your account")
    if inv.created_by == principal.user_id:
        raise HTTPException(status_code=409, detail="You cannot accept your own invitation")
    if access.my_person(db, principal.user_id) is not None:
        _audit(db, inv.id, "refused_has_node", principal.user_id, person.id)
        db.commit()
        raise HTTPException(
            status_code=409,
            detail="You already have a place in a family tree. Two places are never merged automatically.",
        )

    now = _now()
    # Single use, decided by the database: of two simultaneous accepts only one row changes.
    used = db.execute(
        update(models.Invitation)
        .where(
            models.Invitation.id == inv.id,
            models.Invitation.used_at.is_(None),
            models.Invitation.revoked_at.is_(None),
            models.Invitation.declined_at.is_(None),
            models.Invitation.expires_at > now,
        )
        .values(used_at=now, accepted_by=principal.user_id)
    )
    if used.rowcount != 1:
        db.rollback()
        raise _invalid()

    roles.grant(db, principal.user_id, person.id, inv.role, inv.created_by)
    person.user_id = principal.user_id
    person.status = "verified"  # the person themselves has said it is them
    person.verified_at = now
    _audit(db, inv.id, "accepted", principal.user_id, person.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This place is no longer available")

    await events.publish("family.person_claimed", {"person_id": person.id, "by": principal.user_id})
    notify.notify(inv.created_by, "family", "Your family invitation was accepted", link="/tree")
    return {"person_id": person.id, "role": inv.role}
