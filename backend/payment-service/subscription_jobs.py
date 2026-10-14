"""Durable subscription activation/revocation outbox on the payment row.

Payment is committed before creator-service reads it. A crash or a lost reply
leaves the row unsynchronised; the loop retries. Creator receipts are idempotent.
"""
from __future__ import annotations

import asyncio
import logging

import httpx
from sqlalchemy import or_, select, update

from common.database import SessionLocal

import models

log = logging.getLogger("subscription-outbox")


def deliver(payment_id: str, status: str) -> bool:
    try:
        response = httpx.post(f"http://creator-service:8000/internal/subscriptions/reconcile/{payment_id}", timeout=15)
        response.raise_for_status()
        expected = "refunded" if status == "refunded" else "active"
        if response.json().get("receipt_status") != expected:
            return False
    except (httpx.HTTPError, ValueError) as exc:
        log.warning("subscription receipt delivery failed (%s); will retry", type(exc).__name__)
        return False
    with SessionLocal() as db:
        db.execute(update(models.PaymentIntent).where(
            models.PaymentIntent.id == payment_id, models.PaymentIntent.status == status,
        ).values(subscription_synced_status=status))
        db.commit()
    return True


def retry_pending() -> None:
    with SessionLocal() as db:
        rows = db.execute(select(models.PaymentIntent.id, models.PaymentIntent.status).where(
            models.PaymentIntent.purpose == "subscription",
            models.PaymentIntent.subscription_tier.is_not(None),
            models.PaymentIntent.status.in_(["finished", "refunded"]),
            or_(models.PaymentIntent.subscription_synced_status.is_(None),
                models.PaymentIntent.subscription_synced_status != models.PaymentIntent.status),
        ).order_by(models.PaymentIntent.created_at).limit(50)).all()
    for payment_id, status in rows:
        deliver(payment_id, status)


async def _loop() -> None:
    while True:
        try:
            await asyncio.to_thread(retry_pending)
        except Exception:
            log.exception("subscription outbox failed; will retry")
        await asyncio.sleep(10)


async def start() -> None:
    asyncio.create_task(_loop())
