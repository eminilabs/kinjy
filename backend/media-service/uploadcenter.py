"""Thin client for UploadCenter (https://uploadscenter.com), avatars and covers only.

Only the documented endpoints are used: presign, complete, get and delete a
file. Everything happens server to server: the browser sends its image to
media-service, and neither the API key nor the upload URL ever reach it.
"""
from __future__ import annotations

import logging
import time

import httpx

from common import settings

log = logging.getLogger("media-service.uploadcenter")

TIMEOUT_SECONDS = 15
HEAD_BYTES = 32


class UploadCenterError(Exception):
    """A failed call. ``status`` is the HTTP status, or None for a network error."""

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


def enabled() -> bool:
    return bool(settings.UPLOADCENTER_API_KEY and settings.UPLOADCENTER_PROJECT_ID)


def cdn_hosts() -> set[str]:
    return {host.strip() for host in settings.UPLOADCENTER_CDN_HOSTS.split(",") if host.strip()}


def _http() -> httpx.Client:
    return httpx.Client(base_url=settings.UPLOADCENTER_API_BASE, timeout=TIMEOUT_SECONDS)


def _cdn_http() -> httpx.Client:
    # No API key here: the CDN serves public files and never needs it.
    return httpx.Client(timeout=TIMEOUT_SECONDS, follow_redirects=False)


def put_bytes(upload_url: str, data: bytes, mime_type: str) -> None:
    """Send the file to the presigned storage URL returned by presign().

    Done from this service rather than from the browser: UploadCenter's storage
    (Cloudflare R2) answers CORS preflights with 403, so a browser cannot PUT
    to it. The URL carries its own signature; no API key goes with it.
    """
    try:
        with _cdn_http() as client:
            response = client.put(upload_url, content=data, headers={"Content-Type": mime_type})
    except httpx.HTTPError as exc:
        raise UploadCenterError("The file storage service is unreachable") from exc
    if response.status_code >= 300:
        log.warning("uploadcenter storage PUT -> %s: %s", response.status_code, response.text[:300])
        raise UploadCenterError(
            f"The file storage refused the upload ({response.status_code})", status=response.status_code,
        )


def read_head(url: str) -> bytes:
    """The first bytes of a stored public file, to check what it really is.

    Confirms that what the CDN serves is the image that was sent. The caller
    must have checked the URL against cdn_hosts() first.
    """
    head = b""
    try:
        with _cdn_http() as client:
            with client.stream("GET", url, headers={"Range": f"bytes=0-{HEAD_BYTES - 1}"}) as response:
                if response.status_code not in (200, 206):
                    raise UploadCenterError("The stored image could not be read back", status=response.status_code)
                for chunk in response.iter_bytes():
                    head += chunk
                    if len(head) >= HEAD_BYTES:
                        break
    except httpx.HTTPError as exc:
        raise UploadCenterError("The stored image could not be read back") from exc
    return head[:HEAD_BYTES]


