"""The age gate on features, for the services that sell and pay.

Money is where an age rule stops being a content-suitability judgement and
becomes a legal one. A 15-year-old seeing an unsuitable post is a moderation
failure; a 15-year-old entering into a contract, receiving a payout or selling
to strangers is a different problem, with different consequences, and it does
not depend on anybody finding the transaction distasteful.

So this gate is blunter than the content one. There is no grading, no
per-category ceiling and no "restrict rather than refuse": either the account
is old enough for the feature in that jurisdiction or the call fails.

One helper, used by every service, because a marketplace that checks and a
checkout that does not is a marketplace with a checkout-shaped hole.
"""
from __future__ import annotations

import logging

from fastapi import HTTPException

from common import ageclient
from common.agesafety import AgeProfile, engine

log = logging.getLogger("kaluta.agefeatures")

# What a member is told. Deliberately the same sentence for every feature and
# every reason: naming the required age, or which rule applied, is telling
# somebody what to change about their account.
REFUSAL = "This feature is not available for accounts in your age group."


def profile(user_id: str | None) -> AgeProfile:
    return ageclient.age_profile(user_id)


def allowed(user_id: str | None, feature: str) -> bool:
    return bool(engine.can_use_feature(profile(user_id), feature))


def require(user_id: str | None, feature: str) -> AgeProfile:
    """Raise 403 unless this account may use the feature.

    Returns the profile so a caller that needs the tier afterwards does not
    fetch it twice.

    403 rather than 404 here, unlike the content paths. Hiding the existence of
    a marketplace from a teenager would be absurd — they can see it advertised
    on the marketing pages — and the honest answer is that they may not use it
    yet, not that it is not there.
    """
    who = profile(user_id)
    verdict = engine.can_use_feature(who, feature)
    if not verdict.allowed:
        log.info("feature %s refused for tier %s", feature, who.tier.value)
        raise HTTPException(status_code=403, detail=REFUSAL)
    return who


def eligibility(user_id: str | None, features: list[str]) -> dict:
    """What this account may and may not do, for a client to render honestly.

    A client that knows in advance can grey a button out and say why, instead
    of letting somebody fill in a payment form and refusing at the end.
    """
    who = profile(user_id)
    return {
        "age_tier": who.tier.value,
        "features": {f: bool(engine.can_use_feature(who, f)) for f in features},
    }
