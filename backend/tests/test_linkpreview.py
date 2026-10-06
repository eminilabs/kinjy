"""Where a link preview may and may not send a request.

This is the test that matters most in the feature. An endpoint that fetches a
URL a member chose is request forgery with a friendly name: the request leaves
from inside the private network, from a host that every other service trusts,
and the answer is handed back to the member as a "preview".

So these are not style checks. Each one is a way somebody would try to reach
the metadata endpoint or a neighbouring service.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
for extra in (str(BACKEND), str(BACKEND / "social-service")):
    if extra not in sys.path:
        sys.path.insert(0, extra)

import linkpreview  # noqa: E402


def refuses(url, monkeypatch=None):
    with pytest.raises(linkpreview.UnsafeURL):
        linkpreview.check(url)


def test_only_http_and_https():
    for url in (
        "file:///etc/passwd",
        "gopher://127.0.0.1:11211/_stats",
        "data:text/html,<title>hi</title>",
        "ftp://example.com/x",
        # A scheme the parser does not know must not fall through as allowed.
        "jar:http://example.com!/",
    ):
        refuses(url)


def test_the_cloud_metadata_endpoint(monkeypatch):
    """169.254.169.254 is the single most valuable address to reach from here:
    on most clouds it hands out the machine's own credentials."""
    monkeypatch.setattr(linkpreview, "_addresses", lambda host: ["169.254.169.254"])
    refuses("http://169.254.169.254/latest/meta-data/")
    refuses("http://metadata.example.com/latest/meta-data/")


def test_the_private_network(monkeypatch):
    for address in ("127.0.0.1", "10.0.0.5", "172.16.3.9", "192.168.1.1", "0.0.0.0", "::1", "fc00::1"):
        monkeypatch.setattr(linkpreview, "_addresses", lambda host, a=address: [a])
        refuses(f"http://whatever.example.com/")


def test_a_name_that_resolves_to_both(monkeypatch):
    """One private answer among several is enough to land inside the network,
    so every address has to be public, not just the first."""
    monkeypatch.setattr(linkpreview, "_addresses", lambda host: ["93.184.216.34", "127.0.0.1"])
    refuses("http://split-horizon.example.com/")


def test_a_public_address_is_allowed(monkeypatch):
    monkeypatch.setattr(linkpreview, "_addresses", lambda host: ["93.184.216.34"])
    host, address = linkpreview.check("https://example.com/article")
    assert host == "example.com"
    assert address == "93.184.216.34"


def test_credentials_in_the_url(monkeypatch):
    """A URL carrying credentials makes the preview request as somebody else."""
    monkeypatch.setattr(linkpreview, "_addresses", lambda host: ["93.184.216.34"])
    refuses("https://user:secret@example.com/")


def test_internal_service_names(monkeypatch):
    """The private network is addressed by name here, not by IP: a bare
    service name is exactly what a post would contain to reach one."""
    monkeypatch.setattr(linkpreview, "_addresses", lambda host: ["172.19.0.4"])
    refuses("http://auth-service:8000/internal/users/usr_1")


def test_the_card_comes_out_of_the_markup():
    html = """
      <html><head>
        <meta property="og:title" content="A headline &amp; a half">
        <meta property="og:description" content="What the page is about.">
        <meta property="og:image" content="/img/cover.png">
        <meta property="og:site_name" content="Example News">
        <title>Ignored because og:title wins</title>
      </head></html>
    """
    card = linkpreview.parse(html, "https://example.com/story")
    assert card["title"] == "A headline & a half"
    assert card["description"] == "What the page is about."
    # A relative og:image is common and is otherwise a broken thumbnail.
    assert card["image"] == "https://example.com/img/cover.png"
    assert card["site_name"] == "Example News"


def test_attributes_in_either_order():
    """`content` before `property` is common enough that missing it loses
    previews for real sites."""
    html = '<meta content="Backwards but valid" property="og:title">'
    assert linkpreview.parse(html, "https://example.com/")["title"] == "Backwards but valid"


def test_the_title_tag_is_the_fallback():
    card = linkpreview.parse("<html><head><title>  Just a title  </title></head>", "https://example.com/")
    assert card["title"] == "Just a title"


def test_an_image_on_a_private_address_is_dropped(monkeypatch):
    """Same hole, different machine: a private og:image would have the
    *member's browser* make that request instead of ours."""
    monkeypatch.setattr(linkpreview, "_addresses", lambda host: ["127.0.0.1"])
    card = linkpreview.parse(
        '<meta property="og:image" content="http://router.local/admin.png">',
        "https://example.com/",
    )
    assert card["image"] is None


def test_nothing_is_longer_than_the_column():
    html = (
        f'<meta property="og:title" content="{"t" * 500}">'
        f'<meta property="og:description" content="{"d" * 2000}">'
    )
    card = linkpreview.parse(html, "https://example.com/")
    assert len(card["title"]) <= 200
    assert len(card["description"]) <= 400
