"""Short-lived, viewer-bound tickets for media bytes.

The hole this closes: ``GET /media/{asset_id}`` served the file to anyone who
knew the id. The id is unguessable, which is not the same as protected — it is
copied into a chat window, pasted into a group, or read out of a page's source
by anybody who can already see one post, and from then on it is a permanent
public URL with no age check in front of it.

A ticket is an HMAC over *what* is being fetched, *who* may fetch it and *when
it stops working*. It is minted only by a service that has already decided the
viewer may see the thing, so the age decision happens once, in the engine, and
the media origin only has to check arithmetic.

**What this does and does not defend.** Within the ticket's lifetime a copied
URL works for whoever holds it, unless they are signed in as somebody else — a
bearer token that disagrees with the ticket is rejected outright. So pasting a
link into a friend's logged-in browser fails immediately; pasting it into a
private window works until it expires. Shortening that window is the lever, and
it is a setting rather than a constant for that reason.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import time

from common import settings

# Minted tickets are valid for this long. Short enough that a leaked URL is a
# nuisance rather than a permanent bypass, long enough that a slow connection
# finishes a video it started. A player that outlives it re-fetches the post.
DEFAULT_TTL_SECONDS = 300

# Derived from the platform secret rather than adding another one to rotate.
# A distinct label means rotating the JWT secret invalidates tickets too, which
# is the behaviour you want: both are "this server said so".
_KEY_LABEL = b"kinjy-media-ticket-v1"


def _key() -> bytes:
    return hmac.new(
        settings.JWT_SECRET.encode("utf-8"), _KEY_LABEL, hashlib.sha256
    ).digest()


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _sign(asset_id: str, viewer: str, expires: int) -> str:
    # The separator is not part of any field, so ("ab", "c") and ("a", "bc")
    # cannot produce the same message. Without it the signature is ambiguous.
    message = "\x00".join((asset_id, viewer, str(expires))).encode("utf-8")
    return _b64(hmac.new(_key(), message, hashlib.sha256).digest())


def mint(asset_id: str, viewer_id: str | None, *, ttl: int = DEFAULT_TTL_SECONDS) -> dict:
    """A ticket for one asset and one viewer.

    ``viewer_id`` of None means a signed-out visitor, which is a real audience
    for public media. It is bound as the literal "anon" so an anonymous ticket
    cannot be replayed as somebody's authenticated one.
    """
    viewer = viewer_id or "anon"
    expires = int(time.time()) + max(30, ttl)
    return {"v": viewer, "e": str(expires), "s": _sign(asset_id, viewer, expires)}


def query_string(asset_id: str, viewer_id: str | None, *, ttl: int = DEFAULT_TTL_SECONDS) -> str:
    t = mint(asset_id, viewer_id, ttl=ttl)
    return f"v={t['v']}&e={t['e']}&s={t['s']}"


def sign_url(url: str, asset_id: str, viewer_id: str | None, *, ttl: int = DEFAULT_TTL_SECONDS) -> str:
    """Append a ticket to a stored media URL."""
    joiner = "&" if "?" in url else "?"
    return f"{url}{joiner}{query_string(asset_id, viewer_id, ttl=ttl)}"


def verify(
    asset_id: str,
    viewer: str | None,
    expires: str | None,
    signature: str | None,
    *,
    authenticated_as: str | None = None,
    now: int | None = None,
) -> tuple[bool, str]:
    """Check a ticket. Returns ``(ok, reason)``.

    ``authenticated_as`` is the subject of the bearer token when the request
    carried one. A signed-in caller whose identity disagrees with the ticket is
    refused: that is the case of a link copied into somebody else's session,
    and it is the one worth catching even though the anonymous case cannot be.
    """
    if not signature or not expires or viewer is None:
        return False, "missing_ticket"

    try:
        deadline = int(expires)
    except (TypeError, ValueError):
        return False, "bad_ticket"

    if (now or int(time.time())) > deadline:
        return False, "expired"

    expected = _sign(asset_id, viewer, deadline)
    # Constant time: a fast rejection leaks which prefix was right.
    if not hmac.compare_digest(expected, signature):
        return False, "bad_signature"

    if authenticated_as and viewer != "anon" and authenticated_as != viewer:
        return False, "wrong_viewer"

    return True, "ok"
