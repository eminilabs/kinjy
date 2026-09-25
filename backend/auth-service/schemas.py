from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

HANDLE_RE = re.compile(r"^[a-z0-9](?:[a-z0-9_.]{1,38}[a-z0-9])$")


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    display_name: str = Field(min_length=2, max_length=120)
    handle: str = Field(min_length=3, max_length=40)
    lang: str = "en"
    country: str | None = Field(default=None, max_length=2)
    referral_code: str | None = None

    @field_validator("handle")
    @classmethod
    def _handle(cls, value: str) -> str:
        value = value.strip().lower()
        if not HANDLE_RE.match(value):
            raise ValueError("handle must be 3-40 chars, lowercase letters, digits, _ or .")
        return value

    @field_validator("password")
    @classmethod
    def _password(cls, value: str) -> str:
        # Length is the strongest single signal; require a little variety on top.
        if value.isdigit() or value.isalpha():
            raise ValueError("password must mix letters with digits or symbols")
        return value


class LoginIn(BaseModel):
    email: EmailStr
    password: str
    device_label: str | None = None


class RefreshIn(BaseModel):
    refresh_token: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserOut(BaseModel):
    id: str
    email: EmailStr
    handle: str
    display_name: str
    role: str
    lang: str
    country: str | None
    email_verified: bool
    kyc_verified: bool
    referral_code: str
    invited_by: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthOut(BaseModel):
    user: UserOut
    tokens: TokenOut


class SessionOut(BaseModel):
    id: str
    device_label: str | None
    user_agent: str | None
    ip: str | None
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    revoked_at: datetime | None
    current: bool = False

    model_config = {"from_attributes": True}


class PasskeyOut(BaseModel):
    id: str
    label: str
    transports: str | None
    created_at: datetime
    last_used_at: datetime | None

    model_config = {"from_attributes": True}


class DeleteAccountIn(BaseModel):
    """Blueprint §4: identity confirmation, optional cooling period, and
    explicitly *no* justification field — asking for one is a dark pattern."""

    password: str
    cooling_period_days: int = Field(default=30, ge=0, le=90)
    mode: str = Field(default="delete", pattern="^(deactivate|delete)$")


class SponsorOut(BaseModel):
    """The one member paid on this member's activity, or None if unsponsored."""

    user_id: str
    sponsor_id: str | None
    source: str  # invitation|referral_pool|none


class PoolSeatIn(BaseModel):
    """A settled referral-pool entry payment, handed over by payment-service."""

    member_id: str
    amount: str
    currency: str = "USD"
    payment_ref: str | None = None
