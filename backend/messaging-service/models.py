from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, LargeBinary, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from common.database import Base
from common.ids import new_id

SCHEMA = "messaging"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("cnv"))
    kind: Mapped[str] = mapped_column(String(20), default="direct")  # direct|group
    title: Mapped[str | None] = mapped_column(String(140))
    created_by: Mapped[str] = mapped_column(String(40))
    encrypted: Mapped[bool] = mapped_column(Boolean, default=True)
    # Set on the conversation, not per message: "disappearing messages" is a
    # property of the room everyone in it can see, not a per-message trick one
    # participant can play on another. 0 means messages are kept.
    disappear_after_seconds: Mapped[int] = mapped_column(Integer, default=0)
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_participant"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[str] = mapped_column(String(40), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    role: Mapped[str] = mapped_column(String(20), default="member")
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Message(Base):
    """End-to-end encrypted by default.

    When ``encrypted`` is true the server stores ``ciphertext`` and nothing else
    — no plaintext column exists for those messages, so a database dump cannot
    reveal them. ``body`` is only populated for conversations the user has
    explicitly opted out of E2E (e.g. a support thread needing moderation).
    """

    __tablename__ = "messages"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("msg"))
    conversation_id: Mapped[str] = mapped_column(String(40), index=True)
    sender_id: Mapped[str] = mapped_column(String(40), index=True)
    encrypted: Mapped[bool] = mapped_column(Boolean, default=True)
    ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary)
    body: Mapped[str | None] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(20), default="text")  # text|media|call_event
    media_url: Mapped[str | None] = mapped_column(String(500))
    lang: Mapped[str | None] = mapped_column(String(5))
    # Disappearing messages. `expires_at` is a real deletion deadline, not a
    # display rule: a message that vanishes from the screen while sitting in the
    # database has not disappeared, it has only stopped being shown — which is
    # the opposite of what the promise means to the people in the room.
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    delivered: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    kind: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String(300))
    lang: Mapped[str] = mapped_column(String(5), default="en")
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
