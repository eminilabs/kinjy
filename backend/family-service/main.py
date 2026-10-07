"""Kinjy · family-service — the genealogical graph, verification and heritage."""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone

from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as OrmSession

from common import events
from common.auth import CurrentUser
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import access
import graph
import integrity
import models

log = logging.getLogger("family-service")

# A deceased person needs corroboration from this many closely-related members
# before they are marked verified (blueprint §6).
DECEASED_CONFIRMATIONS = 3
CLOSE_ENOUGH = 6  # closeness score under which a member counts as "closely related"

# The most people one tree response carries, nearest first. A family can be far
# larger; the view says so and lets the member re-centre or go deeper.
TREE_MAX_NODES = 250

MIGRATIONS = [
    # What a parent is to a child (father / mother / not said). Additive and nullable.
    f"ALTER TABLE {models.SCHEMA}.relationships ADD COLUMN IF NOT EXISTS role VARCHAR(20)",
    # The indexes in models.py, for databases that already had the table.
    f"CREATE UNIQUE INDEX IF NOT EXISTS uq_relationship_symmetric ON {models.SCHEMA}.relationships "
    "(LEAST(from_person_id, to_person_id), GREATEST(from_person_id, to_person_id), kind) "
    "WHERE kind IN ('spouse_of', 'sibling_of')",
    f"CREATE UNIQUE INDEX IF NOT EXISTS uq_relationship_filiation ON {models.SCHEMA}.relationships "
    "(from_person_id, to_person_id) "
    "WHERE kind IN ('parent_of', 'adoptive_parent_of', 'guardian_of')",
]

app = create_app(
    name="family-service",
    schema=models.SCHEMA,
    migrations=MIGRATIONS,
    description="Family tree graph, derived relationships, verification, heritage archive.",
)


# --- schemas ---------------------------------------------------------------

def _clean_url(value: str | None) -> str | None:
    """A picture is ours (/media/...) or an https address; never a script or a data: blob."""
    if value is None or value == "":
        return None
    if not value.startswith(("https://", "http://", "/media/")):
        raise ValueError("photo_url must be an http(s) address or a /media/ path")
    return value


class PersonCore(BaseModel):
    given_name: str = Field(min_length=1, max_length=120)
    family_name: str | None = Field(default=None, max_length=120)
    other_names: str | None = Field(default=None, max_length=255)
    gender: str | None = Field(default=None, max_length=20)
    birth_date: date | None = None
    birth_place: str | None = Field(default=None, max_length=200)
    death_date: date | None = None
    death_place: str | None = Field(default=None, max_length=200)
    deceased: bool = False
    photo_url: str | None = Field(default=None, max_length=500)
    biography: str | None = Field(default=None, max_length=5000)

    _url = field_validator("photo_url")(_clean_url)

    @field_validator("given_name")
    @classmethod
    def _name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A person needs a given name")
        return value


class PersonIn(PersonCore):
    user_id: str | None = Field(default=None, max_length=40)


# What a parent is to a child. Never worked out from gender; see models.Relationship.role.
ROLE = "^(father|mother)$"


# How a new person stands to the one they are added to, and so which edge is written.
# (edge kind, is the new person the "from" end of it)
RELATIVES = {
    "parent": ("parent_of", True),
    "adoptive_parent": ("adoptive_parent_of", True),
    "child": ("parent_of", False),
    "spouse": ("spouse_of", False),
    "sibling": ("sibling_of", False),
}


