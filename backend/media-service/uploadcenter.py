"""Thin client for UploadCenter (https://uploadscenter.com), avatars and covers only.

Only the documented endpoints are used: presign, complete, get and delete a
file. Everything happens server to server: the browser sends its image to
media-service, and neither the API key nor the upload URL ever reach it.
"""
from __future__ import annotations

import logging

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
