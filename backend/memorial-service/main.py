"""Kinjy · memorial-service — the Digital Graveyard."""
from __future__ import annotations

import secrets
from datetime import date, datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from common import events, settings
from common.auth import AdminUser, CurrentUser, MaybeUser
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import models

app = create_app(
    name="memorial-service",
    schema=models.SCHEMA,
    description="Memorials, tributes, candles and flowers, QR codes, anniversary reminders.",
)


class MemorialIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    person_id: str | None = None
    birth_date: date | None = None
    death_date: date | None = None
    biography: str | None = None
    photo_url: str | None = None
    visibility: str = Field(default="public", pattern="^(public|family|private)$")
    # Faith styling must carry its source; an unsourced value is refused.
    faith_style: str = "none"
    faith_style_source: str | None = Field(default=None, pattern="^(documented_wish|admin_choice)$")


class LocationIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    label: str | None = None
    captured_on_site: bool = False


class TributeIn(BaseModel):
    kind: str = Field(pattern="^(message|flower|candle|photo)$")
    author_name: str = Field(default="Anonymous", max_length=120)
    body: str | None = Field(default=None, max_length=4000)
    media_url: str | None = None
    paid: bool = False
    amount: float | None = None


def _memorial_or_404(db: OrmSession, memorial_id: str) -> models.Memorial:
    memorial = db.get(models.Memorial, memorial_id)
    if memorial is None:
        raise HTTPException(status_code=404, detail="Memorial not found")
    return memorial


def _is_admin_of(db: OrmSession, memorial_id: str, user_id: str) -> bool:
    return bool(
        db.scalar(
            select(models.MemorialAdmin).where(
                models.MemorialAdmin.memorial_id == memorial_id,
                models.MemorialAdmin.user_id == user_id,
            )
        )
    )


def _memorial_out(memorial: models.Memorial) -> dict:
    return {
        "id": memorial.id,
        "person_id": memorial.person_id,
        "full_name": memorial.full_name,
        "birth_date": memorial.birth_date,
        "death_date": memorial.death_date,
        "biography": memorial.biography,
        "photo_url": memorial.photo_url,
        "faith_style": memorial.faith_style,
        "faith_style_source": memorial.faith_style_source,
        "grave": {
            "lat": memorial.grave_lat,
            "lng": memorial.grave_lng,
            "label": memorial.grave_label,
            "verified": memorial.location_verified,
        },
        "audio": {"url": memorial.memorial_audio_url, "autoplay": memorial.audio_autoplay},
        "qr_code": memorial.qr_code,
        "qr_url": f"{settings.FRONTEND_URL}/memorial/{memorial.qr_code}",
        "visibility": memorial.visibility,
        "death_status": memorial.death_status,
        "created_at": memorial.created_at,
    }


