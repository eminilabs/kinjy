"""The content classifier.

The failure that matters here is one-directional. Wrongly restricting a holiday
photo annoys an adult; wrongly clearing adult material puts it in front of a
child. These tests are weighted accordingly: most of them assert that something
was *not* released.

Run: python -m pytest backend/tests/test_classifier.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import common.classifier as classifier  # noqa: E402
from common.agesafety import ContentRating  # noqa: E402


def run(body="", media=None, minor=False, declared=False, model=False):
    with patch.object(classifier, "model_available", return_value=model):
        return classifier.classify(
            body=body,
            media_kinds=media or [],
            author_is_minor=minor,
            declared_mature=declared,
        )


# ---------------------------------------------------------------------------
# The thing a text heuristic must never do
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("kind", ["image", "video", "audio", "carousel"])
def test_a_post_with_media_is_never_cleared_by_reading_the_caption(kind):
    """No amount of reading the caption tells you what is in the picture."""
    result = run(body="Sunrise over the bay, lovely morning", media=[kind])
    assert result.age_rating == ContentRating.UNCLASSIFIED.value
    assert result.human_review_status == "pending"


def test_media_posts_go_to_a_human_queue_rather_than_being_guessed():
    result = run(body="family picnic", media=["image"])
    assert "media_needs_review" in result.reasons
    assert result.classifier_confidence == 0.0


def test_a_declared_warning_on_a_media_post_tightens_it_immediately():
    result = run(body="", media=["image"], declared=True)
    assert result.age_rating == ContentRating.ADULT_18_PLUS.value


# ---------------------------------------------------------------------------
# Text-only
# ---------------------------------------------------------------------------

def test_ordinary_text_is_cleared():
    result = run(body="Anyone going to the market on Saturday?")
    assert result.age_rating == ContentRating.GENERAL.value
    assert result.human_review_status == "none"


def test_explicit_text_is_rated_adult():
    result = run(body="Full nudes available, check my onlyfans")
    assert result.age_rating == ContentRating.ADULT_18_PLUS.value


def test_gambling_promotion_is_kept_from_younger_teens():
    result = run(body="New casino with free spins and a sign-up bonus")
    assert result.age_rating == ContentRating.TEEN_16_PLUS.value
    assert result.levels["gambling_level"] == 2


def test_alcohol_mention_is_graded_lightly_not_banned():
    result = run(body="We played beer pong at the reunion")
    assert result.age_rating == ContentRating.TEEN_13_PLUS.value


def test_self_harm_content_is_withheld_from_every_minor():
    result = run(body="Looking for thinspo accounts to follow")
    assert result.age_rating == ContentRating.ADULT_18_PLUS.value
    assert result.human_review_status == "pending"


# ---------------------------------------------------------------------------
# Self-labelling is a signal, never the check
# ---------------------------------------------------------------------------

def test_an_author_warning_tightens_a_rating():
    plain = run(body="Just a thought I had today")
    warned = run(body="Just a thought I had today", declared=True)
    assert plain.age_rating == ContentRating.GENERAL.value
    assert warned.age_rating == ContentRating.ADULT_18_PLUS.value


def test_an_author_cannot_clear_their_own_explicit_text():
    """Not declaring a warning does not make explicit content general."""
    result = run(body="explicit sex content here", declared=False)
    assert result.age_rating == ContentRating.ADULT_18_PLUS.value


# ---------------------------------------------------------------------------
# Minors uploading (§18)
# ---------------------------------------------------------------------------

def test_a_minor_posting_sexual_content_is_blocked_not_rated_adult():
    """The rule this exists for: it must not become an 18+ post shown to adults."""
    result = run(body="here are my nudes", minor=True)
    assert result.block_publication is True
    assert result.escalate_child_safety is True
    assert result.age_rating == ContentRating.PROHIBITED.value


def test_the_same_text_from_an_adult_is_rated_not_blocked():
    result = run(body="here are my nudes", minor=False)
    assert result.block_publication is False
    assert result.age_rating == ContentRating.ADULT_18_PLUS.value


def test_a_minor_posting_ordinary_content_is_unaffected():
    result = run(body="finished my exams today", minor=True)
    assert result.block_publication is False
    assert result.age_rating == ContentRating.GENERAL.value


# ---------------------------------------------------------------------------
# Exploitation is a different kind of problem
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("text", [
    "selling child p material",
    "underage nude pics for trade",
    "this is sextortion, pay or I post",
])
def test_exploitation_signals_stop_publication_entirely(text):
    result = run(body=text)
    assert result.block_publication is True
    assert result.escalate_child_safety is True
    assert result.exploitation_risk == 3
    assert result.age_rating == ContentRating.PROHIBITED.value


def test_an_exploitation_refusal_does_not_say_what_matched():
    """A message naming the phrase is a guide to rewording it."""
    result = run(body="underage nude pics for trade")
    assert result.reasons == ["exploitation_signal"]


def test_exploitation_is_checked_before_anything_else():
    """Even with an author warning and media, it short-circuits."""
    result = run(body="trafficking ring", media=["image"], declared=True, minor=False)
    assert result.block_publication is True


# ---------------------------------------------------------------------------
# Community reports restrict, never release
# ---------------------------------------------------------------------------

def test_enough_reports_pull_content_back_behind_review():
    assert classifier.reclassify_on_report(ContentRating.GENERAL.value, 3) == \
        ContentRating.UNCLASSIFIED.value


def test_a_few_reports_do_not():
    assert classifier.reclassify_on_report(ContentRating.GENERAL.value, 2) is None


def test_reports_cannot_clear_an_adult_rating():
    """Otherwise brigading would be a way to un-rate adult content."""
    assert classifier.reclassify_on_report(ContentRating.ADULT_18_PLUS.value, 50) is None


# ---------------------------------------------------------------------------
# Confidence is reported honestly
# ---------------------------------------------------------------------------

def test_a_clean_text_post_is_confident_and_a_matched_one_is_not():
    clean = run(body="good morning everyone")
    matched = run(body="beer pong night")
    assert clean.classifier_confidence > matched.classifier_confidence
    assert matched.human_review_status == "pending"


def test_a_model_changes_what_media_can_be_cleared_to():
    """With a moderation model configured, media stops being opaque."""
    without = run(body="a nice day", media=["image"], model=False)
    with_model = run(body="a nice day", media=["image"], model=True)
    assert without.age_rating == ContentRating.UNCLASSIFIED.value
    assert with_model.age_rating == ContentRating.GENERAL.value
