"""Text a member writes where other members read it: names, bios, places.

Shared by auth-service (the account name, at registration and on sync) and
user-service (the profile). One copy of the rules, because the name is
written in both places and a rule enforced on only one of them is a rule
that can be walked around through the other.

The functions raise ValueError so they can back Pydantic validators directly.
"""
from __future__ import annotations

import re
import unicodedata

DISPLAY_NAME_MIN = 2
DISPLAY_NAME_MAX = 120

_CONTROL = re.compile(r"[\x00-\x1f\x7f]")
_CONTROL_EXCEPT_LINES = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
# Direction overrides and isolates: text that renders differently from what it
# says ("Amina‮..." can display as "Kinjy Support").
_BIDI_CONTROLS = re.compile("[‪-‮⁦-⁩]")


def has_invisible(text: str) -> bool:
    """Unicode format characters (category Cf): zero-width spaces and joiners,
    direction marks, BOM. Invisible, so never needed on a one-line field."""
    return any(unicodedata.category(ch) == "Cf" for ch in text)


def visible(text: str) -> str:
    """The text without its invisible characters: what a reader actually sees."""
    return "".join(ch for ch in text if unicodedata.category(ch) != "Cf")


def clean_text(value: str | None, max_length: int, *, multiline: bool = False) -> str | None:
    """Trimmed text, or None when blank (which clears the field)."""
    if value is None:
        return None
    text = value.replace("\r\n", "\n").strip() if multiline else value.strip()
    if not text:
        return None
    pattern = _CONTROL_EXCEPT_LINES if multiline else _CONTROL
    if pattern.search(text):
        raise ValueError("must not contain control characters")
    if multiline:
        # A bio keeps the zero-width joiner (it is what makes 👨‍👩‍👧 one emoji)
        # but never a direction override.
        if _BIDI_CONTROLS.search(text):
            raise ValueError("must not contain text-direction override characters")
    elif has_invisible(text):
        raise ValueError("must not contain invisible formatting characters")
    if len(text) > max_length:
        raise ValueError(f"must be at most {max_length} characters")
    return text


def clean_display_name(value: str) -> str:
    """NFKC first, so full-width and compatibility letters fold to ordinary
    ones before any check. Homoglyphs across scripts (a Cyrillic "а" for a Latin
    "a") are not caught here; the handle, ASCII-only, is the identity."""
    text = clean_text(unicodedata.normalize("NFKC", value), DISPLAY_NAME_MAX)
    if text is None or len(text) < DISPLAY_NAME_MIN:
        raise ValueError(f"must be at least {DISPLAY_NAME_MIN} characters")
    return text
