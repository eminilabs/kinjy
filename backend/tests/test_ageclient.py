"""The age lookup every service makes (common/ageclient.py).

Two rules pull against each other here. A failed lookup must never make
anyone an adult: UNKNOWN is treated as a minor. But a one-second blip in
auth-service must not turn an adult's feed into a child's either. The client
retries once, and during an outage falls back to the last answer auth-service
actually gave, if it is recent; with nothing recent, UNKNOWN as before.

Run: python -m pytest backend/tests/test_ageclient.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from common import ageclient  # noqa: E402
from common.agesafety import AgeTier  # noqa: E402

USER = "usr_test"


class Clock:
    def __init__(self):
        self.now = 1_000.0

    def __call__(self):
        return self.now


class FakeAuth:
    """Answers the age lookup with a scripted sequence of outcomes."""

    def __init__(self, *outcomes):
        self.outcomes = list(outcomes)
        self.calls = 0

    def __call__(self, url, timeout):
        self.calls += 1
        outcome = self.outcomes.pop(0) if self.outcomes else self.last
        self.last = outcome
        if isinstance(outcome, Exception):
            raise outcome
        status, tier = outcome
        request = httpx.Request("GET", url)
        if status != 200:
            return httpx.Response(status, request=request, json={"detail": "x"})
        return httpx.Response(200, request=request, json={"user_id": USER, "tier": tier, "age": 30})


@pytest.fixture
def clock(monkeypatch):
    ageclient._cache.clear()
    ageclient._confirmed.clear()
    clock = Clock()
    monkeypatch.setattr(ageclient.time, "monotonic", clock)
    monkeypatch.setattr(ageclient.time, "sleep", lambda seconds: None)
    return clock


def use(monkeypatch, fake):
    monkeypatch.setattr(ageclient.httpx, "get", fake)
    return fake


ADULT = (200, AgeTier.ADULT.value)
TIMEOUT = httpx.ReadTimeout("slow")
DOWN = httpx.ConnectError("refused")


def test_a_normal_answer_is_returned_and_cached(clock, monkeypatch):
    fake = use(monkeypatch, FakeAuth(ADULT))
    assert ageclient.age_profile(USER).tier is AgeTier.ADULT
    assert ageclient.age_profile(USER).tier is AgeTier.ADULT
    assert fake.calls == 1


def test_one_slow_answer_is_retried(clock, monkeypatch):
    fake = use(monkeypatch, FakeAuth(TIMEOUT, ADULT))
    profile = ageclient.age_profile(USER)
    assert profile.tier is AgeTier.ADULT and not profile.degraded
    assert fake.calls == 2


def test_a_server_error_is_retried_too(clock, monkeypatch):
    fake = use(monkeypatch, FakeAuth((503, None), ADULT))
    assert ageclient.age_profile(USER).tier is AgeTier.ADULT
    assert fake.calls == 2


def test_with_nothing_known_a_failure_is_still_a_minor(clock, monkeypatch):
    use(monkeypatch, FakeAuth(DOWN, DOWN))
    profile = ageclient.age_profile(USER)
    assert profile.tier is AgeTier.UNKNOWN and profile.degraded


def test_an_outage_falls_back_to_the_last_confirmed_answer(clock, monkeypatch):
    use(monkeypatch, FakeAuth(ADULT))
    ageclient.age_profile(USER)
    clock.now += ageclient._TTL_SECONDS + 1          # the short cache has expired
    use(monkeypatch, FakeAuth(DOWN, DOWN))
    assert ageclient.age_profile(USER).tier is AgeTier.ADULT


def test_the_fallback_does_not_last_forever(clock, monkeypatch):
    use(monkeypatch, FakeAuth(ADULT))
    ageclient.age_profile(USER)
    clock.now += ageclient._STALE_IF_ERROR_SECONDS + 1
    use(monkeypatch, FakeAuth(DOWN, DOWN))
    assert ageclient.age_profile(USER).tier is AgeTier.UNKNOWN


def test_a_failure_is_never_remembered_as_an_answer(clock, monkeypatch):
    use(monkeypatch, FakeAuth(DOWN, DOWN))
    ageclient.age_profile(USER)
    fake = use(monkeypatch, FakeAuth(ADULT))
    assert ageclient.age_profile(USER).tier is AgeTier.ADULT
    assert fake.calls == 1


def test_a_missing_record_is_not_retried_and_not_an_adult(clock, monkeypatch):
    fake = use(monkeypatch, FakeAuth((404, None)))
    profile = ageclient.age_profile(USER)
    assert profile.tier is AgeTier.UNKNOWN and fake.calls == 1


def test_a_missing_record_does_not_fall_back_to_an_older_answer(clock, monkeypatch):
    """A 404 is an answer, not an outage: an old tier must not outlive it."""
    use(monkeypatch, FakeAuth(ADULT))
    ageclient.age_profile(USER)
    clock.now += ageclient._TTL_SECONDS + 1
    use(monkeypatch, FakeAuth((404, None)))
    assert ageclient.age_profile(USER).tier is AgeTier.UNKNOWN


def test_invalidating_drops_the_fallback_as_well(clock, monkeypatch):
    """After a tier change, the old tier must not come back during an outage."""
    use(monkeypatch, FakeAuth(ADULT))
    ageclient.age_profile(USER)
    ageclient.invalidate(USER)
    use(monkeypatch, FakeAuth(DOWN, DOWN))
    assert ageclient.age_profile(USER).tier is AgeTier.UNKNOWN


def test_signed_out_is_never_looked_up(clock, monkeypatch):
    fake = use(monkeypatch, FakeAuth(ADULT))
    assert ageclient.age_profile(None).tier is not AgeTier.ADULT
    assert fake.calls == 0
