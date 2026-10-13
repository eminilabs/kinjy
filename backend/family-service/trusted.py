"""A trusted contact: someone an owner names to keep the tree going if the owner cannot.

Designed so that it can be neither abused nor silently triggered:

* naming a contact gives them nothing, and they must accept it;
* a contact who wants to take over opens a *succession request*; every owner of the tree is
  told, and any owner (or the contact) can cancel it during a waiting period (30 days);
* only when that period ends untouched does the contact become an owner. The owners stay
  owners: nobody is removed by it;
* it is refused for minors and for members limited to a branch, and it lapses if the contact
  leaves the tree or the one who named them is no longer an owner;
* nothing here reads or changes Kinjy accounts: there is no signal of an account's death or
  deletion in this service, so the *owners' silence* is what the waiting period measures.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

import access
import graph
import invitations
import models
import roles
from common import ageclient, notify
from common.auth import CurrentUser
from common.database import SessionLocal, get_db

log = logging.getLogger("family-service")
router = APIRouter(tags=["trusted-contacts"])

DELAY_DAYS = 30
MAX_CONTACTS = 3
SWEEP_SECONDS = 3600


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _tree(db: OrmSession, tc: models.TrustedContact) -> set[str]:
    _e, people, _r = graph.load_component(db, {tc.person_id})
    return people


def _pending(db: OrmSession, tc_id: str) -> models.SuccessionRequest | None:
    return db.scalar(
        select(models.SuccessionRequest).where(models.SuccessionRequest.contact_id == tc_id, models.SuccessionRequest.status == "pending")
    )


def _owner_ids(db: OrmSession, people: set[str]) -> set[str]:
    return roles.owners_in(db, people)


def _valid(db: OrmSession, tc: models.TrustedContact) -> bool:
    """Still meaningful: accepted, the contact still has a place in the tree, the one who named them is still an owner."""
    if tc.status != "active":
        return False
    people = _tree(db, tc)
    return roles.role_in(db, tc.contact_id, people) is not None and roles.role_in(db, tc.owner_id, people) == "owner"


def activate_due(db: OrmSession) -> int:
    """Make owners of contacts whose request ran its full waiting period. Idempotent; returns how many."""
    done = 0
    due = db.scalars(
        select(models.SuccessionRequest).where(models.SuccessionRequest.status == "pending", models.SuccessionRequest.effective_at <= _now())
    ).all()
    for req in due:
        tc = db.get(models.TrustedContact, req.contact_id)
        if tc is None or not _valid(db, tc):
            req.status, req.resolved_at = "cancelled", _now()
            roles.record(db, "succession_lapsed", None, tc.contact_id if tc else None, tc.person_id if tc else None)
            continue
        if ageclient.age_profile(tc.contact_id).is_minor:
            continue  # unknown or minor: never made an owner; looked at again next time
        people = _tree(db, tc)
        held = db.scalars(
            select(models.Membership).where(models.Membership.user_id == tc.contact_id, models.Membership.person_id.in_(people))
        ).all()
        for m in held:
            m.role, m.branch_root_id = "owner", None
        req.status, req.resolved_at = "activated", _now()
        roles.record(db, "succession_activated", None, tc.contact_id, tc.person_id)
        notify.notify_many({tc.owner_id, tc.contact_id}, "family", "A trusted contact is now an owner of your family tree", link="/tree")
        done += 1
    if due:
        db.commit()
    return done


async def sweep_forever() -> None:
    while True:
        await asyncio.sleep(SWEEP_SECONDS)
        try:
            with SessionLocal() as db:
                activate_due(db)
        except Exception as exc:  # a failed sweep is tried again next hour; never stops the service
            log.warning("succession sweep failed: %s", exc)


def start_sweep() -> None:
    asyncio.get_running_loop().create_task(sweep_forever())


def lapse_for_member(db: OrmSession, user_id: str, people: set[str]) -> None:
    """A member who leaves or is removed stops being anyone's trusted contact in that tree."""
    for tc in db.scalars(select(models.TrustedContact).where(models.TrustedContact.contact_id == user_id, models.TrustedContact.person_id.in_(people))).all():
        tc.status = "revoked"
        for req in db.scalars(select(models.SuccessionRequest).where(models.SuccessionRequest.contact_id == tc.id, models.SuccessionRequest.status == "pending")).all():
            req.status, req.resolved_at = "cancelled", _now()


