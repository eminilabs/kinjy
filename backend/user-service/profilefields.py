"""Rules for what a member may write on their profile.

A profile is public: every visitor, minors and signed-out readers included,
sees the name, bio and place. The functions raise ValueError so they can back
Pydantic validators directly, and are pure apart from the classifier call.
"""
from __future__ import annotations

import re
import unicodedata

from common import classifier, settings
from common.agesafety import AgeProfile, ContentRating, engine
from common.countries import COUNTRY_CODES

DISPLAY_NAME_MAX = 120
BIO_MAX = 2000
STATE_MAX = 80
CITY_MAX = 120
NEIGHBOURHOOD_MAX = 120
MAX_LANGUAGES = 8

_LANGUAGE_CODE = re.compile(r"^[a-z]{2,3}$")
_CONTROL = re.compile(r"[\x00-\x1f\x7f]")
_CONTROL_EXCEPT_LINES = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
# Direction overrides and isolates: text that renders differently from what it
# says ("Amina‮..." can display as "Kinjy Support").
_BIDI_CONTROLS = re.compile("[‪-‮⁦-⁩]")


def _has_invisible(text: str) -> bool:
    """Unicode format characters (category Cf): zero-width spaces and joiners,
    direction marks, BOM. Invisible, so never needed on a one-line field."""
    return any(unicodedata.category(ch) == "Cf" for ch in text)


def _visible(text: str) -> str:
    return "".join(ch for ch in text if unicodedata.category(ch) != "Cf")

# One message for every refusal: explaining which rule tripped explains how to
# word around it.
BIO_REFUSED = "This bio cannot be published. Profiles are visible to everyone, including younger members."


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
    elif _has_invisible(text):
        raise ValueError("must not contain invisible formatting characters")
    if len(text) > max_length:
        raise ValueError(f"must be at most {max_length} characters")
    return text


def clean_display_name(value: str) -> str:
    """NFKC first, so full-width and compatibility letters fold to ordinary
    ones before any check. Homoglyphs across scripts (a Cyrillic "а" for a Latin
    "a") are not caught here; the handle, ASCII-only, is the identity."""
    text = clean_text(unicodedata.normalize("NFKC", value), DISPLAY_NAME_MAX)
    if text is None or len(text) < 2:
        raise ValueError("must be at least 2 characters")
    return text


def clean_country(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    code = value.strip().upper()
    if code not in COUNTRY_CODES:
        raise ValueError("must be an ISO 3166 country code, e.g. CD or FR")
    return code


def clean_languages(value: str) -> str:
    """Languages the member speaks, as ISO 639 codes, most fluent first.

    Not limited to the interface languages: a member who speaks Lingala should
    be able to say so even though Kinjy is not translated into it.
    """
    codes: list[str] = []
    for part in value.split(","):
        code = part.strip().lower()
        if not code:
            continue
        if not _LANGUAGE_CODE.match(code):
            raise ValueError("must be ISO 639 language codes separated by commas, e.g. fr,ln")
        if code not in codes:
            codes.append(code)
    if not codes:
        raise ValueError("must list at least one language")
    if len(codes) > MAX_LANGUAGES:
        raise ValueError(f"must list at most {MAX_LANGUAGES} languages")
    return ",".join(codes)


def clean_lang(value: str) -> str:
    """The interface language: one Kinjy is actually translated into."""
    code = value.strip().lower()
    if code not in settings.SUPPORTED_LANGS:
        raise ValueError(f"must be one of: {', '.join(settings.SUPPORTED_LANGS)}")
    return code


def bio_problem(bio: str, *, author_is_minor: bool) -> str | None:
    """Why this bio is refused, or None.

    Stricter than a post: a post can be withheld from the readers it does not
    suit, a profile is shown to all of them. So only GENERAL passes.
    """
    # Read without invisible characters: "p​orn" must be read as the word
    # it displays as. The bio itself is stored as written.
    verdict = classifier.classify(body=_visible(bio), media_kinds=[], author_is_minor=author_is_minor)
    if verdict.block_publication or verdict.age_rating != ContentRating.GENERAL.value:
        return BIO_REFUSED
    return None


def may_set_neighbourhood(who: AgeProfile) -> bool:
    """A neighbourhood is a precise location: an 18+ feature in the age engine.
    An unknown age is treated as a minor, so an outage does not open it."""
    return bool(engine.can_use_feature(who, "precise_location").allowed)