class RelativeIn(BaseModel):
    relation: str = Field(pattern="^(parent|adoptive_parent|child|spouse|sibling)$")
    # A relative added this way has no account; a member joins by linking their own node.
    person: PersonCore
    # parent / adoptive_parent: what the new person is to the one they are added to.
    role: str | None = Field(default=None, pattern=ROLE)
    # child: what the person being added to is to the child, the child's other parent (if
    # any, someone already in the tree) and what that other parent is.
    anchor_role: str | None = Field(default=None, pattern=ROLE)
    other_parent_id: str | None = Field(default=None, max_length=40)
    other_parent_role: str | None = Field(default=None, pattern=ROLE)
    # sibling: the parents of the person being added to that are also this one's. Real
    # parent links are written to each; none selected means the parents are not known and
    # the two are declared siblings. Half and full siblings are derived from this, never stored.
    # With a single shared parent, `other_parent_id` (above) says who the new person's other
    # parent is, when that is someone in the tree who is not a parent of the one added to:
    # a half-sibling is then a child of that other union, not of this person's parents.
    shared_parent_ids: list[str] = Field(default_factory=list, max_length=6)


class PersonUpdate(BaseModel):
    """What may change on a person. Not `user_id`: whose account a node is cannot be edited into another's."""

    given_name: str | None = Field(default=None, min_length=1, max_length=120)
    family_name: str | None = Field(default=None, max_length=120)
    other_names: str | None = Field(default=None, max_length=255)
    gender: str | None = Field(default=None, max_length=20)
    birth_date: date | None = None
    birth_place: str | None = Field(default=None, max_length=200)
    death_date: date | None = None
    death_place: str | None = Field(default=None, max_length=200)
    deceased: bool | None = None
    photo_url: str | None = Field(default=None, max_length=500)
    biography: str | None = Field(default=None, max_length=5000)

    _url = field_validator("photo_url")(_clean_url)

    @field_validator("given_name")
    @classmethod
    def _name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("A person needs a given name")
        return value


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
    from_person_id: str = Field(max_length=40)
    to_person_id: str = Field(max_length=40)
    kind: str = Field(max_length=30)
    biological: bool = True
    since: date | None = None
    # What the "from" parent is to the "to" child. Only on parent and adoptive-parent links.
    role: str | None = Field(default=None, pattern=ROLE)


class RelationshipPatch(BaseModel):
    """Today only the role can change: a link is otherwise removed and made again."""

    role: str | None = Field(default=None, pattern=ROLE)


class ConfirmIn(BaseModel):
    decision: str = Field(pattern="^(confirm|dispute)$")
    note: str | None = Field(default=None, max_length=1000)


class HeritageIn(BaseModel):
    person_id: str | None = None
    kind: str = Field(pattern="^(photo|letter|audio|video|document)$")
    title: str = Field(min_length=1, max_length=200)
    source_url: str = Field(max_length=500)
    happened_on: date | None = None
    transcript: str | None = None


def _detail(person: models.Person, principal, family: access.Family, db: OrmSession) -> dict:
    """One person in full, with what the caller may do about them - decided here, not by the screen."""
    me = access.my_person(db, principal.user_id)
    in_family = me is not None and me.id in family.people
    mine = family.viewer_belongs
    edges = family.edges
    decision = db.scalar(
        select(models.Confirmation.decision).where(
            models.Confirmation.target_type == "person",
            models.Confirmation.target_id == person.id,
            models.Confirmation.member_id == principal.user_id,
        )
    )
    return {
        **PersonOut.model_validate(person).model_dump(),
        "other_names": person.other_names,
        "birth_place": person.birth_place,
        "death_place": person.death_place,
        "biography": person.biography,
        "is_me": person.user_id == principal.user_id,
        "relation_to_me": graph.describe(edges, me.id, person.id) if in_family else None,
        "counts": {
            "parents": len(edges.parents.get(person.id, set())),
            "children": len(edges.children.get(person.id, set())),
            "spouses": len(edges.spouses.get(person.id, set())),
            "siblings": len(edges.siblings(person.id)),
        },
        "my_decision": decision,
        "permissions": {
            "can_edit": access.can_edit(principal, person),
            "can_delete": access.can_delete(principal, person),
            "can_link": mine,
            "can_confirm": mine and me is not None,
        },
    }


