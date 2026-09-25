"""Password hashing and JWT issuing/verification (shared across services).

Only the auth service issues tokens; every other service verifies them with the
same secret. Tokens carry the role and the KYC/verification flags so downstream
services can authorise without a round-trip.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from common import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS = "access"
REFRESH = "refresh"


def hash_password(raw: str) -> str:
    return pwd_context.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(raw, hashed)
    except Exception:
        return False


def _encode(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(
    *,
    user_id: str,
    role: str = "member",
    handle: str | None = None,
    kyc_verified: bool = False,
    lang: str = settings.DEFAULT_LANG,
    extra: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "typ": ACCESS,
        "role": role,
        "handle": handle,
        "kyc": kyc_verified,
        "lang": lang,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.ACCESS_TOKEN_TTL_MIN)).timestamp()),
        "jti": uuid.uuid4().hex,
    }
    if extra:
        payload.update(extra)
    return _encode(payload)


def create_refresh_token(*, user_id: str, session_id: str) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
    token = _encode(
        {
            "sub": str(user_id),
            "typ": REFRESH,
            "sid": session_id,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "jti": uuid.uuid4().hex,
        }
    )
    return token, exp


def decode_token(token: str, *, expected_type: str | None = None) -> dict[str, Any] | None:
    """Return the claims, or ``None`` when the token is invalid/expired/wrong type."""
    try:
        claims = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
    if expected_type and claims.get("typ") != expected_type:
        return None
    return claims
