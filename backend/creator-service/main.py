"""Kinjy · creator-service — creator studio, publishing engine, subscriptions."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import json
import logging

import httpx
from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session as OrmSession
from starlette.concurrency import run_in_threadpool

from common import agefeatures, events, mediasign, settings
from common.agesafety import engine as age_engine
from common.auth import CurrentUser, MaybeUser
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import models
import derive
import media_jobs
import newsletter
import newsletter_jobs
import billing
import render

AI_URL = "http://ai-service:8000"
log = logging.getLogger("creator-service")
LEDGER_URL = "http://ledger-service:8000"

# Columns added after the first deploy; create_all only creates missing tables.
MIGRATIONS = [
    f"ALTER TABLE {models.SCHEMA}.publishing_outputs ADD COLUMN IF NOT EXISTS simulated BOOLEAN DEFAULT FALSE",
    f"ALTER TABLE {models.SCHEMA}.publishing_outputs ADD COLUMN IF NOT EXISTS media TEXT",
    f"ALTER TABLE {models.SCHEMA}.newsletter_subscribers ADD COLUMN IF NOT EXISTS creator_handle VARCHAR(60) DEFAULT ''",
]

app = create_app(
    name="creator-service",
    schema=models.SCHEMA,
    description="Creator profiles, one-to-many publishing, series, subscriptions, badges.",
    migrations=MIGRATIONS,
    # Whatever was rendering when the last process stopped is not any more.
    on_startup=[media_jobs.recover, newsletter_jobs.recover],
)
app.include_router(newsletter.router)
app.include_router(billing.router)

# What a creator may hand the engine at once. The text is the same bound a post
# has; without one, a single request could ask for megabytes to be translated
# into every language, which is a bill and not a feature.
MAX_SOURCE_CHARS = 20000

FORMAT_LABELS = {
    "article": "Article",
    "short_video": "Short video",
    "long_video": "Long video",
    "audio": "Audio",
    "carousel": "Carousel",
    "newsletter": "Newsletter",
    "translation": "Translation",
}
# What a creator should know about a format before choosing it, shown with it.
FORMAT_NOTES = {
    "carousel": f"Your text cut into slides, up to {render.MAX_CAROUSEL_SLIDES}. Made in a moment.",
    "audio": "Read aloud by a synthetic voice - clear, but plainly a machine.",
    "short_video": "Vertical, slides read aloud by a synthetic voice. Up to 90 seconds.",
    "long_video": "Landscape, slides read aloud by a synthetic voice. Up to 10 minutes.",
}
LANGUAGE_NAMES = {
    "en": ("English", "English"),
    "sw": ("Swahili", "Kiswahili"),
    "fr": ("French", "Français"),
    "ar": ("Arabic", "العربية"),
    "zh": ("Chinese", "中文"),
}


class PublishIn(BaseModel):
    source_kind: str = Field(default="text", pattern="^(text|video|audio)$")
    source_text: str | None = Field(default=None, max_length=MAX_SOURCE_CHARS)
    source_ref: str | None = Field(default=None, max_length=120)
    source_lang: str = Field(default="en", min_length=2, max_length=5)
    targets: list[str] = Field(min_length=1, max_length=len(models.PublishingJob.TARGETS))
    target_langs: list[str] = Field(default_factory=list, max_length=len(settings.SUPPORTED_LANGS))

    @field_validator("targets", "target_langs")
    @classmethod
    def _once_each(cls, value: list[str]) -> list[str]:
        """Each format and each language once, in the order asked: a repeated one
        would be produced twice and shown twice."""
        return list(dict.fromkeys(value))


class SubscribeIn(BaseModel):
    target_id: str = "platform"
    tier: str = Field(pattern="^(free|basic|premium|creator)$")
    period: str = Field(default="monthly", pattern="^(monthly|yearly)$")


class SeriesIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str = ""
    cover_url: str | None = None
    cadence: str | None = None


@app.get("/creators/plans", tags=["subscriptions"])
def plans():
    """The versioned prices and benefits actually available today."""
    return billing.catalog()


AGE_GATED_FEATURES = ("livestream", "livestream_gifting", "monetization", "marketplace_sell", "marketplace_buy", "payments", "referral_pool")


@app.get("/creators/eligibility", tags=["creators"])
def feature_eligibility(principal: CurrentUser):
    """What this account may and may not do, before it tries.

    So a client can grey a button out and say why, rather than letting somebody
    fill in a payment form and refusing at the end. It is a readout: the gates
    on the endpoints themselves are what actually enforce anything, and they do
    not consult this.
    """
    return agefeatures.eligibility(principal.user_id, AGE_GATED_FEATURES)


@app.get("/live/eligibility", tags=["livestream"])
def livestream_eligibility(principal: CurrentUser):
    """Whether this account may start a livestream, and under what rules.

    There is no streaming backend yet - no ingest, no session, no key. What
    exists is the decision, exposed at the address a streaming stack would have
    to ask. Building the gate first is deliberate: the alternative is shipping
    the stack and remembering the age rule afterwards, which is how a
    13-year-old ends up live to strangers.
    """
    who = agefeatures.profile(principal.user_id)
    verdict = age_engine.can_start_livestream(who)
    policy = age_engine.policy_for(who)
    return {
        "allowed": verdict.allowed,
        "age_tier": who.tier.value,
        "policy": {
            "jurisdiction": policy.jurisdiction,
            "minimum_age": age_engine.FEATURE_MINIMUM_AGES["livestream"],
            "parental_approval_required": policy.parental_consent_required,
            "gifting_allowed": bool(age_engine.can_use_feature(who, "livestream_gifting")),
            "monetization_allowed": bool(age_engine.can_monetize(who)),
            "policy_version": policy.policy_version,
        },
        "reason": None if verdict.allowed else agefeatures.REFUSAL,
        "note": "Streaming infrastructure is not built. This is the age decision it must ask.",
    }


@app.post("/creators/enable", tags=["creators"])
def enable_creator(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    # Becoming a creator is opting into being paid.
    agefeatures.require(principal.user_id, "monetization")

    profile = db.get(models.CreatorProfile, principal.user_id)
    if profile is None:
        profile = models.CreatorProfile(user_id=principal.user_id)
        db.add(profile)
    profile.monetization_enabled = True
    db.commit()
    return {"user_id": principal.user_id, "monetization_enabled": True}


@app.get("/creators/me", tags=["creators"])
def my_creator_profile(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """What the creator screen shows about its owner: whether they are paid, what
    they keep, who subscribes, which badges they earned.

    ``monetization_allowed`` is the age decision, so the screen can offer the
    switch to an adult and explain its absence to everyone else, instead of
    letting a minor press it and be refused.
    """
    profile = db.get(models.CreatorProfile, principal.user_id)
    allowed = agefeatures.eligibility(principal.user_id, ["monetization"])["features"]["monetization"]
    subscribers = db.scalar(
        select(func.count()).select_from(models.Subscription).where(
            models.Subscription.target_id == principal.user_id, models.Subscription.status == "active"
        )
    ) or 0
    earned = db.scalars(select(models.Badge).where(models.Badge.user_id == principal.user_id)).all()
    return {
        "monetization_enabled": bool(profile and profile.monetization_enabled),
        "monetization_allowed": bool(allowed),
        "subscription_price_usd": (
            str(profile.subscription_price_usd) if profile and profile.subscription_price_usd is not None else None
        ),
        "tagline": profile.tagline if profile else None,
        "share_pct": str(settings.CREATOR_SHARE_PCT),
        "subscribers": subscribers,
        "badges": [{"badge": b.badge, "reason": b.reason, "awarded_at": b.awarded_at} for b in earned],
    }


# --- publishing engine -----------------------------------------------------

@app.post("/creators/publish", status_code=202, tags=["publishing"])
async def publish(payload: PublishIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Create once, publish many.

    Returns immediately with one output row per (target, language) pair; the AI
    layer fills them in asynchronously. A creator can watch the article land
    while the dubbing is still rendering.
    """
    unknown = set(payload.targets) - set(models.PublishingJob.TARGETS)
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown targets: {', '.join(sorted(unknown))}. Available: {', '.join(models.PublishingJob.TARGETS)}",
        )
    if payload.source_kind == "text" and not payload.source_text:
        raise HTTPException(status_code=400, detail="source_text is required for a text source")

    langs = payload.target_langs or [payload.source_lang]
    bad_langs = set(langs) - set(settings.SUPPORTED_LANGS)
    if bad_langs:
        raise HTTPException(status_code=400, detail=f"Unsupported languages: {', '.join(sorted(bad_langs))}")

    # Whether this member's writing may be sent to a translation provider: only a confirmed adult's.
    # Asked once per request. "Not a confirmed adult" includes an age nobody has established and a
    # lookup that failed, so every doubt resolves to "do not translate".
    # In a thread: this handler is async, and the lookup is a blocking HTTP call to another service.
    # Run on the event loop, a slow answer would freeze every request this service has.
    may_translate = not (await run_in_threadpool(agefeatures.profile, principal.user_id)).is_minor

    def queued_for(target: str, lang: str) -> bool:
        if target == "translation" and lang == payload.source_lang:
            return False
        if lang != payload.source_lang and not may_translate:
            return False  # refused below, made by nobody
        return derive.needs_background(target, lang, payload.source_lang)

    renders = sum(1 for target in set(payload.targets) for lang in langs if queued_for(target, lang))
    if renders and _pending_renders(db, principal.user_id) + renders > media_jobs.MAX_PENDING_PER_CREATOR:
        raise HTTPException(
            status_code=429,
            detail=(
                f"You already have renders in progress, and this would add {renders} more. "
                f"{media_jobs.MAX_PENDING_PER_CREATOR} at a time is the limit; wait for some to finish."
            ),
        )

    job = models.PublishingJob(
        id=new_id("pub"),
        creator_id=principal.user_id,
        source_kind=payload.source_kind,
        source_ref=payload.source_ref,
        source_text=payload.source_text,
        source_lang=payload.source_lang,
        targets=",".join(payload.targets),
        target_langs=",".join(langs),
    )
    db.add(job)
    db.flush()

    # Produced here rather than left for a worker that does not exist. The
    # endpoint used to return 202 and create empty rows on the promise that
    # "the AI layer fills them in asynchronously" — nothing did, so every job
    # stayed queued forever while looking like it had been accepted.
    #
    # The work is text transformation and one HTTP call per translation, which
    # is fast enough to do inline. When a real media pipeline exists, the
    # unsupported targets are what move to a queue.
    produced = 0
    made = 0
    queued: list[models.PublishingOutput] = []
    statuses: list[str] = []
    for target in payload.targets:
        for lang in langs:
            # "Translate it into the language it is already in" has nothing to
            # do, and a row that says so would be shown as if it were a result.
            if target == "translation" and lang == payload.source_lang:
                continue
            made += 1
            if lang != payload.source_lang and not may_translate:
                # Not an invented translation and not a silent gap: a row that says why.
                result = {"status": "unsupported", "content": None, "error": derive.NOT_FOR_MINORS, "provenance": None, "simulated": False}
            else:
                result = derive.produce(target, lang, payload.source_text or "", payload.source_lang)
            output = models.PublishingOutput(
                job_id=job.id,
                target=target,
                lang=lang,
                status=result["status"],
                content=result["content"],
                error=result["error"],
                simulated=bool(result.get("simulated")),
                # The column is NOT NULL with a default; an unsupported or
                # failed row has no provenance to declare, so let the
                # default stand rather than insert NULL.
                **({"provenance": result["provenance"]} if result["provenance"] else {}),
            )
            db.add(output)
            statuses.append(result["status"])
            if result["status"] == "ready":
                produced += 1
            elif result["status"] == "queued":
                queued.append(output)

    if made == 0:
        raise HTTPException(
            status_code=400,
            detail="Nothing to translate: ask for a language other than the one the text is written in.",
        )

    # "running" while a render is still waiting; "done" once something is made.
    job.status = media_jobs.job_status(statuses)
    db.commit()
    # After the commit, so a worker that starts at once finds its row.
    media_jobs.submit([o.id for o in queued])

    await events.publish(
        "creator.publish_requested",
        {"job_id": job.id, "creator_id": principal.user_id, "targets": payload.targets, "langs": langs},
    )
    return {
        "job_id": job.id,
        "status": job.status,
        "outputs": made,
        "ready": produced,
        # Renders still being made: the screen polls the job until this is zero.
        "pending": len(queued),
        # Stated plainly so the client never has to guess why a target is empty.
        "unsupported": sorted(t for t in set(payload.targets) if render.unavailable(t)),
    }


