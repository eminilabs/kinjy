"""How every service gets a viewer's authoritative age.

The rule this module exists to enforce: a service must never work out a
viewer's age for itself, and must never read it from anything the viewer sent.
It asks the identity service, and when the identity service cannot answer it
gets back a profile that the policy engine treats as a minor.

That last behaviour is the important one. The obvious implementation returns
"adult" or "unknown, carry on" when a lookup fails, and then an outage in one
service becomes an age-verification bypass across the platform. Here a failed
lookup returns UNKNOWN with ``degraded=True``, and UNKNOWN is a minor.

What softens it, without inventing anything: a transient failure is retried
once, and during an outage the last answer auth-service actually gave is used
if it is recent (``_STALE_IF_ERROR_SECONDS``). Without that, one slow second
in auth-service emptied an adult's feed down to what a child may see. Nothing
is ever guessed: no recent answer still means UNKNOWN, and a 404 is an answer
that never falls back.

Known gap, kept small on purpose: a tier lowered in auth-service (an age
review opened, a date of birth corrected to a minor) is not pushed to the
other services; each one learns it on its next lookup. That was already up to
``_TTL_SECONDS`` of staleness. The fallback can stretch it, only while
auth-service is unreachable, to ``_STALE_IF_ERROR_SECONDS`` — hence two
minutes, enough to ride out a restart and no more. ``invalidate`` is
process-local and nothing calls it across services today; propagating tier
changes as events is the real fix.
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

# The last answer auth-service gave, and when: only read while it cannot be
# reached. Two minutes rides out a restart. Kept short because a tier lowered
# meanwhile is not pushed here (see the module docstring): every second of
# fallback is a second an old, possibly more permissive tier can outlive it.
_STALE_IF_ERROR_SECONDS = 120
_confirmed: dict[str, tuple[float, AgeProfile]] = {}

_ATTEMPTS = 2
_RETRY_DELAY_SECONDS = 0.2


class _Transient(Exception):
    """auth-service did not answer (network, timeout, 5xx): worth one retry."""


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


def _remember(user_id: str, profile: AgeProfile) -> None:
    if len(_confirmed) >= _MAX_CACHE:
        _confirmed.clear()
    _confirmed[user_id] = (time.monotonic(), profile)


def _last_confirmed(user_id: str) -> AgeProfile | None:
    entry = _confirmed.get(user_id)
    if not entry:
        return None
    fetched_at, profile = entry
    if time.monotonic() - fetched_at > _STALE_IF_ERROR_SECONDS:
        _confirmed.pop(user_id, None)
        return None
    return profile


def _request(user_id: str, timeout: float) -> httpx.Response:
    """One call, up to _ATTEMPTS times when auth-service does not answer."""
    error: Exception | None = None
    for attempt in range(_ATTEMPTS):
        if attempt:
            time.sleep(_RETRY_DELAY_SECONDS)
        try:
            response = httpx.get(f"{AUTH_URL}/internal/age-profile/{user_id}", timeout=timeout)
        except httpx.HTTPError as exc:
            error = exc
            continue
        if response.status_code >= 500:
            error = _Transient(f"auth-service answered {response.status_code}")
            continue
        return response
    raise _Transient(str(error))


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
        response = _request(user_id, timeout)
    except _Transient as exc:
        stale = _last_confirmed(user_id)
        if stale is not None:
            log.warning("age profile lookup failed for %s (%s); using the last confirmed answer", user_id, exc)
            return stale
        # Not cached: a degraded answer must not be remembered for a minute,
        # or one blip would hold a paying adult in teen mode long after the
        # identity service recovered.
        log.error("age profile lookup failed for %s: %s", user_id, exc)
        return AgeProfile(user_id=user_id, tier=AgeTier.UNKNOWN, degraded=True)

    try:
        if response.status_code == 404:
            # An account with no age record. Not adult, and worth knowing about:
            # it means a registration path wrote a user without a profile. An
            # answer, not an outage, so no fallback to an older one.
            log.warning("no age profile for %s; treating as unknown", user_id)
            _confirmed.pop(user_id, None)
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
    except Exception as exc:
        # An answer we cannot read (4xx, malformed body, unknown tier): not an
        # outage, so no fallback either.
        log.error("age profile for %s could not be read: %s", user_id, exc)
        return AgeProfile(user_id=user_id, tier=AgeTier.UNKNOWN, degraded=True)
    _store(user_id, profile)
    _remember(user_id, profile)
    return profile


def invalidate(user_id: str) -> None:
    """Drop a cached tier, for when it has just changed underneath us.

    The outage fallback goes too: an old tier must never come back just
    because auth-service is unreachable right after the change. In this
    process only: other services keep theirs until they look again.
    """
    _cache.pop(user_id, None)
    _confirmed.pop(user_id, None)
