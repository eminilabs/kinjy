"""Feature gates use payment-verified plans, never a self-declared subscription."""
from __future__ import annotations

import logging
import time

import httpx
from fastapi import HTTPException

from common.subscriptions import features

log = logging.getLogger("entitlements")
CREATOR_URL = "http://creator-service:8000"
_cache: dict[str, tuple[float, str]] = {}
TTL = 5.0


def tier_of(user_id: str | None) -> str:
    if not user_id:
        return "free"
    now = time.monotonic()
    hit = _cache.get(user_id)
    if hit and now - hit[0] < TTL:
        return hit[1]
    try:
        response = httpx.get(f"{CREATOR_URL}/internal/platform-tier/{user_id}", timeout=3)
        response.raise_for_status()
        body = response.json()
        tier = body.get("tier") if body.get("verified") is True else "free"
        tier = tier if tier in ("free", "basic", "premium") else "free"
    except Exception as exc:
        log.warning("could not verify subscription (%s); treating as Free", type(exc).__name__)
        return "free"  # an outage is not cached
    if len(_cache) > 5000:
        _cache.clear()
    _cache[user_id] = (now, tier)
    return tier


def require(user_id: str, feature: str) -> None:
    if not features(tier_of(user_id)).get(feature, False):
        raise HTTPException(status_code=402, detail="This feature needs an active, paid Basic or Premium subscription.")
