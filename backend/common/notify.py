"""Notifications, from any service.

The store and its endpoints have existed since the beginning; nothing ever
called them, so the bell was decoration. This is the caller.

Best-effort and short-timeout by design: a notification is a courtesy, and a
notification service that is slow or down must never make posting a comment
slow or fail. The write it describes has already been committed by the time we
get here.
"""
from __future__ import annotations

import logging

import httpx

log = logging.getLogger(__name__)

MESSAGING_URL = "http://messaging-service:8000"


def notify(
    user_id: str,
    kind: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    lang: str = "en",
) -> None:
    """Tell one member something happened. Never raises, never blocks for long."""
    if not user_id:
        return
    try:
        httpx.post(
            f"{MESSAGING_URL}/internal/notify",
            params={
                "user_id": user_id,
                "kind": kind,
                "title": title,
                **({"body": body} if body else {}),
                **({"link": link} if link else {}),
                "lang": lang,
            },
            timeout=2.0,
        )
    except Exception as exc:
        log.debug("notification dropped (%s -> %s): %s", kind, user_id, exc)


def notify_many(user_ids, kind: str, title: str, **kwargs) -> None:
    """The same notification to several people, skipping duplicates and blanks."""
    for user_id in {u for u in user_ids if u}:
        notify(user_id, kind, title, **kwargs)
