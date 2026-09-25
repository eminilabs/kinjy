from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from common.database import Base
from common.ids import new_id

SCHEMA = "ai"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AiCall(Base):
    """Observability for every model call (recommendation C3).

    Cost, latency, provider and task are recorded so routing decisions can be
    made on measured behaviour rather than on vendor claims.
    """

    __tablename__ = "ai_calls"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("aic"))
    task: Mapped[str] = mapped_column(String(40), index=True)
    provider: Mapped[str] = mapped_column(String(40), index=True)
    model: Mapped[str] = mapped_column(String(80))
    lang: Mapped[str | None] = mapped_column(String(5))
    user_id: Mapped[str | None] = mapped_column(String(40))
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Numeric(12, 6), default=0)
    sensitive: Mapped[bool] = mapped_column(default=False)
    succeeded: Mapped[bool] = mapped_column(default=True)
    error: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class AssistantSession(Base):
    __tablename__ = "assistant_sessions"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("ast"))
    user_id: Mapped[str | None] = mapped_column(String(40), index=True)
    role: Mapped[str] = mapped_column(String(20), default="visitor")
    lang: Mapped[str] = mapped_column(String(5), default="en")
    module: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AssistantMessage(Base):
    __tablename__ = "assistant_messages"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(40), index=True)
    role: Mapped[str] = mapped_column(String(20))  # user|assistant
    body: Mapped[str] = mapped_column(Text)
    lang: Mapped[str] = mapped_column(String(5), default="en")
    kb_entry_id: Mapped[str | None] = mapped_column(String(60))
    grounded: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class KbEntry(Base):
    """Assistant knowledge, versioned with the codebase.

    One row per (entry, language): the same answer exists in each supported
    language, so the primary key is composite. ``source`` points at the document
    or module the answer came from, so the assistant can cite rather than assert.
    """

    __tablename__ = "kb_entries"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    lang: Mapped[str] = mapped_column(String(5), primary_key=True, default="en")
    module: Mapped[str] = mapped_column(String(60), index=True)
    version: Mapped[str] = mapped_column(String(20), default="v1")
    roles: Mapped[str] = mapped_column(String(60), default="visitor,member,admin")
    admin_only: Mapped[bool] = mapped_column(default=False)
    keywords: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(String(200))
    answer: Mapped[str] = mapped_column(Text)
    # Written answers carry an illustration and numbered steps; the client also
    # turns them into the scripted video-clip format the blueprint asks for.
    steps: Mapped[str | None] = mapped_column(Text)          # newline separated
    image_url: Mapped[str | None] = mapped_column(String(300))
    image_alt: Mapped[str | None] = mapped_column(String(300))
    source: Mapped[str | None] = mapped_column(String(200))
    deep_link: Mapped[str | None] = mapped_column(String(200))
    deep_link_label: Mapped[str | None] = mapped_column(String(80))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Translation(Base):
    """Cache. Translating the same string twice is pure waste."""

    __tablename__ = "translations"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_hash: Mapped[str] = mapped_column(String(64), index=True)
    source_lang: Mapped[str] = mapped_column(String(5))
    target_lang: Mapped[str] = mapped_column(String(5))
    source_text: Mapped[str] = mapped_column(Text)
    translated_text: Mapped[str] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(String(40))
    quality: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
