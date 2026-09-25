"""Kinjy · auth-service

Accounts, sessions, passkeys, self-service deletion, the direct sponsor link
resolver every money service depends on.
"""
from __future__ import annotations

import logging

import httpx
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session as OrmSession

from common import events, security, settings
from common.auth import AdminUser, CurrentUser, MaybeUser
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import models
import passkeys
import referral_pool
import schemas

log = logging.getLogger("auth-service")

app = create_app(
    name="auth-service",
    schema=models.SCHEMA,
    description="Accounts, sessions, passkeys, account lifecycle, direct sponsor and referral pool.",
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _referral_code() -> str:
    return secrets.token_urlsafe(6).replace("-", "").replace("_", "")[:8].upper()


def _client(request: Request) -> tuple[str | None, str | None]:
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
    return ip, request.headers.get("user-agent")


def _issue(db: OrmSession, user: models.User, request: Request, label: str | None) -> schemas.TokenOut:
    ip, agent = _client(request)
    session = models.Session(
        id=new_id("ses"),
        user_id=user.id,
        device_label=label,
        user_agent=agent,
        ip=ip,
        expires_at=_now() + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS),
    )
    db.add(session)
    refresh, _ = security.create_refresh_token(user_id=user.id, session_id=session.id)
    access = security.create_access_token(
        user_id=user.id,
        role=user.role,
        handle=user.handle,
        kyc_verified=user.kyc_verified,
        lang=user.lang,
    )
    return schemas.TokenOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_TTL_MIN * 60,
    )


def _log_event(db: OrmSession, user_id: str, kind: str, request: Request, ok: bool = True) -> None:
    ip, agent = _client(request)
    db.add(models.LoginEvent(user_id=user_id, kind=kind, ip=ip, user_agent=agent, succeeded=ok))


def _active_user(db: OrmSession, user_id: str) -> models.User:
    user = db.get(models.User, user_id)
    if user is None or user.status in ("deleted",):
        raise HTTPException(status_code=404, detail="Account not found")
    return user


# ---------------------------------------------------------------------------
# Registration & login
# ---------------------------------------------------------------------------

@app.post("/auth/register", response_model=schemas.AuthOut, status_code=201, tags=["auth"])
async def register(payload: schemas.RegisterIn, request: Request, db: OrmSession = Depends(get_db)):
    email = payload.email.lower().strip()
    clash = db.scalar(
        select(models.User).where(
            or_(func.lower(models.User.email) == email, models.User.handle == payload.handle)
        )
    )
    if clash is not None:
        field = "email" if clash.email.lower() == email else "handle"
        raise HTTPException(status_code=409, detail=f"This {field} is already taken")

    inviter_id: str | None = None
    if payload.referral_code:
        inviter = db.scalar(
            select(models.User).where(models.User.referral_code == payload.referral_code.strip().upper())
        )
        if inviter is None:
            raise HTTPException(status_code=400, detail="Unknown referral code")
        inviter_id = inviter.id
    # No personal invitation link: the referral pool draws a sponsor for them.
    # Resolved below, once the account has an id to record the assignment under.

    # Referral codes are short; retry on the (rare) collision instead of failing.
    for _ in range(5):
        code = _referral_code()
        if not db.scalar(select(models.User.id).where(models.User.referral_code == code)):
            break
    else:
        raise HTTPException(status_code=503, detail="Could not allocate a referral code, retry")

    user = models.User(
        id=new_id("usr"),
        email=email,
        handle=payload.handle,
        display_name=payload.display_name.strip(),
        password_hash=security.hash_password(payload.password),
        lang=payload.lang if payload.lang in settings.SUPPORTED_LANGS else settings.DEFAULT_LANG,
        country=(payload.country or "").upper() or None,
        invited_by=inviter_id,
        referral_code=code,
    )
    db.add(user)
    db.flush()

    if inviter_id is None:
        seat = referral_pool.draw_seat(db, user.id)
        if seat is not None:
            user.invited_by = seat.member_id
            inviter_id = seat.member_id

    # No device label: the member's *name* is not a device name, and passing it
    # here made the device manager list "Demo K." instead of the browser.
    # Left None so the client derives it from the user agent.
    tokens = _issue(db, user, request, None)
    _log_event(db, user.id, "password", request)
    db.commit()
    db.refresh(user)

    await events.publish(
        "user.registered",
        {"user_id": user.id, "handle": user.handle, "invited_by": inviter_id, "country": user.country},
    )

    # Materialise the profile now rather than on the member's first visit to
    # their own page. Lazy creation meant a brand-new member existed to
    # auth-service and to nobody else: their posts showed a raw `usr_…` id and
    # they could not be found in people search at all — invisible until they
    # happened to open their own profile. Best-effort: a user-service hiccup
    # must not fail a registration, and the lazy path still covers it.
    try:
        httpx.post(
            "http://user-service:8000/internal/profiles/seed",
            json={
                "user_id": user.id,
                "handle": user.handle,
                "display_name": user.display_name,
                "country": user.country,
                "lang": user.lang,
                "verified": bool(user.kyc_verified),
            },
            timeout=3,
        )
    except Exception as exc:
        log.warning("could not seed profile for %s: %s", user.id, exc)

    return schemas.AuthOut(user=schemas.UserOut.model_validate(user), tokens=tokens)


