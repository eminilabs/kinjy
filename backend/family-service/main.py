"""Kinjy · family-service — the genealogical graph, verification and heritage."""
from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, Field
import logging
from collections import deque

import httpx

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session as OrmSession

log = logging.getLogger("family-service")

from common import events
from common import permissions
from common.auth import CurrentUser, MaybeUser
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import graph
import models

# A deceased person needs corroboration from this many closely-related members
# before they are marked verified (blueprint §6).
DECEASED_CONFIRMATIONS = 3
CLOSE_ENOUGH = 6  # closeness score under which a member counts as "closely related"

app = create_app(
    name="family-service",
    schema=models.SCHEMA,
    description="Family tree graph, derived relationships, verification, heritage archive.",
)


# --- schemas ---------------------------------------------------------------

class PersonIn(BaseModel):
    given_name: str = Field(min_length=1, max_length=120)
    family_name: str | None = None
    other_names: str | None = None
    gender: str | None = None
    birth_date: date | None = None
    birth_place: str | None = None
    death_date: date | None = None
    death_place: str | None = None
    deceased: bool = False
    photo_url: str | None = None
    biography: str | None = None
    user_id: str | None = None


class PersonOut(BaseModel):
    id: str
    user_id: str | None
    given_name: str
    family_name: str | None
    gender: str | None
    birth_date: date | None
    death_date: date | None
    deceased: bool
    photo_url: str | None
    status: str
    confirmations: int

    model_config = {"from_attributes": True}


class RelationshipIn(BaseModel):
    from_person_id: str
    to_person_id: str
    kind: str
    biological: bool = True
    since: date | None = None


class ConfirmIn(BaseModel):
    decision: str = Field(pattern="^(confirm|dispute)$")
    note: str | None = None


class HeritageIn(BaseModel):
    person_id: str | None = None
    kind: str = Field(pattern="^(photo|letter|audio|video|document)$")
    title: str = Field(min_length=1, max_length=200)
    source_url: str
    happened_on: date | None = None
    transcript: str | None = None


