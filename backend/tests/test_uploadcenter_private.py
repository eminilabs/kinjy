"""The parts of the UploadCenter client that post media relies on.

Run: python -m pytest backend/tests/test_uploadcenter_private.py -q

No network: UploadCenter's answers are stubbed. Their real behaviour (a fixed
900 s link usable by anyone, a DELETE that only trashes for 30 days) is measured
in e2e_post_media_uploadcenter.py and written up in uploadcenter.py.
"""
from __future__ import annotations

import sys
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "media-service"))
import uploadcenter  # noqa: E402

REAL_CLIENT = httpx.Client
MB = 1024 * 1024


def stub_client(monkeypatch, handler):
    """Make uploadcenter build its httpx clients on a stub transport."""
    monkeypatch.setattr(
        uploadcenter.httpx,
        "Client",
        lambda **kwargs: REAL_CLIENT(transport=httpx.MockTransport(handler), **{k: v for k, v in kwargs.items() if k != "transport"}),
    )


# --- signed_url ----------------------------------------------------------------

def test_a_signed_link_comes_with_the_lifetime_the_service_gave(monkeypatch):
    monkeypatch.setattr(uploadcenter, "_call", lambda *a, **k: {"url": "https://r2.example/f?sig=abc", "expires_in": 900})
    assert uploadcenter.signed_url("file_1") == ("https://r2.example/f?sig=abc", 900)


@pytest.mark.parametrize("answer", [
    {"url": "http://r2.example/f"},       # not https
    {"url": None, "expires_in": 900},     # a public-looking record with no link
    {"expires_in": 900},                  # missing
    {"url": 12345, "expires_in": 900},    # wrong type
])
def test_an_unusable_link_is_refused(monkeypatch, answer):
    monkeypatch.setattr(uploadcenter, "_call", lambda *a, **k: answer)
    with pytest.raises(uploadcenter.UploadCenterError):
        uploadcenter.signed_url("file_1")


@pytest.mark.parametrize("lifetime", [None, 0, -5, "soon"])
def test_a_missing_lifetime_is_treated_as_short_not_long(monkeypatch, lifetime):
    monkeypatch.setattr(uploadcenter, "_call", lambda *a, **k: {"url": "https://r2.example/f", "expires_in": lifetime})
    assert uploadcenter.signed_url("file_1")[1] == 60


# --- wait_until_ready ----------------------------------------------------------

def feed(monkeypatch, statuses):
    answers = iter(statuses)
    monkeypatch.setattr(uploadcenter, "get_file", lambda file_id: {"status": next(answers)})
    monkeypatch.setattr(uploadcenter.time, "sleep", lambda seconds: None)


def test_it_waits_through_processing_until_ready(monkeypatch):
    feed(monkeypatch, ["processing", "processing", "ready"])
    assert uploadcenter.wait_until_ready("file_1", MB)["status"] == "ready"


@pytest.mark.parametrize("verdict", ["failed", "rejected", "infected", "blocked"])
def test_a_refused_file_is_a_422(monkeypatch, verdict):
    feed(monkeypatch, ["processing", verdict])
    with pytest.raises(uploadcenter.UploadCenterError) as caught:
        uploadcenter.wait_until_ready("file_1", MB)
    assert caught.value.status == 422


def test_a_file_that_never_finishes_is_a_504(monkeypatch):
    clock = iter(range(0, 10_000, 40))  # each look at the clock is 40 s later
    monkeypatch.setattr(uploadcenter.time, "monotonic", lambda: next(clock))
    feed(monkeypatch, ["processing"] * 100)
    with pytest.raises(uploadcenter.UploadCenterError) as caught:
        uploadcenter.wait_until_ready("file_1", MB)
    assert caught.value.status == 504


def test_a_bigger_file_is_given_longer_but_not_forever():
    small = uploadcenter.READY_BASE_SECONDS + uploadcenter.READY_PER_MB_SECONDS * 1
    huge = min(uploadcenter.READY_MAX_SECONDS, uploadcenter.READY_BASE_SECONDS + uploadcenter.READY_PER_MB_SECONDS * 200)
    assert small < huge <= uploadcenter.READY_MAX_SECONDS


# --- put_file ------------------------------------------------------------------

def test_a_file_is_streamed_with_its_length_declared(monkeypatch, tmp_path):
    path = tmp_path / "clip.bin"
    path.write_bytes(b"\xab" * (3 * MB + 17))
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["length"] = request.headers.get("content-length")
        seen["type"] = request.headers.get("content-type")
        seen["chunked"] = "transfer-encoding" in request.headers
        seen["body"] = request.read()
        seen["auth"] = request.headers.get("authorization")
        return httpx.Response(200)

    stub_client(monkeypatch, handler)
    uploadcenter.put_file("https://r2.example/put?sig=1", str(path), 3 * MB + 17, "video/mp4")
    assert seen["length"] == str(3 * MB + 17)
    assert not seen["chunked"], "the storage refuses a chunked PUT"
    assert seen["type"] == "video/mp4"
    assert seen["body"] == path.read_bytes()
    assert seen["auth"] is None, "the API key must never go to the storage host"


def test_a_storage_refusal_is_an_error_with_its_status(monkeypatch, tmp_path):
    path = tmp_path / "a.bin"
    path.write_bytes(b"x" * 10)
    stub_client(monkeypatch, lambda request: httpx.Response(403, text="SignatureDoesNotMatch"))
    with pytest.raises(uploadcenter.UploadCenterError) as caught:
        uploadcenter.put_file("https://r2.example/put", str(path), 10, "image/png")
    assert caught.value.status == 403


def test_an_unreachable_storage_is_an_error(monkeypatch, tmp_path):
    path = tmp_path / "a.bin"
    path.write_bytes(b"x" * 10)

    def boom(request):
        raise httpx.ConnectError("no route")

    stub_client(monkeypatch, boom)
    with pytest.raises(uploadcenter.UploadCenterError):
        uploadcenter.put_file("https://r2.example/put", str(path), 10, "image/png")


# --- open_stream ---------------------------------------------------------------

def test_a_range_is_passed_on_and_no_key_goes_with_it(monkeypatch):
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["range"] = request.headers.get("range")
        seen["auth"] = request.headers.get("authorization")
        return httpx.Response(206, content=b"0123456789", headers={"content-range": "bytes 0-9/100"})

    stub_client(monkeypatch, handler)
    client, response = uploadcenter.open_stream("https://r2.example/get?sig=1", "bytes=0-9")
    try:
        assert response.status_code == 206 and response.read() == b"0123456789"
    finally:
        response.close()
        client.close()
    assert seen == {"range": "bytes=0-9", "auth": None}


def test_a_redirect_is_not_followed(monkeypatch):
    hits = []

    def handler(request: httpx.Request) -> httpx.Response:
        hits.append(str(request.url))
        return httpx.Response(302, headers={"location": "http://user-service:8000/internal/anything"})

    stub_client(monkeypatch, handler)
    client, response = uploadcenter.open_stream("https://r2.example/get?sig=1")
    try:
        assert response.status_code == 302
    finally:
        response.close()
        client.close()
    assert hits == ["https://r2.example/get?sig=1"], "a signed link has no business sending us elsewhere"


def test_an_unreachable_host_is_an_error(monkeypatch):
    def boom(request):
        raise httpx.ConnectError("no route")

    stub_client(monkeypatch, boom)
    with pytest.raises(uploadcenter.UploadCenterError):
        uploadcenter.open_stream("https://r2.example/get")
