"""Kinjy · social-service — posts, feed modes, algorithm marketplace, reactions."""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone

import httpx
from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session as OrmSession

from common import events, notify
from common.auth import AdminUser, CurrentUser, MaybeUser
from common.database import SessionLocal, get_db
from common.ids import new_id
from common.service import create_app

from common import ageclient, classifier, mediasign
from common.agesafety import engine as age_engine

import agefilter
import models
import ranking

log = logging.getLogger("social-service")
USER_URL = "http://user-service:8000"
MEDIA_URL = "http://media-service:8000"
MESSAGING_URL = "http://messaging-service:8000"


def live(_topic: str, _event: str, **data) -> None:
    """Push a live update to whoever is watching this topic.

    The two positional parameters are underscore-prefixed so they cannot
    collide with a payload key: `live(topic, "activity", kind="comment")` used
    to raise `got multiple values for argument 'kind'` — after the write had
    committed, so the comment was saved and the caller still saw a 500.

    Deliberately fire-and-forget and deliberately short-timeout: liveness is a
    nicety, and a hub that is slow or down must never make posting a comment
    slow or fail. The write has already been committed by the time we get here,
    so a dropped notification costs a refresh, nothing more.
    """
    try:
        httpx.post(
            f"{MESSAGING_URL}/internal/broadcast",
            json={"topic": _topic, "type": _event, "data": data},
            timeout=1.5,
        )
    except Exception as exc:
        log.debug("live update dropped (%s %s): %s", _topic, _event, exc)

# Blueprint §1 — the newsfeed conflict is resolved by having explicit modes
# rather than one contested algorithm.
FEED_MODES = [
    "following", "for_you", "circles", "friends", "local",
    "country", "global", "topics", "trending", "new",
]


def seed_algorithms() -> None:
    """Insert the built-in algorithms once."""
    db = SessionLocal()
    try:
        existing = set(db.scalars(select(models.Algorithm.id)).all())
        for spec in models.BUILTIN_ALGORITHMS:
            if spec["id"] not in existing:
                db.add(models.Algorithm(builtin=True, **spec))
        db.commit()
    except Exception:
        log.exception("could not seed algorithms")
        db.rollback()
    finally:
        db.close()


# content_safety is a new table; create_all makes it, but existing posts have
# no row. restrict_query treats a missing row as UNCLASSIFIED, i.e. hidden from
# minors, so the gap is closed in the safe direction until the backfill runs.
MIGRATIONS: list[str] = []

app = create_app(
    name="social-service",
    schema=models.SCHEMA,
    description="Posts, multiple feed modes, the algorithm marketplace, reactions and comments.",
    on_startup=[seed_algorithms],
)


# --- schemas ---------------------------------------------------------------

class PostIn(BaseModel):
    body: str = Field(default="", max_length=20000)
    # "short" is declared, never inferred. A portrait clip posted to the feed is
    # still a feed post; what makes a short is the author choosing that surface.
    format: str = Field(default="text", pattern="^(text|image|video|audio|article|carousel|short)$")
    visibility: str = Field(default="public", pattern="^(public|followers|circle|community)$")
    circle_id: str | None = None
    community_id: str | None = None
    lang: str = "en"
    country: str | None = None
    city: str | None = None
    neighborhood: str | None = None
    topics: list[str] = Field(default_factory=list)
    provenance: str = Field(default="original", pattern="^(original|edited|ai_assisted|ai_generated|verified_source)$")
    series_id: str | None = None
    episode_number: int | None = None
    media: list[dict] = Field(default_factory=list)
    mature: bool = False


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    parent_id: str | None = None
    lang: str = "en"


class SignalIn(BaseModel):
    kind: str = Field(pattern="^(less_like_this|more_like_this|mute_topic|mute_author)$")
    target_type: str = Field(pattern="^(post|author|topic)$")
    target_id: str


HASHTAG_RE = re.compile(r"#([\wÀ-ɏ؀-ۿ一-鿿][\wÀ-ɏ؀-ۿ一-鿿-]{1,49})")


def extract_hashtags(body: str) -> list[str]:
    """Pull #tags out of a body.

    Hashtags and the composer's topic field are the same thing to the ranker, so
    they are merged rather than tracked separately — a member who writes
    "#agriculture" gets the same reach as one who filled the topics box, which is
    the behaviour anyone would expect.

    The pattern accepts accented, Arabic and CJK characters: an English-only
    \w would silently drop a Swahili or Arabic tag.
    """
    return [tag.lower() for tag in HASHTAG_RE.findall(body or "")]


def _classify_and_store(
    db: OrmSession, post: models.Post, media_kinds: list[str], author_is_minor: bool
) -> classifier.Classification:
    """Run the classifier and write the result alongside the post.

    Inline rather than queued. A post that is published first and classified a
    few seconds later is a post that was visible to everybody for those
    seconds, and "a few seconds" is the entire lifetime of most feed
    impressions. The classifier is a regex pass over one body of text; it costs
    less than the insert it accompanies.
    """
    result = classifier.classify(
        body=post.body or "",
        media_kinds=media_kinds,
        author_is_minor=author_is_minor,
        declared_mature=bool(post.mature),
    )

    row = db.scalar(
        select(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id == post.id
        )
    )
    if row is None:
        row = models.ContentSafetyClassification(id=new_id("csc"), content_id=post.id)
        db.add(row)
    for key, value in result.as_payload().items():
        setattr(row, key, value)

    if result.block_publication:
        # Never published, not published-and-then-hidden. The difference is
        # whether anybody saw it.
        post.status = "withheld"
    if result.escalate_child_safety:
        # Out of the ordinary queue entirely. Logged at error level so it
        # surfaces in alerting rather than waiting to be noticed in a backlog.
        log.error(
            "child-safety escalation on %s by %s (risk %s)",
            post.id, post.author_id, result.exploitation_risk,
        )
    return result


def _restrict_attached_media(media_ids: list[str | None]) -> None:
    """Tell media-service these assets now need a ticket.

    Best-effort and logged loudly on failure. The alternative - refusing the
    post because one HTTP call did not land - would take posting down whenever
    media-service hiccups, and the asset is already unreferenced and
    unguessable in the meantime. The reconciliation job in NOT-DONE.md is the
    proper backstop.
    """
    for media_id in {m for m in media_ids if m}:
        try:
            httpx.post(f"{MEDIA_URL}/internal/media/{media_id}/restrict", timeout=4).raise_for_status()
        except Exception as exc:
            log.error("could not restrict media %s: %s", media_id, exc)


