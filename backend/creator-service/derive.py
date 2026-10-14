"""One-to-Many — the part that actually produces something.

`/creators/publish` has always created one output row per (target, language)
and returned 202, on the promise that "the AI layer fills them in
asynchronously". Nothing ever did: every job sat at `queued` forever, which is
the worst kind of feature — it looks like it worked.

This module is the producer, and it is deliberately honest about the split:

* **Producible today.** A *translation* goes through ai-service, which really
  translates (through a mock provider until a model key is configured, and the
  output says so). A *newsletter* and an *article* are deterministic
  restructurings of text the creator already wrote — no model needed, no
  invention.
* **Rendered, not produced here.** carousel, audio, short_video and long_video
  are files: slides, a synthetic voice, an encoded video. They take seconds to
  minutes, so this module only decides whether one can be made and queues it;
  `render.py` makes it and `media_jobs.py` runs it. When this server lacks the
  tools (an image built without them) the output is marked `unsupported` with
  the reason, so the UI can say why instead of spinning.
* **Not made at all.** Dubbing a recording into another language, lip sync and
  editing footage need models and a source video; the engine takes text only.

Nothing here fabricates content the creator did not write. The blueprint's rule
for the AI layer is that it assists the archive and never invents; the same rule
applies to publishing.
"""
from __future__ import annotations

import hashlib
import html
import logging
import re
import textwrap
import threading
from dataclasses import dataclass

import httpx

import render

log = logging.getLogger("creator-service.derive")

AI_URL = "http://ai-service:8000"

# Files, not text: queued here, made by media_jobs.
MEDIA_TARGETS = render.MEDIA_TARGETS


TEXT_TARGETS = ("article", "newsletter", "translation")

# Said to a member whose account may not have its writing sent to a translation provider.
NOT_FOR_MINORS = "Translation into other languages is not available for accounts under 18."


@dataclass
class Translated:
    """What came back from asking for a translation.

    ``simulated`` is true when the answer came from the stand-in provider, which marks the
    text rather than translating it - the output has to say so, or a creator would publish
    "[fr] My market vlog" believing it was French. ``withheld`` is true when the provider
    was deliberately not asked, because the account is not a confirmed adult.
    """

    text: str | None = None
    error: str | None = None
    simulated: bool = False
    withheld: bool = False


# Translating the same text into the same language for the same member, on two workers at
# once (an article and a newsletter and a translation, all in French), would pay for it
# twice: the second request starts before the first has been cached. One at a time per
# (text, languages, member), and the second finds the first's answer waiting.
_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def _gate(key: str) -> threading.Lock:
    with _locks_guard:
        if len(_locks) > 512:
            for stale in [k for k, lock in _locks.items() if not lock.locked()]:
                del _locks[stale]
        return _locks.setdefault(key, threading.Lock())


def translate(text: str, target_lang: str, source_lang: str, user_id: str) -> Translated:
    """Translate through ai-service on behalf of ``user_id``. Never raises."""
    if target_lang == source_lang:
        return Translated(text=text)
    key = hashlib.sha256(f"{user_id}\x00{source_lang}\x00{target_lang}\x00{text}".encode()).hexdigest()
    with _gate(key):
        return _ask(text, target_lang, source_lang, user_id)


def _ask(text: str, target_lang: str, source_lang: str, user_id: str) -> Translated:
    try:
        # Minutes, not seconds: a language model takes the better part of a minute to translate a
        # long text, and this runs on a worker, not in a request somebody is waiting on.
        response = httpx.post(
            f"{AI_URL}/internal/translate",
            json={"text": text, "target_lang": target_lang, "source_lang": source_lang, "user_id": user_id},
            timeout=300,
        )
    except Exception as exc:
        log.warning("translation failed (%s): %s", target_lang, type(exc).__name__)
        return Translated(error=f"translation service unavailable: {type(exc).__name__}")
    if response.status_code != 200:
        log.warning("translation refused (%s): HTTP %d", target_lang, response.status_code)
        if response.status_code in (429, 502, 503):
            # ai-service's own words (the allowance, the paused budget, a provider's failure in
            # a sentence written to be shown): safe, and what the creator needs to read.
            try:
                return Translated(error=str(response.json().get("detail"))[:300])
            except ValueError:
                pass
        return Translated(error="translation service unavailable")
    data = response.json()
    if data.get("withheld"):
        return Translated(withheld=True)
    simulated = bool(data.get("mock")) or data.get("provider") == "mock"
    return Translated(text=data.get("translated"), simulated=simulated)


def needs_background(target: str, lang: str, source_lang: str) -> bool:
    """Whether an output is made by a worker rather than inside the request: every file, and
    every text that has to be translated (a translation takes seconds to minutes with a real
    provider, and a request has thirty)."""
    return target in MEDIA_TARGETS or (target in TEXT_TARGETS and lang != source_lang)


