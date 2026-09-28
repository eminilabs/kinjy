"""Age enforcement for everything social-service serves.

One helper per question, all of them delegating to the shared policy engine, so
the feed, a direct link, a search hit and a media request cannot answer
differently. They used to: the feed filtered on a boolean while the direct-link
path checked the same boolean separately, and every new surface added a fourth
copy of the rule.

The ordering matters as much as the rule. Age eligibility is applied **before**
ranking, not after (§15). A recommender that ranks first and filters second has
already spent its budget scoring content the viewer may not have, and the day
somebody moves the filter into a template it stops running at all.
"""
from __future__ import annotations

import json
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from common.agesafety import (
    AgeProfile,
    AgeTier,
    ContentRating,
    SafetyClassification,
    engine,
)

import models

log = logging.getLogger("social-service.agefilter")

# Ratings a minor may never be served. Used to keep them out of the SQL, so
# restricted rows are not fetched, ranked, serialised and then dropped.
_MINOR_FORBIDDEN_RATINGS = (
    ContentRating.ADULT_18_PLUS.value,
    ContentRating.PROHIBITED.value,
    ContentRating.UNCLASSIFIED.value,
)
_UNDER_16_FORBIDDEN_RATINGS = _MINOR_FORBIDDEN_RATINGS + (ContentRating.TEEN_16_PLUS.value,)


def classification_for(db: OrmSession, content_id: str) -> SafetyClassification | None:
    """The stored classification for one item, as the engine's value object."""
    row = db.scalar(
        select(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id == content_id
        )
    )
    return _to_value(row)


def classifications_for(db: OrmSession, content_ids: list[str]) -> dict[str, SafetyClassification]:
    """Batched, because a feed page must not make one query per item."""
    if not content_ids:
        return {}
    rows = db.scalars(
        select(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id.in_(content_ids)
        )
    ).all()
    return {r.content_id: _to_value(r) for r in rows}


def _to_value(row) -> SafetyClassification | None:
    if row is None:
        return None
    try:
        overrides = json.loads(row.jurisdiction_overrides or "{}")
    except Exception:
        # A malformed override must not become "no override at all" quietly in
        # a way that loosens the rating; an empty dict is the safe reading here
        # because the base rating still applies.
        log.warning("bad jurisdiction_overrides on %s", row.content_id)
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


def restrict_query(stmt, viewer: AgeProfile):
    """Push age eligibility into the SQL, before ranking touches a row.

    Two conditions, deliberately both present:

    * the classification row says the item is out of bounds, and
    * there is **no** classification row at all.

    The second is the one that is easy to forget and is exactly how unrated
    content reaches a child: an outer join that only excludes known-bad rows
    lets everything unclassified straight through.
    """
    if not viewer.is_minor:
        return stmt

    forbidden = (
        _UNDER_16_FORBIDDEN_RATINGS
        if (viewer.age is None or viewer.age < 16)
        else _MINOR_FORBIDDEN_RATINGS
    )

    classified_out = select(models.ContentSafetyClassification.content_id).where(
        models.ContentSafetyClassification.age_rating.in_(forbidden)
    )
    has_classification = select(models.ContentSafetyClassification.content_id)

    return stmt.where(
        models.Post.id.not_in(classified_out),
        models.Post.id.in_(has_classification),
    )


def visible_to(db: OrmSession, viewer: AgeProfile, post_id: str) -> bool:
    """The check for a single item reached directly - a link, a share, an embed.

    Same engine, same answer as the feed. A URL pasted into a chat is not a
    different security context from a feed impression, and treating it as one
    is how "copy the link" became the standard way around age gates.
    """
    return bool(engine.can_view_content(viewer, classification_for(db, post_id)))


def filter_items(
    db: OrmSession, viewer: AgeProfile, items: list[dict], id_key: str = "id"
) -> list[dict]:
    """Final pass over anything already serialised.

    Belt and braces after :func:`restrict_query`: a surface that builds its own
    query and forgets the filter still cannot leak, and the cost is one batched
    lookup per page.
    """
    if not items:
        return items
    ids = [i.get(id_key) for i in items if i.get(id_key)]
    table = classifications_for(db, ids)
    kept = []
    for item in items:
        verdict = engine.can_view_content(viewer, table.get(item.get(id_key)))
        if verdict.allowed:
            kept.append(item)
    return kept


def default_classification_for_upload(author: AgeProfile) -> dict:
    """What a brand-new post is classified as before anything has looked at it.

    UNCLASSIFIED, which the engine treats as adult-only. A post is therefore
    invisible to minors for the seconds or minutes until the classifier runs,
    rather than visible to everyone until it is caught.
    """
    return {
        "age_rating": ContentRating.UNCLASSIFIED.value,
        "classifier_source": "pending",
        "human_review_status": "none",
    }


def tier_of(viewer: AgeProfile) -> str:
    return viewer.tier.value if isinstance(viewer.tier, AgeTier) else str(viewer.tier)
