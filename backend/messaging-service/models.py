from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, Index, Integer, LargeBinary, String, Text, UniqueConstraint
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
    # Null until this member has accepted the conversation. The person who
    # started it is accepted on creation; everybody else is in a request until
    # they reply or accept. Attachments wait for this, so an image cannot
    # arrive before anyone consented to hear from the sender at all.
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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
    # Attachment facts as media-service recorded them at upload — never as the
    # sending client described them.
    media_id: Mapped[str | None] = mapped_column(String(40))
    media_kind: Mapped[str | None] = mapped_column(String(20))  # image|video|audio|document|file
    media_name: Mapped[str | None] = mapped_column(Text)
    media_type: Mapped[str | None] = mapped_column(String(100))
    media_size: Mapped[int | None] = mapped_column(BigInteger)
    lang: Mapped[str | None] = mapped_column(String(5))
    # The message this one answers, in the same conversation. A pointer rather
    # than a copy of the quoted text: a copy would outlive the original, so a
    # deleted or expired message would stay readable inside every reply to it.
    reply_to_id: Mapped[str | None] = mapped_column(String(40), index=True)
    # Chosen by the sending device before the request goes out. A retry after
    # a dropped response carries the same id, so it finds the message already
    # stored instead of sending it twice. Unique per sender (partial index in
    # the service's migrations).
    client_id: Mapped[str | None] = mapped_column(String(64))
    # Encryption at rest (common/crypto.py): the id of the key `body` and
    # `media_name` are sealed with, or None when they are stored as written.
    # Not to be confused with `encrypted`, which means end-to-end ciphertext
    # the server cannot open at all.
    sealed_with: Mapped[str | None] = mapped_column(String(16))
    # Disappearing messages. `expires_at` is a real deletion deadline, not a
    # display rule: a message that vanishes from the screen while sitting in the
    # database has not disappeared, it has only stopped being shown — which is
    # the opposite of what the promise means to the people in the room.
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    # An edit keeps the message and replaces its text, and says so. A silently
    # edited message is a way to change what somebody appears to have agreed
    # to after they agreed to it.
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # A deleted message keeps its row and loses its words. The row is what lets
    # the thread say "this was deleted" instead of silently resequencing a
    # conversation; the words are gone from the database, not merely hidden,
    # which is the same promise `expires_at` makes above.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # A sticker from the server's catalogue. Only the id is stored: the picture
    # is the server's, so a message cannot point at an arbitrary image, and a
    # sticker withdrawn from the catalogue stops rendering everywhere at once.
    sticker_id: Mapped[str | None] = mapped_column(String(40))
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


class ContactAttempt(Base):
    """Who tried to open a conversation with whom, and how it went.

    Exists for the pattern, not the individual row: one refusal is somebody
    mistyping a handle, and the same account refused by a dozen different
    minors in a month is the thing a Trust and Safety team needs to see. You
    cannot notice the second without having kept the first.

    Deliberately narrow - two ids, an outcome, two tiers and a timestamp. No
    message content, because a safety signal does not need to read what people
    wrote, and a table that did would be worth attacking.
    """

    __tablename__ = "contact_attempts"
    __table_args__ = (
        Index("ix_contact_sender_time", "sender_id", "created_at"),
        Index("ix_contact_outcome", "outcome", "created_at"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sender_id: Mapped[str] = mapped_column(String(40), index=True)
    recipient_id: Mapped[str] = mapped_column(String(40), index=True)
    # allowed | refused_adult_to_minor | refused_not_connected
    outcome: Mapped[str] = mapped_column(String(40))
    sender_tier: Mapped[str] = mapped_column(String(30), default="")
    recipient_tier: Mapped[str] = mapped_column(String(30), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class MessageReaction(Base):
    """One person's reaction to one message.

    One per person per message, enforced by the constraint rather than by the
    client: tapping a second emoji replaces the first. Letting somebody stack
    reactions turns a quiet acknowledgement into a way to flood a thread.
    """

    __tablename__ = "message_reactions"
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_reaction"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    message_id: Mapped[str] = mapped_column(String(40), index=True)
    conversation_id: Mapped[str] = mapped_column(String(40), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    emoji: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
