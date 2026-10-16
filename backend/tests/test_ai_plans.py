"""Which plan a member is on, as ai-service is allowed to believe it (ai-service/plans.py)."""
from __future__ import annotations

import httpx
import pytest

from ai_test_support import plans  # first: it puts backend/ on sys.path, which `common` needs
from common import settings  # noqa: E402


class Reply:
    def __init__(self, status=200, body=None):
        self.status_code, self._body = status, body

    def json(self):
        return self._body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("x", request=None, response=None)


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    plans._cache.clear()
    monkeypatch.setattr(settings, "AI_CREDITS_TRUST_SUBSCRIPTIONS", True)


@pytest.fixture
def asked(monkeypatch):
    calls: list[str] = []
    answer = {"reply": Reply(200, {"tier": "premium"}), "raises": None}

    def get(url, timeout=None):
        calls.append(url)
        if answer["raises"]:
            raise answer["raises"]
        return answer["reply"]

    monkeypatch.setattr(plans.httpx, "get", get)
    return calls, answer


def test_a_recorded_plan_is_not_believed_unless_the_deployment_says_it_may_be(monkeypatch, asked):
    calls, _ = asked
    monkeypatch.setattr(settings, "AI_CREDITS_TRUST_SUBSCRIPTIONS", False)
    assert plans.tier_of("usr_a") == "free"
    assert calls == []  # not even asked: nothing to believe


def test_a_visitor_has_no_plan(asked):
    calls, _ = asked
    assert plans.tier_of(None) == "free" and calls == []


def test_when_it_may_be_believed_the_members_plan_is_asked_for_by_member(asked):
    calls, _ = asked
    assert plans.tier_of("usr_a") == "premium"
    assert calls == ["http://creator-service:8000/internal/platform-tier/usr_a"]


def test_an_answer_is_kept_for_a_few_seconds_so_a_burst_of_translations_asks_once(asked):
    calls, _ = asked
    plans.tier_of("usr_a"), plans.tier_of("usr_a"), plans.tier_of("usr_a")
    assert len(calls) == 1


@pytest.mark.parametrize("reply", [Reply(200, {"tier": "platinum"}), Reply(200, {}), Reply(200, {"tier": None}), Reply(500, {})])
def test_a_plan_it_does_not_know_or_an_error_is_the_free_plan(asked, reply):
    _, answer = asked
    answer["reply"] = reply
    assert plans.tier_of("usr_a") == "free"


def test_an_unreachable_creator_service_means_free_and_is_not_remembered(asked):
    calls, answer = asked
    answer["raises"] = httpx.ConnectError("down")
    assert plans.tier_of("usr_a") == "free"
    answer["raises"] = None  # back up: a blip must not hold a paying member on Free for a minute
    assert plans.tier_of("usr_a") == "premium"
    assert len(calls) == 2
