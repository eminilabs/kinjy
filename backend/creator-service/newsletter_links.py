"""The pure parts of the newsletter feature: signed links, and the shape of a newsletter's text.

No database and no network, so they can be tested alone - and so that a bug in a link's signature, which
decides who may confirm or cancel whose subscription, is not buried among the routes.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import re
import time
from datetime import timedelta

from common import settings

CONFIRM_VALID_FOR = timedelta(days=14)


def _key() -> bytes:
    return hmac.new(settings.JWT_SECRET.encode("utf-8"), b"kinjy-newsletter-v1", hashlib.sha256).digest()


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def sign(subscriber_id: str, purpose: str, issued: int | None = None) -> str:
    """``<subscriber>.<issued>.<signature>``. A confirmation carries the time it was issued, and expires;
    an unsubscribe carries 0, and never does."""
    if issued is None:
        issued = int(time.time()) if purpose == "confirm" else 0
    mac = hmac.new(_key(), f"{purpose}\x00{subscriber_id}\x00{issued}".encode(), hashlib.sha256).digest()
    return f"{subscriber_id}.{issued}.{_b64(mac)}"


def verify(token: str, purpose: str, now: float | None = None) -> str | None:
    """The subscriber id a link is for, or None. Constant-time; and the purpose is part of what was signed,
    so a confirmation link cannot be used to unsubscribe, or the other way round."""
    try:
        subscriber_id, issued_text, signature = token.split(".")
        issued = int(issued_text)
    except (ValueError, AttributeError):
        return None
    expected = sign(subscriber_id, purpose, issued).rsplit(".", 1)[1]
    if not hmac.compare_digest(expected, signature):
        return None
    if purpose == "confirm" and (now if now is not None else time.time()) - issued > CONFIRM_VALID_FOR.total_seconds():
        return None
    return subscriber_id


def link(path: str, token: str) -> str:
    return f"{settings.GATEWAY_URL.rstrip('/')}/api/creators/newsletter/{path}?token={token}"


def mask(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:1]}***@{domain}"


_FOOTER_OF_THE_STUDIO = re.compile(r"\n+—\nSent to your subscribers on Kinjy\.\s*$")


def split_newsletter(content: str) -> tuple[str, str]:
    """A Studio newsletter's subject and body: its first line is ``Subject: ...``, and the Studio's own
    closing line is dropped (every mail gets the real footer, with the way out)."""
    first, _, rest = content.partition("\n")
    subject = first[len("Subject:"):].strip() if first.startswith("Subject:") else first.strip()
    return subject[:200], _FOOTER_OF_THE_STUDIO.sub("", rest.strip()).strip()