def _visible_ids(db: OrmSession, user_id: str) -> set[str]:
    """Everyone in a family the caller belongs to."""
    mine = access.my_person_ids(db, user_id)
    if not mine:
        return set()
    _edges, people, _rows = graph.load_component(db, mine)
    return people


# ---------------------------------------------------------------------------
# Persons
# ---------------------------------------------------------------------------

@app.post("/family/persons", response_model=PersonOut, status_code=201, tags=["persons"])
async def create_person(payload: PersonIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    data = payload.model_dump()
    integrity.check_life_dates(payload.birth_date, payload.death_date)

    if payload.user_id:
        if db.scalar(select(models.Person).where(models.Person.user_id == payload.user_id)):
            raise HTTPException(status_code=409, detail="This member already has a person node")
        # A node that is a member's own is a claim about them; their setting decides who may make it.
        access.may_link_member(principal, payload.user_id)

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
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This member already has a person node")
    db.refresh(person)

    await events.publish("family.person_added", {"person_id": person.id, "by": principal.user_id})
    return PersonOut.model_validate(person)


@app.get("/family/me", tags=["persons"])
def my_node(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Where the member stands in the tree: their own node, if they have added themselves."""
    person = access.my_person(db, principal.user_id)
    if person is None:
        return {"person": None}
    family = access.load_family(db, principal.user_id, person.id)
    return {"person": _detail(person, principal, family, db)}


@app.get("/family/persons", tags=["persons"])
def list_persons(principal: CurrentUser, limit: int = Query(default=30, ge=1, le=100), db: OrmSession = Depends(get_db)):
    """The people in the families you belong to, most recently added first.

    Scoped to your own graph, like search. It used to list every person on the
    platform to anyone, with or without an account: the same hole the other
    endpoints had been closed against, reopened by the endpoint added to fill
    the picker.
    """
    visible = _visible_ids(db, principal.user_id)
    if not visible:
        return {"items": []}
    rows = db.scalars(
        select(models.Person)
        .where(models.Person.id.in_(visible))
        .order_by(models.Person.created_at.desc())
        .limit(limit)
    ).all()
    return {"items": [PersonOut.model_validate(r) for r in rows]}


@app.get("/family/persons/{person_id}", tags=["persons"])
def get_person(person_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    person = access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_can_read(db, principal, family)
    return _detail(person, principal, family, db)


@app.patch("/family/persons/{person_id}", tags=["persons"])
def update_person(person_id: str, payload: PersonUpdate, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    person = access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_can_read(db, principal, family)
    if not access.can_edit(principal, person):
        raise HTTPException(status_code=403, detail="Only the author or the person themselves can edit this node")

    changes = payload.model_dump(exclude_unset=True)
    # A field that was sent as null is a field the member cleared; one that was not sent is untouched.
    for required in ("given_name", "deceased"):
        if required in changes and changes[required] is None:
            raise HTTPException(status_code=400, detail=f"{required} cannot be cleared")

    birth = changes.get("birth_date", person.birth_date)
    death = changes.get("death_date", person.death_date)
    integrity.check_life_dates(birth, death, changes.get("deceased"))
    if "birth_date" in changes and changes["birth_date"] is not None:
        _check_children_born_after(db, family, person, changes["birth_date"])

    for key, value in changes.items():
        setattr(person, key, value)
    if person.death_date:
        person.deceased = True
    db.commit()
    db.refresh(person)
    return _detail(person, principal, family, db)


def _check_children_born_after(db: OrmSession, family: access.Family, person: models.Person, born: date) -> None:
    """Moving a birth date must not make a parent younger than their child."""
    too_young = "A parent cannot be born on or after the day their child was"
    children = family.edges.children.get(person.id, set())
    parents = family.edges.parents.get(person.id, set())
    if children and db.scalar(
        select(func.count()).select_from(models.Person).where(
            models.Person.id.in_(children), models.Person.birth_date <= born
        )
    ):
        raise HTTPException(status_code=400, detail=too_young)
    if parents and db.scalar(
        select(func.count()).select_from(models.Person).where(
            models.Person.id.in_(parents), models.Person.birth_date >= born
        )
    ):
        raise HTTPException(status_code=400, detail=too_young)


@app.delete("/family/persons/{person_id}", status_code=204, tags=["persons"])
async def delete_person(person_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Remove a person, and everything that only made sense with them in the tree.

    Their relationships go with them (a relationship needs both ends), as do the
    confirmations and disputes about them. Archive items they were attached to are
    kept and detached: an uploaded original is never destroyed by editing a tree.
    """
    person = access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_can_read(db, principal, family)
    if not access.can_delete(principal, person):
        raise HTTPException(status_code=403, detail="Only the author, or the member themselves, can remove this person")

    touching = or_(
        models.Relationship.from_person_id == person_id,
        models.Relationship.to_person_id == person_id,
    )
    edge_ids = select(models.Relationship.id).where(touching)
    db.execute(
        delete(models.Confirmation).where(
            models.Confirmation.target_type == "relationship", models.Confirmation.target_id.in_(edge_ids)
        )
    )
    db.execute(delete(models.Relationship).where(touching))
    db.execute(
        delete(models.Confirmation).where(
            models.Confirmation.target_type == "person", models.Confirmation.target_id == person_id
        )
    )
    db.execute(
        delete(models.Dispute).where(models.Dispute.target_type == "person", models.Dispute.target_id == person_id)
    )
    db.execute(update(models.HeritageItem).where(models.HeritageItem.person_id == person_id).values(person_id=None))
    db.delete(person)
    db.commit()
    await events.publish("family.person_removed", {"person_id": person_id, "by": principal.user_id})


@app.post("/family/persons/{person_id}/relatives", status_code=201, tags=["persons"])
async def add_relative(
    person_id: str,
    payload: RelativeIn,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    """Add someone to the tree as this person's parent, child, partner or sibling.

    The person and the relationship are written together or not at all: adding a
    relative from the screen used to be two requests, and a refusal on the second
    left a person in the tree attached to nobody. Every check that applies to a
    relationship applies here, before anything is written.
    """
    anchor = access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_belongs(family)
    access.may_link_member(principal, anchor.user_id)

    data = payload.person.model_dump()
    integrity.check_life_dates(payload.person.birth_date, payload.person.death_date)
    deceased = data.pop("deceased") or bool(data.get("death_date"))
    newcomer = models.Person(
        id=new_id("prs"), created_by=principal.user_id, deceased=deceased, status="pending", **data
    )

    if payload.role and payload.relation not in ("parent", "adoptive_parent"):
        raise HTTPException(status_code=400, detail="role is for adding a parent")
    if payload.anchor_role and payload.relation != "child":
        raise HTTPException(status_code=400, detail="anchor_role is for adding a child")
    if (payload.other_parent_id or payload.other_parent_role) and payload.relation not in ("child", "sibling"):
        raise HTTPException(status_code=400, detail="other_parent is for adding a child or a brother or sister")
    if payload.relation == "sibling" and payload.other_parent_id and not payload.shared_parent_ids:
        raise HTTPException(status_code=400, detail="Name the shared parent as well: the other parent alone does not make a sibling")
    if payload.other_parent_role and not payload.other_parent_id:
        raise HTTPException(status_code=400, detail="other_parent_role needs other_parent_id")
    if payload.shared_parent_ids and payload.relation != "sibling":
        raise HTTPException(status_code=400, detail="shared_parent_ids is for adding a sibling")

    kind, newcomer_is_from = RELATIVES[payload.relation]
    # Every edge this addition writes: (from, to, kind, role, biological).
    planned: list[tuple[models.Person, models.Person, str, str | None, bool]] = []

    if payload.relation in ("parent", "adoptive_parent"):
        planned.append((newcomer, anchor, kind, payload.role, payload.relation == "parent"))
    elif payload.relation == "child":
        planned.append((anchor, newcomer, kind, payload.anchor_role, True))
        if payload.other_parent_id:
            if payload.other_parent_id == anchor.id:
                raise HTTPException(status_code=400, detail="The other parent is someone else")
            other = access.person_or_404(db, payload.other_parent_id)
            if other.id not in family.people:
                raise access.not_found()
            access.may_link_member(principal, other.user_id)
            planned.append((other, newcomer, kind, payload.other_parent_role, True))
    elif payload.relation == "sibling" and payload.shared_parent_ids:
        wanted = set(payload.shared_parent_ids)
        shared = db.scalars(
            select(models.Relationship).where(
                models.Relationship.to_person_id == anchor.id,
                models.Relationship.from_person_id.in_(wanted),
                models.Relationship.kind.in_(models.Relationship.FILIATION),
                models.Relationship.status != "disputed",
            )
        ).all()
        if {edge.from_person_id for edge in shared} != wanted:
            raise HTTPException(status_code=400, detail="Only a parent of this person can be a shared parent")
        by_id = {p.id: p for p in db.scalars(select(models.Person).where(models.Person.id.in_(wanted))).all()}
        for edge in shared:
            # The same father is the same father of both: kind, role and "biological" carry over.
            planned.append((by_id[edge.from_person_id], newcomer, edge.kind, edge.role, edge.biological))
        if payload.other_parent_id:
            if len(wanted) != 1:
                raise HTTPException(status_code=400, detail="A different other parent means exactly one shared parent")
            if payload.other_parent_id in wanted or payload.other_parent_id == anchor.id:
                raise HTTPException(status_code=400, detail="The other parent is someone else")
            if payload.other_parent_id in family.edges.parents.get(anchor.id, set()):
                raise HTTPException(status_code=400, detail="That is also a parent of this person: tick them as shared instead")
            other = access.person_or_404(db, payload.other_parent_id)
            if other.id not in family.people:
                raise access.not_found()
            access.may_link_member(principal, other.user_id)
            planned.append((other, newcomer, "parent_of", payload.other_parent_role, True))
    else:
        left, right = (newcomer, anchor) if newcomer_is_from else (anchor, newcomer)
        planned.append((left, right, kind, None, True))

    for left, right, edge_kind, edge_role, _bio in planned:
        integrity.check_role(edge_kind, edge_role)
        integrity.check_new_edge(family.edges, left, right, edge_kind)

    edges = []
    for left, right, edge_kind, edge_role, biological in planned:
        from_id, to_id = integrity.canonical_pair(edge_kind, left.id, right.id)
        edges.append(
            models.Relationship(
                id=new_id("rel"),
                from_person_id=from_id,
                to_person_id=to_id,
                kind=edge_kind,
                role=edge_role,
                biological=biological,
                asserted_by=principal.user_id,
            )
        )
    db.add(newcomer)
    db.flush()
    db.add_all(edges)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This relationship already exists")
    db.refresh(newcomer)

    await events.publish("family.person_added", {"person_id": newcomer.id, "by": principal.user_id})
    for edge in edges:
        await events.publish("family.relationship_added", {"relationship_id": edge.id, "kind": edge.kind})
    shown = [
        {"id": e.id, "kind": e.kind, "from": e.from_person_id, "to": e.to_person_id, "role": e.role, "status": e.status}
        for e in edges
    ]
    return {"person": PersonOut.model_validate(newcomer), "relationship": shown[0], "relationships": shown}


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
    visible = _visible_ids(db, principal.user_id)
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
def duplicate_candidates(person_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Surface possible duplicates. Never auto-merges — the blueprint is explicit
    that merging is a human decision. Only people in families you can see are compared."""
    person = access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_can_read(db, principal, family)
    visible = _visible_ids(db, principal.user_id) | family.people

    rows = db.scalars(
        select(models.Person).where(
            models.Person.id != person_id,
            models.Person.id.in_(visible),
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

    left = access.person_or_404(db, payload.from_person_id)
    right = access.person_or_404(db, payload.to_person_id)

    # Writing needs a place in the tree: at least one end is in a family the caller belongs to.
    # The other end is either in one too, or is a member who agrees to be linked (their own
    # who_can_add_family setting). A stranger's tree, and a person nobody here knows, are
    # not there to be stitched onto.
    family_left = access.load_family(db, principal.user_id, left.id)
    family_right = family_left if right.id in family_left.people else access.load_family(db, principal.user_id, right.id)
    if not (family_left.viewer_belongs or family_right.viewer_belongs):
        raise access.not_found()
    for person, family in ((left, family_left), (right, family_right)):
        if not family.viewer_belongs and not person.user_id:
            raise access.not_found()
        access.may_link_member(principal, person.user_id)

    if family_left is family_right:
        edges = family_left.edges
    else:
        edges, _people, _rows = graph.load_component(db, {left.id, right.id})
    integrity.check_role(payload.kind, payload.role)
    integrity.check_new_edge(edges, left, right, payload.kind)

    from_id, to_id = integrity.canonical_pair(payload.kind, left.id, right.id)
    data = payload.model_dump()
    data.update(from_person_id=from_id, to_person_id=to_id)
    edge = models.Relationship(id=new_id("rel"), asserted_by=principal.user_id, **data)
    db.add(edge)
    try:
        db.commit()
    except IntegrityError:
        # Two requests raced past the checks; the unique index kept one.
        db.rollback()
        raise HTTPException(status_code=409, detail="This relationship already exists")

    await events.publish("family.relationship_added", {"relationship_id": edge.id, "kind": edge.kind})
    return {
        "id": edge.id,
        "status": edge.status,
        "kind": edge.kind,
        "from": edge.from_person_id,
        "to": edge.to_person_id,
        "role": edge.role,
    }


@app.patch("/family/relationships/{relationship_id}", tags=["relationships"])
def update_relationship(
    relationship_id: str,
    payload: RelationshipPatch,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    """Say, or take back, what a parent is to a child (father, mother, or not said)."""
    edge = db.get(models.Relationship, relationship_id)
    if edge is None:
        raise HTTPException(status_code=404, detail="Relationship not found")
    if edge.asserted_by != principal.user_id and not principal.is_admin:
        raise HTTPException(status_code=403, detail="Only the member who asserted this edge can change it")
    integrity.check_role(edge.kind, payload.role)
    edge.role = payload.role
    db.commit()
    return {"id": edge.id, "kind": edge.kind, "from": edge.from_person_id, "to": edge.to_person_id, "role": edge.role}


@app.delete("/family/relationships/{relationship_id}", status_code=204, tags=["relationships"])
def delete_relationship(relationship_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    edge = db.get(models.Relationship, relationship_id)
    if edge is None:
        raise HTTPException(status_code=404, detail="Relationship not found")
    if edge.asserted_by != principal.user_id and not principal.is_admin:
        raise HTTPException(status_code=403, detail="Only the member who asserted this edge can remove it")
    db.execute(
        delete(models.Confirmation).where(
            models.Confirmation.target_type == "relationship", models.Confirmation.target_id == relationship_id
        )
    )
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

    ``depth`` bounds the generations and ``TREE_MAX_NODES`` the people, nearest
    first, so a large family loads in pieces rather than in one enormous payload.
    Each person says whether more of the family lies beyond them (``more``), so the
    screen can offer to go further. Re-rooting is just calling this with another id.
    """
    person = access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_can_read(db, principal, family)
    edges = family.edges

    level_map = graph.levels(edges, person_id, max_depth=depth, max_nodes=TREE_MAX_NODES)
    shown = set(level_map)
    people = db.scalars(select(models.Person).where(models.Person.id.in_(shown))).all()
    sibling_kinds = edges.siblings(person_id)

    nodes = []
    for member in people:
        relation = graph.describe(edges, person_id, member.id)
        nodes.append(
            {
                "person": PersonOut.model_validate(member).model_dump(),
                "level": level_map[member.id],
                "relation": relation,
                "closeness": graph.closeness(edges, person_id, member.id, label=relation),
                "sibling_kind": sibling_kinds.get(member.id),
                "more": graph.has_more(edges, member.id, shown),
                "mine": member.id in family.mine,
                "editable": access.can_edit(principal, member),
            }
        )
    # Full siblings before half siblings, closest relations first.
    nodes.sort(key=lambda node: (node["closeness"], -node["level"]))

    links = db.scalars(
        select(models.Relationship).where(
            models.Relationship.from_person_id.in_(shown),
            models.Relationship.to_person_id.in_(shown),
        )
    ).all()

    me = access.my_person(db, principal.user_id)
    return {
        "root": person.id,
        "depth": depth,
        "me": me.id if me else None,
        "family_size": len(family.people),
        "truncated": any(node["more"] for node in nodes),
        "nodes": nodes,
        "edges": [
            {
                "id": e.id,
                "from": e.from_person_id,
                "to": e.to_person_id,
                "kind": e.kind,
                "role": e.role,
                "status": e.status,
                # The server decides who may take a link back, so the screen only offers what would be allowed.
                "removable": e.asserted_by == principal.user_id or bool(principal.is_admin),
            }
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
    access.person_or_404(db, from_person)
    access.person_or_404(db, to_person)
    family = access.load_family(db, principal.user_id, from_person)
    access.require_can_read(db, principal, family)
    if to_person not in family.people:
        # Not in the same family. The other person still has to be one the caller may see.
        access.require_can_read(db, principal, access.load_family(db, principal.user_id, to_person))
        return {"related": False, "relation": "no known relation", "path": []}
    edges = family.edges

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
    fabricated ancestors. Only someone in the same family can confirm or dispute:
    a member with a tree of their own cannot reach into another.
    """
    person = access.person_or_404(db, person_id)
    family = access.load_family(db, principal.user_id, person_id)
    access.require_belongs(family)
    me = access.my_person(db, principal.user_id)
    if me is None:
        raise HTTPException(status_code=400, detail="Add yourself to the tree before confirming others")

    edges = family.edges
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
        confirmer = access.my_person(db, confirmation.member_id)
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
    """Open disputes about people in your families, and the ones you raised."""
    visible = _visible_ids(db, principal.user_id)
    rows = db.scalars(
        select(models.Dispute)
        .where(
            models.Dispute.status == "open",
            or_(models.Dispute.target_id.in_(visible), models.Dispute.raised_by == principal.user_id),
        )
        .order_by(models.Dispute.created_at.desc())
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
    if payload.person_id:
        access.person_or_404(db, payload.person_id)
        access.require_belongs(access.load_family(db, principal.user_id, payload.person_id))
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
def list_heritage(
    principal: CurrentUser,
    person_id: str | None = None,
    limit: int = 50,
    db: OrmSession = Depends(get_db),
):
    stmt = select(models.HeritageItem).order_by(models.HeritageItem.created_at.desc())
    if person_id:
        access.person_or_404(db, person_id)
        access.require_can_read(db, principal, access.load_family(db, principal.user_id, person_id))
        stmt = stmt.where(models.HeritageItem.person_id == person_id)
    else:
        # With no person named, only what the caller uploaded themselves.
        stmt = stmt.where(models.HeritageItem.uploaded_by == principal.user_id)
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
def timeline(person_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    person = access.person_or_404(db, person_id)
    access.require_can_read(db, principal, access.load_family(db, principal.user_id, person_id))
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