def _call(method: str, path: str, body: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {settings.UPLOADCENTER_API_KEY}"}
    try:
        with _http() as client:
            response = client.request(method, path, json=body, headers=headers)
    except httpx.HTTPError as exc:
        log.warning("uploadcenter %s %s unreachable: %s", method, path, type(exc).__name__)
        raise UploadCenterError("The file storage service is unreachable") from exc

    if response.status_code >= 400:
        log.warning("uploadcenter %s %s -> %s: %s", method, path, response.status_code, response.text[:300])
        raise UploadCenterError(
            f"The file storage service refused the request ({response.status_code})",
            status=response.status_code,
        )
    return response.json() if response.content else {}


def presign(filename: str, size_bytes: int, mime_type: str, visibility: str = "public") -> dict:
    """Returns ``{file_id, upload_url, expires_in}``."""
    return _call("POST", "/v1/uploads/presign", {
        "project_id": settings.UPLOADCENTER_PROJECT_ID,
        "filename": filename,
        "size_bytes": size_bytes,
        "mime_type": mime_type,
        "visibility": visibility,
    })


def complete(file_id: str) -> dict:
    """Starts UploadCenter's antivirus scan; returns its FileOut record."""
    return _call("POST", "/v1/uploads/complete", {"file_id": file_id})


def get_file(file_id: str) -> dict:
    return _call("GET", f"/v1/files/{file_id}")


def delete_file(file_id: str) -> None:
    _call("DELETE", f"/v1/files/{file_id}")


# --- private files -------------------------------------------------------------
#
# Post media lives here as ``private``: no public CDN address exists for it (the
# record's ``url`` is null), and the only way to read it is a signed link from
# GET /v1/files/{id}/url. Measured against the live API, that link:
#   - lasts 900 seconds, whatever is asked: expires_in, expires, ttl, expiry and
#     expires_in_seconds are all ignored;
#   - is an ordinary presigned R2 URL, usable by anyone who holds it, with no
#     API key, no cookie, and no binding to a member or an address;
#   - answers Range requests, and forces ``Content-Disposition: attachment``.
#
# A link like that must never leave the server. media-service signs it, fetches
# the bytes itself and relays them, so the only thing a member ever holds is the
# viewer-bound ticket (common/mediasign.py) that expires in minutes.

# What the upload may take, per megabyte, before it is given up on: the scan
# UploadCenter runs after complete() grows with the file.
READY_BASE_SECONDS = 30
READY_PER_MB_SECONDS = 0.3
READY_MAX_SECONDS = 180


# The whole PUT, not each write: a storage that accepts a byte now and then would
# otherwise hold the upload (and its worker thread) for as long as it likes.
PUT_MAX_SECONDS = 900


def _chunks(path: str, deadline: float, chunk_size: int = 1024 * 1024):
    with open(path, "rb") as source:
        while chunk := source.read(chunk_size):
            if time.monotonic() > deadline:
                raise UploadCenterError("The file storage took too long to accept the file", status=504)
            yield chunk


def put_file(upload_url: str, path: str, size_bytes: int, mime_type: str) -> None:
    """Stream a file from disk to the presigned storage URL.

    put_bytes() takes the whole file as ``bytes``: fine for an avatar, not for
    200 MB of video. The length is declared up front because the storage
    refuses a chunked PUT.
    """
    try:
        with httpx.Client(timeout=httpx.Timeout(60.0, connect=10.0), follow_redirects=False) as client:
            response = client.put(
                upload_url,
                content=_chunks(path, time.monotonic() + PUT_MAX_SECONDS),
                headers={"Content-Type": mime_type, "Content-Length": str(size_bytes)},
            )
    except httpx.HTTPError as exc:
        raise UploadCenterError("The file storage service is unreachable") from exc
    if response.status_code >= 300:
        log.warning("uploadcenter storage PUT -> %s: %s", response.status_code, response.text[:300])
        raise UploadCenterError(
            f"The file storage refused the upload ({response.status_code})", status=response.status_code,
        )


def wait_until_ready(file_id: str, size_bytes: int) -> dict:
    """Poll the file until UploadCenter's checks finish.

    Returns the final record. Raises UploadCenterError if the file ends up
    ``failed`` (their scan refused it) or is not ready in time; the caller
    deletes the remote file in both cases, so nothing is left half-stored.
    """
    deadline = time.monotonic() + min(READY_MAX_SECONDS, READY_BASE_SECONDS + READY_PER_MB_SECONDS * size_bytes / (1024 * 1024))
    delay = 0.5
    while True:
        record = get_file(file_id)
        status = record.get("status")
        if status == "ready":
            return record
        if status in ("failed", "rejected", "infected", "blocked"):
            raise UploadCenterError(f"The file storage refused the file ({status})", status=422)
        if time.monotonic() >= deadline:
            raise UploadCenterError("The file storage did not finish checking the file in time", status=504)
        time.sleep(delay)
        delay = min(delay * 1.5, 3.0)


def signed_url(file_id: str) -> tuple[str, int]:
    """A fresh signed link for a private file, and how long it lives (seconds).

    The lifetime is the service's, not ours; callers must treat it as given.
    """
    data = _call("GET", f"/v1/files/{file_id}/url")
    url = data.get("url")
    if not isinstance(url, str) or not url.startswith("https://"):
        raise UploadCenterError("The file storage returned no usable link")
    try:
        lifetime = int(data.get("expires_in") or 0)
    except (TypeError, ValueError):
        lifetime = 0
    # An answer without a lifetime is treated as short rather than as long.
    return url, lifetime if lifetime > 0 else 60


def open_stream(url: str, range_header: str | None = None) -> tuple[httpx.Client, httpx.Response]:
    """Start a streamed GET of a signed link. The caller closes both.

    No API key goes with it (the link carries its own signature) and redirects
    are not followed: a signed link has no business answering with one.
    """
    client = httpx.Client(timeout=httpx.Timeout(30.0, connect=10.0), follow_redirects=False)
    try:
        # identity: the bytes are relayed as they are, and a gzip body would reach
        # the viewer without the header that says so.
        headers = {"Accept-Encoding": "identity"}
        if range_header:
            headers["Range"] = range_header
        request = client.build_request("GET", url, headers=headers)
        return client, client.send(request, stream=True)
    except httpx.HTTPError as exc:
        client.close()
        raise UploadCenterError("The file storage service is unreachable") from exc
