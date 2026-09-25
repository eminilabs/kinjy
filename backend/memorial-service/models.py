from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from common.database import Base
from common.ids import new_id

SCHEMA = "memorial"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Memorial(Base):
    """Digital Graveyard 2.0 (blueprint §8)."""

    __tablename__ = "memorials"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("mem"))
    person_id: Mapped[str | None] = mapped_column(String(40), index=True)  # family-service person node
    created_by: Mapped[str] = mapped_column(String(40), index=True)

    full_name: Mapped[str] = mapped_column(String(200))
    birth_date: Mapped[date | None] = mapped_column(Date)
    death_date: Mapped[date | None] = mapped_column(Date)
    biography: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    cover_url: Mapped[str | None] = mapped_column(String(500))

    # Faith styling is chosen ONLY from documented wishes or by the admins.
    # The blueprint forbids inferring it — so there is no "detected_faith" column
    # and no default beyond "none".
    faith_style: Mapped[str] = mapped_column(String(40), default="none")
    faith_style_source: Mapped[str | None] = mapped_column(String(40))  # documented_wish|admin_choice

    # Grave location: captured, never fabricated. ``location_verified`` stays
    # false until someone physically confirms the coordinates.
    grave_lat: Mapped[float | None] = mapped_column(Float)
    grave_lng: Mapped[float | None] = mapped_column(Float)
    grave_label: Mapped[str | None] = mapped_column(String(255))
    location_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    memorial_audio_url: Mapped[str | None] = mapped_column(String(500))
    audio_autoplay: Mapped[bool] = mapped_column(Boolean, default=False)

    qr_code: Mapped[str] = mapped_column(String(40), unique=True)
    visibility: Mapped[str] = mapped_column(String(20), default="public")  # public|family|private
    moderation: Mapped[str] = mapped_column(String(20), default="pending_approval")  # open|pending_approval

    # Death verification states (blueprint §8).
    death_status: Mapped[str] = mapped_column(String(20), default="unconfirmed")
    # unconfirmed|reported|under_review|verified
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class MemorialAdmin(Base):
    """Up to 3 administrators with a documented succession order."""

    __tablename__ = "memorial_admins"
    __table_args__ = (
        UniqueConstraint("memorial_id", "user_id", name="uq_memorial_admin"),
        {"schema": SCHEMA},
    )
    MAX_ADMINS = 3

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    memorial_id: Mapped[str] = mapped_column(ForeignKey(f"{SCHEMA}.memorials.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    succession_order: Mapped[int] = mapped_column(Integer, default=1)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Tribute(Base):
    """Guest book entries, condolences, flowers and candles."""

    __tablename__ = "tributes"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("trb"))
    memorial_id: Mapped[str] = mapped_column(String(40), index=True)
    author_id: Mapped[str | None] = mapped_column(String(40))
    author_name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(20))  # message|flower|candle|photo
    body: Mapped[str | None] = mapped_column(Text)
    media_url: Mapped[str | None] = mapped_column(String(500))
    paid: Mapped[bool] = mapped_column(Boolean, default=False)
    amount: Mapped[float | None] = mapped_column(Numeric(18, 2))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|approved|rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Reminder(Base):
    """Anniversary reminders — 10 days, 3 days and 6 hours before."""

    __tablename__ = "reminders"
    __table_args__ = {"schema": SCHEMA}

    OFFSETS_HOURS = (240, 72, 6)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    memorial_id: Mapped[str] = mapped_column(String(40), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    occasion: Mapped[str] = mapped_column(String(40), default="death_anniversary")
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DeathReport(Base):
    """A report moving a memorial through the verification states."""

    __tablename__ = "death_reports"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    memorial_id: Mapped[str] = mapped_column(String(40), index=True)
    reported_by: Mapped[str] = mapped_column(String(40))
    evidence: Mapped[str | None] = mapped_column(Text)
    document_url: Mapped[str | None] = mapped_column(String(500))
    reviewed_by: Mapped[str | None] = mapped_column(String(40))
    outcome: Mapped[str | None] = mapped_column(String(20))  # verified|rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
