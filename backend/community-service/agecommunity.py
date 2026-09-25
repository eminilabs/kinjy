"""Age gating for forums, threads, replies and community discovery.

The same engine the feed uses, applied to the other half of the platform. A
teenager who cannot reach adult material in their feed but can reach it in a
forum thread has not been protected; they have been inconvenienced.

Two surfaces, two shapes of rule:

* **Content** — threads and replies are user-written text, so they are
  classified on creation and filtered on read exactly like posts.
* **Discovery** — a community is not content, it is a door. What matters is
  whether it should be *listed* to a minor, which is a question about the
  community's own description rather than about any one message inside it.

Secret communities were already excluded from discovery. This adds the case
that is easy to miss: a public community whose whole subject is adult.
"""
from __future__ import annotations

import json
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from common import ageclient, classifier
from common.agesafety import AgeProfile, ContentRating, SafetyClassification, engine
from common.ids import new_id

import models

log = logging.getLogger("community-service.agecommunity")

_FORBIDDEN_FOR_MINORS = (
    ContentRating.ADULT_18_PLUS.value,
    ContentRating.PROHIBITED.value,
    ContentRating.UNCLASSIFIED.value,
)
_FORBIDDEN_UNDER_16 = _FORBIDDEN_FOR_MINORS + (ContentRating.TEEN_16_PLUS.value,)


def viewer(user_id: str | None) -> AgeProfile:
    return ageclient.age_profile(user_id)


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

def classify_and_store(
    db: OrmSession, content_id: str, kind: str, body: str, author_id: str
) -> classifier.Classification:
    """Rate one thread or reply, and record it.

    Forum text carries no media of its own, so unlike a post this can usually
    be settled outright — which is why a forum stays readable to teenagers even
    while the image queue is backed up.
    """
    author_is_minor = ageclient.age_profile(author_id).is_minor
    result = classifier.classify(
        body=body or "", media_kinds=[], author_is_minor=author_is_minor
    )

    row = db.scalar(
        select(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id == content_id
        )
    )
    if row is None:
        row = models.ContentSafetyClassification(id=new_id("csc"), content_id=content_id)
        db.add(row)
    row.content_kind = kind
    for key, value in result.as_payload().items():
        setattr(row, key, value)
    return result


def _to_value(row) -> SafetyClassification | None:
    if row is None:
        return None
    try:
        overrides = json.loads(row.jurisdiction_overrides or "{}")
    except Exception:
        overrides = {}
    try:
        rating = ContentRating(row.age_rating)
    except ValueError:
        rating = ContentRating.UNCLASSIFIED
    return SafetyClassification(
        content_id=row.content_id,
        age_rating=rating,
        sexual_content_level=row.sexual_content_level,
        nudity_level=row.nudity_level,
        violence_level=row.violence_level,
        graphic_content_level=row.graphic_content_level,
        drugs_level=row.drugs_level,
        alcohol_level=row.alcohol_level,
        gambling_level=row.gambling_level,
        dangerous_activity_level=row.dangerous_activity_level,
        self_harm_risk=row.self_harm_risk,
        hate_or_abuse_risk=row.hate_or_abuse_risk,
        exploitation_risk=row.exploitation_risk,
        classifier_source=row.classifier_source,
        classifier_confidence=row.classifier_confidence,
        human_review_status=row.human_review_status,
        jurisdiction_overrides=overrides,
    )


def classifications_for(db: OrmSession, ids: list[str]) -> dict[str, SafetyClassification]:
    if not ids:
        return {}
    rows = db.scalars(
        select(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id.in_(ids)
        )
    ).all()
    return {r.content_id: _to_value(r) for r in rows}


# ---------------------------------------------------------------------------
# Filtering
# ---------------------------------------------------------------------------

def restrict_query(stmt, model, profile: AgeProfile):
    """Push eligibility into the SQL, before ordering and paging.

    Both halves, as in the feed: exclude what is classified out, **and**
    exclude what has no classification at all. The second is the one that is
    easy to forget and is exactly how unrated content reaches a child.
    """
    if not profile.is_minor:
        return stmt

    forbidden = (
        _FORBIDDEN_UNDER_16 if (profile.age is None or profile.age < 16)
        else _FORBIDDEN_FOR_MINORS
    )
    classified_out = select(models.ContentSafetyClassification.content_id).where(
        models.ContentSafetyClassification.age_rating.in_(forbidden)
    )
    has_row = select(models.ContentSafetyClassification.content_id)
    return stmt.where(model.id.not_in(classified_out), model.id.in_(has_row))


def visible(db: OrmSession, profile: AgeProfile, content_id: str) -> bool:
    """One item, reached directly. Same engine, same answer as the listing."""
    row = db.scalar(
        select(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id == content_id
        )
    )
    return bool(engine.can_view_content(profile, _to_value(row)))


def filter_items(db: OrmSession, profile: AgeProfile, items: list[dict]) -> list[dict]:
    """Final pass over anything already serialised, in one batched query."""
    if not items or not profile.is_minor:
        return items
    table = classifications_for(db, [i.get("id") for i in items if i.get("id")])
    return [i for i in items if engine.can_view_content(profile, table.get(i.get("id"))).allowed]


# ---------------------------------------------------------------------------
# Community discovery
# ---------------------------------------------------------------------------

def community_is_listable(db: OrmSession, profile: AgeProfile, community) -> bool:
    """Whether a community may appear in a minor's discovery surfaces.

    Judged on the community's own name and description, not on its messages: a
    door is adult because of what it advertises, and one heated thread inside a
    gardening group does not make the group adult.
    """
    if not profile.is_minor:
        return True
    row = db.scalar(
        select(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id == community.id
        )
    )
    if row is None:
        # Never classified. Communities predate the classifier, and hiding
        # every one of them from teenagers would empty the surface entirely.
        # Classified on next write; until then the description is checked in
        # memory, which costs one regex pass and no round trip.
        result = classifier.classify(
            body=f"{community.name} {community.description}",
            media_kinds=[],
            author_is_minor=False,
        )
        return result.age_rating not in _FORBIDDEN_FOR_MINORS
    return bool(engine.can_view_content(profile, _to_value(row)))


def classify_community(db: OrmSession, community) -> None:
    """Rate a community from what it says about itself."""
    classify_and_store(
        db,
        community.id,
        "community",
        f"{community.name} {community.description}",
        community.owner_id,
    )
