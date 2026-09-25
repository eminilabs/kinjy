"""The age-safety engine, exercised against the scenarios in the specification.

These are the tests that matter most in this codebase. Every one of them
describes a way a child could reach something they should not, so a failure
here is not a regression in a feature — it is a safeguarding failure.

Run: python -m pytest backend/tests/test_agesafety.py -q
"""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from common.agesafety import (  # noqa: E402
    AgeProfile,
    AgeSafetyPolicyEngine,
    AgeTier,
    ContentRating,
    Reason,
    SafetyClassification,
    age_on,
    may_change_setting,
    privacy_defaults_for,
    resolve_policy,
)

TODAY = date(2026, 9, 25)
engine = AgeSafetyPolicyEngine()


def born_aged(years: int, *, today: date = TODAY) -> date:
    """A birth date that makes someone exactly `years` old today."""
    return date(today.year - years, today.month, today.day)


def profile(age: int, jurisdiction: str = "US") -> AgeProfile:
    policy = resolve_policy(jurisdiction)
    return AgeProfile(
        user_id=f"usr_{age}",
        tier=policy.tier_for_age(age),
        age=age,
        jurisdiction=jurisdiction,
        policy_version=policy.policy_version,
    )


def rated(rating: ContentRating, **levels) -> SafetyClassification:
    return SafetyClassification(content_id="pst_1", age_rating=rating, **levels)


# ---------------------------------------------------------------------------
# Age arithmetic — the foundation everything else rests on
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "born, today, expected",
    [
        (date(2013, 9, 25), date(2026, 9, 25), 13),   # birthday today
        (date(2013, 9, 26), date(2026, 9, 25), 12),   # birthday tomorrow
        (date(2008, 2, 29), date(2026, 2, 28), 17),   # leap-day birthday, non-leap year
        (date(2008, 2, 29), date(2026, 3, 1), 18),
    ],
)
def test_age_arithmetic_is_exact(born, today, expected):
    """Off-by-one here is the difference between a 12-year-old and a member."""
    assert age_on(born, today) == expected


# ---------------------------------------------------------------------------
# Registration (§1, §3, §57)
# ---------------------------------------------------------------------------

def test_twelve_year_old_is_refused():
    verdict, tier, _ = engine.registration_eligibility(born_aged(12), TODAY, "US")
    assert not verdict.allowed
    assert tier is AgeTier.UNDER_MINIMUM


def test_thirteen_year_old_gets_the_strongest_teen_protection():
    verdict, tier, _ = engine.registration_eligibility(born_aged(13), TODAY, "US")
    assert verdict.allowed
    assert tier is AgeTier.TEEN_HIGH_PROTECTION


@pytest.mark.parametrize("age, expected", [
    (13, AgeTier.TEEN_HIGH_PROTECTION),
    (15, AgeTier.TEEN_HIGH_PROTECTION),
    (16, AgeTier.TEEN_PROTECTED),
    (17, AgeTier.TEEN_PROTECTED),
    (18, AgeTier.ADULT),
    (21, AgeTier.ADULT),
])
def test_tier_boundaries(age, expected):
    _, tier, _ = engine.registration_eligibility(born_aged(age), TODAY, "US")
    assert tier is expected


def test_jurisdiction_can_raise_the_minimum_but_never_lower_it():
    """Germany requires 16; a 14-year-old is refused there and admitted in the US."""
    assert not engine.registration_eligibility(born_aged(14), TODAY, "DE")[0].allowed
    assert engine.registration_eligibility(born_aged(14), TODAY, "US")[0].allowed


def test_a_misconfigured_jurisdiction_cannot_drop_below_the_kinjy_floor():
    """A compliance mistake must not open the platform to nine-year-olds."""
    from dataclasses import replace
    from common.agesafety import DEFAULT_POLICY

    reckless = {"XX": replace(DEFAULT_POLICY, jurisdiction="XX", minimum_registration_age=8)}
    lax_engine = AgeSafetyPolicyEngine(reckless)
    verdict, tier, policy = lax_engine.registration_eligibility(born_aged(9), TODAY, "XX")
    assert policy.minimum_registration_age == 13
    assert not verdict.allowed
    assert tier is AgeTier.UNDER_MINIMUM


def test_a_birth_date_in_the_future_is_refused():
    verdict, _, _ = engine.registration_eligibility(date(2030, 1, 1), TODAY, "US")
    assert not verdict.allowed


# ---------------------------------------------------------------------------
# Content access (§11, §12, §13, §57)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("age", [13, 14, 15, 16, 17])
def test_no_minor_of_any_age_reaches_adult_content(age):
    verdict = engine.can_view_content(profile(age), rated(ContentRating.ADULT_18_PLUS))
    assert not verdict.allowed
    assert verdict.reason is Reason.AGE_RESTRICTED


def test_an_adult_reaches_adult_content():
    assert engine.can_view_content(profile(25), rated(ContentRating.ADULT_18_PLUS)).allowed


