"""Rules for what a member may write on their profile.

A profile is public: every visitor, minors and signed-out readers included,
sees the name, bio and place. The functions raise ValueError so they can back
Pydantic validators directly, and are pure apart from the classifier call.
"""
from __future__ import annotations

import re

from common import classifier, settings
from common.agesafety import AgeProfile, ContentRating, engine
from common.countries import COUNTRY_CODES
# The Unicode rules live in common so auth-service applies the same ones to the
# account name; re-exported here because the profile validators use them.
from common.textclean import DISPLAY_NAME_MAX, clean_display_name, clean_text, visible  # noqa: F401

BIO_MAX = 2000
STATE_MAX = 80
CITY_MAX = 120
NEIGHBOURHOOD_MAX = 120
MAX_LANGUAGES = 8

_LANGUAGE_CODE = re.compile(r"^[a-z]{2,3}$")

# One message for every refusal: explaining which rule tripped explains how to
# word around it.
BIO_REFUSED = "This bio cannot be published. Profiles are visible to everyone, including younger members."


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
    verdict = classifier.classify(body=visible(bio), media_kinds=[], author_is_minor=author_is_minor)
    if verdict.block_publication or verdict.age_rating != ContentRating.GENERAL.value:
        return BIO_REFUSED
    return None


def may_set_neighbourhood(who: AgeProfile) -> bool:
    """A neighbourhood is a precise location: an 18+ feature in the age engine.
    An unknown age is treated as a minor, so an outage does not open it."""
    return bool(engine.can_use_feature(who, "precise_location").allowed)
