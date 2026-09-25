"""WebAuthn ceremonies (blueprint §5).

What Kinjy stores is a credential id, a public key and a signature counter.
The biometric that unlocks the key never leaves the member's device — there is
no central fingerprint or face database here, by construction rather than by
policy.

Challenges live in Redis when it is reachable and in-process otherwise: a
challenge must be single-use and short-lived, and replaying one is the whole
attack this ceremony exists to prevent.
"""
from __future__ import annotations

import base64
import json
import logging
import secrets
import time

from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from common import settings

log = logging.getLogger("passkeys")

CHALLENGE_TTL_SECONDS = 300

_memory: dict[str, tuple[bytes, float]] = {}
_redis = None


def _store():
    """Redis if available, else the in-process dict. Never both."""
    global _redis
    if _redis is not None:
        return _redis
    try:
        import redis  # imported lazily so the service boots without it

        client = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        client.ping()
        _redis = client
        return _redis
    except Exception as exc:
        log.info("passkey challenges kept in process memory (%s)", exc)
        return None


def _key(handle: str) -> str:
    return f"kaluta:webauthn:{handle}"


def save_challenge(handle: str, challenge: bytes) -> None:
    client = _store()
    if client is not None:
        client.setex(_key(handle), CHALLENGE_TTL_SECONDS, challenge)
        return
    _memory[handle] = (challenge, time.time() + CHALLENGE_TTL_SECONDS)


def take_challenge(handle: str) -> bytes | None:
    """Read and delete — a challenge is valid exactly once."""
    client = _store()
    if client is not None:
        pipeline = client.pipeline()
        pipeline.get(_key(handle))
        pipeline.delete(_key(handle))
        value, _ = pipeline.execute()
        return value

    entry = _memory.pop(handle, None)
    if entry is None:
        return None
    challenge, expires = entry
    return challenge if expires > time.time() else None


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def registration_options(*, user_id: str, handle: str, display_name: str, existing: list[bytes]) -> dict:
    options = generate_registration_options(
        rp_id=settings.WEBAUTHN_RP_ID,
        rp_name=settings.WEBAUTHN_RP_NAME,
        user_id=user_id.encode(),
        user_name=handle,
        user_display_name=display_name,
        # Discoverable credentials let the member sign in without typing an
        # email first, which is the point of a passkey.
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
        exclude_credentials=[PublicKeyCredentialDescriptor(id=cid) for cid in existing],
    )
    save_challenge(f"reg:{user_id}", options.challenge)
    return json.loads(options_to_json(options))


def verify_registration(*, user_id: str, credential: dict) -> tuple[bytes, bytes, int]:
    challenge = take_challenge(f"reg:{user_id}")
    if challenge is None:
        raise ValueError("Registration challenge expired — start again")

    verification = verify_registration_response(
        credential=credential,
        expected_challenge=challenge,
        expected_origin=settings.WEBAUTHN_ORIGIN,
        expected_rp_id=settings.WEBAUTHN_RP_ID,
    )
    return verification.credential_id, verification.credential_public_key, verification.sign_count


def authentication_options(*, handle: str, allow: list[bytes]) -> dict:
    options = generate_authentication_options(
        rp_id=settings.WEBAUTHN_RP_ID,
        allow_credentials=[PublicKeyCredentialDescriptor(id=cid) for cid in allow],
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    save_challenge(f"auth:{handle}", options.challenge)
    return json.loads(options_to_json(options))


def verify_authentication(*, handle: str, credential: dict, public_key: bytes, sign_count: int) -> int:
    challenge = take_challenge(f"auth:{handle}")
    if challenge is None:
        raise ValueError("Sign-in challenge expired — try again")

    verification = verify_authentication_response(
        credential=credential,
        expected_challenge=challenge,
        expected_origin=settings.WEBAUTHN_ORIGIN,
        expected_rp_id=settings.WEBAUTHN_RP_ID,
        credential_public_key=public_key,
        credential_current_sign_count=sign_count,
    )
    return verification.new_sign_count


def new_handle() -> str:
    return secrets.token_urlsafe(12)
