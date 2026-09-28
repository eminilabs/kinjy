"""The Kinjy age-safety policy engine.

One module decides, for the whole platform, what a person of a given age in a
given jurisdiction may see, receive, send and be shown. Every service asks this
engine; no service re-implements an age rule of its own. That is the point: age
rules that are written twice diverge, and the divergence is always discovered
by a minor reaching something they should not have reached.

Three properties this module is built around:

1. **It is pure.** No database, no HTTP, no clock it does not own. Every
   decision is a function of its arguments, so every rule can be tested
   exhaustively and cheaply, and a test can assert the decision rather than
   the plumbing around it.

2. **It fails closed.** An unknown age, an unclassified piece of content, a
   policy that will not resolve — each one restricts rather than permits. The
   cost of wrongly hiding a holiday photo from an adult is an annoyed adult;
   the cost of the opposite error is a child seeing adult material. Those are
   not symmetric and the code does not treat them as if they were.

3. **The viewer's age is never an input the viewer controls.** Callers pass an
   :class:`AgeProfile` that came from the identity record. A request parameter
   saying ``age=18`` is not an age; it is an attacker's suggestion.
"""
from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import date
from enum import Enum


# ---------------------------------------------------------------------------
# Vocabulary
# ---------------------------------------------------------------------------

class AgeTier(str, Enum):
    """What kind of account a person gets. Derived, never chosen."""

    UNDER_MINIMUM = "UNDER_MINIMUM"              # below the registration age here
    TEEN_HIGH_PROTECTION = "TEEN_HIGH_PROTECTION"  # 13-15 by default
    TEEN_PROTECTED = "TEEN_PROTECTED"            # 16-17 by default
    ADULT = "ADULT"                              # 18+ by default
    # Credible evidence contradicts the stated age. Treated as a minor until
    # resolved (§32): an account under suspicion is not given adult reach.
    AGE_REVIEW_REQUIRED = "AGE_REVIEW_REQUIRED"
    # No age on record at all, including signed-out visitors.
    UNKNOWN = "UNKNOWN"

    @property
    def is_minor(self) -> bool:
        """Anything that is not a confirmed adult is treated as a minor.

        UNKNOWN and AGE_REVIEW_REQUIRED land here deliberately. A visitor whose
        age nobody has established is not an adult by default — that mistake is
        how signed-out browsing becomes an adult-content bypass.
        """
        return self is not AgeTier.ADULT


class ContentRating(str, Enum):
    """Age suitability of one piece of content."""

    GENERAL = "GENERAL"
    TEEN_13_PLUS = "TEEN_13_PLUS"
    TEEN_16_PLUS = "TEEN_16_PLUS"
    ADULT_18_PLUS = "ADULT_18_PLUS"
    PROHIBITED = "PROHIBITED"        # allowed to nobody, at any age
    UNCLASSIFIED = "UNCLASSIFIED"    # not yet rated; treated as restricted


