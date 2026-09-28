"""Rules for avatars and covers. Pure: no I/O, so every rule is unit-tested.

An avatar ends up in an <img> tag on every page its owner appears on. The rules
therefore decide what the whole site may render: raster formats only (SVG can
carry script), a size ceiling per purpose, and checks on the bytes themselves
rather than on the Content-Type a client chose to declare.
"""
from __future__ import annotations

from urllib.parse import urlsplit

MB = 1024 * 1024

LIMITS = {"avatar": 5 * MB, "cover": 10 * MB}
ALLOWED_TYPES = ("image/jpeg", "image/png", "image/webp")

# UploadCenter does not publish its status values. "ready" is the one its docs
# name; "failed" was observed live. Anything else is treated as still in
# progress, and the client stops polling after a bounded number of attempts.
READY_STATUS = "ready"
FAILED_STATUSES = {"failed"}


def check_request(purpose: str, mime_type: str, size_bytes: int) -> str | None:
    """Why this upload request is refused, or None if it is acceptable."""
    if purpose not in LIMITS:
        return f"purpose must be one of: {', '.join(LIMITS)}"
    if mime_type not in ALLOWED_TYPES:
        return "Only JPEG, PNG or WebP images are accepted"
    if size_bytes <= 0:
        return "The file is empty"
    if size_bytes > LIMITS[purpose]:
        return f"An image for your {purpose} must be at most {LIMITS[purpose] // MB} MB"
    return None


def sniff(head: bytes) -> str | None:
    """The image type the first bytes actually are, or None."""
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return None


def cdn_url_allowed(url: str | None, hosts: set[str]) -> bool:
    """Whether a stored URL may be redirected to or fetched from.

    A URL this service redirects visitors to, or fetches from itself, must be
    https on one of the configured CDN hosts, compared exactly: no suffix
    matching, no credentials in the authority.
    """
    if not url:
        return False
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    if parts.scheme != "https" or parts.username or parts.password:
        return False
    return (parts.hostname or "").lower() in {host.lower() for host in hosts}


def is_ready(file_out: dict) -> bool:
    return file_out.get("status") == READY_STATUS and bool(file_out.get("url"))


def is_failed(file_out: dict) -> bool:
    return file_out.get("status") in FAILED_STATUSES or bool(file_out.get("trashed_at"))


def stored_file_problem(file_out: dict, purpose: str) -> str | None:
    """Check what UploadCenter says it stored against the same rules.

    The browser uploads straight to UploadCenter, so this service never sees the
    bytes. The declared size and type at presign time are a promise; this is
    where it is checked.
    """
    if file_out.get("visibility") != "public":
        return "The stored file is not public"
    return check_request(purpose, file_out.get("mime_type") or "", int(file_out.get("size_bytes") or 0))
