"""What a real translation provider may be asked to do: a member's AI credits by plan and the
platform's monthly budget (ai-service/limits.py), as pure rules - no stack, no database."""
from __future__ import annotations

import pytest

from ai_test_support import limits

BUDGET, UNIT = 5.0, 1000
FREE = 20 * UNIT


def check(**kw):
    base = dict(spent_this_month=0.0, monthly_budget=BUDGET, used_this_month_chars=0, allowance_chars=FREE,
                text_chars=1_000, tier="free", credit_chars=UNIT, renews_on="1 November")
    limits.check(**{**base, **kw})


def test_a_call_inside_both_limits_goes_ahead():
    check(spent_this_month=2.0, used_this_month_chars=5_000, text_chars=10_000)


def test_the_allowance_is_inclusive_up_to_the_last_character():
    check(used_this_month_chars=FREE - 1_000, text_chars=1_000)
    with pytest.raises(limits.LimitReached):
        check(used_this_month_chars=FREE - 1_000, text_chars=1_001)


def test_a_member_out_of_credits_is_told_what_they_have_what_it_needs_and_when_it_renews():
    with pytest.raises(limits.LimitReached) as raised:
        check(used_this_month_chars=19_000, text_chars=2_000)
    assert raised.value.status == 429
    text = str(raised.value)
    assert "needs 2" in text and "you have 1 of the 20" in text and "Free plan" in text and "1 November" in text


def test_a_free_member_is_pointed_at_the_plans_that_include_more_and_a_paying_one_is_not():
    with pytest.raises(limits.LimitReached) as free:
        check(used_this_month_chars=FREE, text_chars=1)
    with pytest.raises(limits.LimitReached) as basic:
        check(used_this_month_chars=200_000, allowance_chars=200_000, text_chars=1, tier="basic")
    assert "Basic and Premium include more" in str(free.value)
    assert "Basic and Premium" not in str(basic.value) and "Basic plan" in str(basic.value)


def test_one_text_longer_than_the_whole_allowance_is_refused_even_at_the_start_of_the_month():
    with pytest.raises(limits.LimitReached) as raised:
        check(text_chars=FREE + 1)
    assert raised.value.status == 429 and "you have 20 of the 20" in str(raised.value)


def test_when_the_months_budget_is_spent_translation_pauses_for_everybody():
    with pytest.raises(limits.LimitReached) as raised:
        check(spent_this_month=BUDGET)
    assert raised.value.status == 503 and "paused" in str(raised.value)


def test_a_budget_of_zero_means_no_real_spending_at_all():
    with pytest.raises(limits.LimitReached) as raised:
        check(spent_this_month=0.0, monthly_budget=0.0)
    assert raised.value.status == 503


def test_the_platforms_budget_is_checked_before_the_members_credits():
    with pytest.raises(limits.LimitReached) as raised:
        check(spent_this_month=BUDGET + 1, used_this_month_chars=FREE, text_chars=1)
    assert raised.value.status == 503  # nobody's credits matter once the money is gone


@pytest.mark.parametrize("tier, credits", [("free", 20), ("basic", 200), ("premium", 1000), ("creator", 20), ("nonsense", 20), ("", 20)])
def test_a_plan_gives_its_credits_and_any_doubt_is_the_free_plan(tier, credits):
    assert limits.credits_for(tier, free=20, basic=200, premium=1000) == credits


@pytest.mark.parametrize("allowance, used, left", [(20_000, 0, 20), (20_000, 50, 19), (20_000, 316, 19), (400, 316, 0), (400, 400, 0), (400, 999, 0)])
def test_credits_left_are_whole_credits_you_can_spend_in_full(allowance, used, left):
    assert limits.credits_left(allowance, used, 1000 if allowance > 400 else 100) == left


@pytest.mark.parametrize("chars, credits", [(0, 0), (1, 1), (1000, 1), (1001, 2), (20_000, 20)])
def test_characters_become_whole_credits_rounded_up(chars, credits):
    assert limits.to_credits(chars, 1000) == credits