class Decision(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"


# Why a request was refused. The caller maps these to a member-facing message;
# the codes themselves never reach a member, because several of them would tell
# someone exactly which control to attack next (§52).
class Reason(str, Enum):
    OK = "OK"
    PROHIBITED_CONTENT = "PROHIBITED_CONTENT"
    AGE_RESTRICTED = "ACCESS_DENIED_AGE_RESTRICTED"
    UNCLASSIFIED_CONTENT = "UNCLASSIFIED_CONTENT"
    AGE_UNKNOWN = "AGE_UNKNOWN"
    AGE_REVIEW_PENDING = "AGE_REVIEW_PENDING"
    JURISDICTION_PROHIBITED = "JURISDICTION_PROHIBITED"
    SENSITIVE_CATEGORY = "SENSITIVE_CATEGORY"
    ADULT_TO_MINOR = "ADULT_TO_MINOR"
    NOT_CONNECTED = "NOT_CONNECTED"
    MINOR_DISCOVERY_RESTRICTED = "MINOR_DISCOVERY_RESTRICTED"
    FEATURE_AGE_RESTRICTED = "FEATURE_AGE_RESTRICTED"
    PARENTAL_APPROVAL_REQUIRED = "PARENTAL_APPROVAL_REQUIRED"
    POLICY_UNAVAILABLE = "POLICY_UNAVAILABLE"


@dataclass(frozen=True)
class Verdict:
    decision: Decision
    reason: Reason
    # The policy that produced this, so an audit row can be replayed later and
    # say *which* rule applied, not merely that something was refused (§50).
    policy_version: str = ""

    @property
    def allowed(self) -> bool:
        return self.decision is Decision.ALLOW

    def __bool__(self) -> bool:  # `if engine.can_view_content(...)`
        return self.allowed


ALLOW = Verdict(Decision.ALLOW, Reason.OK)


def _deny(reason: Reason, policy_version: str = "") -> Verdict:
    return Verdict(Decision.DENY, reason, policy_version)


# ---------------------------------------------------------------------------
# Jurisdiction policy
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class AgePolicy:
    """The rules in force for one jurisdiction, at one version.

    Stored as data, edited by compliance staff through the admin surface, and
    versioned — so a decision taken last March can still be explained by the
    policy that was in force last March. Changing a country's minimum age must
    never mean changing this file (§59).
    """

    jurisdiction: str = "DEFAULT"          # ISO-3166-1 alpha-2, or DEFAULT
    minimum_registration_age: int = 13
    teen_high_protection_until: int = 16   # tier boundary: [min, 16) is high protection
    adult_age: int = 18
    parental_consent_required: bool = False
    age_assurance_level: str = "self_declared"  # self_declared|risk_based|verified
    # Features a minor may not use here at all, whatever their tier.
    restricted_features: frozenset[str] = frozenset()
    # Content categories that are unlawful here for anyone, at any age.
    prohibited_content_categories: frozenset[str] = frozenset()
    # Minimum age for specific features, overriding the tier defaults.
    feature_minimum_ages: dict = field(default_factory=dict)
    effective_date: date | None = None
    policy_version: str = "default-v1"
    status: str = "active"                 # active|draft|superseded

    def tier_for_age(self, age: int) -> AgeTier:
        if age < self.minimum_registration_age:
            return AgeTier.UNDER_MINIMUM
        if age < self.teen_high_protection_until:
            return AgeTier.TEEN_HIGH_PROTECTION
        if age < self.adult_age:
            return AgeTier.TEEN_PROTECTED
        return AgeTier.ADULT


# The floor Kinjy applies everywhere. A jurisdiction may be *stricter* than
# this; the resolver below enforces that it can never be laxer (§2).
DEFAULT_POLICY = AgePolicy()

# Shipped starting points. Compliance staff own the live values in the
# database; these exist so a fresh install is protective before anyone has
# configured anything, and so the engine has something to test against.
BUILTIN_POLICIES: dict[str, AgePolicy] = {
    "DEFAULT": DEFAULT_POLICY,
    # GDPR lets member states set the data-consent age between 13 and 16.
    "DE": replace(DEFAULT_POLICY, jurisdiction="DE", minimum_registration_age=16,
                  teen_high_protection_until=17, parental_consent_required=True,
                  policy_version="de-v1"),
    "NL": replace(DEFAULT_POLICY, jurisdiction="NL", minimum_registration_age=16,
                  teen_high_protection_until=17, parental_consent_required=True,
                  policy_version="nl-v1"),
    "FR": replace(DEFAULT_POLICY, jurisdiction="FR", minimum_registration_age=15,
                  parental_consent_required=True, age_assurance_level="risk_based",
                  policy_version="fr-v1"),
    "US": replace(DEFAULT_POLICY, jurisdiction="US", minimum_registration_age=13,
                  policy_version="us-v1"),
    "GB": replace(DEFAULT_POLICY, jurisdiction="GB", minimum_registration_age=13,
                  age_assurance_level="risk_based", policy_version="gb-v1"),
}


def resolve_policy(
    jurisdiction: str | None,
    overrides: dict[str, AgePolicy] | None = None,
) -> AgePolicy:
    """The policy in force for a jurisdiction, never laxer than the Kinjy floor.

    ``overrides`` is what the policy service loaded from the database. A
    jurisdiction that is missing, or that someone has configured *below* the
    Kinjy minimum, resolves upward — a configuration mistake cannot lower the
    floor for children.
    """
    table = {**BUILTIN_POLICIES, **(overrides or {})}
    policy = table.get((jurisdiction or "").upper()) or table.get("DEFAULT") or DEFAULT_POLICY
    if policy.status != "active":
        policy = DEFAULT_POLICY
    return replace(
        policy,
        minimum_registration_age=max(policy.minimum_registration_age,
                                     DEFAULT_POLICY.minimum_registration_age),
        adult_age=max(policy.adult_age, DEFAULT_POLICY.adult_age),
    )


# ---------------------------------------------------------------------------
# The viewer
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class AgeProfile:
    """Who is asking — as the identity record knows them, not as they claim.

    ``tier`` is authoritative. ``age`` is carried alongside for the few rules
    that are expressed in years rather than tiers, and is never read from a
    request.
    """

    user_id: str | None = None
    tier: AgeTier = AgeTier.UNKNOWN
    age: int | None = None
    jurisdiction: str | None = None
    policy_version: str = ""
    # True when the tier came from a degraded lookup rather than the record.
    degraded: bool = False

    @property
    def is_minor(self) -> bool:
        return self.tier.is_minor

    @classmethod
    def anonymous(cls) -> "AgeProfile":
        """A signed-out visitor.

        Not an adult. This used to default to adult across the platform, which
        made "open the link in a private window" a complete bypass of every
        age rule on the site.
        """
        return cls(tier=AgeTier.UNKNOWN)


def age_on(born: date, today: date) -> int:
    """Whole years, correct across leap years and month boundaries."""
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def tier_for(born: date, today: date, policy: AgePolicy) -> AgeTier:
    return policy.tier_for_age(age_on(born, today))


# ---------------------------------------------------------------------------
# Content
# ---------------------------------------------------------------------------

# Level scales are 0 (none) .. 3 (extreme) so a category can be graded rather
# than flagged. One boolean "NSFW" cannot express the difference between a
# beach photo and pornography, and a platform that grades them alike will get
# both decisions wrong (§10).
@dataclass(frozen=True)
class SafetyClassification:
    content_id: str = ""
    age_rating: ContentRating = ContentRating.UNCLASSIFIED
    sexual_content_level: int = 0
    nudity_level: int = 0
    violence_level: int = 0
    graphic_content_level: int = 0
    drugs_level: int = 0
    alcohol_level: int = 0
    gambling_level: int = 0
    dangerous_activity_level: int = 0
    self_harm_risk: int = 0
    hate_or_abuse_risk: int = 0
    exploitation_risk: int = 0
    classifier_source: str = ""            # model name, "human", "reporter", ...
    classifier_confidence: float = 0.0
    human_review_status: str = "none"      # none|pending|confirmed|overturned
    jurisdiction_overrides: dict = field(default_factory=dict)

    def effective_rating(self, jurisdiction: str | None) -> ContentRating:
        """The rating for this jurisdiction, which may be stricter than global.

        Only ever stricter: an override cannot make adult material general.
        """
        override = self.jurisdiction_overrides.get((jurisdiction or "").upper())
        if not override:
            return self.age_rating
        try:
            candidate = ContentRating(override)
        except ValueError:
            return self.age_rating
        return max(self.age_rating, candidate, key=_rating_strictness)


_RATING_ORDER = {
    ContentRating.GENERAL: 0,
    ContentRating.TEEN_13_PLUS: 1,
    ContentRating.TEEN_16_PLUS: 2,
    ContentRating.UNCLASSIFIED: 3,   # unrated is treated as at least 18+
    ContentRating.ADULT_18_PLUS: 4,
    ContentRating.PROHIBITED: 5,
}


def _rating_strictness(rating: ContentRating) -> int:
    return _RATING_ORDER.get(rating, 5)


# The minimum age each rating requires. UNCLASSIFIED sits with adult content on
# purpose: until something has been looked at, it is not shown to children.
_MINIMUM_AGE_FOR_RATING = {
    ContentRating.GENERAL: 0,
    ContentRating.TEEN_13_PLUS: 13,
    ContentRating.TEEN_16_PLUS: 16,
    ContentRating.UNCLASSIFIED: 18,
    ContentRating.ADULT_18_PLUS: 18,
}


# Categories a younger teen is shielded from even when the overall rating would
# have let the content through. Values are the maximum level each tier may see.
_CATEGORY_CEILINGS: dict[AgeTier, dict[str, int]] = {
    AgeTier.TEEN_HIGH_PROTECTION: {
        "sexual_content_level": 0,
        "nudity_level": 0,
        "violence_level": 1,
        "graphic_content_level": 0,
        "drugs_level": 0,
        "alcohol_level": 0,
        "gambling_level": 0,
        "dangerous_activity_level": 0,
        "self_harm_risk": 0,
        "hate_or_abuse_risk": 0,
        "exploitation_risk": 0,
    },
    AgeTier.TEEN_PROTECTED: {
        "sexual_content_level": 0,
        "nudity_level": 1,
        "violence_level": 2,
        "graphic_content_level": 1,
        "drugs_level": 1,
        "alcohol_level": 1,
        "gambling_level": 0,
        "dangerous_activity_level": 1,
        "self_harm_risk": 0,
        "hate_or_abuse_risk": 0,
        "exploitation_risk": 0,
    },
}
# UNKNOWN and AGE_REVIEW_REQUIRED are held to the strictest teen ceiling.
_CATEGORY_CEILINGS[AgeTier.UNKNOWN] = _CATEGORY_CEILINGS[AgeTier.TEEN_HIGH_PROTECTION]
_CATEGORY_CEILINGS[AgeTier.AGE_REVIEW_REQUIRED] = _CATEGORY_CEILINGS[AgeTier.TEEN_HIGH_PROTECTION]


# ---------------------------------------------------------------------------
# The engine
# ---------------------------------------------------------------------------

class AgeSafetyPolicyEngine:
    """Every age decision on Kinjy. Stateless; construct one per process."""

    def __init__(self, policy_overrides: dict[str, AgePolicy] | None = None):
        self._overrides = policy_overrides or {}

    def policy_for(self, profile: AgeProfile) -> AgePolicy:
        return resolve_policy(profile.jurisdiction, self._overrides)

    # -- registration ------------------------------------------------------

    def registration_eligibility(
        self, born: date, today: date, jurisdiction: str | None
    ) -> tuple[Verdict, AgeTier, AgePolicy]:
        """May this person register, and as what?

        Returns the tier as well as the verdict so the caller never has to
        re-derive it — re-deriving is how the registration path and the
        enforcement path end up disagreeing.
        """
        policy = resolve_policy(jurisdiction, self._overrides)
        if born > today:
            return _deny(Reason.AGE_UNKNOWN, policy.policy_version), AgeTier.UNKNOWN, policy
        tier = tier_for(born, today, policy)
        if tier is AgeTier.UNDER_MINIMUM:
            return _deny(Reason.AGE_RESTRICTED, policy.policy_version), tier, policy
        return replace(ALLOW, policy_version=policy.policy_version), tier, policy

    # -- content -----------------------------------------------------------

    def can_view_content(
        self,
        profile: AgeProfile,
        classification: SafetyClassification | None,
    ) -> Verdict:
        """The single gate every content path goes through (§12).

        Called for a feed item, a single post, a search hit, a message
        attachment, a media byte-range — the same function, so the answer
        cannot differ depending on which door the request came through.
        """
        policy = self.policy_for(profile)
        version = policy.policy_version

        # No classification at all is the dangerous case, not the harmless one.
        if classification is None:
            return (replace(ALLOW, policy_version=version) if not profile.is_minor
                    else _deny(Reason.UNCLASSIFIED_CONTENT, version))

        rating = classification.effective_rating(profile.jurisdiction)

        if rating is ContentRating.PROHIBITED:
            return _deny(Reason.PROHIBITED_CONTENT, version)

        # Exploitation risk overrides everything else, for every viewer.
        if classification.exploitation_risk >= 2:
            return _deny(Reason.PROHIBITED_CONTENT, version)

        required = _MINIMUM_AGE_FOR_RATING.get(rating, policy.adult_age)

        if profile.tier is AgeTier.ADULT:
            return replace(ALLOW, policy_version=version)

        # Every non-adult tier is checked against the required age. An unknown
        # numeric age with a minor tier is held to the strictest reading.
        age = profile.age
        if age is None:
            if required > 0:
                return _deny(
                    Reason.AGE_UNKNOWN if profile.tier is AgeTier.UNKNOWN else Reason.AGE_RESTRICTED,
                    version,
                )
        elif age < required:
            return _deny(Reason.AGE_RESTRICTED, version)

        ceilings = _CATEGORY_CEILINGS.get(profile.tier)
        if ceilings:
            for field_name, ceiling in ceilings.items():
                if getattr(classification, field_name, 0) > ceiling:
                    return _deny(Reason.SENSITIVE_CATEGORY, version)

        return replace(ALLOW, policy_version=version)

    def can_search_content(
        self, profile: AgeProfile, classification: SafetyClassification | None
    ) -> Verdict:
        """Search is the same gate, applied before results are returned (§16)."""
        return self.can_view_content(profile, classification)

    # -- people ------------------------------------------------------------

    def can_message_user(
        self,
        sender: AgeProfile,
        recipient: AgeProfile,
        *,
        connected: bool,
        sender_risk_score: float = 0.0,
    ) -> Verdict:
        """Who may open a private conversation with whom (§19).

        The asymmetry is deliberate: two teenagers who are not connected are
        merely restricted, while an adult reaching an unconnected minor is
        refused. Most unwanted adult contact begins with a first message that
        nobody asked for.
        """
        policy = self.policy_for(recipient)
        version = policy.policy_version

        if connected and sender_risk_score < 0.8:
            return replace(ALLOW, policy_version=version)

        if recipient.is_minor and not sender.is_minor:
            return _deny(Reason.ADULT_TO_MINOR, version)

        # A flagged account does not get to open conversations with minors even
        # where an ordinary account could.
        if recipient.is_minor and sender_risk_score >= 0.6:
            return _deny(Reason.ADULT_TO_MINOR, version)

        if recipient.tier is AgeTier.TEEN_HIGH_PROTECTION and not connected:
            return _deny(Reason.NOT_CONNECTED, version)

        return replace(ALLOW, policy_version=version)

    def can_receive_media_in_request(self, recipient: AgeProfile, *, connected: bool) -> Verdict:
        """Attachments in an unaccepted message request (§20).

        Text first, everything else after the recipient has accepted. An image
        that arrives before consent has already been seen by the time anyone
        can report it.
        """
        policy = self.policy_for(recipient)
        if connected:
            return replace(ALLOW, policy_version=policy.policy_version)
        if recipient.is_minor:
            return _deny(Reason.NOT_CONNECTED, policy.policy_version)
        return replace(ALLOW, policy_version=policy.policy_version)

    def can_recommend_profile(self, viewer: AgeProfile, candidate: AgeProfile) -> Verdict:
        """Whether a profile may be suggested to a viewer (§22).

        Minors are not surfaced to unrelated adults by the discovery features.
        Suggestion is how most unwanted contact starts, so the cheapest place
        to stop it is before the suggestion is made.
        """
        policy = self.policy_for(candidate)
        version = policy.policy_version
        if candidate.is_minor and not viewer.is_minor:
            return _deny(Reason.MINOR_DISCOVERY_RESTRICTED, version)
        return replace(ALLOW, policy_version=version)

    # -- features ----------------------------------------------------------

    # Default minimum ages per feature. A jurisdiction may raise these through
    # `feature_minimum_ages`; it cannot lower them below the Kinjy floor.
    FEATURE_MINIMUM_AGES: dict[str, int] = {
        "livestream": 18,
        "livestream_gifting": 18,
        "monetization": 18,
        "marketplace_sell": 18,
        "marketplace_buy": 18,
        "payments": 18,
        "referral_pool": 18,
        "precise_location": 18,
        "dating_discovery": 18,
    }

    def can_use_feature(self, profile: AgeProfile, feature: str) -> Verdict:
        policy = self.policy_for(profile)
        version = policy.policy_version
        if feature in policy.restricted_features and profile.is_minor:
            return _deny(Reason.FEATURE_AGE_RESTRICTED, version)
        floor = self.FEATURE_MINIMUM_AGES.get(feature, 0)
        required = max(floor, policy.feature_minimum_ages.get(feature, 0))
        if required == 0:
            return replace(ALLOW, policy_version=version)
        if profile.tier is AgeTier.ADULT and required <= policy.adult_age:
            return replace(ALLOW, policy_version=version)
        if profile.age is None or profile.age < required:
            return _deny(Reason.FEATURE_AGE_RESTRICTED, version)
        return replace(ALLOW, policy_version=version)

    def can_start_livestream(self, profile: AgeProfile) -> Verdict:
        return self.can_use_feature(profile, "livestream")

    def can_monetize(self, profile: AgeProfile) -> Verdict:
        return self.can_use_feature(profile, "monetization")

    def can_use_marketplace(self, profile: AgeProfile) -> Verdict:
        return self.can_use_feature(profile, "marketplace_buy")

    # -- advertising -------------------------------------------------------

    # Categories no minor may be advertised, anywhere (§26).
    MINOR_PROHIBITED_AD_CATEGORIES = frozenset({
        "alcohol", "tobacco", "nicotine", "vaping", "gambling", "lottery",
        "adult_dating", "sexual_products", "regulated_drugs", "weapons",
        "cosmetic_surgery", "weight_loss", "financial_trading", "crypto",
    })

    def can_view_advertisement(self, profile: AgeProfile, ad_category: str) -> Verdict:
        policy = self.policy_for(profile)
        version = policy.policy_version
        category = (ad_category or "").lower()
        if profile.is_minor and category in self.MINOR_PROHIBITED_AD_CATEGORIES:
            return _deny(Reason.AGE_RESTRICTED, version)
        if category in policy.prohibited_content_categories:
            return _deny(Reason.JURISDICTION_PROHIBITED, version)
        return replace(ALLOW, policy_version=version)

    # -- assurance ---------------------------------------------------------

    def requires_age_verification(
        self,
        *,
        current_tier: AgeTier,
        proposed_tier: AgeTier,
        jurisdiction: str | None = None,
    ) -> bool:
        """Whether a change of stated age must be proven before it takes effect.

        Moving from a minor tier to adult is the case that matters: it is both
        the change a genuine mistake produces and the change someone attempting
        to reach adult content will attempt (§31).
        """
        if current_tier is proposed_tier:
            return False
        if current_tier.is_minor and proposed_tier is AgeTier.ADULT:
            return True
        policy = resolve_policy(jurisdiction, self._overrides)
        return policy.age_assurance_level == "verified"

    def requires_parental_approval(self, profile: AgeProfile, action: str) -> bool:
        """Weakening a safety-critical setting, for a supervised younger teen (§28)."""
        policy = self.policy_for(profile)
        if not policy.parental_consent_required:
            return False
        if profile.tier is not AgeTier.TEEN_HIGH_PROTECTION:
            return False
        return action in {
            "profile_visibility_public",
            "allow_messages_from_anyone",
            "disable_sensitive_content_filter",
            "enable_precise_location",
            "search_engine_indexing",
        }


# ---------------------------------------------------------------------------
# Privacy defaults
# ---------------------------------------------------------------------------

# Applied at account creation, not offered as a setting to find later (§5, §7).
# A protection a teenager has to discover is a protection most of them do not
# have.
PRIVACY_DEFAULTS: dict[AgeTier, dict[str, object]] = {
    AgeTier.TEEN_HIGH_PROTECTION: {
        "profile_visibility": "private",
        "post_default_audience": "friends_or_approved",
        "who_can_request": "restricted",
        "search_visibility": "limited",
        "search_engine_indexing": False,
        "precise_geolocation": False,
        "location_sharing": False,
        "activity_status": "limited",
        "recommend_to_unknown_adults": False,
        "allow_media_download": False,
        "tagging": "approval_required",
        "mentions": "friends_or_approved",
        "who_can_message": "friends",
        "sensitive_content": "most_restrictive",
        "adult_content": "blocked",
        "personalised_ads_sensitive": False,
        "livestream": False,
    },
    AgeTier.TEEN_PROTECTED: {
        "profile_visibility": "private",
        "post_default_audience": "friends_or_approved",
        "who_can_request": "restricted",
        "search_visibility": "limited",
        "search_engine_indexing": False,
        "precise_geolocation": False,
        "location_sharing": False,
        "activity_status": "limited",
        "recommend_to_unknown_adults": False,
        "allow_media_download": False,
        "tagging": "approval_required",
        "mentions": "friends_or_approved",
        "who_can_message": "connections",
        "sensitive_content": "restrictive",
        "adult_content": "blocked",
        "personalised_ads_sensitive": False,
        "livestream": False,
    },
    AgeTier.ADULT: {
        "profile_visibility": "public",
        "post_default_audience": "public",
        "who_can_request": "anyone",
        "search_visibility": "full",
        "search_engine_indexing": True,
        "precise_geolocation": False,   # opt-in for everybody, not only minors
        "location_sharing": False,
        "activity_status": "full",
        "recommend_to_unknown_adults": True,
        "allow_media_download": True,
        "tagging": "allowed",
        "mentions": "anyone",
        "who_can_message": "anyone",
        "sensitive_content": "standard",
        "adult_content": "allowed",
        "personalised_ads_sensitive": True,
        "livestream": True,
    },
}

# Settings a minor may not change, whatever the interface offers (§7).
LOCKED_SETTINGS_FOR_MINORS = frozenset({
    "adult_content",
    "search_engine_indexing",
    "personalised_ads_sensitive",
})


def privacy_defaults_for(tier: AgeTier) -> dict[str, object]:
    """The settings a new account starts with. Unknown tiers get the strictest."""
    return dict(PRIVACY_DEFAULTS.get(tier, PRIVACY_DEFAULTS[AgeTier.TEEN_HIGH_PROTECTION]))


def may_change_setting(tier: AgeTier, setting: str) -> bool:
    if tier is AgeTier.ADULT:
        return True
    return setting not in LOCKED_SETTINGS_FOR_MINORS


# A single engine for callers that do not need custom overrides.
engine = AgeSafetyPolicyEngine()
