"""Platform subscriptions backed by settled payment receipts.

Only payment-service supplies evidence. A callback asking to reconcile is a
hint: we fetch the committed payment ourselves, then serialize changes per
member. Receipts are idempotent; refunds are terminal tombstones.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from decimal import Decimal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from common import agefeatures, settings
from common.auth import CurrentUser
from common.database import get_db
from common.subscriptions import CATALOG_VERSION, RANK, features, mock_allowed, period_end, price, validate_proof

import models

router = APIRouter(tags=["subscriptions"])
PAYMENT_URL = "http://payment-service:8000"


def allow_mock() -> bool:
    return mock_allowed(settings.ENV, live_crypto=bool(settings.NOWPAYMENTS_API_KEY), live_fiat=bool(settings.MANGOPAY_CLIENT_ID and settings.MANGOPAY_API_KEY))


def catalog() -> dict:
    credits = {"free": settings.AI_CREDITS_FREE, "basic": settings.AI_CREDITS_BASIC, "premium": settings.AI_CREDITS_PREMIUM}
    return {
        "catalog_version": CATALOG_VERSION,
        "currency": "USD",
        "renewal_mode": "manual",
        "plans": [{
            "tier": tier,
            "price": {p: str(price(tier, p)) if tier != "free" else "0.00" for p in ("monthly", "yearly")},
            "credits": credits[tier],
            "features": features(tier),
        } for tier in ("free", "basic", "premium")],
        "planned_features": ["copilot", "brand_kit", "dubbing", "lip_sync", "autonomous_agents"],
    }


@router.get("/subscriptions/catalog")
def subscription_catalog():
    return catalog()


def _subscription(db: Session, user_id: str):
    return db.scalar(select(models.Subscription).where(models.Subscription.subscriber_id == user_id, models.Subscription.target_id == "platform"))


def _grants(db: Session, user_id: str, now: datetime):
    statement = select(models.SubscriptionGrant).where(
        models.SubscriptionGrant.user_id == user_id,
        models.SubscriptionGrant.status == "active",
        models.SubscriptionGrant.ends_at > now,
    ).order_by(models.SubscriptionGrant.starts_at)
    if not allow_mock():
        statement = statement.where(models.SubscriptionGrant.mock.is_(False))
    return list(db.scalars(statement).all())


def effective(db: Session, user_id: str) -> dict:
    now = datetime.now(timezone.utc)
    grants = _grants(db, user_id, now)
    current = [g for g in grants if g.starts_at <= now]
    if current and agefeatures.profile(user_id).is_minor:
        current = []  # a changed or unconfirmed age cannot unlock paid features
    best = max(current, key=lambda g: (RANK[g.tier], g.ends_at), default=None)
    tier = best.tier if best else "free"
    until = best.ends_at if best else None
    if best:
        for grant in grants:
            if grant.tier == tier and grant.starts_at <= until:
                until = max(until, grant.ends_at)
    row = _subscription(db, user_id)
    return {
        "tier": tier, "verified": True,
        "subscription_id": row.id if row and grants else None,
        "status": "cancelled" if best and row and row.cancelled_at else "active" if best else "free",
        "access_until": until,
        "mock": best.mock if best else False,
        "renewal_mode": "manual",
        "features": features(tier),
        "periods": [{"payment_id": g.payment_id, "tier": g.tier, "period": g.period,
                     "starts_at": g.starts_at, "ends_at": g.ends_at, "mock": g.mock} for g in grants],
    }


@router.get("/internal/platform-tier/{user_id}")
def platform_tier(user_id: str, db: Session = Depends(get_db)):
    return {"user_id": user_id, **effective(db, user_id)}


@router.get("/subscriptions/me")
def mine(principal: CurrentUser, db: Session = Depends(get_db)):
    state = effective(db, principal.user_id)
    return {**state, "items": ([{
        "id": state["subscription_id"], "target_id": "platform", "tier": state["tier"],
        "status": state["status"], "renews_on": state["access_until"],
    }] if state["subscription_id"] else [])}


@router.post("/subscriptions")
def deprecated_subscription(principal: CurrentUser):
    raise HTTPException(status_code=409, detail="Paid plans require a verified payment. Use /payments/subscriptions/checkout. Free access is automatic.")


def _lock(db: Session, user_id: str) -> None:
    key = int.from_bytes(hashlib.sha256(f"subscription:{user_id}".encode()).digest()[:8], "big", signed=True)
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})


@router.post("/internal/subscriptions/reconcile/{payment_id}")
def reconcile(payment_id: str, db: Session = Depends(get_db)):
    try:
        response = httpx.get(f"{PAYMENT_URL}/internal/payments/{payment_id}/subscription", timeout=8)
        response.raise_for_status()
        proof = response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(status_code=503, detail="Payment verification is temporarily unavailable") from None
    if proof.get("payment_id") != payment_id:
        raise HTTPException(status_code=400, detail="Payment reference does not match")
    try:
        validate_proof(proof, allow_mock=allow_mock())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    user_id = proof["user_id"]
    _lock(db, user_id)
    grant = db.get(models.SubscriptionGrant, payment_id)
    now = datetime.now(timezone.utc)
    if grant is not None and (grant.user_id != user_id or grant.tier != proof["tier"] or grant.period != proof["period"]):
        raise HTTPException(status_code=409, detail="A verified payment cannot be reassigned")

    if proof["status"] == "refunded":
        if grant is None:
            grant = models.SubscriptionGrant(payment_id=payment_id, user_id=user_id, tier=proof["tier"],
                period=proof["period"], amount=Decimal(proof["amount"]), mock=proof["mock"], starts_at=now, ends_at=now)
            db.add(grant)
        grant.status = "refunded"
    elif grant is None:
        # Same-plan renewals extend the purchased period. A full-price upgrade
        # starts now; a downgrade waits until higher paid periods have ended.
        existing = _grants(db, user_id, now)
        starts = max([now] + [g.ends_at for g in existing if RANK[g.tier] >= RANK[proof["tier"]]])
        grant = models.SubscriptionGrant(payment_id=payment_id, user_id=user_id, tier=proof["tier"],
            period=proof["period"], amount=Decimal(proof["amount"]), mock=proof["mock"],
            starts_at=starts, ends_at=period_end(starts, proof["period"]), status="active")
        db.add(grant)
        row = _subscription(db, user_id)
        if row is None:
            row = models.Subscription(subscriber_id=user_id, target_id="platform")
            db.add(row)
        row.tier, row.period, row.price_usd = proof["tier"], proof["period"], Decimal(proof["amount"])
        row.status, row.cancelled_at = "active", None
        row.renews_on = max([grant.ends_at] + [g.ends_at for g in existing]).date()
    # An already-refunded receipt is never revived by an older finished event.
    db.commit()
    return {"payment_id": payment_id, "receipt_status": grant.status, **effective(db, user_id)}


@router.delete("/subscriptions/{subscription_id}")
def cancel(subscription_id: str, principal: CurrentUser, db: Session = Depends(get_db)):
    _lock(db, principal.user_id)
    row = db.get(models.Subscription, subscription_id)
    if row is None or row.subscriber_id != principal.user_id or row.target_id != "platform":
        raise HTTPException(status_code=404, detail="Subscription not found")
    row.status, row.cancelled_at = "cancelled", datetime.now(timezone.utc)
    db.commit()
    return {"cancelled": True, "access_until": effective(db, principal.user_id)["access_until"], "renewal_mode": "manual"}
