"""How every service gets a viewer's authoritative age.

The rule this module exists to enforce: a service must never work out a
viewer's age for itself, and must never read it from anything the viewer sent.
It asks the identity service, and when the identity service cannot answer it
gets back a profile that the policy engine treats as a minor.

That last behaviour is the important one. The obvious implementation returns
"adult" or "unknown, carry on" when a lookup fails, and then an outage in one
service becomes an age-verification bypass across the platform. Here a failed
lookup returns UNKNOWN with ``degraded=True``, and UNKNOWN is a minor.
"""
from __future__ import annotations

import logging
import time

import httpx

from common.agesafety import AgeProfile, AgeTier

log = logging.getLogger("kaluta.ageclient")

AUTH_URL = "http://auth-service:8000"

# A short cache. Age tiers change on a birthday, not by the second, so a minute
# of staleness is harmless — and the cache is what keeps a per-item content
# check from becoming a per-item HTTP call.
_TTL_SECONDS = 60
_cache: dict[str, tuple[float, AgeProfile]] = {}
# Bounded so a service under scrape pressure cannot be made to hold every
# member it has ever seen in memory.
_MAX_CACHE = 20_000


def _cached(user_id: str) -> AgeProfile | None:
    entry = _cache.get(user_id)
    if not entry:
        return None
    expires, profile = entry
    if expires < time.monotonic():
        _cache.pop(user_id, None)
        return None
    return profile


def _store(user_id: str, profile: AgeProfile) -> None:
    if len(_cache) >= _MAX_CACHE:
        _cache.clear()
    _cache[user_id] = (time.monotonic() + _TTL_SECONDS, profile)


def age_profile(user_id: str | None, *, timeout: float = 3.0) -> AgeProfile:
    """The viewer's age record, or a minor-by-default profile.

    Signed out is not an error and not an adult: a visitor with no account has
    no established age, so they see what an unestablished age may see.
    """
    if not user_id:
        return AgeProfile.anonymous()

    hit = _cached(user_id)
    if hit is not None:
        return hit

    try:
        response = httpx.get(f"{AUTH_URL}/internal/age-profile/{user_id}", timeout=timeout)
        if response.status_code == 404:
            # An account with no age record. Not adult, and worth knowing about:
            # it means a registration path wrote a user without a profile.
            log.warning("no age profile for %s; treating as unknown", user_id)
            profile = AgeProfile(user_id=user_id, tier=AgeTier.UNKNOWN, degraded=True)
            _store(user_id, profile)
            return profile
        response.raise_for_status()
        body = response.json()
        profile = AgeProfile(
            user_id=body["user_id"],
            tier=AgeTier(body["tier"]),
            age=body.get("age"),
            jurisdiction=body.get("jurisdiction"),
            policy_version=body.get("policy_version", ""),
        )
        _store(user_id, profile)
        return profile
    except Exception as exc:
        # Not cached: a degraded answer must not be remembered for a minute,
        # or one blip would hold a paying adult in teen mode long after the
        # identity service recovered.
        log.error("age profile lookup failed for %s: %s", user_id, exc)
        return AgeProfile(user_id=user_id, tier=AgeTier.UNKNOWN, degraded=True)


def invalidate(user_id: str) -> None:
    """Drop a cached tier, for when it has just changed underneath us."""
    _cache.pop(user_id, None)