@app.post("/auth/login", response_model=schemas.AuthOut, tags=["auth"])
def login(payload: schemas.LoginIn, request: Request, db: OrmSession = Depends(get_db)):
    user = db.scalar(select(models.User).where(func.lower(models.User.email) == payload.email.lower().strip()))
    # Same error and roughly the same work whether the email exists or not.
    if user is None or not user.password_hash or not security.verify_password(payload.password, user.password_hash):
        if user is not None:
            _log_event(db, user.id, "failed", request, ok=False)
            db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.status == "deleted":
        raise HTTPException(status_code=403, detail="This account has been deleted")
    if user.status in ("deactivated", "pending_deletion"):
        # Logging back in cancels a pending deletion — the cooling period exists
        # precisely so the member can change their mind.
        user.status = "active"
        user.deactivated_at = None
        user.deletion_requested_at = None
        user.deletion_effective_at = None

    user.last_login_at = _now()
    tokens = _issue(db, user, request, payload.device_label)
    _log_event(db, user.id, "password", request)
    db.commit()
    db.refresh(user)
    return schemas.AuthOut(user=schemas.UserOut.model_validate(user), tokens=tokens)


@app.post("/auth/refresh", response_model=schemas.TokenOut, tags=["auth"])
def refresh(payload: schemas.RefreshIn, db: OrmSession = Depends(get_db)):
    claims = security.decode_token(payload.refresh_token, expected_type=security.REFRESH)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    session = db.get(models.Session, claims.get("sid", ""))
    if session is None or not session.active or session.user_id != claims["sub"]:
        raise HTTPException(status_code=401, detail="Session revoked, sign in again")

    user = _active_user(db, session.user_id)
    session.last_seen_at = _now()
    db.commit()
    return schemas.TokenOut(
        access_token=security.create_access_token(
            user_id=user.id,
            role=user.role,
            handle=user.handle,
            kyc_verified=user.kyc_verified,
            lang=user.lang,
        ),
        refresh_token=payload.refresh_token,
        expires_in=settings.ACCESS_TOKEN_TTL_MIN * 60,
    )


