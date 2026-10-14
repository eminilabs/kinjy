"""The AI gateway's rules, with no stack and no provider.

What these pin down is the ordering that makes a real provider safe to add: a key
alone must do nothing, a provider must answer only the tasks somebody wrote code
for, and the word "mock" in a result must be true exactly when the text was
invented. Each was false before this suite existed - a key would have removed the
"Simulated" label from text that was still made up.

A fake adapter stands in for a vendor. Nothing here touches the network.
"""
from __future__ import annotations

import importlib
import json
import logging

import pytest

from ai_test_support import gateway as gw  # noqa: E402  (loaded by path: see that module)

SECRET = "sk-test-NOT-A-REAL-KEY-98765"


class FakeAdapter:
    """A provider that really answers - with text the test can recognise."""

    tasks = frozenset({"translate"})

    def __init__(self):
        self.calls: list[dict] = []

    def run(self, *, task, prompt, lang, target_lang, model):
        self.calls.append({"task": task, "prompt": prompt, "target_lang": target_lang, "model": model})
        return {"output": f"REAL<{prompt}>", "input_tokens": 10, "output_tokens": 5}


@pytest.fixture
def live(monkeypatch):
    """The gateway as it is with one real provider (kimi, translate only) switched on."""
    adapter = FakeAdapter()
    registry = gw.build_registry({"KIMI_API_KEY": SECRET}, {"kimi": adapter}, True)
    monkeypatch.setattr(gw, "PROVIDERS", registry)
    monkeypatch.setattr(gw, "ADAPTERS", {"kimi": adapter})
    return adapter


def names(registry):
    return [p.name for p in registry]


def test_no_keys_means_only_the_mock():
    assert names(gw.build_registry({}, {}, True)) == ["mock"]


def test_a_key_with_no_adapter_is_ignored_and_says_so(caplog):
    with caplog.at_level(logging.WARNING, logger="ai-gateway"):
        registry = gw.build_registry({"ANTHROPIC_API_KEY": SECRET}, {}, True)
    assert names(registry) == ["mock"]
    assert "anthropic" in caplog.text and "no adapter" in caplog.text
    assert SECRET not in caplog.text


def test_an_adapter_without_the_switch_is_not_used(caplog):
    with caplog.at_level(logging.WARNING, logger="ai-gateway"):
        registry = gw.build_registry({"KIMI_API_KEY": SECRET}, {"kimi": FakeAdapter()}, False)
    assert names(registry) == ["mock"]
    assert "AI_LIVE_ENABLED" in caplog.text and SECRET not in caplog.text


def test_a_switch_without_a_key_adds_nothing():
    assert names(gw.build_registry({}, {"kimi": FakeAdapter()}, True)) == ["mock"]


def test_a_real_provider_declares_only_what_its_adapter_implements():
    registry = gw.build_registry({"KIMI_API_KEY": SECRET}, {"kimi": FakeAdapter()}, True)
    kimi = next(p for p in registry if p.name == "kimi")
    # The vendor could do summarise, generate, assist and classify too; nobody wrote that.
    assert set(kimi.models) == {"translate"}


def test_a_configured_provider_beats_the_mock_for_its_task(live):
    assert gw.route(task="translate", lang="en").name == "kimi"


def test_without_one_the_mock_still_serves(monkeypatch):
    monkeypatch.setattr(gw, "PROVIDERS", gw.build_registry({}, {}, True))
    assert gw.route(task="translate").name == "mock"


def test_every_other_task_stays_with_the_mock_and_stays_labelled(live):
    for task in ("summarize", "moderate", "assist", "classify", "generate"):
        result = gw.run(task=task, prompt="Some text. More text.")
        assert result["provider"] == "mock" and result["mock"] is True, task
    # Specifically: moderation is not answered by a real provider's name with an invented verdict.
    assert gw.run(task="moderate", prompt="anything")["output"] == "allow"
    assert live.calls == []


def test_a_real_answer_comes_from_the_adapter_and_is_not_marked_mock(live):
    result = gw.run(task="translate", prompt="hello", lang="en", target_lang="fr")
    assert result["output"] == "REAL<hello>"
    assert result["provider"] == "kimi" and result["mock"] is False
    assert (result["input_tokens"], result["output_tokens"]) == (10, 5)
    assert result["cost_usd"] > 0
    assert live.calls == [{"task": "translate", "prompt": "hello", "target_lang": "fr", "model": "moonshot-v1-32k"}]


def test_sensitive_text_never_reaches_a_remote_provider(live):
    result = gw.run(task="translate", prompt="a private thing", target_lang="fr", sensitive=True)
    assert result["provider"] == "mock" and result["mock"] is True
    assert live.calls == []


def test_a_real_provider_with_no_adapter_is_refused_not_invented(monkeypatch):
    # Whatever put it in the registry, a provider nobody wrote an adapter for must not be answered for.
    registry = gw.build_registry({"KIMI_API_KEY": SECRET}, {"kimi": FakeAdapter()}, True)
    monkeypatch.setattr(gw, "PROVIDERS", registry)
    monkeypatch.setattr(gw, "ADAPTERS", {})
    with pytest.raises(gw.NoProviderError):
        gw.run(task="translate", prompt="hello", target_lang="fr")


def test_a_quality_floor_is_still_honoured(live):
    with pytest.raises(gw.NoProviderError):
        gw.route(task="translate", quality_floor=0.99)


def test_the_description_never_carries_a_key(live):
    described = json.dumps(gw.describe())
    assert SECRET not in described
    by_name = {p["name"]: p for p in gw.describe()}
    assert by_name["mock"]["live"] is False and by_name["kimi"]["live"] is True
    assert by_name["kimi"]["tasks"] == ["translate"]


@pytest.mark.parametrize("value, expected", [
    (None, False), ("", False), ("false", False), ("0", False), ("no", False),
    ("true", True), ("TRUE", True), (" 1 ", True), ("yes", True), ("on", True),
])
def test_the_live_switch_is_off_unless_clearly_on(monkeypatch, value, expected):
    from common import settings
    if value is None:
        monkeypatch.delenv("AI_LIVE_ENABLED", raising=False)
    else:
        monkeypatch.setenv("AI_LIVE_ENABLED", value)
    try:
        assert importlib.reload(settings).AI_LIVE_ENABLED is expected
    finally:
        monkeypatch.undo()
        importlib.reload(settings)
