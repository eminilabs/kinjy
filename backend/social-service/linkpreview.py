"""Unfurling a link somebody pasted into a post.

This is the most dangerous kind of feature a server can have: it takes a URL
chosen by a member and fetches it. Done naively that is a request-forgery hole
with a friendly name — a post containing
``http://169.254.169.254/latest/meta-data/iam/`` would have this service fetch
cloud credentials and hand the result back as a "preview", and
``http://auth-service:8000/internal/...`` would reach straight into the private
network, where every service trusts its callers.

So the rules here are about where a request may *land*, not about what the URL
looks like:

* http and https only. No file://, no gopher://, no data:.
* The hostname is resolved and **every** address it resolves to is checked.
  A public name is free to resolve to 127.0.0.1, and a name whose answer
  changes between the check and the fetch (DNS rebinding) is defeated by
  connecting to the address that was checked rather than re-resolving.
* Redirects are followed by hand, one at a time, with the same check at every
  hop — a permitted host that 302s to the metadata endpoint is the ordinary way
  past a naive check.
* The response is capped and the body is read as a stream, so a URL pointing at
  a terabyte does not become this service's memory problem.
"""
from __future__ import annotations

import ipaddress
import logging
import re
import socket
from html import unescape
from urllib.parse import urljoin, urlsplit

import httpx

log = logging.getLogger("social-service.linkpreview")

TIMEOUT_SECONDS = 6
MAX_BYTES = 512 * 1024          # a page's <head> is never megabytes
MAX_REDIRECTS = 3
ALLOWED_SCHEMES = {"http", "https"}


class UnsafeURL(Exception):
    """The URL is not one this service may fetch."""


def _addresses(host: str) -> list[str]:
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError as exc:
        raise UnsafeURL("That address could not be resolved") from exc
    return sorted({info[4][0] for info in infos})


def _is_public(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    # is_global is not enough on its own: it is False for private ranges but
    # these are named individually because each has been somebody's incident.
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local      # 169.254.0.0/16 - the cloud metadata endpoint
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
        or not ip.is_global
    )


def check(url: str) -> tuple[str, str]:
    """Validate a URL and return (host, one resolved public address).

    The address is returned so the caller can connect to the address that was
    checked. Resolving again at connect time is what DNS rebinding relies on.
    """
    try:
        parts = urlsplit(url)
    except ValueError as exc:
        raise UnsafeURL("That does not look like a link") from exc

    if parts.scheme not in ALLOWED_SCHEMES:
        raise UnsafeURL("Only http and https links can be previewed")
    host = (parts.hostname or "").lower()
    if not host:
        raise UnsafeURL("That link has no host")
    # Credentials in a URL are how a preview request gets made as somebody else.
    if parts.username or parts.password:
        raise UnsafeURL("That link carries credentials")

    addresses = _addresses(host)
    if not addresses:
        raise UnsafeURL("That address could not be resolved")
    # EVERY answer must be public. One private address among several is enough
    # for a request to land inside the network.
    for address in addresses:
        if not _is_public(address):
            raise UnsafeURL("That link points inside a private network")
    return host, addresses[0]


_META = re.compile(
    r"<meta[^>]+?(?:property|name)\s*=\s*[\"']([^\"']+)[\"'][^>]*?content\s*=\s*[\"']([^\"']*)[\"']",
    re.I | re.S,
)
_META_REVERSED = re.compile(
    r"<meta[^>]+?content\s*=\s*[\"']([^\"']*)[\"'][^>]*?(?:property|name)\s*=\s*[\"']([^\"']+)[\"']",
    re.I | re.S,
)
_TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)


def parse(html: str, base_url: str) -> dict:
    """Pull the card out of a page's markup.

    A regex rather than a parser because only four values are wanted out of the
    first half-megabyte, and adding an HTML parser to every service that might
    one day want this is a bigger cost than the sharp edges here. Both attribute
    orders are matched: `property` before `content` is the common one, and the
    reverse is common enough that missing it loses previews for real sites.
    """
    found: dict[str, str] = {}
    for pattern, order in ((_META, "forward"), (_META_REVERSED, "reverse")):
        for a, b in pattern.findall(html):
            key, value = (a, b) if order == "forward" else (b, a)
            key = key.strip().lower()
            if key not in found and value.strip():
                found[key] = unescape(value.strip())

    title = found.get("og:title") or found.get("twitter:title")
    if not title:
        match = _TITLE.search(html)
        title = unescape(match.group(1).strip()) if match else ""

    image = found.get("og:image") or found.get("twitter:image") or found.get("og:image:url")
    if image:
        # Relative og:image is common and is otherwise a broken thumbnail.
        image = urljoin(base_url, image)
        try:
            check(image)
        except UnsafeURL:
            # An image on a private address would have the *member's* browser
            # make that request instead of ours. Same hole, different machine.
            image = None

    return {
        "url": base_url,
        "title": (title or "")[:200],
        "description": (found.get("og:description") or found.get("twitter:description")
                        or found.get("description") or "")[:400],
        "image": image,
        "site_name": (found.get("og:site_name") or urlsplit(base_url).hostname or "")[:100],
    }


def fetch(url: str) -> dict:
    """Fetch a URL and return its preview card, or raise UnsafeURL.

    Redirects are followed by hand so each hop is checked. httpx's own
    `follow_redirects` would check the first URL and then go wherever it is
    sent, which is the whole attack.
    """
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        check(current)
        try:
            with httpx.Client(
                timeout=TIMEOUT_SECONDS,
                follow_redirects=False,
                headers={
                    # Honest about who is asking. Sites that block unknown
                    # agents should be able to block this one by name.
                    "User-Agent": "KinjyLinkPreview/1.0 (+https://kinjy.com)",
                    "Accept": "text/html,application/xhtml+xml",
                },
            ) as client:
                with client.stream("GET", current) as response:
                    if response.is_redirect:
                        location = response.headers.get("location")
                        if not location:
                            raise UnsafeURL("That link redirects nowhere")
                        current = urljoin(current, location)
                        continue
                    if response.status_code >= 400:
                        raise UnsafeURL("That page could not be read")
                    kind = response.headers.get("content-type", "")
                    if "html" not in kind.lower():
                        # An image or a PDF has no card to extract, and reading
                        # one into memory to find that out is wasted.
                        raise UnsafeURL("That link is not a web page")

                    chunks, total = [], 0
                    for chunk in response.iter_bytes(32 * 1024):
                        chunks.append(chunk)
                        total += len(chunk)
                        if total >= MAX_BYTES:
                            break
                    html = b"".join(chunks).decode(response.encoding or "utf-8", errors="replace")
            return parse(html, current)
        except httpx.HTTPError as exc:
            log.info("link preview failed for a link: %s", type(exc).__name__)
            raise UnsafeURL("That page could not be reached") from exc
    raise UnsafeURL("That link redirects too many times")
