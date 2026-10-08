"""Sending a Web Push, and knowing when to stop.

A push is a courtesy. Everything here is best-effort and bounded: the write it
describes has already been committed, and a push service that is slow or down
must never make sending a message slow or fail.

What the push services see: an encrypted blob. The payload is sealed to the
subscription's own keys (RFC 8291), so Google, Mozilla and Apple relay a
notification they cannot read. That is worth knowing before putting a message
preview in one - and it is why the preview that goes in is the same one the
in-app notification uses, which already says "Encrypted message" rather than
the text for end-to-end conversations.
"""
from __future__ import annotations

import json
import logging
from urllib.parse import urlsplit

from common import settings

log = logging.getLogger("messaging-service.webpush")

# After this many failures in a row that were not an outright "gone", a
# subscription is dropped. A browser that is closed forever looks exactly like
# one that is briefly unreachable, and the only difference is how long it keeps
# failing.
MAX_FAILURES = 8
TIMEOUT_SECONDS = 8

try:  # pragma: no cover - import guard
    import requests
except Exception:  # pragma: no cover
    requests = None

try:  # pragma: no cover - import guard, exercised by the absence of the package
    from pywebpush import WebPushException, webpush
except Exception:  # pragma: no cover
    webpush = None
    WebPushException = Exception

# The only places a browser's push endpoint can legitimately be: the push
# services run by the browser vendors. A subscription's endpoint is a URL the
# *member* supplies and this server then POSTs to, so without a list it is
# request forgery with a friendly name - any signed-in member could aim the
# server's request at the services next to it on the private network, which
# trust their caller. A host matches itself or any subdomain of it.
ALLOWED_PUSH_HOSTS = (
    "fcm.googleapis.com",  # Chrome, Edge, Opera, Brave, Samsung Internet
    "push.services.mozilla.com",  # Firefox
    "notify.windows.com",  # Edge on Windows
    "push.apple.com",  # Safari, including web.push.apple.com
)

# More than this many devices for one member is not a person, it is a way to make
# every notification cost a string of outbound requests.
MAX_SUBSCRIPTIONS_PER_MEMBER = 10


def endpoint_allowed(endpoint: str) -> bool:
    """Whether this is the address of a real push service, and nothing else.

    https only, on the default port, with no credentials, no whitespace or
    backslash (which different parsers read differently), and a host that is
    one of ALLOWED_PUSH_HOSTS or a subdomain of one. An IP address never
    matches, so the private network is out by construction.
    """
    if not endpoint or len(endpoint) > 2000 or any(ch.isspace() or ch == "\\" for ch in endpoint):
        return False
    try:
        parts = urlsplit(endpoint)
        host, port = parts.hostname, parts.port
    except ValueError:
        return False
    if parts.scheme != "https" or not host or parts.username is not None or parts.password is not None:
        return False
    if port not in (None, 443):
        return False
    return any(host == allowed or host.endswith("." + allowed) for allowed in ALLOWED_PUSH_HOSTS)


class Gone(Exception):
    """The push service says this subscription no longer exists."""


def available() -> bool:
    """Whether a push can be sent at all: keys configured and library present."""
    return bool(settings.push_configured() and webpush is not None)


def send(subscription: dict, payload: dict) -> None:
    """Push one notification, or raise.

    Raises :class:`Gone` when the subscription is dead - the caller deletes it
    rather than counting a failure, because there is nothing to retry.
    """
    if not available() or requests is None:
        raise RuntimeError("Web Push is not configured")
    if not endpoint_allowed(subscription.get("endpoint", "")):
        raise RuntimeError("Refusing to push to an address that is not a push service")

    # No redirects: an allowed host that answers with a redirect must not be able
    # to send the request somewhere that is not. No proxy from the environment either.
    session = requests.Session()
    session.max_redirects = 0
    session.trust_env = False
    try:
        webpush(
            requests_session=session,
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
            timeout=TIMEOUT_SECONDS,
            # Let the push service drop it rather than hold it for days: a
            # notification about a message is worth nothing a day later, and
            # "you have a message" arriving on Thursday about Monday is worse
            # than silence.
            ttl=60 * 60 * 12,
        )
    except WebPushException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        # 404: the endpoint never existed. 410: it has been revoked - the
        # browser was uninstalled, or the member turned notifications off at
        # the operating system. Either way it will never work again.
        if status in (404, 410):
            raise Gone(str(status)) from exc
        raise
