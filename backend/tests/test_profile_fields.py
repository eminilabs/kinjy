"""Profile field rules (user-service/profilefields.py).

A profile is public: every visitor, including minors and signed-out readers,
sees the name, bio and place. These rules decide what may be written there.

Run: python -m pytest backend/tests/test_profile_fields.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "user-service"))
import common.classifier as classifier  # noqa: E402
import profilefields  # noqa: E402
from common.agesafety import AgeProfile, AgeTier  # noqa: E402


# ---------------------------------------------------------------------------
# Free text
# ---------------------------------------------------------------------------

def test_text_is_trimmed():
    assert profilefields.clean_text("  Kinshasa  ", 120) == "Kinshasa"


@pytest.mark.parametrize("value", ["", "   ", None])
def test_blank_text_clears_the_field(value):
    assert profilefields.clean_text(value, 120) is None


def test_text_over_the_column_width_is_refused():
    with pytest.raises(ValueError):
        profilefields.clean_text("x" * 121, 120)


@pytest.mark.parametrize("value", ["Paris\x00", "a\x1bb", "line\nbreak"])
def test_control_characters_are_refused_on_one_line_fields(value):
    with pytest.raises(ValueError):
        profilefields.clean_text(value, 120)


def test_a_bio_may_span_several_lines():
    assert profilefields.clean_text("one\r\ntwo\n\tthree", 2000, multiline=True) == "one\ntwo\n\tthree"


def test_a_bio_still_refuses_other_control_characters():
    with pytest.raises(ValueError):
        profilefields.clean_text("one\x07two", 2000, multiline=True)


@pytest.mark.parametrize("value", ["", " ", "A", " B "])
def test_a_display_name_needs_two_characters(value):
    with pytest.raises(ValueError):
        profilefields.clean_display_name(value)


def test_a_display_name_is_trimmed():
    assert profilefields.clean_display_name("  Amina Diallo ") == "Amina Diallo"


# ---------------------------------------------------------------------------
# Invisible characters: impersonation and classifier evasion
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("value", [
    "Amina‮roppuS yjniK",  # right-to-left override: renders reversed
    "Kinjy​Support",        # zero-width space
    "Ami‍na",               # zero-width joiner
    "⁦Kinjy⁩",         # bidi isolate
    "Amina﻿",               # BOM / zero-width no-break space
])
def test_a_display_name_refuses_invisible_formatting_characters(value):
    with pytest.raises(ValueError):
        profilefields.clean_display_name(value)


def test_a_display_name_is_nfkc_normalised():
    """Full-width and compatibility forms fold to their ordinary letters."""
    assert profilefields.clean_display_name("Ａｍｉｎａ") == "Amina"


def test_non_latin_names_are_welcome():
    assert profilefields.clean_display_name("أمينة ديالو") == "أمينة ديالو"
    assert profilefields.clean_display_name("李明") == "李明"


def test_one_line_fields_refuse_invisible_characters():
    with pytest.raises(ValueError):
        profilefields.clean_text("Kin​shasa", 120)


def test_a_bio_refuses_bidi_overrides():
    with pytest.raises(ValueError):
        profilefields.clean_text("Hello ‮ dlrow", 2000, multiline=True)


def test_a_bio_keeps_emoji_sequences():
    """The zero-width joiner is what makes a family emoji one glyph."""
    family = "Papa de 3 \U0001F468‍\U0001F469‍\U0001F467"
    assert profilefields.clean_text(family, 2000, multiline=True) == family


def test_the_classifier_reads_the_bio_without_invisible_characters():
    """Zero-width characters inside a word are a classic keyword-filter bypass."""
    evasive = "explicit p​orn n​ude s​ex videos, dm me"
    assert bio(evasive) is not None


# ---------------------------------------------------------------------------
# Country
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("value,expected", [("cd", "CD"), (" FR ", "FR"), ("xk", "XK")])
def test_a_real_country_code_is_normalised(value, expected):
    assert profilefields.clean_country(value) == expected


@pytest.mark.parametrize("value", ["ZZ", "XX", "FRA", "F", "12", "Fr1"])
def test_anything_but_an_iso_country_code_is_refused(value):
    """The old rule was max_length=2, so "ZZ" was a valid country."""
    with pytest.raises(ValueError):
        profilefields.clean_country(value)


@pytest.mark.parametrize("value", ["", None])
def test_a_blank_country_clears_it(value):
    assert profilefields.clean_country(value) is None


# ---------------------------------------------------------------------------
# Languages spoken (shown on the profile) vs interface language
# ---------------------------------------------------------------------------

def test_spoken_languages_are_normalised_and_deduplicated_in_order():
    assert profilefields.clean_languages(" FR, ln ,fr,sw ") == "fr,ln,sw"


def test_spoken_languages_are_not_limited_to_the_interface_languages():
    """Lingala is not a Kinjy interface language, but members speak it."""
    assert profilefields.clean_languages("ln,wo,yo") == "ln,wo,yo"


@pytest.mark.parametrize("value", ["", " , ", "french", "f", "fr;en", "fr,<b>"])
def test_malformed_spoken_languages_are_refused(value):
    with pytest.raises(ValueError):
        profilefields.clean_languages(value)


def test_at_most_eight_spoken_languages():
    assert profilefields.clean_languages("aa,ab,af,ak,am,an,ar,as")
    with pytest.raises(ValueError):
        profilefields.clean_languages("aa,ab,af,ak,am,an,ar,as,av")


@pytest.mark.parametrize("value", ["fr", " EN ", "sw", "ar", "zh"])
def test_the_interface_language_must_be_supported(value):
    assert profilefields.clean_lang(value) == value.strip().lower()


@pytest.mark.parametrize("value", ["de", "ln", "", "french"])
def test_an_unsupported_interface_language_is_refused(value):
    with pytest.raises(ValueError):
        profilefields.clean_lang(value)


# ---------------------------------------------------------------------------
# Bio: public text, readable by minors
# ---------------------------------------------------------------------------

def bio(text, minor=False):
    with patch.object(classifier, "model_available", return_value=False):
        return profilefields.bio_problem(text, author_is_minor=minor)


def test_an_ordinary_bio_is_accepted():
    assert bio("Agronome à Kigoma. J'aime la cuisine et le football.") is None


def test_an_explicit_bio_is_refused():
    """A profile is shown to every visitor, minors included."""
    assert bio("explicit porn nude sex videos, dm me") is not None


def test_a_refusal_does_not_explain_which_rule_tripped():
    message = bio("explicit porn nude sex videos, dm me")
    assert "porn" not in message.lower() and "adult" not in message.lower()


# ---------------------------------------------------------------------------
# Neighbourhood is a precise location
# ---------------------------------------------------------------------------

def profile(tier, age):
    return AgeProfile(tier=tier, age=age)


def test_an_adult_may_set_a_neighbourhood():
    assert profilefields.may_set_neighbourhood(profile(AgeTier.ADULT, 30))


@pytest.mark.parametrize("tier,age", [
    (AgeTier.TEEN_PROTECTED, 17),
    (AgeTier.TEEN_HIGH_PROTECTION, 14),
    (AgeTier.UNKNOWN, None),
])
def test_a_minor_or_an_unknown_age_may_not(tier, age):
    """precise_location is an 18+ feature in the age engine; an identity outage
    must not become a way around it."""
    assert not profilefields.may_set_neighbourhood(profile(tier, age))
