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
* **Not producible today.** short_video, long_video, audio and carousel need a
  media pipeline — encoding, text-to-speech, dubbing, lip sync — that does not
  exist in this deployment. Those outputs are marked `unsupported` with the
  reason attached, so the UI can say why instead of spinning.

Nothing here fabricates content the creator did not write. The blueprint's rule
for the AI layer is that it assists the archive and never invents; the same rule
applies to publishing.
"""
from __future__ import annotations

import logging
import textwrap

import httpx

log = logging.getLogger("creator-service.derive")

AI_URL = "http://ai-service:8000"

# What a media pipeline would be needed for. Kept as data so the message in the
# UI and the reason stored on the row cannot drift apart.
NEEDS_MEDIA_PIPELINE = {
    "short_video": "needs video rendering and auto-captioning",
    "long_video": "needs video rendering and dubbing",
    "audio": "needs text-to-speech",
    "carousel": "needs image composition",
}


def _translate(text: str, target_lang: str, source_lang: str) -> tuple[str | None, str | None]:
    """Translate through ai-service. Returns (content, error)."""
    if target_lang == source_lang:
        return text, None
    try:
        response = httpx.post(
            f"{AI_URL}/ai/translate",
            json={"text": text, "target_lang": target_lang, "source_lang": source_lang},
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("translated"), None
    except Exception as exc:
        log.warning("translation failed (%s): %s", target_lang, exc)
        return None, f"translation service unavailable: {type(exc).__name__}"


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
    paragraphs = "\n".join(f"<p>{line}</p>" for line in (rest or lines))
    return f"<h2>{heading}</h2>\n{paragraphs}"


def produce(target: str, lang: str, source_text: str, source_lang: str) -> dict:
    """Produce one output row's content.

    Returns ``{status, content, error, provenance}``. Never raises: one target
    failing must not abandon the rest of the job.
    """
    if target in NEEDS_MEDIA_PIPELINE:
        return {
            "status": "unsupported",
            "content": None,
            "error": NEEDS_MEDIA_PIPELINE[target],
            "provenance": None,
        }

    if not source_text or not source_text.strip():
        return {"status": "failed", "content": None, "error": "no source text", "provenance": None}

    if target == "translation":
        content, error = _translate(source_text, lang, source_lang)
        if error:
            return {"status": "failed", "content": None, "error": error, "provenance": None}
        return {
            "status": "ready",
            "content": content,
            "error": None,
            # Machine translation is a machine's output, and the label travels
            # with it — the blueprint's provenance rule is not only for posts.
            "provenance": "ai_generated" if lang != source_lang else "original",
        }

    if target == "newsletter":
        text = source_text
        if lang != source_lang:
            translated, error = _translate(source_text, lang, source_lang)
            if error:
                return {"status": "failed", "content": None, "error": error, "provenance": None}
            text = translated or source_text
        return {
            "status": "ready",
            "content": _newsletter(text, lang),
            "error": None,
            "provenance": "ai_assisted" if lang != source_lang else "edited",
        }

    if target == "article":
        text = source_text
        if lang != source_lang:
            translated, error = _translate(source_text, lang, source_lang)
            if error:
                return {"status": "failed", "content": None, "error": error, "provenance": None}
            text = translated or source_text
        return {
            "status": "ready",
            "content": _article(text, lang),
            "error": None,
            "provenance": "ai_assisted" if lang != source_lang else "edited",
        }

    return {"status": "failed", "content": None, "error": f"unknown target {target}", "provenance": None}
