"""Take a family tree out of Kinjy as a GEDCOM file.

Only an owner may. Being allowed to read a tree is not being allowed to send it out of
Kinjy: a file travels beyond every rule that protects the tree here. So the preview and
the file both say what was hidden, and each export is recorded (who, when, how many
people - never the content).
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as OrmSession

import access
import gedcom
import graph
import invitations
import models
from common.auth import CurrentUser
from common.database import get_db

router = APIRouter(tags=["export"])

EXPORT_MAX = 4000
KEEP_EVENTS_DAYS = 365
FORMAT = "gedcom551"


def _material(db: OrmSession, principal, person_id: str):
    """The tree around ``person_id`` as generator input, after the owner check. Never partial."""
    access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_role(family, "owner")
    _edges, ids, rows = graph.load_component(db, {person_id}, limit=EXPORT_MAX + 1)
    if len(ids) > EXPORT_MAX:
        raise HTTPException(status_code=413, detail=f"This tree has more than {EXPORT_MAX} people; it is too large to export in one file")
    people = [
        gedcom.PersonData(
            id=p.id, given_name=p.given_name, family_name=p.family_name, other_names=p.other_names, gender=p.gender,
            birth_date=p.birth_date, birth_place=p.birth_place, death_date=p.death_date, death_place=p.death_place,
            deceased=bool(p.deceased), status=p.status, biography=p.biography,
        )
        for p in db.scalars(select(models.Person).where(models.Person.id.in_(ids))).all()
    ]
    links = [gedcom.LinkData(from_id=e.from_person_id, to_id=e.to_person_id, kind=e.kind, role=e.role) for e in rows]
    disputed = db.scalars(
        select(models.Relationship.id).where(
            models.Relationship.status == "disputed",
            models.Relationship.from_person_id.in_(ids),
            models.Relationship.to_person_id.in_(ids),
        )
    ).all()
    return people, links, len(disputed)


@router.get("/family/persons/{person_id}/export/preview")
def export_preview(person_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """What an export would contain, in numbers. Writes nothing and returns no personal data."""
    people, links, disputed = _material(db, principal, person_id)
    _text, stats = gedcom.build(people, links, date.today(), disputed)
    result = stats.as_dict()
    result["omitted_labels"] = {k: gedcom.OMITTED_LABEL[k] for k in stats.omitted}
    result["warning"] = gedcom.MASK_WARNING if stats.masked else None
    result["format"] = "GEDCOM 5.5.1"
    return result


@router.post("/family/persons/{person_id}/export")
def export_gedcom(person_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    invitations._limit(f"export:{principal.user_id}", 5, 3600)
    people, links, disputed = _material(db, principal, person_id)
    today = date.today()
    text, stats = gedcom.build(people, links, today, disputed)
    now = datetime.now(timezone.utc)
    db.execute(delete(models.ExportEvent).where(models.ExportEvent.at < now - timedelta(days=KEEP_EVENTS_DAYS)))
    db.add(models.ExportEvent(user_id=principal.user_id, person_id=person_id, format=FORMAT, people=stats.people, included=stats.included, masked=stats.masked))
    db.commit()
    return Response(
        content=text.encode("utf-8"),
        media_type="application/x-gedcom; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="kinjy-family-{today:%Y%m%d}.ged"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
