"""Profile images (avatars and covers) and the UploadCenter client.

An avatar is shown to every visitor of every page a member appears on, so the
rules here are about what may end up in an <img> tag across the whole site:
only raster images the server has checked, never a format that can carry
script, never a URL the member typed.

Run: python -m pytest backend/tests/test_profile_images.py -q
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "media-service"))
import profileimages  # noqa: E402
import uploadcenter  # noqa: E402

MB = 1024 * 1024

JPEG = bytes.fromhex("ffd8ffe000104a46494600")
PNG = bytes.fromhex("89504e470d0a1a0a0000000d49484452")
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 "


# ---------------------------------------------------------------------------
# What a member may ask to upload
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("purpose,mime", [
    ("avatar", "image/jpeg"), ("avatar", "image/png"), ("avatar", "image/webp"),
    ("cover", "image/jpeg"),
])
def test_raster_images_are_accepted(purpose, mime):
    assert profileimages.check_request(purpose, mime, 200_000) is None


@pytest.mark.parametrize("mime", ["image/svg+xml", "text/html", "image/gif", "application/pdf", ""])
def test_anything_but_jpeg_png_webp_is_refused(mime):
    """SVG in particular: it is an image format that can carry script."""
    assert profileimages.check_request("avatar", mime, 1000) is not None


def test_an_unknown_purpose_is_refused():
    assert profileimages.check_request("banner", "image/png", 1000) is not None


@pytest.mark.parametrize("size", [0, -1])
def test_an_empty_or_negative_size_is_refused(size):
    assert profileimages.check_request("avatar", "image/png", size) is not None


def test_each_purpose_has_its_own_ceiling():
    assert profileimages.check_request("avatar", "image/png", 5 * MB) is None
    assert profileimages.check_request("avatar", "image/png", 5 * MB + 1) is not None
    assert profileimages.check_request("cover", "image/png", 10 * MB) is None
    assert profileimages.check_request("cover", "image/png", 10 * MB + 1) is not None


# ---------------------------------------------------------------------------
# Trusting the bytes, not the declared Content-Type
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("head,mime", [(JPEG, "image/jpeg"), (PNG, "image/png"), (WEBP, "image/webp")])
def test_real_images_are_recognised_from_their_first_bytes(head, mime):
    assert profileimages.sniff(head) == mime


@pytest.mark.parametrize("head", [
    b"<html><script>alert(1)</script>",
    b'<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>',
    b"GIF89a",
    b"\xff\xd8",  # truncated JPEG signature
    b"RIFF\x24\x00\x00\x00WAVE",  # RIFF, but audio
    b"",
])
def test_anything_else_is_not_an_image(head):
    assert profileimages.sniff(head) is None


# ---------------------------------------------------------------------------
# Reading UploadCenter's answer
# ---------------------------------------------------------------------------

def file_out(**overrides):
    base = {
        "id": "f_1", "status": "ready", "url": "https://cdn.example.net/f_1.png",
        "mime_type": "image/png", "size_bytes": 1000, "visibility": "public",
    }
    return {**base, **overrides}


def test_a_file_is_ready_only_with_a_ready_status_and_a_url():
    assert profileimages.is_ready(file_out())
    assert not profileimages.is_ready(file_out(url=None))
    assert not profileimages.is_ready(file_out(status="processing"))
    assert not profileimages.is_ready(file_out(status="scanning"))


def test_a_failed_or_trashed_file_is_final():
    """Observed live: UploadCenter reports status "failed". Treating it as
    still processing would have the client poll forever."""
    assert profileimages.is_failed(file_out(status="failed", url=None))
    assert profileimages.is_failed(file_out(trashed_at="2026-09-28T10:00:00Z"))
    assert not profileimages.is_failed(file_out(status="processing", url=None))
    assert not profileimages.is_failed(file_out())


def test_what_was_stored_must_still_match_the_rules():
    """What UploadCenter reports it stored is checked against the same rules
    the upload request was."""
    assert profileimages.stored_file_problem(file_out(), "avatar") is None
    assert profileimages.stored_file_problem(file_out(mime_type="image/svg+xml"), "avatar")
    assert profileimages.stored_file_problem(file_out(size_bytes=6 * MB), "avatar")
    assert profileimages.stored_file_problem(file_out(visibility="private"), "avatar")


@pytest.mark.parametrize("url", [
    "https://cdn.uploadscenter.com/file_1",
    "https://CDN.uploadscenter.com/file_1",
])
def test_the_cdn_host_is_allowed(url):
    assert profileimages.cdn_url_allowed(url, {"cdn.uploadscenter.com"})


@pytest.mark.parametrize("url", [
    "http://cdn.uploadscenter.com/file_1",              # not https
    "https://cdn.uploadscenter.com.evil.net/file_1",    # suffix trick
    "https://evil.net/?cdn.uploadscenter.com",
    "https://user@evil.net/file_1",
    "javascript:alert(1)",
    "",
    None,
])
def test_anything_else_is_not_redirected_to_or_fetched(url):
    """Stored URLs are redirected to and fetched from: only the CDN qualifies."""
    assert not profileimages.cdn_url_allowed(url, {"cdn.uploadscenter.com"})


NOW = datetime(2026, 9, 28, 12, 0, tzinfo=timezone.utc)


def test_the_first_status_check_goes_straight_to_uploadcenter():
    assert profileimages.status_check_delay(None, 0, NOW) == 0


def test_checks_closer_than_the_interval_are_answered_without_asking():
    delay = profileimages.status_check_delay(NOW - timedelta(seconds=0.5), 3, NOW)
    assert 0 < delay <= profileimages.STATUS_CHECK_INTERVAL.total_seconds()


def test_a_check_after_the_interval_asks_again():
    assert profileimages.status_check_delay(NOW - profileimages.STATUS_CHECK_INTERVAL, 3, NOW) == 0


def test_an_upload_that_is_never_ready_stops_being_checked():
    """Bounds what one upload can cost in calls to UploadCenter."""
    assert profileimages.status_check_delay(None, profileimages.MAX_STATUS_CHECKS, NOW) is None


def test_a_presigned_storage_url_may_be_uploaded_to():
    url = "https://abc123.r2.cloudflarestorage.com/bucket/file_1?X-Amz-Signature=deadbeef"
    assert profileimages.upload_url_allowed(url)


@pytest.mark.parametrize("url", [
    "http://user-service:8000/internal/users/usr_1",   # the private network is plain http
    "http://169.254.169.254/latest/meta-data/",
    "https://user:secret@storage.example/file_1",
    "file:///etc/passwd",
    "https:///no-host",
    "",
    None,
])
def test_the_bytes_are_never_sent_anywhere_else(url):
    """The upload URL comes from UploadCenter; a bad one must not turn
    media-service into a client for the private network."""
    assert not profileimages.upload_url_allowed(url)


# ---------------------------------------------------------------------------
# The UploadCenter client
# ---------------------------------------------------------------------------

@pytest.fixture
def api(monkeypatch):
    """Route the client through an in-memory transport and record the calls."""
    calls: list[httpx.Request] = []
    responses: dict[tuple[str, str], httpx.Response] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return responses.get((request.method, request.url.path), httpx.Response(404, json={"detail": "nope"}))

    monkeypatch.setattr(uploadcenter.settings, "UPLOADCENTER_API_KEY", "sk_test_123")
    monkeypatch.setattr(uploadcenter.settings, "UPLOADCENTER_PROJECT_ID", "prj_1")
    monkeypatch.setattr(uploadcenter.settings, "UPLOADCENTER_API_BASE", "https://api.test")
    monkeypatch.setattr(
        uploadcenter, "_http",
        lambda: httpx.Client(base_url="https://api.test", transport=httpx.MockTransport(handler)),
    )
    return calls, responses


def test_the_client_is_disabled_without_a_key(monkeypatch):
    monkeypatch.setattr(uploadcenter.settings, "UPLOADCENTER_API_KEY", "")
    monkeypatch.setattr(uploadcenter.settings, "UPLOADCENTER_PROJECT_ID", "prj_1")
    assert not uploadcenter.enabled()


def test_the_client_is_disabled_without_a_project(monkeypatch):
    monkeypatch.setattr(uploadcenter.settings, "UPLOADCENTER_API_KEY", "sk_test_123")
    monkeypatch.setattr(uploadcenter.settings, "UPLOADCENTER_PROJECT_ID", "")
    assert not uploadcenter.enabled()


def test_presign_sends_the_key_and_the_project(api):
    calls, responses = api
    responses[("POST", "/v1/uploads/presign")] = httpx.Response(
        201, json={"file_id": "f_1", "upload_url": "https://up.test/f_1", "expires_in": 600},
    )
    result = uploadcenter.presign("me.png", 1000, "image/png", visibility="public")

    assert result["file_id"] == "f_1"
    sent = calls[0]
    assert sent.headers["authorization"] == "Bearer sk_test_123"
    assert json.loads(sent.content) == {
        "project_id": "prj_1", "filename": "me.png", "size_bytes": 1000,
        "mime_type": "image/png", "visibility": "public",
    }


def test_complete_and_get_file_hit_the_documented_paths(api):
    calls, responses = api
    responses[("POST", "/v1/uploads/complete")] = httpx.Response(200, json=file_out())
    responses[("GET", "/v1/files/f_1")] = httpx.Response(200, json=file_out())

    assert uploadcenter.complete("f_1")["id"] == "f_1"
    assert uploadcenter.get_file("f_1")["id"] == "f_1"
    assert json.loads(calls[0].content) == {"file_id": "f_1"}


def test_delete_accepts_a_204(api):
    _, responses = api
    responses[("DELETE", "/v1/files/f_1")] = httpx.Response(204)
    uploadcenter.delete_file("f_1")


def test_an_error_status_becomes_an_uploadcenter_error_without_leaking_the_key(api):
    _, responses = api
    responses[("POST", "/v1/uploads/presign")] = httpx.Response(402, json={"detail": "quota exceeded"})
    with pytest.raises(uploadcenter.UploadCenterError) as caught:
        uploadcenter.presign("me.png", 1000, "image/png")
    assert caught.value.status == 402
    assert "sk_test_123" not in str(caught.value)


def test_put_bytes_sends_the_file_without_the_api_key(monkeypatch):
    """The upload URL is a presigned storage URL: it needs no key, and must not
    receive one (it is a different host from the API)."""
    seen = {}

    def handler(request):
        seen.update(auth=request.headers.get("authorization"), type=request.headers.get("content-type"),
                    body=request.content, method=request.method)
        return httpx.Response(200)

    monkeypatch.setattr(uploadcenter.settings, "UPLOADCENTER_API_KEY", "sk_test_123")
    monkeypatch.setattr(uploadcenter, "_cdn_http", lambda: httpx.Client(transport=httpx.MockTransport(handler)))
    uploadcenter.put_bytes("https://bucket.r2.test/f_1?sig=x", PNG, "image/png")

    assert seen == {"auth": None, "type": "image/png", "body": PNG, "method": "PUT"}


def test_put_bytes_failure_is_an_uploadcenter_error(monkeypatch):
    monkeypatch.setattr(
        uploadcenter, "_cdn_http",
        lambda: httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(403))),
    )
    with pytest.raises(uploadcenter.UploadCenterError) as caught:
        uploadcenter.put_bytes("https://bucket.r2.test/f_1", PNG, "image/png")
    assert caught.value.status == 403


def test_read_head_asks_for_the_first_bytes_only(monkeypatch):
    seen = {}

    def handler(request):
        seen["range"] = request.headers.get("range")
        return httpx.Response(206, content=PNG)

    monkeypatch.setattr(
        uploadcenter, "_cdn_http",
        lambda: httpx.Client(transport=httpx.MockTransport(handler)),
    )
    assert uploadcenter.read_head("https://cdn.uploadscenter.com/f_1").startswith(PNG[:8])
    assert seen["range"] == "bytes=0-31"


def test_read_head_failure_is_an_uploadcenter_error(monkeypatch):
    monkeypatch.setattr(
        uploadcenter, "_cdn_http",
        lambda: httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(404))),
    )
    with pytest.raises(uploadcenter.UploadCenterError):
        uploadcenter.read_head("https://cdn.uploadscenter.com/f_1")


def test_a_network_failure_becomes_an_uploadcenter_error(monkeypatch, api):
    def broken():
        def handler(request):
            raise httpx.ConnectError("down", request=request)
        return httpx.Client(base_url="https://api.test", transport=httpx.MockTransport(handler))

    monkeypatch.setattr(uploadcenter, "_http", broken)
    with pytest.raises(uploadcenter.UploadCenterError) as caught:
        uploadcenter.get_file("f_1")
    assert caught.value.status is None
