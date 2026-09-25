from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from common.database import Base
from common.ids import new_id

SCHEMA = "commerce"
AMOUNT = Numeric(18, 2)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Product(Base):
    """A marketplace listing. ``vendor_price`` is what the seller wants; the
    customer price is derived from it and never stored twice."""

    __tablename__ = "products"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("prd"))
    vendor_id: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(20), default="product")  # product|service|digital
    vendor_price: Mapped[Decimal] = mapped_column(AMOUNT)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    stock: Mapped[int | None] = mapped_column(Integer)
    country: Mapped[str | None] = mapped_column(String(2), index=True)
    city: Mapped[str | None] = mapped_column(String(120))
    images: Mapped[str | None] = mapped_column(Text)  # csv of urls
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("ord"))
    buyer_id: Mapped[str] = mapped_column(String(40), index=True)
    vendor_id: Mapped[str] = mapped_column(String(40), index=True)
    product_id: Mapped[str] = mapped_column(String(40), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    vendor_price: Mapped[Decimal] = mapped_column(AMOUNT)
    margin: Mapped[Decimal] = mapped_column(AMOUNT)
    customer_price: Mapped[Decimal] = mapped_column(AMOUNT)
    currency: Mapped[str] = mapped_column(String(10), default="USD")

    # Escrow: the buyer's money sits with an authorised financial institution,
    # not with Kinjy, and reaches the seller only once the buyer confirms
    # receipt — or once the confirmation window closes with no dispute.
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    # pending|in_escrow|delivered|settled|disputed|refunded|part_refunded|cancelled
    custodian: Mapped[str | None] = mapped_column(String(40))
    custody_ref: Mapped[str | None] = mapped_column(String(120))
    escrow_funded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    escrow_released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dispute_window_ends: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    # Set by the seller when they hand the goods over / deliver the file. It does
    # not release the money: only the buyer, or the window expiring, does that.
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivery_note: Mapped[str | None] = mapped_column(Text)
    refunded_amount: Mapped[Decimal] = mapped_column(AMOUNT, default=Decimal("0"))
    ledger_journal_id: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Campaign(Base):
    """An advertising campaign."""

    __tablename__ = "campaigns"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("cmp"))
    advertiser_id: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(200))
    objective: Mapped[str] = mapped_column(String(40))  # awareness|traffic|leads|sales|local
    pricing_model: Mapped[str] = mapped_column(String(20))  # cpm|cpm_video|cpc|cpv|engagement|lead|daily_local|daily_city
    bid: Mapped[Decimal] = mapped_column(AMOUNT)
    budget: Mapped[Decimal] = mapped_column(AMOUNT)
    spent: Mapped[Decimal] = mapped_column(AMOUNT, default=Decimal("0"))

    target_country: Mapped[str | None] = mapped_column(String(2))
    target_city: Mapped[str | None] = mapped_column(String(120))
    target_radius_km: Mapped[int | None] = mapped_column(Integer)
    target_age_min: Mapped[int | None] = mapped_column(Integer)
    target_age_max: Mapped[int | None] = mapped_column(Integer)
    target_langs: Mapped[str | None] = mapped_column(String(60))

    creative_headline: Mapped[str | None] = mapped_column(String(200))
    creative_body: Mapped[str | None] = mapped_column(Text)
    creative_media_url: Mapped[str | None] = mapped_column(String(500))
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    # An AI-built campaign never goes live on its own (blueprint §13).
    status: Mapped[str] = mapped_column(String(20), default="draft")
    # draft|pending_approval|active|paused|completed
    approved_by: Mapped[str | None] = mapped_column(String(40))
    starts_on: Mapped[date | None] = mapped_column(Date)
    ends_on: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# Blueprint §13 — auction floor prices, AI-adjusted upward but never below these.
AD_FLOORS = {
    "cpm": "0.50",
    "cpm_video": "1.00",
    "cpc": "0.05",
    "cpv": "0.005",
    "engagement": "0.02",
    "lead": "0.25",
    "daily_local": "1.00",
    "daily_city": "5.00",
}


class Dispute(Base):
    """A contested order, and the record of how it was settled.

    Opening a dispute freezes the escrow: the auto-release stops, so a seller
    cannot simply wait out a buyer who is raising a problem, and a buyer cannot
    keep the goods and the money by opening a case and going quiet — the seller
    has a deadline to answer and arbitration decides if they do not.

    Every exchange lives in :class:`DisputeMessage` rather than in a single
    free-text field, so the case can be read in order by whoever arbitrates it.
    """

    __tablename__ = "disputes"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("dsp"))
    order_id: Mapped[str] = mapped_column(String(40), index=True)
    opened_by: Mapped[str] = mapped_column(String(40), index=True)
    against: Mapped[str] = mapped_column(String(40), index=True)
    role: Mapped[str] = mapped_column(String(10))  # buyer|seller
    category: Mapped[str] = mapped_column(String(40))
    # not_received|not_as_described|damaged|unauthorised|other
    reason: Mapped[str] = mapped_column(Text)
    amount_claimed: Mapped[Decimal] = mapped_column(AMOUNT, default=Decimal("0"))

    status: Mapped[str] = mapped_column(String(24), default="open", index=True)
    # open|answered|arbitration|resolved|withdrawn
    outcome: Mapped[str | None] = mapped_column(String(24))
    # release_to_seller|refund_buyer|split|withdrawn
    refund_amount: Mapped[Decimal] = mapped_column(AMOUNT, default=Decimal("0"))
    resolution_note: Mapped[str | None] = mapped_column(Text)
    resolved_by: Mapped[str | None] = mapped_column(String(40))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # The other side has until here to answer before the case is escalated.
    respond_by: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    arbitrate_by: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class DisputeMessage(Base):
    """One statement in a dispute, from either party or from Kinjy."""

    __tablename__ = "dispute_messages"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dispute_id: Mapped[str] = mapped_column(String(40), index=True)
    author_id: Mapped[str] = mapped_column(String(40))
    author_role: Mapped[str] = mapped_column(String(12))  # buyer|seller|kinjy
    body: Mapped[str] = mapped_column(Text)
    # Evidence is a list of media URLs, stored as a newline-separated blob: the
    # files themselves live in media-service like any other upload.
    evidence: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


DISPUTE_CATEGORIES = (
    "not_received",
    "not_as_described",
    "damaged",
    "unauthorised",
    "other",
)