def _post_out(
    post: models.Post,
    db: OrmSession,
    why: list[dict] | None = None,
    viewer: str | None = None,
    authors: dict[str, dict] | None = None,
    reposted: set[str] | None = None,
) -> dict:
    media = db.scalars(
        select(models.PostMedia).where(models.PostMedia.post_id == post.id).order_by(models.PostMedia.position)
    ).all()
    # Every media URL leaves here as a short-lived ticket bound to this viewer.
    # Minted only at this point, which is downstream of the age check that
    # selected the post in the first place - so a URL cannot exist for a viewer
    # who was never allowed the post it belongs to.
    signed_media = {
        m.media_id: mediasign.sign_url(m.url, m.media_id, viewer) for m in media
    }
    return {
        "id": post.id,
        "author_id": post.author_id,
        # Resolved in one batch per response; without a handle the card has no
        # profile to link its avatar to.
        "author": (authors or {}).get(post.author_id),
        "body": post.body,
        "format": post.format,
        "lang": post.lang,
        "visibility": post.visibility,
        "circle_id": post.circle_id,
        "community_id": post.community_id,
        "country": post.country,
        "city": post.city,
        "topics": [t for t in (post.topics or "").split(",") if t],
        "provenance": post.provenance,
        "mature": post.mature,
        "series_id": post.series_id,
        "episode_number": post.episode_number,
        "likes_count": post.likes_count,
        "comments_count": post.comments_count,
        "reposts_count": post.reposts_count,
        "views_count": post.views_count,
        # The shared post travels inside the card. Depth is capped at one by
        # repost() pointing at the original, so this never recurses.
        "repost_of": (
            _post_out(original, db, viewer=viewer, authors=authors, reposted=reposted)
            if post.repost_of and (original := db.get(models.Post, post.repost_of))
            and original.status not in ("removed", "draft")
            else None
        ),
        # Resolved once per response by _reposted_by(); a per-card lookup here
        # would be one extra query for every post on the page.
        "reposted_by_me": post.id in (reposted if reposted is not None else set()),
        "created_at": post.created_at,
        "edited_at": post.edited_at,
        "media": [
            {
                "url": signed_media[m.media_id],
                "kind": m.kind,
                "alt_text": m.alt_text,
                "width": m.width,
                "height": m.height,
                "duration_seconds": m.duration_seconds,
            }
            for m in media
        ],
        # Included inline so a feed of 20 posts does not fire 20 extra requests
        # just to colour the reaction buttons.
        "reactions": _reaction_summary(db, post.id, viewer),
        "why": why,
    }


def _author_ids(db: OrmSession, posts: list[models.Post]) -> set[str]:
    """Every author on the page, including the authors of shared originals.

    One extra query for the whole page rather than a card falling back to a
    raw `usr_…` id because its author was never resolved.
    """
    ids = {p.author_id for p in posts}
    shared = [p.repost_of for p in posts if p.repost_of]
    if shared:
        ids |= set(
            db.scalars(select(models.Post.author_id).where(models.Post.id.in_(shared))).all()
        )
    return ids


def _reposted_by(db: OrmSession, viewer: str | None, posts: list[models.Post]) -> set[str]:
    """Which of these posts the viewer has already reposted — in one query.

    Includes the posts nested inside a share: the repost button on a shared card
    acts on the original, so it is the original's state the card needs.
    """
    post_ids = [p.id for p in posts] + [p.repost_of for p in posts if p.repost_of]
    if not viewer or not post_ids:
        return set()
    return set(
        db.scalars(
            select(models.Post.repost_of).where(
                models.Post.author_id == viewer,
                models.Post.repost_of.in_(post_ids),
                models.Post.body == "",
                models.Post.status == "published",
            )
        ).all()
    )


def _merge_topics(topics: list[str], body: str) -> str | None:
    """Explicit topics plus the hashtags found in the body, de-duplicated."""
    seen: list[str] = []
    for value in [t.strip().lower() for t in topics if t.strip()] + extract_hashtags(body):
        if value not in seen:
            seen.append(value)
    return ",".join(seen) or None


def _resolve_authors(ids: set[str]) -> dict[str, dict]:
    """One call for every author on the page rather than one per post."""
    if not ids:
        return {}
    try:
        response = httpx.post(f"{USER_URL}/internal/profiles", json={"ids": sorted(ids)}, timeout=5)
        response.raise_for_status()
        return response.json()["profiles"]
    except Exception as exc:
        log.warning("could not resolve post authors: %s", exc)
        return {}


def _viewer_age(user_id: str | None):
    """The viewer's authoritative age profile.

    Not a preference. ``age_mode`` used to come from the member's own settings,
    which meant the age gate was a checkbox the person being gated could clear.
    This comes from the identity record, and a failed lookup returns UNKNOWN —
    which the policy engine treats as a minor.
    """
    return ageclient.age_profile(user_id)


def _viewer_prefs(user_id: str | None) -> dict:
    """The viewer's *display* settings — data saver, autoplay.

    Age is deliberately no longer in here. These are preferences a member is
    entitled to set for themselves; age is not one of them.
    """
    if not user_id:
        return {"data_saver": False, "autoplay_media": True, "degraded": False}
    try:
        response = httpx.get(f"{USER_URL}/internal/preferences/{user_id}", timeout=4)
        response.raise_for_status()
        return {**response.json(), "degraded": False}
    except Exception as exc:
        log.warning("preferences lookup failed for %s: %s", user_id, exc)
        return {"data_saver": True, "autoplay_media": False, "degraded": True}


# Media kinds a data-saver feed will not carry inline.
HEAVY_MEDIA = {"video", "audio"}


def _apply_prefs(item: dict, prefs: dict) -> dict:
    """Trim a serialised post to what the viewer's settings allow.

    Done here rather than in the client because this is where the bytes are
    decided. A client that merely hides a video has already downloaded it.
    """
    if prefs.get("data_saver"):
        item["media"] = [
            {**m, "url": None, "deferred": True} if m["kind"] in HEAVY_MEDIA else m
            for m in item["media"][:1]
        ]
        item["data_saver"] = True
    if not prefs.get("autoplay_media", True):
        item["autoplay"] = False
    return item


def _context(db: OrmSession, principal) -> ranking.Context:
    ctx = ranking.Context(user_id=principal.user_id if principal else None)
    if principal is None:
        return ctx

    try:
        response = httpx.get(f"{USER_URL}/internal/audience/{principal.user_id}", timeout=4)
        if response.status_code == 200:
            data = response.json()
            ctx.muted_authors = set(data.get("blocked", []))
    except Exception:
        # A user-service hiccup degrades personalisation; it must not empty the feed.
        log.warning("audience lookup failed for %s", principal.user_id)

    # Declared interests come from preferences, which user-service owns.
    ctx.interests = {t.lower() for t in _viewer_prefs(principal.user_id).get("interest_topics", [])}

    for signal in db.scalars(
        select(models.FeedSignal).where(models.FeedSignal.user_id == principal.user_id)
    ).all():
        if signal.kind == "mute_author":
            ctx.muted_authors.add(signal.target_id)
        elif signal.kind == "mute_topic":
            ctx.muted_topics.add(signal.target_id.lower())
        else:
            key = f"{'author' if signal.target_type == 'author' else 'topic'}:{signal.target_id.lower()}"
            ctx.penalties[key] = ctx.penalties.get(key, 0.0) + signal.weight
    return ctx