class NameIn(BaseModel):
    membership_id: str = Field(max_length=40)


def _as_owner(db: OrmSession, principal, person_id: str) -> tuple[access.Family, set[str]]:
    access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_role(family, "owner")
    return family, family.people


@router.post("/family/persons/{person_id}/trusted-contacts", status_code=201)
def name_contact(person_id: str, payload: NameIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    family, people = _as_owner(db, principal, person_id)
    target = db.get(models.Membership, payload.membership_id)
    if target is None or target.person_id not in people:
        raise HTTPException(status_code=404, detail="That member was not found in this tree")
    if target.user_id == principal.user_id:
        raise HTTPException(status_code=400, detail="You cannot name yourself")
    held = db.scalars(select(models.Membership).where(models.Membership.user_id == target.user_id, models.Membership.person_id.in_(people))).all()
    if roles.best(m.role for m in held) == "owner":
        raise HTTPException(status_code=409, detail="They are already an owner of this tree")
    if any(m.branch_root_id for m in held):
        raise HTTPException(status_code=409, detail="A member limited to one branch cannot be named: succession would give them the whole tree")
    if ageclient.age_profile(target.user_id).is_minor:
        raise HTTPException(status_code=403, detail="This member cannot be named")
    anchor = db.scalar(select(models.Membership.person_id).where(models.Membership.user_id == principal.user_id, models.Membership.person_id.in_(people)))
    mine = db.scalars(select(models.TrustedContact).where(models.TrustedContact.owner_id == principal.user_id, models.TrustedContact.person_id == anchor, models.TrustedContact.status.in_(("invited", "active")))).all()
    if len(mine) >= MAX_CONTACTS:
        raise HTTPException(status_code=409, detail=f"You can name at most {MAX_CONTACTS} trusted contacts")
    if any(t.contact_id == target.user_id for t in mine):
        raise HTTPException(status_code=409, detail="They are already named")
    tc = models.TrustedContact(person_id=anchor, owner_id=principal.user_id, contact_id=target.user_id)
    db.add(tc)
    db.flush()
    roles.record(db, "trusted_contact_named", principal.user_id, target.user_id, anchor)
    db.commit()
    notify.notify(target.user_id, "family", "You were named as a trusted contact for a family tree", link="/tree")
    return {"id": tc.id, "status": tc.status}


@router.get("/family/persons/{person_id}/trusted-contacts")
def list_contacts(person_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    _family, people = _as_owner(db, principal, person_id)
    activate_due(db)
    rows = db.scalars(select(models.TrustedContact).where(models.TrustedContact.person_id.in_(people), models.TrustedContact.status.in_(("invited", "active"))).order_by(models.TrustedContact.created_at)).all()
    names = {p.user_id: p.given_name for p in db.scalars(select(models.Person).where(models.Person.user_id.in_({r.contact_id for r in rows} or {""}))).all()}
    out = []
    for r in rows:
        pending = _pending(db, r.id)
        out.append({
            "id": r.id, "status": r.status, "name": names.get(r.contact_id), "named_by_me": r.owner_id == principal.user_id,
            "request": {"id": pending.id, "requested_at": pending.requested_at, "effective_at": pending.effective_at} if pending else None,
        })
    return {"items": out, "delay_days": DELAY_DAYS}


@router.get("/family/trusted-contacts/mine")
def my_designations(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """The times the caller was named a trusted contact: to accept, to withdraw from, to act on."""
    activate_due(db)
    rows = db.scalars(select(models.TrustedContact).where(models.TrustedContact.contact_id == principal.user_id, models.TrustedContact.status.in_(("invited", "active")))).all()
    out = []
    for r in rows:
        owner = db.scalar(select(models.Person).where(models.Person.user_id == r.owner_id))
        pending = _pending(db, r.id)
        out.append({
            "id": r.id, "status": r.status, "owner_name": owner.given_name if owner else None, "valid": _valid(db, r) if r.status == "active" else None,
            "request": {"id": pending.id, "requested_at": pending.requested_at, "effective_at": pending.effective_at} if pending else None,
        })
    return {"items": out, "delay_days": DELAY_DAYS}


def _mine_or_404(db: OrmSession, principal, tc_id: str) -> models.TrustedContact:
    """The designation, for the contact or for any owner of the tree; anyone else is told it does not exist."""
    tc = db.get(models.TrustedContact, tc_id)
    if tc is None:
        raise access.not_found()
    if principal.user_id != tc.contact_id and roles.role_in(db, principal.user_id, _tree(db, tc)) != "owner":
        raise access.not_found()
    return tc


@router.post("/family/trusted-contacts/{tc_id}/accept")
def accept(tc_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    tc = _mine_or_404(db, principal, tc_id)
    if tc.contact_id != principal.user_id or tc.status != "invited":
        raise HTTPException(status_code=409, detail="This cannot be accepted")
    if ageclient.age_profile(principal.user_id).is_minor:
        raise HTTPException(status_code=403, detail="This is not available for your account")
    if roles.role_in(db, tc.contact_id, _tree(db, tc)) is None:
        raise HTTPException(status_code=409, detail="You no longer have a place in this tree")
    tc.status, tc.accepted_at = "active", _now()
    roles.record(db, "trusted_contact_accepted", principal.user_id, tc.owner_id, tc.person_id)
    db.commit()
    notify.notify(tc.owner_id, "family", "Your trusted contact accepted", link="/tree")
    return {"id": tc.id, "status": tc.status}


@router.post("/family/trusted-contacts/{tc_id}/decline", status_code=204)
def decline(tc_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    tc = _mine_or_404(db, principal, tc_id)
    if tc.contact_id != principal.user_id or tc.status != "invited":
        raise HTTPException(status_code=409, detail="This cannot be declined")
    tc.status = "declined"
    roles.record(db, "trusted_contact_declined", principal.user_id, tc.owner_id, tc.person_id)
    db.commit()


@router.delete("/family/trusted-contacts/{tc_id}", status_code=204)
def revoke(tc_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """The one who named them, any owner, or the contact themselves, ends it (and any request with it)."""
    tc = _mine_or_404(db, principal, tc_id)
    tc.status = "revoked"
    pending = _pending(db, tc.id)
    if pending:
        pending.status, pending.resolved_at, pending.resolved_by = "cancelled", _now(), principal.user_id
    roles.record(db, "trusted_contact_revoked", principal.user_id, tc.contact_id, tc.person_id)
    db.commit()


@router.post("/family/trusted-contacts/{tc_id}/succession", status_code=201)
def request_succession(tc_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    invitations._limit(f"succession:{principal.user_id}", 5, 86400)
    tc = _mine_or_404(db, principal, tc_id)
    if tc.contact_id != principal.user_id:
        raise access.not_found()
    if not _valid(db, tc):
        raise HTTPException(status_code=409, detail="This designation is no longer valid")
    if _pending(db, tc.id):
        raise HTTPException(status_code=409, detail="A request is already waiting")
    people = _tree(db, tc)
    if roles.role_in(db, principal.user_id, people) == "owner":
        raise HTTPException(status_code=409, detail="You are already an owner of this tree")
    req = models.SuccessionRequest(contact_id=tc.id, effective_at=_now() + timedelta(days=DELAY_DAYS))
    db.add(req)
    roles.record(db, "succession_requested", principal.user_id, tc.owner_id, tc.person_id)
    db.commit()
    notify.notify_many(
        _owner_ids(db, people), "family", f"A trusted contact asked to take over your family tree in {DELAY_DAYS} days. Cancel it if you are still here.", link="/tree",
    )
    return {"id": req.id, "effective_at": req.effective_at, "delay_days": DELAY_DAYS}


@router.delete("/family/trusted-contacts/{tc_id}/succession", status_code=204)
def cancel_succession(tc_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    tc = _mine_or_404(db, principal, tc_id)
    pending = _pending(db, tc.id)
    if pending is None:
        raise HTTPException(status_code=409, detail="There is no waiting request")
    pending.status, pending.resolved_at, pending.resolved_by = "cancelled", _now(), principal.user_id
    roles.record(db, "succession_cancelled", principal.user_id, tc.contact_id, tc.person_id)
    db.commit()