@app.post("/memorials", status_code=201, tags=["memorials"])
async def create_memorial(payload: MemorialIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    if payload.faith_style != "none" and not payload.faith_style_source:
        raise HTTPException(
            status_code=400,
            detail="A faith style must state its source (documented_wish or admin_choice). It is never inferred.",
        )

    memorial = models.Memorial(
        id=new_id("mem"),
        created_by=principal.user_id,
        qr_code=secrets.token_urlsafe(9).replace("-", "").replace("_", "")[:12],
        **payload.model_dump(),
    )
    db.add(memorial)
    db.flush()
    db.add(models.MemorialAdmin(memorial_id=memorial.id, user_id=principal.user_id, succession_order=1))

    # Anniversary reminders at 10 days / 3 days / 6 hours.
    if memorial.death_date:
        anniversary = datetime.combine(memorial.death_date, datetime.min.time(), tzinfo=timezone.utc)
        while anniversary < datetime.now(timezone.utc):
            anniversary = anniversary.replace(year=anniversary.year + 1)
        for hours in models.Reminder.OFFSETS_HOURS:
            db.add(
                models.Reminder(
                    memorial_id=memorial.id,
                    user_id=principal.user_id,
                    due_at=anniversary - timedelta(hours=hours),
                )
            )

    db.commit()
    db.refresh(memorial)
    await events.publish("memorial.created", {"memorial_id": memorial.id, "by": principal.user_id})
    return _memorial_out(memorial)


@app.get("/memorials", tags=["memorials"])
def list_memorials(
    q: str | None = None,
    mine: bool = False,
    principal: MaybeUser = None,
    limit: int = Query(default=30, le=100),
    offset: int = 0,
    db: OrmSession = Depends(get_db),
):
    """Browse the graveyard.

    The module had no way to *see* a memorial: one could be created and reached
    by its QR code, and otherwise it was unreachable — a graveyard nobody could
    walk through. Ordered by death date, most recent first, because that is how
    people look for someone they have just lost.

    Deliberately public: a memorial exists to be visited, and requiring an
    account to find a grave would be the wrong default for this module.
    """
    stmt = select(models.Memorial)
    if q and len(q.strip()) >= 2:
        stmt = stmt.where(models.Memorial.full_name.ilike(f"%{q.strip()}%"))
    if mine:
        if principal is None:
            raise HTTPException(status_code=401, detail="Sign in to see the memorials you created")
        stmt = stmt.where(models.Memorial.created_by == principal.user_id)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(models.Memorial.death_date.desc().nullslast(), models.Memorial.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return {"total": total, "items": [_memorial_out(m) for m in rows]}


# Declared after /memorials and before /memorials/{id}: FastAPI matches in
# order, so a literal path must come first or it is read as an id.
@app.get("/memorials/{memorial_id}", tags=["memorials"])
def get_memorial(memorial_id: str, db: OrmSession = Depends(get_db)):
    return _memorial_out(_memorial_or_404(db, memorial_id))


@app.get("/memorials/qr/{qr_code}", tags=["memorials"])
def get_by_qr(qr_code: str, db: OrmSession = Depends(get_db)):
    """A QR memorial code on a headstone resolves here."""
    memorial = db.scalar(select(models.Memorial).where(models.Memorial.qr_code == qr_code))
    if memorial is None:
        raise HTTPException(status_code=404, detail="Unknown memorial code")
    return _memorial_out(memorial)


@app.post("/memorials/{memorial_id}/location", tags=["memorials"])
def set_location(
    memorial_id: str,
    payload: LocationIn,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    """Record grave coordinates.

    ``verified`` is only granted when the capture happened on site — the
    blueprint is explicit that a grave location must never be fabricated, and an
    address typed from memory is not a verified location.
    """
    memorial = _memorial_or_404(db, memorial_id)
    if not _is_admin_of(db, memorial_id, principal.user_id):
        raise HTTPException(status_code=403, detail="Only a memorial administrator can set the location")
    memorial.grave_lat = payload.lat
    memorial.grave_lng = payload.lng
    memorial.grave_label = payload.label
    memorial.location_verified = payload.captured_on_site
    db.commit()
    return {"verified": memorial.location_verified, "lat": payload.lat, "lng": payload.lng}


@app.post("/memorials/{memorial_id}/admins/{user_id}", status_code=201, tags=["memorials"])
def add_admin(memorial_id: str, user_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    _memorial_or_404(db, memorial_id)
    if not _is_admin_of(db, memorial_id, principal.user_id):
        raise HTTPException(status_code=403, detail="Only a memorial administrator can add another")

    count = db.scalar(
        select(func.count()).select_from(models.MemorialAdmin).where(
            models.MemorialAdmin.memorial_id == memorial_id
        )
    ) or 0
    if count >= models.MemorialAdmin.MAX_ADMINS:
        raise HTTPException(
            status_code=400,
            detail=f"A memorial has at most {models.MemorialAdmin.MAX_ADMINS} administrators",
        )
    db.add(models.MemorialAdmin(memorial_id=memorial_id, user_id=user_id, succession_order=count + 1))
    db.commit()
    return {"added": True, "succession_order": count + 1}


@app.post("/memorials/{memorial_id}/tributes", status_code=201, tags=["tributes"])
def add_tribute(
    memorial_id: str,
    payload: TributeIn,
    principal: MaybeUser,
    db: OrmSession = Depends(get_db),
):
    memorial = _memorial_or_404(db, memorial_id)
    tribute = models.Tribute(
        id=new_id("trb"),
        memorial_id=memorial_id,
        author_id=principal.user_id if principal else None,
        # Content is held for approval by default — a grieving family should not
        # discover an abusive message already published on the page.
        status="approved" if memorial.moderation == "open" else "pending",
        **payload.model_dump(),
    )
    db.add(tribute)
    db.commit()
    return {"id": tribute.id, "status": tribute.status}


@app.get("/memorials/{memorial_id}/tributes", tags=["tributes"])
def list_tributes(memorial_id: str, kind: str | None = None, limit: int = 50, db: OrmSession = Depends(get_db)):
    stmt = select(models.Tribute).where(
        models.Tribute.memorial_id == memorial_id, models.Tribute.status == "approved"
    )
    if kind:
        stmt = stmt.where(models.Tribute.kind == kind)
    rows = db.scalars(stmt.order_by(models.Tribute.created_at.desc()).limit(min(limit, 200))).all()

    counts = dict(
        db.execute(
            select(models.Tribute.kind, func.count())
            .where(models.Tribute.memorial_id == memorial_id, models.Tribute.status == "approved")
            .group_by(models.Tribute.kind)
        ).all()
    )
    return {
        "counts": counts,
        "items": [
            {
                "id": r.id,
                "kind": r.kind,
                "author_name": r.author_name,
                "body": r.body,
                "media_url": r.media_url,
                "paid": r.paid,
                "created_at": r.created_at,
            }
            for r in rows
        ],
    }


@app.post("/memorials/{memorial_id}/tributes/{tribute_id}/moderate", tags=["tributes"])
def moderate_tribute(
    memorial_id: str,
    tribute_id: str,
    decision: str,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    if decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be approved or rejected")
    if not _is_admin_of(db, memorial_id, principal.user_id):
        raise HTTPException(status_code=403, detail="Only a memorial administrator can moderate tributes")
    tribute = db.get(models.Tribute, tribute_id)
    if tribute is None or tribute.memorial_id != memorial_id:
        raise HTTPException(status_code=404, detail="Tribute not found")
    tribute.status = decision
    db.commit()
    return {"id": tribute_id, "status": decision}


@app.post("/memorials/{memorial_id}/report-death", status_code=201, tags=["verification"])
async def report_death(
    memorial_id: str,
    evidence: str,
    principal: CurrentUser,
    document_url: str | None = None,
    db: OrmSession = Depends(get_db),
):
    """unconfirmed -> reported -> under_review -> verified."""
    memorial = _memorial_or_404(db, memorial_id)
    db.add(
        models.DeathReport(
            memorial_id=memorial_id,
            reported_by=principal.user_id,
            evidence=evidence,
            document_url=document_url,
        )
    )
    if memorial.death_status == "unconfirmed":
        memorial.death_status = "reported"
    db.commit()
    await events.publish("memorial.death_reported", {"memorial_id": memorial_id})
    return {"death_status": memorial.death_status}


@app.post("/admin/memorials/{memorial_id}/verify-death", tags=["verification"])
def verify_death(memorial_id: str, outcome: str, admin: AdminUser, db: OrmSession = Depends(get_db)):
    if outcome not in ("verified", "rejected"):
        raise HTTPException(status_code=400, detail="outcome must be verified or rejected")
    memorial = _memorial_or_404(db, memorial_id)
    memorial.death_status = "verified" if outcome == "verified" else "unconfirmed"
    memorial.verified_at = datetime.now(timezone.utc) if outcome == "verified" else None
    for report in db.scalars(
        select(models.DeathReport).where(models.DeathReport.memorial_id == memorial_id)
    ).all():
        report.reviewed_by = admin.user_id
        report.outcome = outcome
    db.commit()
    return {"memorial_id": memorial_id, "death_status": memorial.death_status}


@app.get("/memorials/{memorial_id}/reminders", tags=["reminders"])
def reminders(memorial_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.Reminder)
        .where(models.Reminder.memorial_id == memorial_id, models.Reminder.user_id == principal.user_id)
        .order_by(models.Reminder.due_at)
    ).all()
    return {
        "items": [
            {"occasion": r.occasion, "due_at": r.due_at, "sent": r.sent_at is not None} for r in rows
        ]
    }