def test_a_fifteen_year_old_cannot_see_sixteen_plus_content():
    assert not engine.can_view_content(profile(15), rated(ContentRating.TEEN_16_PLUS)).allowed
    assert engine.can_view_content(profile(16), rated(ContentRating.TEEN_16_PLUS)).allowed


def test_prohibited_content_is_refused_to_everyone_including_adults():
    verdict = engine.can_view_content(profile(40), rated(ContentRating.PROHIBITED))
    assert not verdict.allowed
    assert verdict.reason is Reason.PROHIBITED_CONTENT


def test_exploitation_risk_overrides_every_other_rule():
    """Material flagged for exploitation risk is refused even to an adult and
    even when someone has rated it GENERAL."""
    verdict = engine.can_view_content(
        profile(40), rated(ContentRating.GENERAL, exploitation_risk=2)
    )
    assert not verdict.allowed
    assert verdict.reason is Reason.PROHIBITED_CONTENT


# ---------------------------------------------------------------------------
# Failing closed (§47, §32)
# ---------------------------------------------------------------------------

def test_unclassified_content_is_withheld_from_minors():
    verdict = engine.can_view_content(profile(15), rated(ContentRating.UNCLASSIFIED))
    assert not verdict.allowed
    assert verdict.reason is Reason.AGE_RESTRICTED


def test_content_with_no_classification_at_all_is_withheld_from_minors():
    verdict = engine.can_view_content(profile(15), None)
    assert not verdict.allowed
    assert verdict.reason is Reason.UNCLASSIFIED_CONTENT


def test_a_signed_out_visitor_is_not_an_adult():
    """Opening the link in a private window must not be a bypass."""
    anon = AgeProfile.anonymous()
    assert anon.is_minor
    assert not engine.can_view_content(anon, rated(ContentRating.ADULT_18_PLUS)).allowed


def test_an_account_under_age_review_is_treated_as_a_minor():
    under_review = AgeProfile(user_id="usr_x", tier=AgeTier.AGE_REVIEW_REQUIRED, age=None)
    assert not engine.can_view_content(under_review, rated(ContentRating.ADULT_18_PLUS)).allowed


def test_a_degraded_lookup_does_not_grant_adult_access():
    """When the identity service is unreachable the viewer is not an adult."""
    degraded = AgeProfile(user_id="usr_x", tier=AgeTier.UNKNOWN, age=None, degraded=True)
    assert not engine.can_view_content(degraded, rated(ContentRating.ADULT_18_PLUS)).allowed
    assert not engine.can_view_content(degraded, rated(ContentRating.TEEN_16_PLUS)).allowed


# ---------------------------------------------------------------------------
# Graded categories (§10, §36)
# ---------------------------------------------------------------------------

def test_a_younger_teen_is_shielded_from_graded_categories_a_bare_rating_would_allow():
    """Rated for 13+, but carrying gambling promotion: refused to a 14-year-old."""
    content = rated(ContentRating.TEEN_13_PLUS, gambling_level=2)
    verdict = engine.can_view_content(profile(14), content)
    assert not verdict.allowed
    assert verdict.reason is Reason.SENSITIVE_CATEGORY


def test_the_same_content_is_graded_differently_for_an_older_teen():
    mild_violence = rated(ContentRating.TEEN_13_PLUS, violence_level=2)
    assert not engine.can_view_content(profile(14), mild_violence).allowed
    assert engine.can_view_content(profile(17), mild_violence).allowed


def test_self_harm_content_is_withheld_from_every_minor():
    content = rated(ContentRating.TEEN_13_PLUS, self_harm_risk=1)
    assert not engine.can_view_content(profile(14), content).allowed
    assert not engine.can_view_content(profile(17), content).allowed


def test_a_jurisdiction_override_can_only_tighten_a_rating():
    content = SafetyClassification(
        age_rating=ContentRating.TEEN_13_PLUS,
        jurisdiction_overrides={"DE": "ADULT_18_PLUS"},
    )
    assert engine.can_view_content(profile(14, "US"), content).allowed
    assert not engine.can_view_content(profile(14, "DE"), content).allowed


def test_an_override_cannot_loosen_a_rating():
    """Marking adult material GENERAL for one country must not work."""
    content = SafetyClassification(
        age_rating=ContentRating.ADULT_18_PLUS,
        jurisdiction_overrides={"US": "GENERAL"},
    )
    assert not engine.can_view_content(profile(15, "US"), content).allowed


# ---------------------------------------------------------------------------
# Messaging (§19, §20, §21)
# ---------------------------------------------------------------------------

def test_an_unknown_adult_cannot_open_a_conversation_with_a_fourteen_year_old():
    verdict = engine.can_message_user(profile(30), profile(14), connected=False)
    assert not verdict.allowed
    assert verdict.reason is Reason.ADULT_TO_MINOR


