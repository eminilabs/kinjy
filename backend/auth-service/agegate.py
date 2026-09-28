"""Registration-time age gating, and the authoritative age profile.

This module owns three things the rest of the platform depends on:

* deciding whether somebody may join at all, and as what tier;
* writing the age record that every other service reads;
* making the "enter 12, get refused, enter 19, get in" sequence not work.

The last one is the reason the rejection path is stateful. A refusal that
leaves no trace is a refusal that can be retried until it succeeds, and the
retry costs the attacker nothing.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from common.agesafety import (
    AgePolicy,
    AgeSafetyPolicyEngine,
    AgeTier,
    age_on,
    privacy_defaults_for,
)
from common.ids import new_id

import models

log = logging.getLogger("auth-service.agegate")

# How many refused attempts from one subject before we stop answering with a
# plain refusal and require assurance instead. Low, because a person entering
# their own birthday does not need five tries.
MAX_REFUSED_ATTEMPTS = 3
ATTEMPT_WINDOW = timedelta(hours=24)
# How long a refusal keeps that subject out. Long enough that guessing is not
# a workable strategy, short enough that a genuine mis-type is not a life ban.
COOLDOWN = timedelta(hours=24)


def _today() -> date:
    return datetime.now(timezone.utc).date()


def subject_hash(*parts: str | None) -> str:
    """A stable key for a would-be registrant, storing none of their details.

    Hashed so the attempts table cannot be read as a list of people who tried
    to join and were turned away — which for a service with a minimum age is a
    list of children.
    """
    material = "|".join((p or "").strip().lower() for p in parts)
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def load_policies(db: OrmSession) -> dict[str, AgePolicy]:
    """Jurisdiction policies as compliance staff have configured them.

    A row that will not parse is skipped rather than allowed to break
    registration, and skipping falls back to the built-in floor — the
    conservative direction.
    """
    overrides: dict[str, AgePolicy] = {}
    try:
        rows = db.scalars(
            select(models.JurisdictionPolicy).where(models.JurisdictionPolicy.status == "active")
        ).all()
    except Exception as exc:
        log.error("jurisdiction policies unreadable, using built-in floor: %s", exc)
        return {}

    for row in rows:
        try:
            overrides[row.jurisdiction.upper()] = AgePolicy(
                jurisdiction=row.jurisdiction.upper(),
                minimum_registration_age=row.minimum_registration_age,
                teen_high_protection_until=row.teen_high_protection_until,
                adult_age=row.adult_age,
                parental_consent_required=row.parental_consent_required,
                age_assurance_level=row.age_assurance_level,
                restricted_features=frozenset(
                    f.strip() for f in (row.restricted_features or "").split(",") if f.strip()
                ),
                prohibited_content_categories=frozenset(
                    c.strip() for c in (row.prohibited_content_categories or "").split(",") if c.strip()
                ),
                feature_minimum_ages=json.loads(row.feature_minimum_ages or "{}"),
                effective_date=row.effective_date,
                policy_version=row.policy_version,
                status=row.status,
            )
        except Exception as exc:
            log.error("policy row %s/%s ignored: %s", row.jurisdiction, row.policy_version, exc)
    return overrides


def engine_for(db: OrmSession) -> AgeSafetyPolicyEngine:
    return AgeSafetyPolicyEngine(load_policies(db))


# ---------------------------------------------------------------------------
# Retry control
# ---------------------------------------------------------------------------

def recent_refusals(db: OrmSession, subject: str) -> int:
    since = datetime.now(timezone.utc) - ATTEMPT_WINDOW
    return db.scalar(
        select(func.count())
        .select_from(models.RegistrationAttempt)
        .where(
            models.RegistrationAttempt.subject_hash == subject,
            models.RegistrationAttempt.outcome == "under_minimum",
            models.RegistrationAttempt.created_at >= since,
        )
    ) or 0


def in_cooldown(db: OrmSession, subject: str) -> bool:
    """True while a recent refusal still stands for this subject.

    Checked before the date of birth is even evaluated, so a second attempt
    cannot learn anything from how fast or how differently we answer.
    """
    since = datetime.now(timezone.utc) - COOLDOWN
    latest = db.scalar(
        select(models.RegistrationAttempt.created_at)
        .where(
            models.RegistrationAttempt.subject_hash == subject,
            models.RegistrationAttempt.outcome == "under_minimum",
            models.RegistrationAttempt.created_at >= since,
        )
        .order_by(models.RegistrationAttempt.created_at.desc())
        .limit(1)
    )
    return latest is not None


def record_attempt(
    db: OrmSession,
    subject: str,
    outcome: str,
    *,
    declared_age: int | None = None,
    jurisdiction: str | None = None,
    ip: str | None = None,
) -> None:
    db.add(
        models.RegistrationAttempt(
            subject_hash=subject,
            outcome=outcome,
            declared_age=declared_age,
            jurisdiction=(jurisdiction or "")[:2].upper() or None,
            ip=ip,
        )
    )


# ---------------------------------------------------------------------------
# The age profile
# ---------------------------------------------------------------------------

def next_transition_date(born: date, policy: AgePolicy, today: date) -> date | None:
    """When this account's tier changes on its own, if it ever does.

    Precomputed so the nightly job selects on an index instead of recomputing
    an age for every account on the platform.
    """
    age = age_on(born, today)
    for boundary in (policy.teen_high_protection_until, policy.adult_age):
        if age < boundary:
            try:
                return born.replace(year=born.year + boundary)
            except ValueError:
                # 29 February: the transition lands on 1 March in common years.
                return date(born.year + boundary, 3, 1)
    return None


def create_age_profile(
    db: OrmSession,
    user_id: str,
    born: date,
    tier: AgeTier,
    policy: AgePolicy,
    *,
    today: date | None = None,
) -> models.UserAgeProfile:
    today = today or _today()
    profile = models.UserAgeProfile(
        id=new_id("agp"),
        user_id=user_id,
        date_of_birth=born,
        tier=tier.value,
        jurisdiction=policy.jurisdiction[:2].upper(),
        policy_version=policy.policy_version,
        assurance_level=policy.age_assurance_level,
        next_transition_on=next_transition_date(born, policy, today),
    )
    db.add(profile)
    return profile


def effective_tier(profile: models.UserAgeProfile) -> AgeTier:
    """The tier other services must use.

    An account under review resolves to AGE_REVIEW_REQUIRED whatever its stored
    tier says, so a contested adult claim loses adult reach immediately rather
    than when a human eventually gets to the case.
    """
    if profile.under_review:
        return AgeTier.AGE_REVIEW_REQUIRED
    try:
        return AgeTier(profile.tier)
    except ValueError:
        return AgeTier.UNKNOWN


def profile_payload(profile: models.UserAgeProfile, today: date | None = None) -> dict:
    """What crosses the wire to other services.

    The date of birth is not in it. Services need to know how old somebody is,
    not when they were born, and the difference is the whole of a minor's
    birthday privacy.
    """
    today = today or _today()
    return {
        "user_id": profile.user_id,
        "tier": effective_tier(profile).value,
        "age": age_on(profile.date_of_birth, today),
        "jurisdiction": profile.jurisdiction,
        "policy_version": profile.policy_version,
        "assurance_level": profile.assurance_level,
        "under_review": profile.under_review,
    }


def apply_age_transitions(db: OrmSession, today: date | None = None, limit: int = 5000) -> list[dict]:
    """Move accounts whose birthday has moved them into a new tier.

    Protections follow the member automatically; nobody has to notice their own
    birthday for their account to change. Historical safety records are left
    alone — turning 18 does not erase what happened before it.
    """
    today = today or _today()
    due = db.scalars(
        select(models.UserAgeProfile)
        .where(
            models.UserAgeProfile.next_transition_on.is_not(None),
            models.UserAgeProfile.next_transition_on <= today,
        )
        .limit(limit)
    ).all()

    changed = []
    overrides = load_policies(db)
    from common.agesafety import resolve_policy

    for profile in due:
        policy = resolve_policy(profile.jurisdiction, overrides)
        new_tier = policy.tier_for_age(age_on(profile.date_of_birth, today))
        old_tier = profile.tier
        profile.tier = new_tier.value
        profile.policy_version = policy.policy_version
        profile.next_transition_on = next_transition_date(profile.date_of_birth, policy, today)
        if old_tier != profile.tier:
            changed.append({"user_id": profile.user_id, "from": old_tier, "to": profile.tier})
    return changed


def privacy_defaults_payload(tier: AgeTier) -> dict:
    """The settings a new account is created with, by tier."""
    return privacy_defaults_for(tier)