def _newsletter(text: str, lang: str) -> str:
    """An email-shaped version of what the creator wrote.

    A restructuring, not a rewrite: the first line becomes the subject, the body
    is wrapped for email clients, and a footer is appended. Every word is the
    creator's own — an LLM-written newsletter would be a different text
    attributed to them, which is not what "also create" promises.
    """
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    subject = lines[0][:120] if lines else "Your update"
    body = "\n\n".join(textwrap.fill(line, width=78) for line in lines)
    return f"Subject: {subject}\n\n{body}\n\n—\nSent to your subscribers on Kinjy."


def _article(text: str, lang: str) -> str:
    """A long-form scaffold around the creator's own text.

    The heading is their first line and the body is their words; what is added
    is structure, not sentences. Anything more would be the model writing in
    their name.
    """
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    if not lines:
        return text
    heading, rest = lines[0], lines[1:]
    # The creator's words are text, and this output is HTML: every character they
    # typed is escaped. Without it a line containing "<script>" would be stored
    # as markup and run wherever the article is shown.
    paragraphs = "\n".join(f"<p>{html.escape(line, quote=False)}</p>" for line in (rest or lines))
    return f"<h2>{html.escape(heading, quote=False)}</h2>\n{paragraphs}"


def to_text(target: str, content: str | None) -> str | None:
    """The words of an output with no markup, for showing and copying.

    Only an article is HTML; it is read back with a pattern that knows the two
    tags `_article` writes, so a client never has to render stored markup.
    """
    if content is None or target != "article":
        return content
    parts = re.findall(r"<(?:h2|p)>(.*?)</(?:h2|p)>", content, flags=re.S)
    return "\n\n".join(html.unescape(part) for part in parts) if parts else html.unescape(content)


def produce(target: str, lang: str, source_text: str, source_lang: str) -> dict:
    """Produce one output row's content.

    Returns ``{status, content, error, provenance}``. Never raises: one target
    failing must not abandon the rest of the job.
    """
    if target in MEDIA_TARGETS:
        reason = render.unavailable(target)
        if reason:
            return {"status": "unsupported", "content": None, "error": reason, "provenance": None, "simulated": False}
        if not source_text or not source_text.strip():
            return {"status": "failed", "content": None, "error": "no source text", "provenance": None, "simulated": False}
        # Not made now: the row is queued and media_jobs renders it, translating
        # first when the language differs. Nothing is promised until it is ready.
        return {"status": "queued", "content": None, "error": None, "provenance": None, "simulated": False}

    if not source_text or not source_text.strip():
        return {"status": "failed", "content": None, "error": "no source text", "provenance": None, "simulated": False}

    if target in TEXT_TARGETS and lang != source_lang:
        # Needs a translation: queued, and made by media_jobs (make_text below).
        return {"status": "queued", "content": None, "error": None, "provenance": None, "simulated": False}

    # The creator's own language: a restructuring of their words, made here and now.
    if target == "newsletter":
        return {"status": "ready", "content": _newsletter(source_text, lang), "error": None, "simulated": False, "provenance": "edited"}
    if target == "article":
        return {"status": "ready", "content": _article(source_text, lang), "error": None, "simulated": False, "provenance": "edited"}
    if target == "translation":
        # "Translate it into the language it is already in": the caller does not ask for this,
        # and if it did there would be nothing to say but the original.
        return {"status": "ready", "content": source_text, "error": None, "simulated": False, "provenance": "original"}

    return {"status": "failed", "content": None, "error": f"unknown target {target}", "provenance": None, "simulated": False}


def make_text(target: str, lang: str, source_text: str, source_lang: str, user_id: str) -> dict:
    """The text output that needs a translation, made on a worker. Never raises.

    Same result shape as :func:`produce`. A member who may not have their writing sent to a
    provider gets ``unsupported`` with the reason, not an invented translation.
    """
    translated = translate(source_text, lang, source_lang, user_id)
    if translated.withheld:
        return {"status": "unsupported", "content": None, "error": NOT_FOR_MINORS, "provenance": None, "simulated": False}
    if translated.error or not translated.text:
        return {"status": "failed", "content": None, "error": translated.error or "the translation came back empty", "provenance": None, "simulated": False}
    text = translated.text
    if target == "translation":
        content, provenance = text, "ai_generated"  # a machine's output; the label travels with it
    elif target == "newsletter":
        content, provenance = _newsletter(text, lang), "ai_assisted"
    else:
        content, provenance = _article(text, lang), "ai_assisted"
    return {"status": "ready", "content": content, "error": None, "simulated": translated.simulated, "provenance": provenance}