def _pending_renders(db: OrmSession, creator_id: str) -> int:
    return db.scalar(
        select(func.count())
        .select_from(models.PublishingOutput)
        .join(models.PublishingJob, models.PublishingJob.id == models.PublishingOutput.job_id)
        .where(
            models.PublishingJob.creator_id == creator_id,
            models.PublishingOutput.status.in_(("queued", "running")),
        )
    ) or 0


def _ai_is_simulated() -> bool | None:
    """Whether every AI provider is the stand-in one. ``None`` when ai-service
    cannot be asked — the screen then says nothing rather than guessing."""
    try:
        response = httpx.get(f"{AI_URL}/ai/providers", timeout=4)
        response.raise_for_status()
        names = {p.get("name") for p in response.json().get("providers", [])}
        return names <= {"mock"}
    except Exception as exc:
        log.warning("could not ask ai-service which providers are configured: %s", exc)
        return None


@app.get("/creators/formats", tags=["publishing"])
def formats(principal: MaybeUser):
    """What the engine can make today, and why it cannot make the rest.

    The reasons come from the same table that refuses them, so a screen built on
    this never advertises a format that would come back empty.
    """
    simulated = _ai_is_simulated()
    return {
        "formats": [
            {
                "id": target,
                "label": FORMAT_LABELS[target],
                # Asked of the machine: an image without the rendering tools
                # says so here instead of accepting a job it can only fail.
                "available": render.unavailable(target) is None,
                "reason": render.unavailable(target),
                "note": FORMAT_NOTES.get(target),
            }
            for target in models.PublishingJob.TARGETS
        ],
        "languages": [
            {"code": code, "name": LANGUAGE_NAMES.get(code, (code, code))[0], "native": LANGUAGE_NAMES.get(code, (code, code))[1]}
            for code in settings.SUPPORTED_LANGS
        ],
        "max_source_chars": MAX_SOURCE_CHARS,
        "ai": {"simulated": simulated},
        "translation": _translation_for(principal, simulated),
    }


