from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from common.database import Base
from common.ids import new_id

SCHEMA = "creator"
AMOUNT = Numeric(18, 2)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class CreatorProfile(Base):
    __tablename__ = "creator_profiles"
    __table_args__ = {"schema": SCHEMA}

    user_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    tagline: Mapped[str | None] = mapped_column(String(200))
    categories: Mapped[str | None] = mapped_column(String(255))
    brand_kit: Mapped[str | None] = mapped_column(Text)  # JSON: colors, fonts, logo
    monetization_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    subscription_price_usd: Mapped[Decimal | None] = mapped_column(AMOUNT)
    total_views: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Series(Base):
    """Serialized content — episodes with a "next episode" rail."""

    __tablename__ = "series"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("srs"))
    creator_id: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    cover_url: Mapped[str | None] = mapped_column(String(500))
    cadence: Mapped[str | None] = mapped_column(String(40))  # weekly, daily...
    episodes_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PublishingJob(Base):
    """The One-to-Many Publishing Engine (blueprint module G).

    One source piece fans out into article / short video / long video / audio /
    carousel / newsletter / translations. Each output tracks its own state so a
    failed dubbing job never blocks the article.
    """

    __tablename__ = "publishing_jobs"
    __table_args__ = {"schema": SCHEMA}

    TARGETS = ("article", "short_video", "long_video", "audio", "carousel", "newsletter", "translation")

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("pub"))
    creator_id: Mapped[str] = mapped_column(String(40), index=True)
    source_kind: Mapped[str] = mapped_column(String(20))  # text|video|audio
    source_ref: Mapped[str | None] = mapped_column(String(120))
    source_text: Mapped[str | None] = mapped_column(Text)
    source_lang: Mapped[str] = mapped_column(String(5), default="en")
    targets: Mapped[str] = mapped_column(String(255))     # csv of TARGETS
    target_langs: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="queued")  # queued|running|done|failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PublishingOutput(Base):
    __tablename__ = "publishing_outputs"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String(40), index=True)
    target: Mapped[str] = mapped_column(String(30))
    lang: Mapped[str] = mapped_column(String(5), default="en")
    # queued -> running -> ready | failed, or unsupported when this server cannot
    # make it. Text is made inside the request and is born ready; a render
    # (carousel, audio, video) is queued and finished by media_jobs.
    status: Mapped[str] = mapped_column(String(20), default="queued")
    content: Mapped[str | None] = mapped_column(Text)
    media_url: Mapped[str | None] = mapped_column(String(500))
    # The files a render made, as media-service holds them: a JSON list of
    # {id, kind, content_type, alt}. Ids only - a viewable address is minted
    # fresh on every read, because the tickets in one expire.
    media: Mapped[str | None] = mapped_column(Text)
    # Anything the engine produced is labelled — the provenance rule applies to
    # the platform's own AI output too, not only to users'.
    provenance: Mapped[str] = mapped_column(String(20), default="ai_generated")
    # Produced through the stand-in AI provider rather than a real model, so a
    # "translation" is only a marker on the text. Kept on the row because the
    # provider can change after the job: what was produced stays what it was.
    simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    error: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class NewsletterSubscriber(Base):
    """Somebody who asked, with an e-mail address, to receive one creator's newsletter.

    ``pending`` until they follow the link in the confirmation mail - nothing is ever sent to a
    pending address - then ``confirmed``; ``unsubscribed`` is final until *they* ask again.
    There is no token column: the links in the mails are signed (newsletter.py), so nothing a
    database leak reveals can confirm, or cancel, anybody's subscription.
    """

    __tablename__ = "newsletter_subscribers"
    __table_args__ = (UniqueConstraint("creator_id", "email", name="uq_newsletter_subscriber"), {"schema": SCHEMA})

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("nws"))
    creator_id: Mapped[str] = mapped_column(String(40), index=True)
    creator_handle: Mapped[str] = mapped_column(String(60), default="")
    email: Mapped[str] = mapped_column(String(254), index=True)  # lower case
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|confirmed|unsubscribed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    confirmation_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    unsubscribed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NewsletterIssue(Base):
    """One newsletter, sent once to the people who were confirmed at the time."""

    __tablename__ = "newsletter_issues"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("iss"))
    creator_id: Mapped[str] = mapped_column(String(40), index=True)
    creator_handle: Mapped[str] = mapped_column(String(60))
    subject: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    lang: Mapped[str] = mapped_column(String(5), default="en")
    # queued -> sending -> sent | partial | failed. A restart puts "sending" back in the queue; the
    # deliveries table is what stops anybody being written to twice.
    status: Mapped[str] = mapped_column(String(20), default="queued")
    recipients: Mapped[int] = mapped_column(Integer, default=0)
    sent: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    skipped: Mapped[int] = mapped_column(Integer, default=0)  # left before their turn came
    error: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NewsletterDelivery(Base):
    """One address, one issue, one result. Its uniqueness is what makes a resumed send safe."""

    __tablename__ = "newsletter_deliveries"
    __table_args__ = (UniqueConstraint("issue_id", "subscriber_id", name="uq_newsletter_delivery"), {"schema": SCHEMA})

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    issue_id: Mapped[str] = mapped_column(String(40), index=True)
    subscriber_id: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20))  # sent|failed|skipped
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Subscription(Base):
    """Platform tiers (Free/Basic/Premium) and creator subscriptions."""

    __tablename__ = "subscriptions"
    __table_args__ = (
        UniqueConstraint("subscriber_id", "target_id", name="uq_subscription"),
        {"schema": SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("sub"))
    subscriber_id: Mapped[str] = mapped_column(String(40), index=True)
    target_id: Mapped[str] = mapped_column(String(40), index=True)  # "platform" or a creator id
    tier: Mapped[str] = mapped_column(String(20), default="free")   # free|basic|premium|creator
    period: Mapped[str] = mapped_column(String(10), default="monthly")  # monthly|yearly
    price_usd: Mapped[Decimal] = mapped_column(AMOUNT, default=Decimal("0"))
    status: Mapped[str] = mapped_column(String(20), default="active")
    started_on: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    renews_on: Mapped[date | None] = mapped_column(Date)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SubscriptionGrant(Base):
    """One verified payment, one immutable period. Legacy subscriptions are not evidence."""

    __tablename__ = "subscription_grants"
    __table_args__ = {"schema": SCHEMA}

    payment_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    tier: Mapped[str] = mapped_column(String(20))
    period: Mapped[str] = mapped_column(String(10))
    amount: Mapped[Decimal] = mapped_column(AMOUNT)
    mock: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="active")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Badge(Base):
    """Gamification (blueprint §19) — rewards quality, not volume."""

    __tablename__ = "badges"
    __table_args__ = (
        UniqueConstraint("user_id", "badge", name="uq_badge"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    badge: Mapped[str] = mapped_column(String(40))
    awarded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    reason: Mapped[str | None] = mapped_column(String(255))


BADGES = [
    "helpful_contributor", "expert", "community_builder",
    "verified_creator", "family_historian", "local_expert",
]

# Blueprint §12 — one-off purchases are priced 2–4x the implied subscription
# unit cost, so a subscription always remains the better deal.
PLANS = {
    "free": {"monthly": "0.00", "yearly": "0.00"},
    "basic": {"monthly": "3.99", "yearly": "39.00"},
    "premium": {"monthly": "9.99", "yearly": "99.00"},
}
