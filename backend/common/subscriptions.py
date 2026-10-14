"""Versioned subscription prices and paid-period rules. No network or database.

Keep old catalogues when prices change: an already-created payment is checked
against the price it was quoted, not a newer price.
"""
from __future__ import annotations

import calendar
from datetime import datetime
from decimal import Decimal

CATALOG_VERSION = 1
CATALOGS = {1: {
    "basic": {"monthly": "3.99", "yearly": "39.00"},
    "premium": {"monthly": "9.99", "yearly": "99.00"},
}}
RANK = {"free": 0, "basic": 1, "premium": 2}


def price(tier: str, period: str, version: int = CATALOG_VERSION) -> Decimal:
    try:
        return Decimal(CATALOGS[version][tier][period])
    except (KeyError, TypeError):
        raise ValueError("Unknown subscription plan, period or price version") from None


def period_end(start: datetime, period: str) -> datetime:
    if period not in ("monthly", "yearly"):
        raise ValueError("Unknown subscription period")
    months = 1 if period == "monthly" else 12
    year, month = divmod(start.year * 12 + start.month - 1 + months, 12)
    month += 1
    return start.replace(year=year, month=month, day=min(start.day, calendar.monthrange(year, month)[1]))


def features(tier: str) -> dict[str, bool]:
    paid = RANK.get(tier, 0) >= RANK["basic"]
    return {"scheduled_posts": paid, "newsletter_send": paid}


def mock_allowed(environment: str, *, live_crypto: bool, live_fiat: bool) -> bool:
    return environment in ("development", "test") and not live_crypto and not live_fiat


def validate_proof(proof: dict, *, allow_mock: bool) -> None:
    """A legacy record, a partial payment and a simulated production payment grant nothing."""
    if proof.get("purpose") != "subscription" or proof.get("currency") != "USD":
        raise ValueError("Not a platform subscription payment")
    expected = price(proof.get("tier"), proof.get("period"), proof.get("catalog_version"))
    try:
        amount = Decimal(str(proof.get("amount")))
    except Exception:
        raise ValueError("Invalid payment amount") from None
    if not amount.is_finite() or amount != expected:
        raise ValueError("Payment does not match the quoted price")
    if not isinstance(proof.get("mock"), bool) or (proof["mock"] and not allow_mock):
        raise ValueError("Simulated payments cannot grant access here")
    if not proof.get("user_id") or not proof.get("payment_id"):
        raise ValueError("Missing payment owner or reference")
    if proof.get("status") not in ("finished", "refunded") or not proof.get("settled_at"):
        raise ValueError("Payment is not settled")


def validate_callback(intent, payload: dict) -> None:
    """The signed callback must still belong to this exact real payment."""
    if intent.mock or intent.rail != "nowpayments":
        raise ValueError("This payment does not accept provider callbacks")
    if not intent.external_id or str(payload.get("payment_id")) != intent.external_id:
        raise ValueError("Payment reference does not match")
    if str(payload.get("price_currency", "")).upper() != intent.currency:
        raise ValueError("Payment currency does not match")
    if str(payload.get("pay_currency", "")).lower() != (intent.pay_currency or "").lower():
        raise ValueError("Payment asset does not match")
    try:
        amount = Decimal(str(payload.get("price_amount")))
    except Exception:
        raise ValueError("Invalid payment amount") from None
    if not amount.is_finite() or amount < intent.amount:
        raise ValueError("Payment amount is too small")
    if payload.get("payment_status") not in {
        "waiting", "confirming", "confirmed", "sending", "partially_paid",
        "finished", "failed", "refunded", "expired",
    }:
        raise ValueError("Unknown payment status")
