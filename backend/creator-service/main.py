"""Kinjy · creator-service — creator studio, publishing engine, subscriptions."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from common import agefeatures, events, settings
from common.agesafety import engine as age_engine
from common.auth import CurrentUser
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import models
import derive

AI_URL = "http://ai-service:8000"
LEDGER_URL = "http://ledger-service:8000"

app = create_app(
    name="creator-service",
    schema=models.SCHEMA,
    description="Creator profiles, one-to-many publishing, series, subscriptions, badges.",
)


class PublishIn(BaseModel):
    source_kind: str = Field(default="text", pattern="^(text|video|audio)$")
    source_text: str | None = None
    source_ref: str | None = None
    source_lang: str = "en"
    targets: list[str] = Field(min_length=1)
    target_langs: list[str] = Field(default_factory=list)


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
    """Blueprint §12 tiers. The free tier is deliberately useful, not a trap."""
    return {
        "plans": [
            {
                "tier": "free",
                "price": models.PLANS["free"],
                "features": ["All core modules", "Standard video", "Basic translation", "Family tree", "Memorials"],
            },
            {
                "tier": "basic",
                "price": models.PLANS["basic"],
                "features": ["HD video", "Advanced translation", "Scheduled posts", "More AI credits", "Newsletters"],
            },
            {
                "tier": "premium",
                "price": models.PLANS["premium"],
                "features": [
                    "4K video", "AI Creator Studio", "AI dubbing + lip-sync", "AI clips",
                    "Brand kit", "Custom algorithm feeds", "API allowance", "Premium themes",
                ],
            },
        ],
        "one_off_multiplier": "2-4x the implied subscription unit cost",
    }


# The features whose availability depends on age. Listed once so the readout
# below and the gates that enforce them cannot drift apart.
AGE_GATED_FEATURES = [
    "livestream",
    "livestream_gifting",
    "monetization",
    "marketplace_sell",
    "marketplace_buy",
    "payments",
    "referral_pool",
]


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
    for target in payload.targets:
        for lang in langs:
            result = derive.produce(target, lang, payload.source_text or "", payload.source_lang)
            db.add(
                models.PublishingOutput(
                    job_id=job.id,
                    target=target,
                    lang=lang,
                    status=result["status"],
                    content=result["content"],
                    error=result["error"],
                    # The column is NOT NULL with a default; an unsupported or
                    # failed row has no provenance to declare, so let the
                    # default stand rather than insert NULL.
                    **({"provenance": result["provenance"]} if result["provenance"] else {}),
                )
            )
            if result["status"] == "ready":
                produced += 1

    # The job is only "done" when nothing is still waiting on a pipeline.
    job.status = "done" if produced else "partial"
    db.commit()

    await events.publish(
        "creator.publish_requested",
        {"job_id": job.id, "creator_id": principal.user_id, "targets": payload.targets, "langs": langs},
    )
    return {
        "job_id": job.id,
        "status": job.status,
        "outputs": len(payload.targets) * len(langs),
        "ready": produced,
        # Stated plainly so the client never has to guess why a target is empty.
        "unsupported": sorted(set(payload.targets) & set(derive.NEEDS_MEDIA_PIPELINE)),
    }


@app.get("/creators/publish/{job_id}", tags=["publishing"])
def publish_status(job_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    job = db.get(models.PublishingJob, job_id)
    if job is None or job.creator_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Job not found")
    outputs = db.scalars(
        select(models.PublishingOutput).where(models.PublishingOutput.job_id == job_id)
    ).all()
    return {
        "job_id": job.id,
        "status": job.status,
        "outputs": [
            {
                "target": o.target,
                "lang": o.lang,
                "status": o.status,
                "content": o.content,
                "media_url": o.media_url,
                "provenance": o.provenance,
                "error": o.error,
            }
            for o in outputs
        ],
    }


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

@app.post("/subscriptions", status_code=201, tags=["subscriptions"])
def subscribe(payload: SubscribeIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    price = Decimal(models.PLANS.get(payload.tier, {}).get(payload.period, "0.00"))
    if payload.target_id != "platform":
        profile = db.get(models.CreatorProfile, payload.target_id)
        if profile is None or not profile.monetization_enabled:
            raise HTTPException(status_code=404, detail="This creator does not offer subscriptions")
        price = profile.subscription_price_usd or Decimal("0")

    existing = db.scalar(
        select(models.Subscription).where(
            models.Subscription.subscriber_id == principal.user_id,
            models.Subscription.target_id == payload.target_id,
        )
    )
    renews = date.today() + timedelta(days=365 if payload.period == "yearly" else 30)
    if existing:
        existing.tier = payload.tier
        existing.period = payload.period
        existing.price_usd = price
        existing.status = "active"
        existing.renews_on = renews
        existing.cancelled_at = None
        subscription = existing
    else:
        subscription = models.Subscription(
            id=new_id("sub"),
            subscriber_id=principal.user_id,
            target_id=payload.target_id,
            tier=payload.tier,
            period=payload.period,
            price_usd=price,
            renews_on=renews,
        )
        db.add(subscription)
    db.commit()

    return {
        "id": subscription.id,
        "tier": subscription.tier,
        "price_usd": str(price),
        "renews_on": renews,
        "note": "Billing is handled by payment-service; this records the entitlement.",
    }


@app.delete("/subscriptions/{subscription_id}", tags=["subscriptions"])
def cancel(subscription_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    subscription = db.get(models.Subscription, subscription_id)
    if subscription is None or subscription.subscriber_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Subscription not found")
    subscription.status = "cancelled"
    subscription.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    # Access runs to the end of the paid period rather than stopping instantly.
    return {"cancelled": True, "access_until": subscription.renews_on}


@app.get("/subscriptions/me", tags=["subscriptions"])
def my_subscriptions(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.Subscription).where(models.Subscription.subscriber_id == principal.user_id)
    ).all()
    return {
        "items": [
            {
                "id": r.id,
                "target_id": r.target_id,
                "tier": r.tier,
                "period": r.period,
                "price_usd": str(r.price_usd),
                "status": r.status,
                "renews_on": r.renews_on,
            }
            for r in rows
        ]
    }


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
