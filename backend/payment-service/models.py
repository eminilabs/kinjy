from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from common.database import Base
from common.ids import new_id

SCHEMA = "payment"
AMOUNT = Numeric(18, 2)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class PaymentIntent(Base):
    """A payment being collected on one of the rails."""

    __tablename__ = "payment_intents"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("pmt"))
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    rail: Mapped[str] = mapped_column(String(20), default="nowpayments")  # nowpayments|mangopay|mock
    purpose: Mapped[str] = mapped_column(String(40))  # order|subscription|ad_credit|kyc_fee|tribute
    reference: Mapped[str | None] = mapped_column(String(80), index=True)

    amount: Mapped[Decimal] = mapped_column(AMOUNT)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    pay_currency: Mapped[str | None] = mapped_column(String(20))
    pay_address: Mapped[str | None] = mapped_column(String(255))

    external_id: Mapped[str | None] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(20), default="waiting")
    # waiting|confirming|confirmed|sending|partially_paid|finished|failed|refunded|expired
    raw_payload: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PayoutDestination(Base):
    """Where a member wants to be paid. One of the two eligibility gates."""

    __tablename__ = "payout_destinations"
    __table_args__ = (
        UniqueConstraint("user_id", "rail", name="uq_destination_rail"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    rail: Mapped[str] = mapped_column(String(20))  # nowpayments|mangopay
    # For crypto: a BSC address. Whitelisted on the provider side before use.
    address: Mapped[str] = mapped_column(String(255))
    currency: Mapped[str] = mapped_column(String(20), default="usdtbsc")
    label: Mapped[str | None] = mapped_column(String(80))
    whitelisted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class KycRecord(Base):
    """KinjyKYC (blueprint §20).

    Payment and verification are deliberately decoupled: paying the $10 fee does
    not make someone verified, and a failed check does not silently consume the
    year they paid for.
    """

    __tablename__ = "kyc_records"
    __table_args__ = {"schema": SCHEMA}

    MAX_ATTEMPTS_PER_YEAR = 3

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    fee_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    fee_payment_id: Mapped[str | None] = mapped_column(String(40))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    # Only the *result* is stored on-platform, never the identity documents.
    status: Mapped[str] = mapped_column(String(20), default="unverified")
    # unverified|pending|verified|rejected
    provider_reference: Mapped[str | None] = mapped_column(String(120))
    verified_on: Mapped[date | None] = mapped_column(Date)
    expires_on: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Refund(Base):
    """Money instructed back to a buyer out of custody.

    A row exists even when the rail refuses, with the reason on it. A refund
    that failed silently looks exactly like a refund that was never asked for,
    and the buyer is the one who finds out.
    """

    __tablename__ = "refunds"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("rfd"))
    order_id: Mapped[str] = mapped_column(String(40), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    rail: Mapped[str] = mapped_column(String(30), default="mock")
    custody_ref: Mapped[str | None] = mapped_column(String(120))
    external_id: Mapped[str | None] = mapped_column(String(120))
    reason: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    # pending|submitted|finished|failed
    failure_reason: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