def test_an_unknown_adult_cannot_open_a_conversation_with_a_seventeen_year_old():
    assert not engine.can_message_user(profile(30), profile(17), connected=False).allowed


def test_a_connected_adult_may_message_a_teenager():
    assert engine.can_message_user(profile(30), profile(16), connected=True).allowed


def test_a_high_risk_account_cannot_message_a_minor_even_when_connected():
    verdict = engine.can_message_user(
        profile(30), profile(15), connected=True, sender_risk_score=0.9
    )
    assert not verdict.allowed


def test_an_unconnected_teenager_cannot_message_a_younger_teen():
    verdict = engine.can_message_user(profile(15), profile(14), connected=False)
    assert not verdict.allowed
    assert verdict.reason is Reason.NOT_CONNECTED


def test_media_cannot_be_sent_to_a_minor_in_an_unaccepted_request():
    assert not engine.can_receive_media_in_request(profile(15), connected=False).allowed
    assert engine.can_receive_media_in_request(profile(15), connected=True).allowed


# ---------------------------------------------------------------------------
# Discovery (§22)
# ---------------------------------------------------------------------------

def test_a_minor_is_not_recommended_to_an_unrelated_adult():
    verdict = engine.can_recommend_profile(viewer=profile(35), candidate=profile(14))
    assert not verdict.allowed
    assert verdict.reason is Reason.MINOR_DISCOVERY_RESTRICTED


def test_teenagers_may_still_be_recommended_to_each_other():
    assert engine.can_recommend_profile(viewer=profile(15), candidate=profile(14)).allowed


def test_adults_may_still_be_recommended_to_adults():
    assert engine.can_recommend_profile(viewer=profile(35), candidate=profile(40)).allowed


# ---------------------------------------------------------------------------
# Features, advertising, assurance (§24, §25, §26, §31)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("feature", ["livestream", "monetization", "marketplace_buy", "payments"])
def test_minors_cannot_reach_adult_only_features(feature):
    assert not engine.can_use_feature(profile(17), feature).allowed
    assert engine.can_use_feature(profile(18), feature).allowed


@pytest.mark.parametrize("category", ["alcohol", "gambling", "adult_dating", "crypto"])
def test_restricted_advertising_never_reaches_a_minor(category):
    assert not engine.can_view_advertisement(profile(16), category).allowed
    assert engine.can_view_advertisement(profile(30), category).allowed


def test_moving_from_minor_to_adult_requires_verification():
    """The 15 → 25 correction, which is both the honest mistake and the attack."""
    assert engine.requires_age_verification(
        current_tier=AgeTier.TEEN_HIGH_PROTECTION, proposed_tier=AgeTier.ADULT
    )


def test_moving_between_teen_tiers_does_not_require_verification():
    assert not engine.requires_age_verification(
        current_tier=AgeTier.TEEN_HIGH_PROTECTION, proposed_tier=AgeTier.TEEN_PROTECTED
    )


# ---------------------------------------------------------------------------
# Privacy defaults (§5, §7)
# ---------------------------------------------------------------------------

def test_teen_accounts_start_private_without_anyone_choosing_it():
    defaults = privacy_defaults_for(AgeTier.TEEN_HIGH_PROTECTION)
    assert defaults["profile_visibility"] == "private"
    assert defaults["adult_content"] == "blocked"
    assert defaults["precise_geolocation"] is False
    assert defaults["search_engine_indexing"] is False


def test_an_unknown_tier_gets_the_strictest_defaults():
    assert privacy_defaults_for(AgeTier.UNKNOWN) == privacy_defaults_for(
        AgeTier.TEEN_HIGH_PROTECTION
    )


def test_a_minor_cannot_switch_off_a_legally_required_protection():
    assert not may_change_setting(AgeTier.TEEN_PROTECTED, "adult_content")
    assert not may_change_setting(AgeTier.TEEN_HIGH_PROTECTION, "search_engine_indexing")
    assert may_change_setting(AgeTier.ADULT, "adult_content")


def test_a_younger_teen_needs_a_parent_to_go_public_where_consent_is_required():
    fr_teen = AgeProfile(user_id="u", tier=AgeTier.TEEN_HIGH_PROTECTION, age=15, jurisdiction="FR")
    assert engine.requires_parental_approval(fr_teen, "profile_visibility_public")
    us_teen = AgeProfile(user_id="u", tier=AgeTier.TEEN_HIGH_PROTECTION, age=15, jurisdiction="US")
    assert not engine.requires_parental_approval(us_teen, "profile_visibility_public")


# ---------------------------------------------------------------------------
# Auditability (§50)
# ---------------------------------------------------------------------------

def test_every_verdict_names_the_policy_that_produced_it():
    allow = engine.can_view_content(profile(30, "GB"), rated(ContentRating.GENERAL))
    deny = engine.can_view_content(profile(15, "GB"), rated(ContentRating.ADULT_18_PLUS))
    assert allow.policy_version == "gb-v1"
    assert deny.policy_version == "gb-v1"