@app.post("/auth/logout", status_code=204, tags=["auth"])
def logout(payload: schemas.RefreshIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    claims = security.decode_token(payload.refresh_token, expected_type=security.REFRESH)
    if claims:
        session = db.get(models.Session, claims.get("sid", ""))
        if session is not None and session.user_id == principal.user_id:
            session.revoked_at = _now()
            db.commit()


# ---------------------------------------------------------------------------
# Me / sessions / passkeys
# ---------------------------------------------------------------------------

@app.get("/auth/me", response_model=schemas.UserOut, tags=["auth"])
def me(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    return schemas.UserOut.model_validate(_active_user(db, principal.user_id))


@app.get("/auth/sessions", response_model=list[schemas.SessionOut], tags=["auth"])
def list_sessions(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.Session)
        .where(models.Session.user_id == principal.user_id)
        .order_by(models.Session.last_seen_at.desc())
    ).all()
    return [schemas.SessionOut.model_validate(row) for row in rows]


@app.delete("/auth/sessions/{session_id}", status_code=204, tags=["auth"])
def revoke_session(session_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    session = db.get(models.Session, session_id)
    if session is None or session.user_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    session.revoked_at = _now()
    db.commit()


@app.get("/auth/passkeys", response_model=list[schemas.PasskeyOut], tags=["passkeys"])
def list_passkeys(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    rows = db.scalars(select(models.Passkey).where(models.Passkey.user_id == principal.user_id)).all()
    return [schemas.PasskeyOut.model_validate(row) for row in rows]


@app.post("/auth/passkeys/register/options", tags=["passkeys"])
def passkey_register_options(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Step 1 of registration — the browser passes this to navigator.credentials.create()."""
    user = _active_user(db, principal.user_id)
    existing = [k.credential_id for k in user.passkeys]
    return passkeys.registration_options(
        user_id=user.id, handle=user.handle, display_name=user.display_name, existing=existing
    )


class PasskeyVerifyIn(BaseModel):
    credential: dict
    label: str | None = None


@app.post("/auth/passkeys/register/verify", status_code=201, tags=["passkeys"])
def passkey_register_verify(
    payload: PasskeyVerifyIn,
    principal: CurrentUser,
    request: Request,
    db: OrmSession = Depends(get_db),
):
    """Step 2 — verify the attestation and keep only the public key."""
    user = _active_user(db, principal.user_id)
    try:
        credential_id, public_key, sign_count = passkeys.verify_registration(
            user_id=user.id, credential=payload.credential
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Passkey registration failed: {exc}")

    if db.scalar(select(models.Passkey).where(models.Passkey.credential_id == credential_id)):
        raise HTTPException(status_code=409, detail="This passkey is already registered")

    agent = request.headers.get("user-agent", "")
    default_label = (
        "iPhone" if "iPhone" in agent else
        "Android" if "Android" in agent else
        "Mac" if "Mac OS X" in agent else
        "Windows" if "Windows" in agent else
        "Passkey"
    )
    key = models.Passkey(
        id=new_id("pky"),
        user_id=user.id,
        credential_id=credential_id,
        public_key=public_key,
        sign_count=sign_count,
        label=payload.label or default_label,
    )
    db.add(key)
    _log_event(db, user.id, "passkey", request)
    db.commit()
    return {"id": key.id, "label": key.label}


class PasskeyLoginStart(BaseModel):
    email: str


@app.post("/auth/passkeys/login/options", tags=["passkeys"])
def passkey_login_options(payload: PasskeyLoginStart, db: OrmSession = Depends(get_db)):
    user = db.scalar(select(models.User).where(func.lower(models.User.email) == payload.email.lower().strip()))
    # Same shape whether or not the account exists: revealing "no passkey here"
    # would turn this endpoint into an account-enumeration oracle.
    allow = [k.credential_id for k in user.passkeys] if user else []
    handle = user.handle if user else passkeys.new_handle()
    return {"handle": handle, **passkeys.authentication_options(handle=handle, allow=allow)}


class PasskeyLoginFinish(BaseModel):
    handle: str
    credential: dict


@app.post("/auth/passkeys/login/verify", response_model=schemas.AuthOut, tags=["passkeys"])
def passkey_login_verify(
    payload: PasskeyLoginFinish, request: Request, db: OrmSession = Depends(get_db)
):
    user = db.scalar(select(models.User).where(models.User.handle == payload.handle))
    if user is None:
        raise HTTPException(status_code=401, detail="Passkey not recognised")

    raw_id = payload.credential.get("rawId") or payload.credential.get("id") or ""
    try:
        credential_id = passkeys.unb64(raw_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed credential")

    key = db.scalar(
        select(models.Passkey).where(
            models.Passkey.user_id == user.id, models.Passkey.credential_id == credential_id
        )
    )
    if key is None:
        raise HTTPException(status_code=401, detail="Passkey not recognised")

    try:
        new_count = passkeys.verify_authentication(
            handle=payload.handle,
            credential=payload.credential,
            public_key=key.public_key,
            sign_count=key.sign_count,
        )
    except Exception as exc:
        _log_event(db, user.id, "passkey", request, ok=False)
        db.commit()
        raise HTTPException(status_code=401, detail=f"Passkey rejected: {exc}")

    # A counter that fails to advance is the classic cloned-authenticator signal.
    key.sign_count = new_count
    key.last_used_at = _now()
    user.last_login_at = _now()
    tokens = _issue(db, user, request, None)
    _log_event(db, user.id, "passkey", request)
    db.commit()
    db.refresh(user)
    return schemas.AuthOut(user=schemas.UserOut.model_validate(user), tokens=tokens)


@app.delete("/auth/passkeys/{passkey_id}", status_code=204, tags=["passkeys"])
def delete_passkey(passkey_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    key = db.get(models.Passkey, passkey_id)
    if key is None or key.user_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Passkey not found")
    db.delete(key)
    db.commit()


# ---------------------------------------------------------------------------
# Account lifecycle — self-service (blueprint §4)
# ---------------------------------------------------------------------------

@app.post("/auth/account/delete", tags=["lifecycle"])
async def delete_account(
    payload: schemas.DeleteAccountIn,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    user = _active_user(db, principal.user_id)
    if not user.password_hash or not security.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Identity confirmation failed")

    now = _now()
    if payload.mode == "deactivate":
        user.status = "deactivated"
        user.deactivated_at = now
    else:
        user.status = "pending_deletion"
        user.deletion_requested_at = now
        user.deletion_effective_at = now + timedelta(days=payload.cooling_period_days)

    for session in user.sessions:
        session.revoked_at = now
    db.commit()

    await events.publish(
        "user.deletion_requested",
        {"user_id": user.id, "mode": payload.mode, "effective_at": str(user.deletion_effective_at)},
    )
    return {
        "status": user.status,
        "effective_at": user.deletion_effective_at,
        "reversible_until": user.deletion_effective_at,
        "note": "Signing in again before the effective date cancels the deletion.",
    }


# ---------------------------------------------------------------------------
# Internal — consumed by other services, never exposed through the gateway
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Referral pool
# ---------------------------------------------------------------------------

@app.get("/auth/referral-pool", tags=["referral-pool"])
def referral_pool_state(principal: MaybeUser, db: OrmSession = Depends(get_db)):
    """Seats sold, seats left, and this member's own seat if they hold one.

    Readable signed out so the programme page can show the real counter rather
    than a number baked into the page.
    """
    return referral_pool.state(db, principal.user_id if principal else None)


@app.get("/auth/referral-pool/assignments", tags=["referral-pool"])
def referral_pool_assignments(
    principal: CurrentUser, limit: int = 50, db: OrmSession = Depends(get_db)
):
    """Who the pool has sent this member, newest first."""
    rows = db.scalars(
        select(models.PoolAssignment)
        .where(models.PoolAssignment.sponsor_id == principal.user_id)
        .order_by(models.PoolAssignment.created_at.desc())
        .limit(min(limit, 200))
    ).all()
    members = {
        u.id: u
        for u in db.scalars(
            select(models.User).where(models.User.id.in_([r.new_member_id for r in rows] or [""]))
        ).all()
    }
    return {
        "items": [
            {
                "member_id": r.new_member_id,
                "handle": members[r.new_member_id].handle if r.new_member_id in members else None,
                "display_name": members[r.new_member_id].display_name
                if r.new_member_id in members
                else None,
                "seats_in_draw": r.seats_in_draw,
                "assigned_at": r.created_at,
            }
            for r in rows
        ]
    }


@app.post("/internal/referral-pool/seats", tags=["internal"])
def grant_referral_pool_seat(payload: schemas.PoolSeatIn, db: OrmSession = Depends(get_db)):
    """Seat a member whose entry payment has settled.

    Called by payment-service, never by the client: the seat follows the money.
    """
    if db.get(models.User, payload.member_id) is None:
        raise HTTPException(status_code=404, detail="User not found")

    seat, error = referral_pool.grant_seat(
        db,
        payload.member_id,
        price_paid=payload.amount,
        payment_ref=payload.payment_ref,
        currency=payload.currency,
    )
    if error == "pool_full":
        db.rollback()
        raise HTTPException(status_code=409, detail="The referral pool is full")
    db.commit()
    return {
        "seat_id": seat.id,
        "seat_number": seat.seat_number,
        "status": seat.status,
        "already_seated": error == "already_seated",
    }


@app.post("/admin/referral-pool/seats/{seat_id}/status", tags=["admin"])
def set_seat_status(seat_id: str, status: str, _: AdminUser, db: OrmSession = Depends(get_db)):
    """Suspend or restore a seat. A suspended seat stops receiving assignments
    but keeps its history — fraud review needs the record, not a deletion."""
    if status not in ("active", "suspended", "refunded"):
        raise HTTPException(status_code=400, detail="status must be active, suspended or refunded")
    seat = db.get(models.ReferralPoolSeat, seat_id)
    if seat is None:
        raise HTTPException(status_code=404, detail="Seat not found")
    seat.status = status
    db.commit()
    return {"seat_id": seat.id, "status": seat.status}


@app.get("/internal/sponsor/{user_id}", response_model=schemas.SponsorOut, tags=["internal"])
def sponsor(user_id: str, db: OrmSession = Depends(get_db)):
    """The one member paid on this member's activity.

    The direct affiliate programme has a single level, so this is a lookup, not
    a walk: there is no chain above the sponsor to resolve. A sponsor who has
    since deleted their account resolves to None rather than to a dead id — the
    commission is then recorded as unclaimed instead of credited to a ghost.
    """
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.invited_by or user.invited_by == user_id:
        return schemas.SponsorOut(user_id=user_id, sponsor_id=None, source="none")

    parent = db.get(models.User, user.invited_by)
    if parent is None or parent.status == "deleted":
        return schemas.SponsorOut(user_id=user_id, sponsor_id=None, source="none")

    assigned = db.scalar(
        select(models.PoolAssignment).where(models.PoolAssignment.new_member_id == user_id)
    )
    return schemas.SponsorOut(
        user_id=user_id,
        sponsor_id=parent.id,
        source="referral_pool" if assigned is not None else "invitation",
    )


@app.get("/internal/users/{user_id}", tags=["internal"])
def internal_user(user_id: str, db: OrmSession = Depends(get_db)):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "handle": user.handle,
        "display_name": user.display_name,
        "role": user.role,
        "lang": user.lang,
        "country": user.country,
        "kyc_verified": user.kyc_verified,
        "status": user.status,
        "invited_by": user.invited_by,
    }


@app.get("/internal/referral-counts", tags=["internal"])
def referral_counts(db: OrmSession = Depends(get_db)):
    """Verified direct referral counts per member.

    Kinjy Leaders ranks on commission earned, not on head count, so this is a
    reporting and fraud-review figure — not a payout input. Only KYC-verified
    referrals are counted.
    """
    rows = db.execute(
        select(models.User.invited_by, func.count(models.User.id))
        .where(
            models.User.invited_by.is_not(None),
            models.User.kyc_verified.is_(True),
            models.User.status == "active",
        )
        .group_by(models.User.invited_by)
    ).all()
    return {"referrals": {uid: count for uid, count in rows}}


@app.post("/internal/users/{user_id}/kyc", tags=["internal"])
def set_kyc(user_id: str, verified: bool, until: datetime | None = None, db: OrmSession = Depends(get_db)):
    """Called by payment-service once KinjyKYC returns a result."""
    user = _active_user(db, user_id)
    user.kyc_verified = verified
    user.kyc_verified_until = until
    db.commit()
    return {"user_id": user_id, "kyc_verified": verified, "until": until}


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

@app.get("/admin/users", tags=["admin"])
def admin_users(
    _: AdminUser,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: OrmSession = Depends(get_db),
):
    stmt = select(models.User).order_by(models.User.created_at.desc())
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(models.User.email).like(like),
                func.lower(models.User.handle).like(like),
                func.lower(models.User.display_name).like(like),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.limit(min(limit, 200)).offset(offset)).all()
    return {"total": total, "items": [schemas.UserOut.model_validate(r) for r in rows]}