# ---------------------------------------------------------------------------
# Posts
# ---------------------------------------------------------------------------

@app.post("/posts", status_code=201, tags=["posts"])
async def create_post(payload: PostIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    if payload.visibility == "circle" and not payload.circle_id:
        raise HTTPException(status_code=400, detail="A circle post needs circle_id")
    if payload.visibility == "community" and not payload.community_id:
        raise HTTPException(status_code=400, detail="A community post needs community_id")
    if not payload.body.strip() and not payload.media:
        raise HTTPException(status_code=400, detail="A post needs a body or media")

    data = payload.model_dump(exclude={"topics", "media"})
    post = models.Post(
        id=new_id("pst"),
        author_id=principal.user_id,
        topics=_merge_topics(payload.topics, payload.body),
        **data,
    )
    db.add(post)
    db.flush()

    for index, item in enumerate(payload.media):
        db.add(
            models.PostMedia(
                post_id=post.id,
                media_id=item.get("media_id", ""),
                url=item.get("url", ""),
                kind=item.get("kind", "image"),
                alt_text=item.get("alt_text"),
                position=index,
                width=item.get("width"),
                height=item.get("height"),
                duration_seconds=item.get("duration_seconds"),
            )
        )
    # Classified before it is committed as published: the age filter reads the
    # classification row, so a post that reaches the feed without one would be
    # invisible to minors at best and unrated at worst.
    verdict = _classify_and_store(
        db, post, [m.get("kind", "image") for m in payload.media],
        _viewer_age(principal.user_id).is_minor,
    )
    db.commit()
    db.refresh(post)

    if verdict.block_publication:
        # Deliberately vague, and identical whatever the reason. A message that
        # explains which rule was tripped is a message that explains how to get
        # around it next time.
        raise HTTPException(
            status_code=403,
            detail="This post cannot be published. If you believe this is a mistake, contact support.",
        )

    # Attached media stops being publicly fetchable from this moment. Marked
    # here, server-side, rather than declared by the uploader: a client that
    # could label its own media "public" would be the age gate.
    _restrict_attached_media([m.get("media_id") for m in payload.media])
    db.refresh(post)

    await events.publish(
        "post.published",
        {"post_id": post.id, "author_id": post.author_id, "format": post.format, "lang": post.lang},
    )
    # Only public posts announce themselves on the shared channels: a followers-
    # only or circle post must not surface on a stranger's screen just because
    # the feed is live.
    if post.visibility == "public":
        live("shorts" if post.format == "short" else "feed", "post",
             post_id=post.id, author_id=post.author_id, format=post.format,
             mature=post.mature)
    return _post_out(post, db, viewer=principal.user_id)


# Declared before /posts/{post_id}: FastAPI matches in order, and the
# parameterised route would otherwise read "by" as a post id.
@app.get("/posts/by/{author_id}", tags=["posts"])
def posts_by_author(
    author_id: str,
    principal: MaybeUser,
    limit: int = 20,
    offset: int = 0,
    db: OrmSession = Depends(get_db),
):
    """A member's own posts, for their profile page.

    Visibility is applied here rather than in the client: a visitor sees only
    public posts, and follower-only or circle-only posts stay out of the payload
    entirely instead of being fetched and then hidden.
    """
    viewer = principal.user_id if principal else None
    prefs = _viewer_prefs(viewer)
    age = _viewer_age(viewer)
    stmt = select(models.Post).where(
        models.Post.author_id == author_id, models.Post.status == "published"
    )
    # Before ordering and before paging: restricted rows are never fetched.
    stmt = agefilter.restrict_query(stmt, age)
    if viewer != author_id:
        stmt = stmt.where(models.Post.visibility == "public")

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(models.Post.created_at.desc()).limit(min(limit, 50)).offset(offset)
    ).all()
    authors = _resolve_authors(_author_ids(db, list(rows)))
    reposted = _reposted_by(db, viewer, list(rows))
    items = [
        _apply_prefs(_post_out(p, db, viewer=viewer, authors=authors, reposted=reposted), prefs)
        for p in rows
    ]
    return {"total": total, "items": agefilter.filter_items(db, age, items)}


class ClassificationIn(BaseModel):
    """A safety classification, as the pipeline or a reviewer writes it."""

    age_rating: str = Field(
        default="UNCLASSIFIED",
        pattern="^(GENERAL|TEEN_13_PLUS|TEEN_16_PLUS|ADULT_18_PLUS|PROHIBITED|UNCLASSIFIED)$",
    )
    sexual_content_level: int = Field(default=0, ge=0, le=3)
    nudity_level: int = Field(default=0, ge=0, le=3)
    violence_level: int = Field(default=0, ge=0, le=3)
    graphic_content_level: int = Field(default=0, ge=0, le=3)
    drugs_level: int = Field(default=0, ge=0, le=3)
    alcohol_level: int = Field(default=0, ge=0, le=3)
    gambling_level: int = Field(default=0, ge=0, le=3)
    dangerous_activity_level: int = Field(default=0, ge=0, le=3)
    self_harm_risk: int = Field(default=0, ge=0, le=3)
    hate_or_abuse_risk: int = Field(default=0, ge=0, le=3)
    exploitation_risk: int = Field(default=0, ge=0, le=3)
    classifier_source: str = ""
    classifier_confidence: float = 0.0
    human_review_status: str = "none"
    jurisdiction_overrides: dict = {}