# A Studio ticket is longer than the feed's five minutes: it is shown only to
# the file's owner, who may leave a render on screen while they edit a draft. A
# player that outlives it asks for the job again.
STUDIO_TICKET_SECONDS = 15 * 60


def _media_out(o: models.PublishingOutput, viewer: str) -> list[dict]:
    if not o.media:
        return []
    try:
        items = json.loads(o.media)
    except ValueError:
        return []
    return [
        {
            "id": m["id"],
            "kind": m["kind"],
            "content_type": m["content_type"],
            "alt": m.get("alt") or "",
            "width": m.get("width"),
            "height": m.get("height"),
            "seconds": m.get("seconds"),
            "url": mediasign.sign_url(
                f"{settings.MEDIA_PUBLIC_BASE}/{m['id']}", m["id"], viewer, ttl=STUDIO_TICKET_SECONDS
            ),
        }
        for m in items
    ]


def _translation_for(principal, simulated: bool | None) -> dict:
    """What translation is for the person asking, so the screen can say so before they try.

    ``available`` is false for anyone who is not a confirmed adult (and for a visitor): the
    writing of those accounts is never sent to a provider. ``notice`` is the disclosure a
    member is owed when their writing *is* sent to one.
    """
    if principal is None or agefeatures.profile(principal.user_id).is_minor:
        return {"available": False, "reason": derive.NOT_FOR_MINORS, "notice": None}
    return {
        "available": True,
        "reason": None,
        "notice": (
            "Your text and language choices are sent to IleAI for translation. Depending on the configured "
            "engine, IleAI forwards them to DeepL or a language model provider such as OpenAI. "
            "Translations are cached by Kinjy and labelled as made by AI."
            if simulated is False else None
        ),
    }


