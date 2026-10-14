"""How the Creator Studio asks for a translation, and what it makes of the answer.

creator-service/derive.py with ai-service stubbed out: no stack, no network. What matters is
what a creator ends up seeing - and, for an account that may not have its writing sent to a
provider, that they see an honest gap and not an invented text.
"""
from __future__ import annotations

import importlib.util
import sys
import threading
import time
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def _load(name: str, filename: str):
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, ROOT / "creator-service" / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


_load("render", "render.py")  # derive does `import render`
derive = _load("creator_derive_under_test", "derive.py")


class Reply:
    def __init__(self, status=200, body=None):
        self.status_code, self._body = status, body

    def json(self):
        if self._body is None:
            raise ValueError("no body")
        return self._body


@pytest.fixture
def ai(monkeypatch):
    """ai-service as a function of the test: set ``ai.reply`` (or ``ai.raises``) and read ``ai.sent``."""
    class AI:
        reply = Reply(200, {"translated": "Le marché ouvre à l'aube.", "mock": False, "provider": "ileai"})
        raises = None
        sent: list[dict] = []

    state = AI()
    state.sent = []

    def post(url, json=None, timeout=None):
        state.sent.append({"url": url, "json": json, "timeout": timeout})
        if state.raises:
            raise state.raises
        return state.reply

    monkeypatch.setattr(derive.httpx, "post", post)
    return state


def test_a_translation_is_asked_for_on_behalf_of_the_member(ai):
    done = derive.translate("The market opens at dawn.", "fr", "en", "usr_ada")
    assert done.text == "Le marché ouvre à l'aube." and not done.simulated and not done.withheld
    (sent,) = ai.sent
    assert sent["url"].endswith("/internal/translate")  # the route that knows who is asking
    assert sent["json"] == {"text": "The market opens at dawn.", "target_lang": "fr", "source_lang": "en", "user_id": "usr_ada"}
    assert sent["timeout"] >= 120  # a worker waits as long as a language model needs


def test_the_same_language_is_not_sent_anywhere(ai):
    assert derive.translate("Hello", "en", "en", "usr_ada").text == "Hello"
    assert ai.sent == []


def test_the_stand_ins_answer_is_marked_simulated(ai):
    ai.reply = Reply(200, {"translated": "[fr] Hello", "mock": True, "provider": "mock"})
    assert derive.translate("Hello", "fr", "en", "usr_ada").simulated is True


def test_an_account_the_provider_was_not_asked_about_is_withheld_not_translated(ai):
    ai.reply = Reply(200, {"translated": "[fr] Hello", "mock": True, "withheld": "account"})
    done = derive.translate("Hello", "fr", "en", "usr_teen")
    assert done.withheld is True and done.text is None


@pytest.mark.parametrize("status", [429, 502, 503])
def test_the_allowance_the_pause_and_a_provider_failure_are_said_in_ai_services_own_words(ai, status):
    ai.reply = Reply(status, {"detail": "You have reached today's translation allowance (100,000 characters)."})
    done = derive.translate("Hello", "fr", "en", "usr_ada")
    assert done.text is None and "allowance" in done.error


def test_any_other_failure_is_generic_and_never_a_response_body(ai):
    ai.reply = Reply(500, {"detail": "Traceback: the key emk_test_SECRET leaked here"})
    done = derive.translate("Hello", "fr", "en", "usr_ada")
    assert done.error == "translation service unavailable" and "emk_" not in done.error


def test_an_unreachable_ai_service_is_a_failure_not_a_crash(ai):
    ai.raises = httpx.ConnectError("boom")
    assert "unavailable" in derive.translate("Hello", "fr", "en", "usr_ada").error


def test_the_same_translation_asked_on_two_workers_is_made_one_at_a_time(monkeypatch):
    # An article and a newsletter in French, rendered at once: the second must start only when the
    # first has finished, so it finds the first's answer in ai-service's cache instead of paying again.
    running, peak = 0, 0
    lock = threading.Lock()

    def slow_ask(text, target_lang, source_lang, user_id):
        nonlocal running, peak
        with lock:
            running += 1
            peak = max(peak, running)
        time.sleep(0.15)
        with lock:
            running -= 1
        return derive.Translated(text="ok")

    monkeypatch.setattr(derive, "_ask", slow_ask)
    threads = [threading.Thread(target=derive.translate, args=("Hello", "fr", "en", "usr_ada")) for _ in range(4)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert peak == 1

    peak = 0
    other = [threading.Thread(target=derive.translate, args=(f"Text {i}", "fr", "en", "usr_ada")) for i in range(3)]
    [t.start() for t in other]
    [t.join() for t in other]
    assert peak > 1  # different texts are not made to wait for each other


def test_what_needs_a_worker():
    needs = derive.needs_background
    assert needs("carousel", "en", "en") and needs("audio", "fr", "en")  # every file
    assert needs("article", "fr", "en") and needs("translation", "fr", "en") and needs("newsletter", "sw", "en")
    assert not needs("article", "en", "en") and not needs("newsletter", "en", "en")  # only rearranged


def test_text_in_another_language_is_queued_not_made_in_the_request():
    assert derive.produce("article", "fr", "Title\nBody", "en")["status"] == "queued"
    assert derive.produce("article", "en", "Title\nBody", "en")["status"] == "ready"


@pytest.mark.parametrize("target, provenance", [("translation", "ai_generated"), ("article", "ai_assisted"), ("newsletter", "ai_assisted")])
def test_a_made_translation_says_what_it_is(ai, target, provenance):
    made = derive.make_text(target, "fr", "The market opens.", "en", "usr_ada")
    assert made["status"] == "ready" and made["provenance"] == provenance and made["simulated"] is False
    assert "marché" in made["content"]


def test_an_article_in_translation_is_escaped_like_any_other(ai):
    ai.reply = Reply(200, {"translated": "<script>alert(1)</script> bonjour", "mock": False, "provider": "ileai"})
    content = derive.make_text("article", "fr", "x", "en", "usr_ada")["content"]
    assert "<script" not in content and "&lt;script&gt;" in content


def test_a_member_who_may_not_be_translated_gets_an_honest_gap(ai):
    ai.reply = Reply(200, {"translated": "[fr] x", "mock": True, "withheld": "account"})
    made = derive.make_text("article", "fr", "x", "en", "usr_teen")
    assert made["status"] == "unsupported" and made["error"] == derive.NOT_FOR_MINORS and made["content"] is None


def test_a_failure_is_a_failed_output_with_its_reason(ai):
    ai.reply = Reply(429, {"detail": "You have reached today's translation allowance (100,000 characters)."})
    made = derive.make_text("newsletter", "fr", "x", "en", "usr_ada")
    assert made["status"] == "failed" and "allowance" in made["error"]


def test_the_stand_ins_translation_is_still_made_but_marked(ai):
    ai.reply = Reply(200, {"translated": "[fr] x", "mock": True, "provider": "mock"})
    made = derive.make_text("translation", "fr", "x", "en", "usr_ada")
    assert made["status"] == "ready" and made["simulated"] is True