@app.post("/internal/classify/{post_id}", tags=["internal"])
def classify_post(post_id: str, payload: ClassificationIn, db: OrmSession = Depends(get_db)):
    """Record or update a post's safety classification.

    Internal only: the classifier, a reviewer's tooling and the child-safety
    workflow call it. It is not reachable through the gateway, because a
    classification a member could set for their own post is not a
    classification at all.

    Upserted rather than appended so there is exactly one current answer per
    item, and the read path never has to decide which of several rows wins.
    """
    post = db.get(models.Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    row = db.scalar(
        select(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id == post_id
        )
    )
    if row is None:
        row = models.ContentSafetyClassification(id=new_id("csc"), content_id=post_id)
        db.add(row)

    data = payload.model_dump()
    overrides = data.pop("jurisdiction_overrides", {}) or {}
    for key, value in data.items():
        setattr(row, key, value)
    row.jurisdiction_overrides = json.dumps(overrides)

    # Exploitation risk is not an ordinary moderation outcome. It takes the
    # post out of circulation immediately and hands it to the child-safety
    # process rather than leaving it queued behind everything else.
    if payload.exploitation_risk >= 2 or payload.age_rating == "PROHIBITED":
        post.status = "removed"
        log.error("content %s withheld pending child-safety review", post_id)

    db.commit()
    return {"content_id": post_id, "age_rating": row.age_rating, "status": post.status}


@app.get("/internal/classification/{post_id}", tags=["internal"])
def read_classification(post_id: str, db: OrmSession = Depends(get_db)):
    row = db.scalar(
        select(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id == post_id
        )
    )
    if row is None:
        # Not an error: "unrated" is a real state, and the engine treats it as
        # adult-only. Saying so plainly is better than a 404 the caller has to
        # interpret.
        return {"content_id": post_id, "age_rating": "UNCLASSIFIED", "classified": False}
    return {
        "content_id": post_id,
        "age_rating": row.age_rating,
        "classified": True,
        "human_review_status": row.human_review_status,
        "classifier_source": row.classifier_source,
    }


@app.get("/admin/classification-queue", tags=["admin"])
def classification_queue(_: AdminUser, limit: int = 50, db: OrmSession = Depends(get_db)):
    """Content the classifier would not settle on its own.

    Mostly posts carrying media, which no text pass can see into. Until a
    reviewer or a vision model rates them they stay restricted, so the queue
    being long costs reach, not safety.
    """
    rows = db.scalars(
        select(models.ContentSafetyClassification)
        .where(models.ContentSafetyClassification.human_review_status == "pending")
        .order_by(models.ContentSafetyClassification.created_at)
        .limit(min(limit, 200))
    ).all()
    return {
        "pending": len(rows),
        "items": [
            {
                "content_id": r.content_id,
                "age_rating": r.age_rating,
                "classifier_source": r.classifier_source,
                "confidence": r.classifier_confidence,
                "exploitation_risk": r.exploitation_risk,
                "created_at": r.created_at,
            }
            for r in rows
        ],
    }


@app.post("/admin/classification/{post_id}/review", tags=["admin"])
def review_classification(
    post_id: str, payload: ClassificationIn, admin: AdminUser, db: OrmSession = Depends(get_db)
):
    """A human settles a rating. Their answer outranks the classifier's."""
    result = classify_post(post_id, payload, db)
    row = db.scalar(
        select(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id == post_id
        )
    )
    if row is not None:
        row.human_review_status = "confirmed"
        row.classifier_source = f"human:{admin.user_id}"
        row.classifier_confidence = 1.0
        db.commit()
    return result


# Not /internal/classify/backfill: that path is swallowed by
# /internal/classify/{post_id}, which matched "backfill" as an id and
# then demanded a classification body.
@app.post("/internal/classification-backfill", tags=["internal"])
def backfill_classifications(limit: int = 500, db: OrmSession = Depends(get_db)):
    """Classify posts that predate the classifier.

    They are currently unrated, which means restricted - safe, and invisible to
    every minor. This releases the ones that can be released and queues the
    rest. Idempotent: a post that already has a row is skipped.
    """
    classified = select(models.ContentSafetyClassification.content_id)
    rows = db.scalars(
        select(models.Post).where(models.Post.id.not_in(classified)).limit(min(limit, 2000))
    ).all()

    done, blocked, queued = 0, 0, 0
    for post in rows:
        kinds = db.scalars(
            select(models.PostMedia.kind).where(models.PostMedia.post_id == post.id)
        ).all()
        # The author's age today, not at the time of writing. Their tier may
        # have changed, and the current one is the one that governs.
        result = _classify_and_store(db, post, list(kinds), _viewer_age(post.author_id).is_minor)
        done += 1
        blocked += 1 if result.block_publication else 0
        queued += 1 if result.human_review_status == "pending" else 0
    db.commit()
    return {"classified": done, "withheld": blocked, "queued_for_review": queued}


@app.get("/posts/{post_id}", tags=["posts"])
def get_post(post_id: str, principal: MaybeUser, db: OrmSession = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if post is None or post.status in ("removed", "draft"):
        raise HTTPException(status_code=404, detail="Post not found")
    viewer = principal.user_id if principal else None
    prefs = _viewer_prefs(viewer)
    age = _viewer_age(viewer)
    # A direct link bypasses the feed entirely, so the same gate runs here.
    # 404 rather than 403: confirming that a post exists but is out of reach
    # tells somebody exactly which links are worth passing to a minor.
    if not agefilter.visible_to(db, age, post.id):
        raise HTTPException(status_code=404, detail="Post not found")
    post.views_count += 1
    db.commit()
    return _apply_prefs(_post_out(post, db, viewer=viewer), prefs)


@app.get("/posts/{post_id}/media", tags=["posts"])
def get_post_media(post_id: str, principal: MaybeUser, db: OrmSession = Depends(get_db)):
    """The full media list, ignoring data saver.

    Data saver withholds heavy URLs so nothing downloads on its own; this is how
    a member says "yes, load it anyway" for one post without turning the setting
    off. The age rule is *not* relaxed here — that one is not the viewer's to
    waive.
    """
    post = db.get(models.Post, post_id)
    if post is None or post.status in ("removed", "draft"):
        raise HTTPException(status_code=404, detail="Post not found")
    viewer_id = principal.user_id if principal else None
    prefs = _viewer_prefs(viewer_id)
    # The bytes themselves. Withholding the URL is the only protection that
    # actually works - a client told "do not display this" has already
    # downloaded it.
    if not agefilter.visible_to(db, _viewer_age(viewer_id), post.id):
        raise HTTPException(status_code=404, detail="Post not found")
    rows = db.scalars(
        select(models.PostMedia)
        .where(models.PostMedia.post_id == post.id)
        .order_by(models.PostMedia.position)
    ).all()
    return {
        "post_id": post.id,
        # Signed here too: this route is reached by "load it anyway" after data
        # saver withheld the inline URL, and it is exactly the route somebody
        # would try if the feed's URLs stopped working unsigned.
        "media": [
            {
                "url": mediasign.sign_url(m.url, m.media_id, viewer_id),
                "kind": m.kind,
                "alt_text": m.alt_text,
            }
            for m in rows
        ],
    }


@app.patch("/posts/{post_id}", tags=["posts"])
def edit_post(post_id: str, payload: PostIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if post is None or post.author_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Post not found")
    post.body = payload.body
    post.topics = _merge_topics(payload.topics, payload.body)
    post.edited_at = datetime.now(timezone.utc)
    # An edit of original content becomes "edited" — provenance must stay honest.
    if post.provenance == "original":
        post.provenance = "edited"
    db.commit()
    return _post_out(post, db)


@app.delete("/posts/{post_id}", status_code=204, tags=["posts"])
def delete_post(post_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if post is None or (post.author_id != principal.user_id and not principal.is_admin):
        raise HTTPException(status_code=404, detail="Post not found")
    post.status = "removed"
    db.commit()


# ---------------------------------------------------------------------------
# Feeds
# ---------------------------------------------------------------------------

def _visible_posts(principal, age):
    """The base feed query: published, age-appropriate, and audience-allowed.

    Factored out so the shorts reel cannot drift from the feed's rules. A second
    hand-written query is how a post a minor must not see ends up visible on one
    surface and hidden on another.

    ``age`` is the authoritative profile from the identity record, never the
    viewer's own settings.
    """
    stmt = select(models.Post).where(models.Post.status == "published")
    # Age eligibility enters the SQL here, before ranking and before paging,
    # so restricted rows are never candidates in the first place.
    stmt = agefilter.restrict_query(stmt, age)
    if principal is None:
        return stmt.where(models.Post.visibility == "public")
    return stmt.where(
        or_(
            models.Post.visibility == "public",
            models.Post.author_id == principal.user_id,
            models.Post.visibility == "followers",
        )
    )


@app.get("/shorts", tags=["shorts"])
def shorts(
    principal: MaybeUser,
    limit: int = Query(default=12, le=40),
    offset: int = 0,
    author: str | None = None,
    db: OrmSession = Depends(get_db),
):
    """The vertical reel.

    Only posts the author published *as* a short — a landscape clip dropped into
    the feed is not silently promoted into a full-screen reel it was never
    framed for.

    Data saver is deliberately **not** applied here the way it is on the feed.
    A reel with every clip withheld is not a reel; the surface exists to play
    video, and asking for it is consent to load it. The autoplay preference is
    still honoured, so a member on a metered connection can open a short and
    have it wait for a tap.
    """
    viewer = principal.user_id if principal else None
    prefs = _viewer_prefs(viewer)
    age = _viewer_age(viewer)

    stmt = _visible_posts(principal, age).where(models.Post.format == "short")
    if author:
        stmt = stmt.where(models.Post.author_id == author)

    ctx = _context(db, principal)
    if ctx.muted_authors:
        stmt = stmt.where(models.Post.author_id.not_in(ctx.muted_authors))

    rows = db.scalars(
        stmt.order_by(models.Post.created_at.desc()).limit(limit).offset(offset)
    ).all()
    authors = _resolve_authors(_author_ids(db, list(rows)))
    reposted = _reposted_by(db, viewer, list(rows))

    items = [_post_out(p, db, viewer=viewer, authors=authors, reposted=reposted) for p in rows]
    for item in items:
        if not prefs.get("autoplay_media", True):
            item["autoplay"] = False

    return {
        "items": items,
        "has_more": len(rows) == limit,
        "applied_settings": {
            # The tier, so a client can explain why a surface looks the way it
            # does. It is a readout, never an input.
            "age_tier": agefilter.tier_of(age),
            "autoplay_media": prefs.get("autoplay_media", True),
            "degraded": prefs.get("degraded", False) or age.degraded,
        },
    }


@app.get("/feed", tags=["feed"])
def feed(
    principal: MaybeUser,
    mode: str = Query(default="following"),
    algorithm_id: str | None = None,
    country: str | None = None,
    city: str | None = None,
    topic: str | None = None,
    limit: int = Query(default=25, le=100),
    offset: int = 0,
    db: OrmSession = Depends(get_db),
):
    """One endpoint, explicit modes.

    ``following`` is strictly reverse-chronological and never ranked — that is
    the promise the blueprint makes, and running it through the ranker would
    quietly break it.
    """
    if mode not in FEED_MODES:
        raise HTTPException(status_code=400, detail=f"Unknown feed mode. Available: {', '.join(FEED_MODES)}")

    viewer = principal.user_id if principal else None
    ctx = _context(db, principal)
    prefs = _viewer_prefs(principal.user_id if principal else None)
    age = _viewer_age(principal.user_id if principal else None)

    # Shared with the shorts reel: published, age-appropriate, audience-allowed.
    # The age rule is applied in the query rather than after - a post a child
    # must not see should never be selected, never serialised and never sent.
    stmt = _visible_posts(principal, age)

    following: set[str] = set()
    if principal is not None:
        try:
            response = httpx.get(
                f"{USER_URL}/users/me/following",
                headers={"Authorization": f"Bearer {''}"},
                timeout=3,
            )
            if response.status_code == 200:
                following = set(response.json().get("user_ids", []))
        except Exception:
            pass
    ctx.following = following

    if mode == "following":
        if not following:
            return {"mode": mode, "algorithm": "chronological", "items": [],
                    "age_tier": agefilter.tier_of(age), "empty_reason": "not_following_anyone"}
        rows = db.scalars(
            stmt.where(models.Post.author_id.in_(following))
            .order_by(models.Post.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).all()
        authors = _resolve_authors(_author_ids(db, list(rows)))
        reposted = _reposted_by(db, viewer, list(rows))
        return {
            "mode": mode,
            "algorithm": "chronological",
            "ranked": False,
            "age_tier": agefilter.tier_of(age),
            "items": [_apply_prefs(_post_out(p, db, viewer=viewer, authors=authors, reposted=reposted), prefs) for p in rows],
        }

    if mode == "new":
        rows = db.scalars(stmt.order_by(models.Post.created_at.desc()).limit(limit).offset(offset)).all()
        authors = _resolve_authors(_author_ids(db, list(rows)))
        reposted = _reposted_by(db, viewer, list(rows))
        return {
            "mode": mode,
            "algorithm": "chronological",
            "ranked": False,
            "age_tier": agefilter.tier_of(age),
            "items": [_apply_prefs(_post_out(p, db, viewer=viewer, authors=authors, reposted=reposted), prefs) for p in rows],
        }

    if mode == "local" and city:
        stmt = stmt.where(func.lower(models.Post.city) == city.lower())
    elif mode == "country" and country:
        stmt = stmt.where(models.Post.country == country.upper())
    elif mode == "topics" and topic:
        stmt = stmt.where(models.Post.topics.like(f"%{topic.lower()}%"))
    elif mode == "circles":
        if principal is None:
            raise HTTPException(status_code=401, detail="Sign in to see your circles")
        stmt = stmt.where(models.Post.visibility == "circle")

    chosen_id = algorithm_id or {
        "for_you": "friends_first",
        "trending": "entertainment",
        "local": "local_news",
        "global": "global_discovery",
    }.get(mode, "chronological")

    algorithm = db.get(models.Algorithm, chosen_id)
    if algorithm is None:
        raise HTTPException(status_code=404, detail=f"Unknown algorithm '{chosen_id}'")

    ctx.country = country
    ctx.city = city

    # Rank a bounded candidate window rather than the whole table.
    candidates = db.scalars(stmt.order_by(models.Post.created_at.desc()).limit(500)).all()
    scored = ranking.rank(list(candidates), algorithm, ctx)
    page = scored[offset : offset + limit]
    ranked_authors = _resolve_authors(_author_ids(db, [item.post for item in page]))
    reposted = _reposted_by(db, viewer, [item.post for item in page])

    return {
        "mode": mode,
        "algorithm": algorithm.id,
        "algorithm_name": algorithm.name,
        "ranked": True,
        "total_candidates": len(scored),
        "applied_settings": {
            "age_tier": agefilter.tier_of(age),
            "data_saver": bool(prefs.get("data_saver")),
            "degraded": bool(prefs.get("degraded")) or age.degraded,
        },
        "items": [
            _apply_prefs(
                _post_out(item.post, db, why=item.why(), viewer=viewer, authors=ranked_authors, reposted=reposted), prefs
            )
            for item in page
        ],
    }


@app.get("/feed/modes", tags=["feed"])
def feed_modes():
    return {
        "modes": [
            {"id": "following", "label": "Following", "ranked": False, "description": "Strict reverse-chronological."},
            {"id": "for_you", "label": "For You", "ranked": True, "description": "Personalised by your chosen algorithm."},
            {"id": "circles", "label": "Circles", "ranked": True, "description": "Posts shared to your circles."},
            {"id": "friends", "label": "Friends", "ranked": True, "description": "Mutual connections."},
            {"id": "local", "label": "Local", "ranked": True, "description": "Your city and neighborhood."},
            {"id": "country", "label": "Country", "ranked": True, "description": "Your country."},
            {"id": "global", "label": "Global", "ranked": True, "description": "Beyond your country."},
            {"id": "topics", "label": "Topics", "ranked": True, "description": "A single topic."},
            {"id": "trending", "label": "Trending", "ranked": True, "description": "Gaining traction now."},
            {"id": "new", "label": "New", "ranked": False, "description": "Everything, newest first."},
        ]
    }


RANKED_MODES = {"for_you", "friends", "trending", "circles"}


def _inclusion_reasons(post: models.Post, mode: str, viewer: str | None, db: OrmSession) -> list[dict]:
    """Why this post is in the feed at all, before any ranking.

    This is the question members actually ask. A score alone does not answer it:
    on an unranked mode nothing was scored, and even on a ranked one the first
    thing that matters is which rule *selected* the post.
    """
    reasons: list[dict] = []

    if post.author_id == viewer:
        reasons.append({"kind": "own", "label": "You wrote it."})

    if mode == "following":
        reasons.append({"kind": "following", "label": "You follow the author."})
    elif mode == "local" and post.city:
        reasons.append({"kind": "place", "label": f"Posted in {post.city}."})
    elif mode == "country" and post.country:
        reasons.append({"kind": "place", "label": f"Posted from {post.country}."})
    elif mode == "topics" and post.topics:
        reasons.append({"kind": "topic", "label": f"Tagged {', '.join('#' + t for t in post.topics.split(',')[:3])}."})
    elif mode == "circles" and post.circle_id:
        reasons.append({"kind": "circle", "label": "Shared to one of your circles."})
    elif mode == "new":
        reasons.append({"kind": "recent", "label": "It is one of the most recent posts on Kinjy."})
    elif mode == "global":
        reasons.append({"kind": "public", "label": "It is public, and you are browsing everything."})
    elif mode == "trending":
        reasons.append({"kind": "trending", "label": "It is getting engagement right now."})
    elif mode == "for_you":
        reasons.append({"kind": "ranked", "label": "Your algorithm placed it here."})

    if post.visibility == "public":
        reasons.append({"kind": "visibility", "label": "The author made it public."})
    elif post.visibility == "followers":
        reasons.append({"kind": "visibility", "label": "The author shared it with their followers."})

    return reasons


@app.get("/feed/why/{post_id}", tags=["feed"])
def why_am_i_seeing_this(
    post_id: str,
    principal: MaybeUser,
    algorithm_id: str = "friends_first",
    mode: str = "new",
    db: OrmSession = Depends(get_db),
):
    """Why this post is in this feed, for this viewer.

    Two separate answers, because conflating them misleads: *selection* (which
    feed mode picked it up) and, only when the mode actually ranks, *ordering*
    (the score and its components). Reporting "ranked by chronological, score
    0.46" on an unranked feed described something that never happened.
    """
    post = db.get(models.Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    viewer = principal.user_id if principal else None
    ranked = mode in RANKED_MODES
    reasons = _inclusion_reasons(post, mode, viewer, db)

    payload: dict = {
        "post_id": post_id,
        "mode": mode,
        "ranked": ranked,
        "reasons": reasons,
        "actions": ["show_less_like_this", "mute_author", "mute_topic", "change_algorithm"],
    }

    if not ranked:
        payload["explanation"] = "This feed is in date order — nothing was ranked or personalised."
        payload["factors"] = []
        return payload

    algorithm = db.get(models.Algorithm, algorithm_id)
    if algorithm is None:
        # A missing algorithm must not blank the whole answer: the selection
        # reasons above are still true and still worth showing.
        payload["explanation"] = f"Unknown algorithm '{algorithm_id}', so ordering cannot be explained."
        payload["factors"] = []
        return payload

    scored = ranking.score_post(post, algorithm, _context(db, principal))
    payload.update(
        {
            "algorithm": algorithm.id,
            "algorithm_name": algorithm.name,
            "score": round(scored.score, 4),
            "factors": scored.why(),
            "explanation": f"Ordered by “{algorithm.name}”, the algorithm you chose.",
        }
    )
    return payload


@app.post("/feed/signals", status_code=201, tags=["feed"])
def add_signal(payload: SignalIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """"Show less like this" — recorded and honoured on the next feed build."""
    weight = 1.0 if payload.kind == "more_like_this" else -1.0
    target_id = payload.target_id
    if payload.kind == "less_like_this" and payload.target_type == "post":
        post = db.get(models.Post, target_id)
        if post is None:
            raise HTTPException(status_code=404, detail="Post not found")
        # Penalise the author and the topics, not the (already-seen) post.
        db.add(
            models.FeedSignal(
                user_id=principal.user_id,
                kind=payload.kind,
                target_type="author",
                target_id=post.author_id,
                weight=weight,
            )
        )
        for topic in (post.topics or "").split(","):
            if topic.strip():
                db.add(
                    models.FeedSignal(
                        user_id=principal.user_id,
                        kind=payload.kind,
                        target_type="topic",
                        target_id=topic.strip().lower(),
                        weight=weight / 2,
                    )
                )
    else:
        db.add(
            models.FeedSignal(
                user_id=principal.user_id,
                kind=payload.kind,
                target_type=payload.target_type,
                target_id=target_id,
                weight=weight,
            )
        )
    db.commit()
    return {"recorded": True, "applies_from": "next feed request"}


# ---------------------------------------------------------------------------
# Algorithm marketplace
# ---------------------------------------------------------------------------

@app.get("/algorithms", tags=["algorithms"])
def list_algorithms(db: OrmSession = Depends(get_db)):
    rows = db.scalars(select(models.Algorithm).order_by(models.Algorithm.builtin.desc(), models.Algorithm.name)).all()
    return {
        "items": [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "builtin": r.builtin,
                "author_id": r.author_id,
                "installs": r.installs,
                "weights": {
                    "recency": r.weight_recency,
                    "affinity": r.weight_affinity,
                    "engagement": r.weight_engagement,
                    "locality": r.weight_locality,
                    "family": r.weight_family,
                    "new_creator": r.weight_new_creator,
                },
                "filters": {"topics": r.topic_filter, "formats": r.format_filter},
            }
            for r in rows
        ]
    }


class AlgorithmIn(BaseModel):
    id: str = Field(min_length=3, max_length=60, pattern="^[a-z0-9_]+$")
    name: str
    description: str = ""
    weight_recency: float = 1.0
    weight_affinity: float = 0.0
    weight_engagement: float = 0.0
    weight_locality: float = 0.0
    weight_family: float = 0.0
    weight_new_creator: float = 0.0
    topic_filter: str | None = None
    format_filter: str | None = None


@app.post("/algorithms", status_code=201, tags=["algorithms"])
def publish_algorithm(payload: AlgorithmIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Developers publish feed algorithms (blueprint §2)."""
    if db.get(models.Algorithm, payload.id):
        raise HTTPException(status_code=409, detail="That algorithm id is taken")
    algorithm = models.Algorithm(author_id=principal.user_id, builtin=False, **payload.model_dump())
    db.add(algorithm)
    db.commit()
    return {"id": algorithm.id, "published": True}


# ---------------------------------------------------------------------------
# Reactions & comments
# ---------------------------------------------------------------------------


# One reaction per member per post: picking a new one replaces the old, the way
# people expect. `likes_count` stays the total across every kind, so existing
# ranking signals keep working without a migration.
REACTION_KINDS = ("like", "celebrate", "support", "insightful", "love")


class ReactIn(BaseModel):
    kind: str = Field(default="like")


def _reaction_summary(db: OrmSession, post_id: str, viewer: str | None) -> dict:
    rows = db.execute(
        select(models.Reaction.kind, func.count())
        .where(models.Reaction.post_id == post_id)
        .group_by(models.Reaction.kind)
    ).all()
    mine = None
    if viewer:
        mine = db.scalar(
            select(models.Reaction.kind).where(
                models.Reaction.post_id == post_id, models.Reaction.user_id == viewer
            )
        )
    return {
        "counts": {kind: count for kind, count in rows},
        "total": sum(count for _, count in rows),
        "mine": mine,
    }


@app.post("/posts/{post_id}/react", tags=["engagement"])
def react(post_id: str, payload: ReactIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    if payload.kind not in REACTION_KINDS:
        raise HTTPException(status_code=400, detail=f"Unknown reaction. Available: {', '.join(REACTION_KINDS)}")

    post = db.get(models.Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.scalar(
        select(models.Reaction).where(
            models.Reaction.post_id == post_id, models.Reaction.user_id == principal.user_id
        )
    )

    if existing and existing.kind == payload.kind:
        # Tapping the same reaction again clears it.
        db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
    elif existing:
        existing.kind = payload.kind  # switch, total unchanged
    else:
        db.add(models.Reaction(post_id=post_id, user_id=principal.user_id, kind=payload.kind))
        post.likes_count += 1

    db.commit()
    _broadcast_reactions(db, post, principal.user_id)
    return {"post_id": post_id, "reactions": _reaction_summary(db, post_id, principal.user_id)}


@app.get("/posts/{post_id}/reactions", tags=["engagement"])
def post_reactions(post_id: str, principal: MaybeUser, db: OrmSession = Depends(get_db)):
    return _reaction_summary(db, post_id, principal.user_id if principal else None)


def _broadcast_reactions(db: OrmSession, post: models.Post, actor: str) -> None:
    """Announce a post's reaction state.

    `like` and `react` are two routes onto the same counter, so both send the
    same shape — otherwise a client would need one handler per route and a
    plain like would leave the reaction pill stale.

    `mine` is deliberately not included: it is per-viewer, and broadcasting the
    actor's own choice would paint it on everyone else's card.
    """
    summary = _reaction_summary(db, post.id, None)
    live(f"post:{post.id}", "reactions", post_id=post.id,
         counts=summary["counts"], total=summary["total"],
         likes_count=post.likes_count, actor=actor)


@app.post("/posts/{post_id}/like", tags=["engagement"])
def like(post_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.scalar(
        select(models.Reaction).where(
            models.Reaction.post_id == post_id, models.Reaction.user_id == principal.user_id
        )
    )
    if existing:
        db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        db.commit()
        _broadcast_reactions(db, post, principal.user_id)
        return {"liked": False, "likes_count": post.likes_count}
    db.add(models.Reaction(post_id=post_id, user_id=principal.user_id))
    post.likes_count += 1
    db.commit()
    _broadcast_reactions(db, post, principal.user_id)
    return {"liked": True, "likes_count": post.likes_count}


class RepostIn(BaseModel):
    """A comment turns a repost into a quote — the blueprint's two are one route."""

    body: str = Field(default="", max_length=5000)
    visibility: str = Field(default="public", pattern="^(public|followers|circle|community)$")
    circle_id: str | None = None


@app.post("/posts/{post_id}/repost", status_code=201, tags=["engagement"])
def repost(post_id: str, payload: RepostIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Share someone's post to your own audience.

    The repost carries the original's topics so it can still be found by tag,
    but keeps its own author, timestamp and audience. Reposting a repost points
    at the original rather than building a chain — three levels of "X shared Y
    sharing Z" tells the reader nothing.
    """
    original = db.get(models.Post, post_id)
    if original is None or original.status in ("removed", "draft"):
        raise HTTPException(status_code=404, detail="Post not found")

    target = db.get(models.Post, original.repost_of) if original.repost_of else original
    if target is None:
        raise HTTPException(status_code=404, detail="Post not found")
    if target.author_id == principal.user_id and not payload.body.strip():
        raise HTTPException(status_code=400, detail="Reposting your own post needs a comment")

    existing = db.scalar(
        select(models.Post).where(
            models.Post.author_id == principal.user_id,
            models.Post.repost_of == target.id,
            models.Post.body == "",
            models.Post.status == "published",
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="You already reposted this")

    post = models.Post(
        id=new_id("pst"),
        author_id=principal.user_id,
        body=payload.body.strip(),
        format="text",
        visibility=payload.visibility,
        circle_id=payload.circle_id if payload.visibility == "circle" else None,
        repost_of=target.id,
        topics=target.topics,
        lang=target.lang,
        # Inherited so a repost of adult content stays out of a minor's feed —
        # the sharer cannot launder it by resharing.
        mature=target.mature,
        provenance="original" if payload.body.strip() else "verified_source",
    )
    db.add(post)
    target.reposts_count += 1
    db.commit()
    live(f"post:{target.id}", "reposts", post_id=target.id,
         reposts_count=target.reposts_count, actor=principal.user_id)
    live("feed", "post", post_id=post.id, author_id=principal.user_id, format="text")
    return _post_out(post, db, viewer=principal.user_id)


@app.delete("/posts/{post_id}/repost", status_code=204, tags=["engagement"])
def undo_repost(post_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Undo a plain repost. A quote is a post of your own — delete it as one."""
    mine = db.scalar(
        select(models.Post).where(
            models.Post.author_id == principal.user_id,
            models.Post.repost_of == post_id,
            models.Post.body == "",
            models.Post.status == "published",
        )
    )
    if mine is None:
        raise HTTPException(status_code=404, detail="You have not reposted this")
    original = db.get(models.Post, post_id)
    if original is not None:
        original.reposts_count = max(0, original.reposts_count - 1)
    db.delete(mine)
    db.commit()
    if original is not None:
        live(f"post:{post_id}", "reposts", post_id=post_id,
             reposts_count=original.reposts_count, actor=principal.user_id)


class ViewsIn(BaseModel):
    post_ids: list[str] = Field(default_factory=list, max_length=100)


@app.post("/posts/views", tags=["engagement"])
def record_views(payload: ViewsIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Record that these posts were actually seen.

    Batched because the client reports whatever came into view since the last
    call — one request per card would be one request per scroll tick. A member's
    own post does not count as a view of it, and each pair is stored once, so
    the figure means "people who saw this", not "times a card rendered".
    """
    ids = [pid for pid in dict.fromkeys(payload.post_ids) if pid]
    if not ids:
        return {"recorded": 0}

    already = set(
        db.scalars(
            select(models.PostView.post_id).where(
                models.PostView.user_id == principal.user_id, models.PostView.post_id.in_(ids)
            )
        ).all()
    )
    fresh = [
        post
        for post in db.scalars(
            select(models.Post).where(models.Post.id.in_([i for i in ids if i not in already]))
        ).all()
        if post.author_id != principal.user_id
    ]
    for post in fresh:
        db.add(models.PostView(post_id=post.id, user_id=principal.user_id))
        post.views_count += 1
    db.commit()
    for post in fresh:
        live(f"post:{post.id}", "views", post_id=post.id, views_count=post.views_count)
    return {"recorded": len(fresh), "counts": {p.id: p.views_count for p in fresh}}


# Two visual levels: 0 = a comment, 1 = a reply to it. Anything deeper joins the
# depth-1 branch and names its addressee instead of indenting further.
#
# Unbounded nesting turns a conversation into a staircase that runs out of
# horizontal room; the @mention carries "who answered whom" once indentation
# can no longer show it.
MAX_COMMENT_DEPTH = 1

USER_SERVICE = "http://user-service:8000"


def _authors(ids: set[str]) -> dict[str, dict]:
    """Resolve author ids to handles for display and for @mentions.

    Falls back to the raw id when user-service cannot be reached: a comment
    thread that renders with ugly names still beats one that fails to load.
    """
    if not ids:
        return {}
    try:
        response = httpx.post(f"{USER_SERVICE}/internal/profiles", json={"ids": sorted(ids)}, timeout=5)
        response.raise_for_status()
        return response.json()["profiles"]
    except Exception as exc:
        log.warning("could not resolve comment authors: %s", exc)
        return {}


@app.post("/posts/{post_id}/comments", status_code=201, tags=["engagement"])
def add_comment(post_id: str, payload: CommentIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    parent = db.get(models.Comment, payload.parent_id) if payload.parent_id else None
    if payload.parent_id and (parent is None or parent.post_id != post_id):
        raise HTTPException(status_code=400, detail="That comment is not on this post")

    depth = 0
    parent_id = None
    reply_to = None

    if parent is not None:
        reply_to = parent.author_id
        if parent.depth < MAX_COMMENT_DEPTH:
            depth = parent.depth + 1
            parent_id = parent.id
        else:
            # Too deep to indent: hang it off the deepest allowed ancestor so it
            # stays in the right branch, and keep `reply_to` so the client can
            # show who it answers.
            depth = MAX_COMMENT_DEPTH
            cursor = parent
            while cursor.depth > MAX_COMMENT_DEPTH - 1 and cursor.parent_id:
                nxt = db.get(models.Comment, cursor.parent_id)
                if nxt is None:
                    break
                cursor = nxt
            parent_id = cursor.id

    comment = models.Comment(
        id=new_id("cmt"),
        post_id=post_id,
        author_id=principal.user_id,
        parent_id=parent_id,
        depth=depth,
        reply_to=reply_to,
        body=payload.body,
        lang=payload.lang,
    )
    db.add(comment)
    post.comments_count += 1
    db.commit()
    live(f"post:{post_id}", "comment",
         post_id=post_id, comment_id=comment.id, author_id=principal.user_id,
         parent_id=parent_id, reply_to=reply_to, depth=depth,
         comments_count=post.comments_count)
    # The author, and whoever is being replied to, hear about it on their own
    # channel even when they are not looking at the post.
    for target in {post.author_id, reply_to} - {principal.user_id, None}:
        live(f"user:{target}", "activity", event_kind="comment",
             post_id=post_id, comment_id=comment.id, actor=principal.user_id)
        notify.notify(
            target,
            kind="comment" if target == post.author_id else "reply",
            title="Someone replied to you" if target == reply_to else "New comment on your post",
            body=payload.body[:140],
            link=f"/hub?post={post_id}",
        )
    return {
        "id": comment.id,
        "created_at": comment.created_at,
        "depth": depth,
        "parent_id": parent_id,
        "reply_to": reply_to,
    }


@app.get("/posts/{post_id}/comments", tags=["engagement"])
def list_comments(post_id: str, limit: int = 100, offset: int = 0, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.Comment)
        .where(models.Comment.post_id == post_id, models.Comment.status == "published")
        .order_by(models.Comment.created_at)
        .limit(min(limit, 300))
        .offset(offset)
    ).all()

    people = _authors({r.author_id for r in rows} | {r.reply_to for r in rows if r.reply_to})

    def describe(uid: str | None) -> dict | None:
        if not uid:
            return None
        profile = people.get(uid)
        return {
            "id": uid,
            "handle": profile["handle"] if profile else uid[:12],
            "display_name": profile["display_name"] if profile else uid[:12],
        }

    return {
        "max_depth": MAX_COMMENT_DEPTH,
        "items": [
            {
                "id": r.id,
                "author_id": r.author_id,
                "author": describe(r.author_id),
                "parent_id": r.parent_id,
                "depth": r.depth,
                "reply_to": r.reply_to,
                "reply_to_user": describe(r.reply_to),
                "body": r.body,
                "lang": r.lang,
                "created_at": r.created_at,
            }
            for r in rows
        ],
    }


@app.get("/internal/stats", tags=["internal"])
def stats(db: OrmSession = Depends(get_db)):
    return {
        "posts": db.scalar(select(func.count()).select_from(models.Post)) or 0,
        "comments": db.scalar(select(func.count()).select_from(models.Comment)) or 0,
        "algorithms": db.scalar(select(func.count()).select_from(models.Algorithm)) or 0,
    }
