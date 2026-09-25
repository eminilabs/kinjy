from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from common.database import Base
from common.ids import new_id

SCHEMA = "family"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Person(Base):
    """A person node.

    Blueprint §6: the *graph* is the backend truth. A Person may or may not be a
    Kinjy member (``user_id`` is nullable) — ancestors usually are not. The
    "Level" model (Level 0 = viewer, parents above, children below) is a UI
    presentation computed from edges, never stored here.
    """

    __tablename__ = "persons"
    __table_args__ = (
        Index("ix_person_name", "given_name", "family_name"),
        {"schema": SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("prs"))
    user_id: Mapped[str | None] = mapped_column(String(40), unique=True, index=True)
    created_by: Mapped[str] = mapped_column(String(40), index=True)

    given_name: Mapped[str] = mapped_column(String(120))
    family_name: Mapped[str | None] = mapped_column(String(120))
    other_names: Mapped[str | None] = mapped_column(String(255))
    gender: Mapped[str | None] = mapped_column(String(20))  # self-declared, free text; never inferred

    birth_date: Mapped[date | None] = mapped_column(Date)
    birth_place: Mapped[str | None] = mapped_column(String(200))
    death_date: Mapped[date | None] = mapped_column(Date)
    death_place: Mapped[str | None] = mapped_column(String(200))
    deceased: Mapped[bool] = mapped_column(Boolean, default=False)

    photo_url: Mapped[str | None] = mapped_column(String(500))
    biography: Mapped[str | None] = mapped_column(Text)

    # Verification (blueprint §6): a living person confirms themselves; a
    # deceased person needs corroboration from 3 closely-related members.
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|verified|disputed
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confirmations: Mapped[int] = mapped_column(Integer, default=0)

    # Deliberately absent: religion, ethnicity, paternity probability. The
    # blueprint forbids the AI from inferring them and we do not store guesses.

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Relationship(Base):
    """A directed edge between two persons.

    Only *primitive* edges are stored: ``parent_of``, ``spouse_of``,
    ``adoptive_parent_of``, ``guardian_of``, ``sibling_of`` (only when no shared
    parent is known). Grandparent, uncle, cousin and every other label is
    derived at read time — storing them would be denormalised truth that drifts.
    """

    __tablename__ = "relationships"
    __table_args__ = (
        UniqueConstraint("from_person_id", "to_person_id", "kind", name="uq_relationship"),
        Index("ix_rel_from", "from_person_id"),
        Index("ix_rel_to", "to_person_id"),
        {"schema": SCHEMA},
    )

    PRIMITIVES = ("parent_of", "adoptive_parent_of", "guardian_of", "spouse_of", "sibling_of")

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("rel"))
    from_person_id: Mapped[str] = mapped_column(ForeignKey(f"{SCHEMA}.persons.id", ondelete="CASCADE"))
    to_person_id: Mapped[str] = mapped_column(ForeignKey(f"{SCHEMA}.persons.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(30))

    # Half vs full sibling ranking (blueprint: "full siblings before half").
    biological: Mapped[bool] = mapped_column(Boolean, default=True)
    since: Mapped[date | None] = mapped_column(Date)
    until: Mapped[date | None] = mapped_column(Date)

    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|verified|disputed
    asserted_by: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Confirmation(Base):
    """One member corroborating a person or an edge."""

    __tablename__ = "confirmations"
    __table_args__ = (
        UniqueConstraint("target_type", "target_id", "member_id", name="uq_confirmation"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_type: Mapped[str] = mapped_column(String(20))  # person|relationship
    target_id: Mapped[str] = mapped_column(String(40), index=True)
    member_id: Mapped[str] = mapped_column(String(40), index=True)
    decision: Mapped[str] = mapped_column(String(20))  # confirm|dispute
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Dispute(Base):
    __tablename__ = "disputes"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_type: Mapped[str] = mapped_column(String(20))
    target_id: Mapped[str] = mapped_column(String(40), index=True)
    raised_by: Mapped[str] = mapped_column(String(40))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open|resolved|rejected
    resolution: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class HeritageItem(Base):
    """An uploaded photo/letter/recording plus its AI-derived reading.

    The original file is never replaced — ``source_url`` stays untouched and any
    enhancement lands in ``enhanced_url`` (blueprint §7).
    """

    __tablename__ = "heritage_items"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("her"))
    person_id: Mapped[str | None] = mapped_column(String(40), index=True)
    uploaded_by: Mapped[str] = mapped_column(String(40), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # photo|letter|audio|video|document
    title: Mapped[str] = mapped_column(String(200))
    source_url: Mapped[str] = mapped_column(String(500))
    enhanced_url: Mapped[str | None] = mapped_column(String(500))
    transcript: Mapped[str | None] = mapped_column(Text)
    ai_summary: Mapped[str | None] = mapped_column(Text)
    ai_confidence: Mapped[float | None] = mapped_column(Float)
    happened_on: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