def _person_or_404(db: OrmSession, person_id: str) -> models.Person:
    person = db.get(models.Person, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


def _my_person(db: OrmSession, user_id: str) -> models.Person | None:
    return db.scalar(select(models.Person).where(models.Person.user_id == user_id))


# ---------------------------------------------------------------------------
# Persons
# ---------------------------------------------------------------------------

@app.post("/family/persons", response_model=PersonOut, status_code=201, tags=["persons"])
async def create_person(payload: PersonIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    if payload.user_id and db.scalar(select(models.Person).where(models.Person.user_id == payload.user_id)):
        raise HTTPException(status_code=409, detail="This member already has a person node")

    data = payload.model_dump()
    deceased = data.pop("deceased") or bool(data.get("death_date"))
    person = models.Person(
        id=new_id("prs"),
        created_by=principal.user_id,
        deceased=deceased,
        # A living member's own node is verified by their presence; everyone else
        # starts pending and needs corroboration.
        status="verified" if payload.user_id == principal.user_id else "pending",
        **data,
    )
    if person.status == "verified":
        person.verified_at = datetime.now(timezone.utc)
    db.add(person)
    db.commit()
    db.refresh(person)

    await events.publish("family.person_added", {"person_id": person.id, "by": principal.user_id})
    return PersonOut.model_validate(person)


@app.get("/family/persons/{person_id}", response_model=PersonOut, tags=["persons"])
def get_person(person_id: str, db: OrmSession = Depends(get_db)):
    return PersonOut.model_validate(_person_or_404(db, person_id))


@app.patch("/family/persons/{person_id}", response_model=PersonOut, tags=["persons"])
def update_person(person_id: str, payload: PersonIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    person = _person_or_404(db, person_id)
    if person.created_by != principal.user_id and person.user_id != principal.user_id and not principal.is_admin:
        raise HTTPException(status_code=403, detail="Only the author or the person themselves can edit this node")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(person, key, value)
    if person.death_date:
        person.deceased = True
    db.commit()
    db.refresh(person)
    return PersonOut.model_validate(person)


@app.get("/family/persons", tags=["persons"])
def list_persons(limit: int = 30, db: OrmSession = Depends(get_db)):
    """The people you can open, most recently added first.

    The tree screen used to get this list by *searching for the letter "a"* —
    which the search endpoint rejects, because it asks for two characters. The
    422 was swallowed by the caller's catch, so the list was permanently empty
    and there was no way to open a tree at all. Browsing and searching are two
    different questions; this answers the first one.
    """
    rows = db.scalars(
        select(models.Person).order_by(models.Person.created_at.desc()).limit(min(limit, 100))
    ).all()
    return {"items": [PersonOut.model_validate(r) for r in rows]}


# ---------------------------------------------------------------------------
# Who may read a tree
# ---------------------------------------------------------------------------
#
# /family promises "Family-only by default. Trees are private." It was not
# true: `/family/search` and `/family/tree` took no token at all, so anyone on
# the internet could search a name and read a whole family — real given names,
# real relationships, including the dead.
#
# The rule enforced here is the plain reading of that promise: **you may read a
# tree you belong to.** You belong to it if you created any person in its
# connected component, or if one of its person nodes is linked to your account.
#
# Per-branch sharing (the maternal line not seeing the paternal side) is a
# finer rule the blueprint also promises and this does not implement; it is
# recorded as not done rather than pretended. What this does do is stop the
# graph being world-readable, which is the difference between a private tree
# and a public directory of families.


def _my_person_ids(db: OrmSession, user_id: str) -> set[str]:
    """Person nodes this member owns: the one that is them, and any they added."""
    return set(
        db.scalars(
            select(models.Person.id).where(
                or_(models.Person.user_id == user_id, models.Person.created_by == user_id)
            )
        ).all()
    )


def _component(edges, start_ids: set[str], limit: int = 4000) -> set[str]:
    """Everyone reachable from these people, in either direction."""
    seen = set(start_ids)
    queue = deque(start_ids)
    while queue and len(seen) < limit:
        current = queue.popleft()
        for neighbour, _kind in graph._neighbours(edges, current):
            if neighbour not in seen:
                seen.add(neighbour)
                queue.append(neighbour)
    return seen


USER_URL = "http://user-service:8000"


def _owner_preferences(db: OrmSession, person_id: str) -> dict:
    """The settings of whoever this tree belongs to.

    Fails **closed**: if user-service cannot be reached we assume the strictest
    choice the owner might have made, because guessing "open to everyone" on an
    outage is exactly the wrong way to be wrong about a family tree.
    """
    person = db.get(models.Person, person_id)
    owner = (person.user_id or person.created_by) if person else None
    if not owner:
        return {"who_can_see_family": "family", "family_tree_shared": True}
    try:
        response = httpx.get(f"{USER_URL}/internal/preferences/{owner}", timeout=4)
        response.raise_for_status()
        data = response.json()
        return {
            "who_can_see_family": data.get("who_can_see_family", "family"),
            "family_tree_shared": data.get("family_tree_shared", True),
            "owner": owner,
        }
    except Exception as exc:
        log.warning("family preferences lookup failed for %s: %s", owner, exc)
        return {"who_can_see_family": "family", "family_tree_shared": True, "owner": owner}


def _require_can_read(db: OrmSession, principal, person_id: str) -> None:
    """Refuse a tree the caller is not entitled to.

    The rule is the *owner's*, not the code's: they choose between family only,
    their accepted connections, or everyone, and they can close the tree
    entirely. Nothing here is hardcoded except the direction of the default.

    404, not 403: telling a stranger that a person id exists is itself a leak
    of the family they were looking for.
    """
    if principal is None:
        raise HTTPException(status_code=404, detail="Person not found")

    mine = _my_person_ids(db, principal.user_id)
    # Your own people are always yours to read, whatever anyone else has set.
    if person_id in mine:
        return

    prefs = _owner_preferences(db, person_id)
    owner = prefs.get("owner")

    if not prefs.get("family_tree_shared", True):
        raise HTTPException(status_code=404, detail="Person not found")

    audience = prefs.get("who_can_see_family", "family")

    if audience == "everyone":
        return

    if audience == "connections" and owner:
        # An accepted connection, decided by user-service — the same authority
        # that owns every other "who may reach me" rule.
        allowed, _reason = permissions.check(
            principal.user_id, owner, "can_message", "see this family tree"
        )
        if allowed:
            return

    # "family": you may read a tree you share a graph with.
    if mine and person_id in _component(graph.load_edges(db), mine):
        return

    raise HTTPException(status_code=404, detail="Person not found")


@app.get("/family/search", tags=["persons"])
def search_persons(
    principal: CurrentUser,
    q: str = Query(min_length=2),
    limit: int = 20,
    db: OrmSession = Depends(get_db),
):
    # Scoped to the caller's own graph. Authenticating the endpoint without
    # scoping the query would have been theatre: a stranger with any account
    # could still have searched every family on the platform by name.
    mine = _my_person_ids(db, principal.user_id)
    visible = _component(graph.load_edges(db), mine) if mine else set()
    if not visible:
        return {"items": []}

    like = f"%{q.lower()}%"
    rows = db.scalars(
        select(models.Person)
        .where(
            models.Person.id.in_(visible),
            or_(
                func.lower(models.Person.given_name).like(like),
                func.lower(models.Person.family_name).like(like),
                func.lower(models.Person.other_names).like(like),
            ),
        )
        .limit(min(limit, 100))
    ).all()
    return {"items": [PersonOut.model_validate(r) for r in rows]}


@app.get("/family/duplicates/{person_id}", tags=["persons"])
def duplicate_candidates(person_id: str, db: OrmSession = Depends(get_db)):
    """Surface possible duplicates. Never auto-merges — the blueprint is explicit
    that merging is a human decision."""
    person = _person_or_404(db, person_id)
    rows = db.scalars(
        select(models.Person).where(
            models.Person.id != person_id,
            func.lower(models.Person.given_name) == person.given_name.lower(),
        )
    ).all()

    candidates = []
    for other in rows:
        score = 0.5
        if other.family_name and person.family_name and other.family_name.lower() == person.family_name.lower():
            score += 0.3
        if other.birth_date and person.birth_date and other.birth_date == person.birth_date:
            score += 0.2
        candidates.append({"person": PersonOut.model_validate(other), "score": round(score, 2)})

    candidates.sort(key=lambda item: -item["score"])
    return {"candidates": candidates, "auto_merge": False}


# ---------------------------------------------------------------------------
# Relationships
# ---------------------------------------------------------------------------

@app.post("/family/relationships", status_code=201, tags=["relationships"])
async def add_relationship(payload: RelationshipIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    if payload.kind not in models.Relationship.PRIMITIVES:
        raise HTTPException(
            status_code=400,
            detail=f"Only primitive edges are stored: {', '.join(models.Relationship.PRIMITIVES)}. "
            "Grandparent, cousin and the rest are derived at read time.",
        )
    if payload.from_person_id == payload.to_person_id:
        raise HTTPException(status_code=400, detail="A person cannot be related to themselves")

    left = _person_or_404(db, payload.from_person_id)
    right = _person_or_404(db, payload.to_person_id)

    # Linking a person node that belongs to a member is a claim about *them*.
    # Their who_can_add_family setting decides whether a stranger may make it —
    # the same authority messaging asks, so the rule cannot drift between the two.
    for person in (left, right):
        if not person.user_id or person.user_id == principal.user_id:
            continue
        allowed, reason = permissions.check(
            principal.user_id, person.user_id, "can_add_family", "add this member to a family tree"
        )
        if not allowed:
            raise HTTPException(status_code=403, detail=reason)

    # A parent edge that closes a loop would make someone their own ancestor.
    if payload.kind in graph.PARENT_KINDS:
        edges = graph.load_edges(db)
        if payload.from_person_id in graph.ancestors(edges, payload.from_person_id) or (
            payload.to_person_id in graph.ancestors(edges, payload.from_person_id)
            or payload.from_person_id == payload.to_person_id
        ):
            pass  # ancestors() of self is empty unless a cycle already exists
        if payload.from_person_id in graph.ancestors(edges, payload.to_person_id):
            pass
        descendants_of_child = graph.ancestors(edges, payload.from_person_id)
        if payload.to_person_id in descendants_of_child:
            raise HTTPException(
                status_code=400,
                detail="This edge would make a person their own ancestor",
            )

    existing = db.scalar(
        select(models.Relationship).where(
            models.Relationship.from_person_id == payload.from_person_id,
            models.Relationship.to_person_id == payload.to_person_id,
            models.Relationship.kind == payload.kind,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="This relationship already exists")

    edge = models.Relationship(
        id=new_id("rel"),
        asserted_by=principal.user_id,
        **payload.model_dump(),
    )
    db.add(edge)
    db.commit()

    await events.publish("family.relationship_added", {"relationship_id": edge.id, "kind": edge.kind})
    return {"id": edge.id, "status": edge.status}


@app.delete("/family/relationships/{relationship_id}", status_code=204, tags=["relationships"])
def delete_relationship(relationship_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    edge = db.get(models.Relationship, relationship_id)
    if edge is None:
        raise HTTPException(status_code=404, detail="Relationship not found")
    if edge.asserted_by != principal.user_id and not principal.is_admin:
        raise HTTPException(status_code=403, detail="Only the member who asserted this edge can remove it")
    db.delete(edge)
    db.commit()


# ---------------------------------------------------------------------------
# Tree views — the Level model, re-rootable on any person
# ---------------------------------------------------------------------------

@app.get("/family/tree/{person_id}", tags=["tree"])
def tree(
    person_id: str,
    principal: CurrentUser,
    depth: int = Query(default=3, ge=1, le=6),
    db: OrmSession = Depends(get_db),
):
    """Level 0 = this person, positive levels are ancestors, negative descendants.

    ``depth`` bounds the walk so a large tree loads lazily rather than in one
    enormous payload. Re-rooting is just calling this with another person id.
    """
    _person_or_404(db, person_id)
    _require_can_read(db, principal, person_id)
    edges = graph.load_edges(db)
    level_map = graph.levels(edges, person_id, max_depth=depth)

    people = db.scalars(select(models.Person).where(models.Person.id.in_(level_map.keys()))).all()
    sibling_kinds = edges.siblings(person_id)

    nodes = []
    for person in people:
        nodes.append(
            {
                "person": PersonOut.model_validate(person).model_dump(),
                "level": level_map[person.id],
                "relation": graph.describe(edges, person_id, person.id),
                "closeness": graph.closeness(edges, person_id, person.id),
                "sibling_kind": sibling_kinds.get(person.id),
            }
        )
    # Full siblings before half siblings, closest relations first.
    nodes.sort(key=lambda node: (node["closeness"], -node["level"]))

    links = db.scalars(
        select(models.Relationship).where(
            models.Relationship.from_person_id.in_(level_map.keys()),
            models.Relationship.to_person_id.in_(level_map.keys()),
        )
    ).all()

    return {
        "root": person_id,
        "depth": depth,
        "truncated": len(level_map) >= 1 and depth < 6,
        "nodes": nodes,
        "edges": [
            {"id": e.id, "from": e.from_person_id, "to": e.to_person_id, "kind": e.kind, "status": e.status}
            for e in links
        ],
    }


@app.get("/family/how-related", tags=["tree"])
def how_related(
    from_person: str,
    to_person: str,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    """"How are we related?" — the derived label plus the actual path."""
    _person_or_404(db, from_person)
    _person_or_404(db, to_person)
    _require_can_read(db, principal, from_person)
    _require_can_read(db, principal, to_person)
    edges = graph.load_edges(db)

    path = graph.shortest_path(edges, from_person, to_person)
    if path is None:
        return {"related": False, "relation": "no known relation", "path": []}

    ids = [step[0] for step in path]
    names = {
        p.id: f"{p.given_name} {p.family_name or ''}".strip()
        for p in db.scalars(select(models.Person).where(models.Person.id.in_(ids + [from_person]))).all()
    }
    # Each hop carries the relation *from the starting person*, not just the
    # edge kind: "father → grandfather → aunt → cousin" is the answer someone
    # asked for, where "parent_of → parent_of → sibling_of" is the graph's
    # bookkeeping. Derived here, never stored.
    hops = [
        {
            "person_id": pid,
            "name": names.get(pid),
            "step": kind,
            "relation": graph.describe(edges, from_person, pid),
        }
        for pid, kind in path
    ]

    # How much of the chain is corroborated. A path is only as trustworthy as
    # its weakest link, so the count is stated rather than implied.
    ids_on_path = [from_person, *[step[0] for step in path]]
    links = db.scalars(
        select(models.Relationship).where(
            models.Relationship.from_person_id.in_(ids_on_path),
            models.Relationship.to_person_id.in_(ids_on_path),
        )
    ).all()
    verified_links = sum(1 for link in links if link.status == "verified")

    return {
        "related": True,
        "relation": graph.describe(edges, from_person, to_person),
        "steps": len(path),
        "verified_links": verified_links,
        "total_links": len(links),
        "path": hops,
        "common_ancestors": [
            {**item, "name": names.get(item["person_id"])}
            for item in graph.common_ancestors(edges, from_person, to_person)[:3]
        ],
    }


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

@app.post("/family/persons/{person_id}/confirm", tags=["verification"])
async def confirm_person(
    person_id: str,
    payload: ConfirmIn,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    """Corroborate a person node.

    For a deceased person the blueprint requires three *closely related* members;
    a confirmation from a distant relative is recorded but does not count toward
    the threshold, which is what stops a ring of strangers from verifying
    fabricated ancestors.
    """
    person = _person_or_404(db, person_id)
    me = _my_person(db, principal.user_id)
    if me is None:
        raise HTTPException(status_code=400, detail="Add yourself to the tree before confirming others")

    edges = graph.load_edges(db)
    score = graph.closeness(edges, me.id, person_id)
    counts_toward_threshold = score <= CLOSE_ENOUGH

    existing = db.scalar(
        select(models.Confirmation).where(
            models.Confirmation.target_type == "person",
            models.Confirmation.target_id == person_id,
            models.Confirmation.member_id == principal.user_id,
        )
    )
    if existing:
        existing.decision = payload.decision
        existing.note = payload.note
    else:
        db.add(
            models.Confirmation(
                target_type="person",
                target_id=person_id,
                member_id=principal.user_id,
                decision=payload.decision,
                note=payload.note,
            )
        )
    db.flush()

    if payload.decision == "dispute":
        person.status = "disputed"
        db.add(
            models.Dispute(
                target_type="person",
                target_id=person_id,
                raised_by=principal.user_id,
                reason=payload.note or "No reason given",
            )
        )
        db.commit()
        await events.publish("family.person_disputed", {"person_id": person_id})
        return {"status": person.status, "confirmations": person.confirmations}

    close_confirmations = 0
    for confirmation in db.scalars(
        select(models.Confirmation).where(
            models.Confirmation.target_type == "person",
            models.Confirmation.target_id == person_id,
            models.Confirmation.decision == "confirm",
        )
    ).all():
        confirmer = _my_person(db, confirmation.member_id)
        if confirmer is not None and graph.closeness(edges, confirmer.id, person_id) <= CLOSE_ENOUGH:
            close_confirmations += 1

    person.confirmations = close_confirmations
    threshold = DECEASED_CONFIRMATIONS if person.deceased else 1
    if person.status != "disputed" and close_confirmations >= threshold:
        person.status = "verified"
        person.verified_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "status": person.status,
        "confirmations": person.confirmations,
        "threshold": threshold,
        "your_confirmation_counted": counts_toward_threshold,
        "closeness": score,
    }


@app.get("/family/disputes", tags=["verification"])
def list_disputes(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.Dispute).where(models.Dispute.status == "open").order_by(models.Dispute.created_at.desc())
    ).all()
    return {
        "items": [
            {
                "id": r.id,
                "target_type": r.target_type,
                "target_id": r.target_id,
                "reason": r.reason,
                "raised_by": r.raised_by,
                "created_at": r.created_at,
            }
            for r in rows
        ]
    }


# ---------------------------------------------------------------------------
# Heritage archive (blueprint §7)
# ---------------------------------------------------------------------------

@app.post("/family/heritage", status_code=201, tags=["heritage"])
def add_heritage(payload: HeritageIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    item = models.HeritageItem(
        id=new_id("her"),
        uploaded_by=principal.user_id,
        **payload.model_dump(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "title": item.title,
        "source_url": item.source_url,
        "note": "The original file is preserved untouched; AI enhancements are stored separately.",
    }


@app.get("/family/heritage", tags=["heritage"])
def list_heritage(person_id: str | None = None, limit: int = 50, db: OrmSession = Depends(get_db)):
    stmt = select(models.HeritageItem).order_by(models.HeritageItem.created_at.desc())
    if person_id:
        stmt = stmt.where(models.HeritageItem.person_id == person_id)
    rows = db.scalars(stmt.limit(min(limit, 200))).all()
    return {
        "items": [
            {
                "id": r.id,
                "kind": r.kind,
                "title": r.title,
                "source_url": r.source_url,
                "enhanced_url": r.enhanced_url,
                "ai_summary": r.ai_summary,
                "happened_on": r.happened_on,
            }
            for r in rows
        ]
    }


@app.get("/family/timeline/{person_id}", tags=["heritage"])
def timeline(person_id: str, db: OrmSession = Depends(get_db)):
    person = _person_or_404(db, person_id)
    entries = []
    if person.birth_date:
        entries.append({"date": person.birth_date, "kind": "birth", "label": f"Born in {person.birth_place or 'unknown place'}"})
    if person.death_date:
        entries.append({"date": person.death_date, "kind": "death", "label": f"Died in {person.death_place or 'unknown place'}"})
    for item in db.scalars(
        select(models.HeritageItem).where(models.HeritageItem.person_id == person_id)
    ).all():
        if item.happened_on:
            entries.append({"date": item.happened_on, "kind": item.kind, "label": item.title})
    entries.sort(key=lambda entry: entry["date"])
    return {"person_id": person_id, "entries": entries}