def _output_out(o: models.PublishingOutput, viewer: str) -> dict:
    return {
        "id": o.id,
        "target": o.target,
        "lang": o.lang,
        "status": o.status,
        "content": o.content,
        # The same words with no markup, for showing and copying.
        "text": derive.to_text(o.target, o.content),
        "media_url": o.media_url,
        "media": _media_out(o, viewer),
        "provenance": o.provenance,
        "simulated": bool(o.simulated),
        "error": o.error,
    }


@app.get("/creators/publish", tags=["publishing"])
def list_jobs(
    principal: CurrentUser,
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: OrmSession = Depends(get_db),
):
    """The creator's own jobs, newest first — what they made, when."""
    base = select(models.PublishingJob).where(models.PublishingJob.creator_id == principal.user_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    jobs = db.scalars(base.order_by(models.PublishingJob.created_at.desc()).limit(limit).offset(offset)).all()
    counts: dict[str, dict[str, int]] = {}
    if jobs:
        for job_id, status, n in db.execute(
            select(models.PublishingOutput.job_id, models.PublishingOutput.status, func.count())
            .where(models.PublishingOutput.job_id.in_([j.id for j in jobs]))
            .group_by(models.PublishingOutput.job_id, models.PublishingOutput.status)
        ).all():
            counts.setdefault(job_id, {})[status] = n
    return {
        "total": total,
        "items": [
            {
                "job_id": j.id,
                "created_at": j.created_at,
                "status": j.status,
                "source_snippet": (j.source_text or "")[:140],
                "source_lang": j.source_lang,
                "source_ref": j.source_ref,
                "targets": j.targets.split(",") if j.targets else [],
                "target_langs": j.target_langs.split(",") if j.target_langs else [],
                "ready": counts.get(j.id, {}).get("ready", 0),
                "failed": counts.get(j.id, {}).get("failed", 0),
                "unsupported": counts.get(j.id, {}).get("unsupported", 0),
                "pending": counts.get(j.id, {}).get("queued", 0) + counts.get(j.id, {}).get("running", 0),
            }
            for j in jobs
        ],
    }


@app.get("/creators/publish/{job_id}", tags=["publishing"])
def publish_status(job_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    job = db.get(models.PublishingJob, job_id)
    if job is None or job.creator_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Job not found")
    outputs = db.scalars(
        select(models.PublishingOutput)
        .where(models.PublishingOutput.job_id == job_id)
        .order_by(models.PublishingOutput.id)
    ).all()
    return {
        "job_id": job.id,
        "status": job.status,
        "created_at": job.created_at,
        "source_text": job.source_text,
        "source_lang": job.source_lang,
        "source_ref": job.source_ref,
        "outputs": [_output_out(o, principal.user_id) for o in outputs],
    }


@app.delete("/creators/publish/{job_id}", status_code=204, tags=["publishing"])
def delete_job(job_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Throw a job away — the text the creator gave and everything made from it."""
    job = db.get(models.PublishingJob, job_id)
    if job is None or job.creator_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Job not found")
    files = [
        m["id"]
        for o in db.scalars(select(models.PublishingOutput).where(models.PublishingOutput.job_id == job_id)).all()
        for m in json.loads(o.media or "[]")
    ]
    db.execute(delete(models.PublishingOutput).where(models.PublishingOutput.job_id == job_id))
    db.delete(job)
    db.commit()
    # After the job is gone: a failure here leaves a file behind, never a job.
    media_jobs.release(principal.user_id, files)


@app.post("/internal/publish/{job_id}/outputs", tags=["internal"])
def fill_output(
    job_id: str,
    target: str,
    lang: str,
    content: str | None = None,
    media_url: str | None = None,
    error: str | None = None,
    db: OrmSession = Depends(get_db),
):
    """ai-service writes a finished output back here."""
    output = db.scalar(
        select(models.PublishingOutput).where(
            models.PublishingOutput.job_id == job_id,
            models.PublishingOutput.target == target,
            models.PublishingOutput.lang == lang,
        )
    )
    if output is None:
        raise HTTPException(status_code=404, detail="Output slot not found")
    output.content = content
    output.media_url = media_url
    output.error = error
    output.status = "failed" if error else "done"

    remaining = db.scalar(
        select(func.count())
        .select_from(models.PublishingOutput)
        .where(models.PublishingOutput.job_id == job_id, models.PublishingOutput.status.in_(["queued", "running"]))
    ) or 0
    if remaining == 0:
        job = db.get(models.PublishingJob, job_id)
        if job is not None:
            job.status = "done"
    db.commit()
    return {"status": output.status, "remaining": remaining}


# --- series ----------------------------------------------------------------

@app.post("/creators/series", status_code=201, tags=["series"])
def create_series(payload: SeriesIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    series = models.Series(id=new_id("srs"), creator_id=principal.user_id, **payload.model_dump())
    db.add(series)
    db.commit()
    return {"id": series.id, "title": series.title}


@app.get("/creators/{creator_id}/series", tags=["series"])
def list_series(creator_id: str, db: OrmSession = Depends(get_db)):
    rows = db.scalars(select(models.Series).where(models.Series.creator_id == creator_id)).all()
    return {
        "items": [
            {"id": r.id, "title": r.title, "episodes_count": r.episodes_count, "cadence": r.cadence}
            for r in rows
        ]
    }


# --- subscriptions ---------------------------------------------------------

# --- earnings --------------------------------------------------------------

@app.get("/creators/earnings", tags=["earnings"])
def earnings(principal: CurrentUser):
    """Proxy the ledger so the creator dashboard has one place to call."""
    try:
        response = httpx.post(
            f"{LEDGER_URL}/ledger/simulate",
            json={"kind": "creator_revenue", "amount": "100", "creator_id": principal.user_id},
            timeout=5,
        )
        response.raise_for_status()
        model = response.json()
    except Exception:
        model = None
    return {
        "creator_id": principal.user_id,
        "share_pct": str(settings.CREATOR_SHARE_PCT),
        "example_per_100": model,
        "wallet_endpoint": "/api/ledger/wallet",
    }


@app.get("/badges/{user_id}", tags=["badges"])
def badges(user_id: str, db: OrmSession = Depends(get_db)):
    rows = db.scalars(select(models.Badge).where(models.Badge.user_id == user_id)).all()
    return {
        "available": models.BADGES,
        "earned": [{"badge": r.badge, "reason": r.reason, "awarded_at": r.awarded_at} for r in rows],
    }
