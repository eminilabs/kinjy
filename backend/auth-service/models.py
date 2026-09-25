from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.database import Base
from common.ids import new_id

SCHEMA = "auth"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """The account. Profile data lives in user-service; this table is the
    credential + lifecycle record only."""

    __tablename__ = "users"
    __table_args__ = (
        Index("ix_auth_users_email_lower", "email"),
        {"schema": SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("usr"))
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    handle: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)

    role: Mapped[str] = mapped_column(String(20), default="member")  # member|creator|admin|superadmin
    lang: Mapped[str] = mapped_column(String(5), default="en")
    country: Mapped[str | None] = mapped_column(String(2))

    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    kyc_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    kyc_verified_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Affiliate graph: who sponsored this member. One level, and one level only
    # - the direct affiliate programme pays this member and nobody above them.
    # Set either from a personal invitation link or by a referral-pool draw.
    invited_by: Mapped[str | None] = mapped_column(String(40), index=True)
    referral_code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)

    # Lifecycle — self-service deletion (blueprint §4). No justification stored.
    status: Mapped[str] = mapped_column(String(20), default="active")  # active|deactivated|pending_deletion|deleted
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deletion_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deletion_effective_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    sessions: Mapped[list["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    passkeys: Mapped[list["Passkey"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    """One logged-in device. Refresh tokens are bound to a session so a single
    device can be revoked from the device manager without touching the others."""

    __tablename__ = "sessions"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("ses"))
    user_id: Mapped[str] = mapped_column(ForeignKey(f"{SCHEMA}.users.id", ondelete="CASCADE"), index=True)
    device_label: Mapped[str | None] = mapped_column(String(120))
    user_agent: Mapped[str | None] = mapped_column(Text)
    ip: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="sessions")

    @property
    def active(self) -> bool:
        return self.revoked_at is None and self.expires_at > _now()


class Passkey(Base):
    """A WebAuthn credential.

    Blueprint §5: device-level passkeys, *no central biometric database*. What is
    stored here is a public key and a counter — never a fingerprint or a face
    template. The biometric never leaves the user's device.
    """

    __tablename__ = "passkeys"
    __table_args__ = (
        UniqueConstraint("credential_id", name="uq_passkey_credential"),
        {"schema": SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("pky"))
    user_id: Mapped[str] = mapped_column(ForeignKey(f"{SCHEMA}.users.id", ondelete="CASCADE"), index=True)
    credential_id: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    public_key: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    sign_count: Mapped[int] = mapped_column(Integer, default=0)
    transports: Mapped[str | None] = mapped_column(String(120))
    label: Mapped[str] = mapped_column(String(80), default="Passkey")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="passkeys")


class OtpCode(Base):
    """Email one-time codes (verification, passwordless login, deletion confirm)."""

    __tablename__ = "otp_codes"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    purpose: Mapped[str] = mapped_column(String(40))  # verify_email|login|delete_account
    code_hash: Mapped[str] = mapped_column(String(255))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class LoginEvent(Base):
    """Login alerts + device management surface (blueprint §5)."""

    __tablename__ = "login_events"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    kind: Mapped[str] = mapped_column(String(30))  # password|passkey|otp|refresh|logout|failed
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(Text)
    succeeded: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class ReferralPoolSeat(Base):
    """A paid seat in the referral pool.

    Members buy a seat; sign-ups that arrive with no personal invitation link
    are assigned to a seat at random and the seat holder becomes their sponsor,
    with exactly the same 20% direct commission as a personal invitation.

    The pool closes to new entrants once REFERRAL_POOL_CAP seats are sold. Seats
    already held keep receiving assignments: a seat that stopped working the
    moment the last one sold would make the final purchases worthless.
    """

    __tablename__ = "referral_pool_seats"
    __table_args__ = (
        UniqueConstraint("member_id", name="uq_pool_seat_member"),
        {"schema": SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("seat"))
    member_id: Mapped[str] = mapped_column(String(40), index=True)
    seat_number: Mapped[int] = mapped_column(Integer, index=True)
    price_paid: Mapped[str] = mapped_column(String(20), default="0")
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    payment_ref: Mapped[str | None] = mapped_column(String(80))
    # active seats receive assignments; a refunded or suspended seat does not.
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    assigned_count: Mapped[int] = mapped_column(Integer, default=0)
    last_assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PoolAssignment(Base):
    """Audit trail: which sign-up went to which seat, and when.

    Without this row the assignment is unreviewable — a member disputing their
    sponsor, or a fraud review looking for a seat that took an implausible share
    of sign-ups, has nothing to read.
    """

    __tablename__ = "pool_assignments"
    __table_args__ = (
        UniqueConstraint("new_member_id", name="uq_pool_assignment_member"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    seat_id: Mapped[str] = mapped_column(String(40), index=True)
    sponsor_id: Mapped[str] = mapped_column(String(40), index=True)
    new_member_id: Mapped[str] = mapped_column(String(40), index=True)
    seats_in_draw: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
