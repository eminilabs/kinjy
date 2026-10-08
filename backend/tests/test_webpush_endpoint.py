"""Where a push may be sent.

A push subscription's endpoint is an address the *member* supplies and this server
then POSTs to. Left unchecked that is request forgery with a friendly name: the
request leaves from inside the private network, from a host that every other
service trusts, and several of those services answer to a bare query string.

So these are not style checks. Each rejected case is a way somebody would aim the
request at the neighbours, and each accepted one is a real browser vendor, which
must keep working or nobody gets a notification.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
for extra in (str(BACKEND), str(BACKEND / "messaging-service")):
    if extra not in sys.path:
        sys.path.insert(0, extra)

import webpush  # noqa: E402


@pytest.mark.parametrize("endpoint", [
    "https://fcm.googleapis.com/fcm/send/abc123:APA91bHxyz",
    "https://fcm.googleapis.com/wp/abc123",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAAAB",
    "https://web.push.apple.com/QGxyz",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
    "https://fcm.googleapis.com:443/fcm/send/abc",
])
def test_real_push_services_are_accepted(endpoint):
    assert webpush.endpoint_allowed(endpoint)


@pytest.mark.parametrize("endpoint", [
    # the neighbours on the private network, the whole point of the check
    "http://commerce-service:8000/internal/orders/ord_1/funded?custody_ref=x",
    "https://commerce-service:8000/internal/orders/ord_1/funded",
    "http://auth-service:8000/internal/age-review/open?user_id=usr_1&source=x",
    "http://localhost:8000/internal/x",
    "http://127.0.0.1:8000/internal/x",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://10.0.0.5/",
    "http://169.254.169.254/latest/meta-data/",
    "https://169.254.169.254/latest/meta-data/",
    "http://postgres:5432/",
    # the right words in the wrong place
    "https://fcm.googleapis.com.evil.example/x",
    "https://evilfcm.googleapis.com/x",
    "https://evil.example/fcm.googleapis.com",
    "https://evil.example/?fcm.googleapis.com",
    "https://evil.example#fcm.googleapis.com",
    "https://fcm.googleapis.com@evil.example/x",
    "https://fcm.googleapis.com:pass@evil.example/x",
    "https://user@fcm.googleapis.com/x",
    "https://evil.example\\@fcm.googleapis.com/x",
    "https://evil.example\\.fcm.googleapis.com/x",
    "https://fcm.googleapis.com./x",
    # not https, or not the default port
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com:8443/fcm/send/abc",
    "ftp://fcm.googleapis.com/x",
    "file:///etc/passwd",
    "//fcm.googleapis.com/x",
    "fcm.googleapis.com/x",
    # shapes a parser might read differently from another
    "https://fcm.googleapis.com/x y",
    "https://fcm.googleapis.com/x\ny",
    "https://fcm.googleapis.com\t.evil.example/x",
    " https://fcm.googleapis.com/x",
    "",
    "https://",
    "https://" + "a" * 2100,
])
def test_anything_else_is_refused(endpoint):
    assert not webpush.endpoint_allowed(endpoint)


def test_a_stored_endpoint_that_is_not_a_push_service_is_never_sent_to(monkeypatch):
    """Rows written before the check existed must not be the way round it."""
    monkeypatch.setattr(webpush.settings, "push_configured", lambda: True)
    monkeypatch.setattr(webpush, "webpush", lambda **_: pytest.fail("a request was made"))
    with pytest.raises(RuntimeError):
        webpush.send({"endpoint": "http://commerce-service:8000/internal/x", "keys": {}}, {"title": "x"})


def test_a_redirect_from_an_allowed_host_is_not_followed(monkeypatch):
    """The session handed to pywebpush refuses redirects, so a 30x cannot bounce the POST inward."""
    seen = {}

    def fake(**kwargs):
        seen["session"] = kwargs["requests_session"]

    monkeypatch.setattr(webpush.settings, "push_configured", lambda: True)
    monkeypatch.setattr(webpush, "webpush", fake)
    webpush.send({"endpoint": "https://fcm.googleapis.com/fcm/send/abc", "keys": {}}, {"title": "x"})
    assert seen["session"].max_redirects == 0
    assert seen["session"].trust_env is False
