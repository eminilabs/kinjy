from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from common.database import Base
from common.ids import new_id

SCHEMA = "family"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Person(Base):
    """A person node.

    Blueprint §6: the *graph* is the backend truth. A Person may or may not be a
    Kinjy member (``user_id`` is nullable) — ancestors usually are not. The
    "Level" model (Level 0 = viewer, parents above, children below) is a UI
    presentation computed from edges, never stored here.
    """

    __tablename__ = "persons"
    __table_args__ = (
        Index("ix_person_name", "given_name", "family_name"),
        {"schema": SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("prs"))
    user_id: Mapped[str | None] = mapped_column(String(40), unique=True, index=True)
    created_by: Mapped[str] = mapped_column(String(40), index=True)

    given_name: Mapped[str] = mapped_column(String(120))
    family_name: Mapped[str | None] = mapped_column(String(120))
    other_names: Mapped[str | None] = mapped_column(String(255))
    gender: Mapped[str | None] = mapped_column(String(20))  # self-declared, free text; never inferred

    birth_date: Mapped[date | None] = mapped_column(Date)
    birth_place: Mapped[str | None] = mapped_column(String(200))
    death_date: Mapped[date | None] = mapped_column(Date)
    death_place: Mapped[str | None] = mapped_column(String(200))
    deceased: Mapped[bool] = mapped_column(Boolean, default=False)

    photo_url: Mapped[str | None] = mapped_column(String(500))
    biography: Mapped[str | None] = mapped_column(Text)

    # Verification (blueprint §6): a living person confirms themselves; a
    # deceased person needs corroboration from 3 closely-related members.
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|verified|disputed
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confirmations: Mapped[int] = mapped_column(Integer, default=0)

    # Deliberately absent: religion, ethnicity, paternity probability. The
    # blueprint forbids the AI from inferring them and we do not store guesses.

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Relationship(Base):
    """A directed edge between two persons.

    Only *primitive* edges are stored: ``parent_of``, ``spouse_of``,
    ``adoptive_parent_of``, ``guardian_of``, ``sibling_of`` (only when no shared
    parent is known). Grandparent, uncle, cousin and every other label is
    derived at read time — storing them would be denormalised truth that drifts.
    """

    __tablename__ = "relationships"
    __table_args__ = (
        UniqueConstraint("from_person_id", "to_person_id", "kind", name="uq_relationship"),
        Index("ix_rel_from", "from_person_id"),
        Index("ix_rel_to", "to_person_id"),
        {"schema": SCHEMA},
    )

    PRIMITIVES = ("parent_of", "adoptive_parent_of", "guardian_of", "spouse_of", "sibling_of")
    # Two people are spouses (or siblings) of each other, whichever way round the
    # edge was written, so these are one fact and may be stored only once.
    SYMMETRIC = ("spouse_of", "sibling_of")
    # A parent edge says who stands above whom: one per ordered pair, whatever its kind.
    FILIATION = ("parent_of", "adoptive_parent_of", "guardian_of")

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("rel"))
    from_person_id: Mapped[str] = mapped_column(ForeignKey(f"{SCHEMA}.persons.id", ondelete="CASCADE"))
    to_person_id: Mapped[str] = mapped_column(ForeignKey(f"{SCHEMA}.persons.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(30))

    # Half vs full sibling ranking (blueprint: "full siblings before half").
    biological: Mapped[bool] = mapped_column(Boolean, default=True)
    since: Mapped[date | None] = mapped_column(Date)
    until: Mapped[date | None] = mapped_column(Date)

    # What this parent is to this child: "father", "mother", or None when it is not
    # said. A property of the *relationship*, never of the person: gender belongs to
    # Person.gender, and neither is worked out from the other. Only on parent edges.
    role: Mapped[str | None] = mapped_column(String(20))

    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|verified|disputed
    asserted_by: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# The database backs up what the service checks before it writes: a second
# marriage between the same two people, or a second parent edge for the same
# ordered pair, is refused even when two requests race past the check. They are
# also created for databases that already exist by the service's MIGRATIONS.
Index(
    "uq_relationship_symmetric",
    func.least(Relationship.from_person_id, Relationship.to_person_id),
    func.greatest(Relationship.from_person_id, Relationship.to_person_id),
    Relationship.kind,
    unique=True,
    postgresql_where=text("kind IN ('spouse_of', 'sibling_of')"),
)
Index(
    "uq_relationship_filiation",
    Relationship.from_person_id,
    Relationship.to_person_id,
    unique=True,
    postgresql_where=text("kind IN ('parent_of', 'adoptive_parent_of', 'guardian_of')"),
)


class Confirmation(Base):
    """One member corroborating a person or an edge."""

    __tablename__ = "confirmations"
    __table_args__ = (
        UniqueConstraint("target_type", "target_id", "member_id", name="uq_confirmation"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_type: Mapped[str] = mapped_column(String(20))  # person|relationship
    target_id: Mapped[str] = mapped_column(String(40), index=True)
    member_id: Mapped[str] = mapped_column(String(40), index=True)
    decision: Mapped[str] = mapped_column(String(20))  # confirm|dispute
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Dispute(Base):
    __tablename__ = "disputes"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_type: Mapped[str] = mapped_column(String(20))
    target_id: Mapped[str] = mapped_column(String(40), index=True)
    raised_by: Mapped[str] = mapped_column(String(40))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open|resolved|rejected
    resolution: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class HeritageItem(Base):
    """An uploaded photo/letter/recording plus its AI-derived reading.

    The original file is never replaced — ``source_url`` stays untouched and any
    enhancement lands in ``enhanced_url`` (blueprint §7).
    """

    __tablename__ = "heritage_items"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("her"))
    person_id: Mapped[str | None] = mapped_column(String(40), index=True)
    uploaded_by: Mapped[str] = mapped_column(String(40), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # photo|letter|audio|video|document
    title: Mapped[str] = mapped_column(String(200))
    source_url: Mapped[str] = mapped_column(String(500))
    enhanced_url: Mapped[str | None] = mapped_column(String(500))
    transcript: Mapped[str | None] = mapped_column(Text)
    ai_summary: Mapped[str | None] = mapped_column(Text)
    ai_confidence: Mapped[float | None] = mapped_column(Float)
    happened_on: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Invitation(Base):
    """One link that lets someone claim a person node as themselves.

    What is stored is a SHA-256 of the token, never the token: the token is a
    credential until it is used, so a copy of this table must not be enough to
    claim anybody. The inviter sees it once, when it is made. It grants nothing by
    itself: it can only be accepted by a signed-in adult who has no node yet, and
    only while it is unused, unrevoked, undeclined and unexpired.
    """

    __tablename__ = "invitations"
    __table_args__ = (
        Index("ix_invitation_person", "person_id"),
        Index("ix_invitation_creator", "created_by"),
        {"schema": SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("inv"))
    person_id: Mapped[str] = mapped_column(ForeignKey(f"{SCHEMA}.persons.id", ondelete="CASCADE"))
    created_by: Mapped[str] = mapped_column(String(40))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_by: Mapped[str | None] = mapped_column(String(40))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    declined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # What the invitee becomes on accepting. The least there is, unless the inviter says more.
    role: Mapped[str] = mapped_column(String(20), default="viewer", server_default="viewer")
    # A viewer invitation may open one branch only (see Membership.branch_root_id).
    branch_root_id: Mapped[str | None] = mapped_column(String(40))


class InvitationEvent(Base):
    """What was done with an invitation, who did it, and when. Never the token.

    Not tied to the invitation by a foreign key: the record of a claim must outlive
    the node it was about. Kept for a limited time (see invitations.py).
    """

    __tablename__ = "invitation_events"
    __table_args__ = (Index("ix_invitation_event_time", "at"), {"schema": SCHEMA})

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("ive"))
    invitation_id: Mapped[str] = mapped_column(String(40), index=True)
    person_id: Mapped[str | None] = mapped_column(String(40))
    actor_id: Mapped[str | None] = mapped_column(String(40))
    kind: Mapped[str] = mapped_column(String(30))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Membership(Base):
    """A member's role in the tree their person node belongs to.

    There is no stored "tree": a tree is whatever is connected to a person. A membership
    is therefore anchored on a person, the member's own place (or, for old data, a node
    they added), and its role applies to everyone connected to that person. Being someone's
    parent, child or partner gives nothing: only a row here does.

    Roles: viewer (reads), contributor (adds and changes what the rules let them), owner
    (also manages members). A person with no Kinjy account is never a member.
    """

    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "person_id", name="uq_membership"),
        Index("ix_membership_user", "user_id"),
        Index("ix_membership_person", "person_id"),
        {"schema": SCHEMA},
    )

    ROLES = ("viewer", "contributor", "owner")

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("mem"))
    user_id: Mapped[str] = mapped_column(String(40))
    person_id: Mapped[str] = mapped_column(ForeignKey(f"{SCHEMA}.persons.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(20))
    granted_by: Mapped[str | None] = mapped_column(String(40))
    # A viewer limited to one branch: this person and their descendants (and partners). No foreign
    # key on purpose: if that person is ever removed the member must see less, never everything.
    branch_root_id: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class OwnershipReview(Base):
    """A tree that existed before roles and whose owner the history does not show.

    Written by the one-time migration instead of inventing an owner. Nothing reads it to
    grant anything: it is a list for a person to settle.
    """

    __tablename__ = "ownership_reviews"
    __table_args__ = {"schema": SCHEMA}

    person_id: Mapped[str] = mapped_column(String(40), primary_key=True)  # the smallest id in the tree
    people: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(200))
    noted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Marker(Base):
    """One-time work already done, so a restart never repeats it."""

    __tablename__ = "markers"
    __table_args__ = {"schema": SCHEMA}

    name: Mapped[str] = mapped_column(String(60), primary_key=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ExportEvent(Base):
    """That a tree was exported, by whom and how much - never what was in the file."""

    __tablename__ = "export_events"
    __table_args__ = (Index("ix_export_event_time", "at"), {"schema": SCHEMA})

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("exp"))
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    person_id: Mapped[str | None] = mapped_column(String(40))  # the person the export was started from
    format: Mapped[str] = mapped_column(String(20))
    people: Mapped[int] = mapped_column(Integer)
    included: Mapped[int] = mapped_column(Integer)
    masked: Mapped[int] = mapped_column(Integer)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AccessEvent(Base):
    """Who changed who may see or do what in a tree, and when: roles, branches, trusted contacts.

    Ids and short facts only (a role, a person id): never names, never tree content. Kept for a
    limited time (memberships.KEEP_ACCESS_EVENTS_DAYS).
    """

    __tablename__ = "access_events"
    __table_args__ = (Index("ix_access_event_time", "at"), {"schema": SCHEMA})

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("acc"))
    actor_id: Mapped[str | None] = mapped_column(String(40))
    subject_id: Mapped[str | None] = mapped_column(String(40))  # the member the change is about
    person_id: Mapped[str | None] = mapped_column(String(40))  # an anchor person of the tree
    kind: Mapped[str] = mapped_column(String(40))
    detail: Mapped[str | None] = mapped_column(String(200))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class TrustedContact(Base):
    """Someone an owner has named to be able to take over the tree if the owner cannot.

    Naming grants nothing. The contact must accept; they then hold no extra access either. Only a
    succession request that the owners let run its waiting period (and any owner can cancel) makes
    them an owner. Anchored on the owner's own place in the tree.
    """

    __tablename__ = "trusted_contacts"
    __table_args__ = (
        UniqueConstraint("owner_id", "contact_id", "person_id", name="uq_trusted_contact"),
        Index("ix_trusted_contact_contact", "contact_id"),
        {"schema": SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("tcn"))
    person_id: Mapped[str] = mapped_column(String(40), index=True)  # the owner's anchor in the tree
    owner_id: Mapped[str] = mapped_column(String(40))
    contact_id: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="invited")  # invited|active|declined|revoked
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SuccessionRequest(Base):
    __tablename__ = "succession_requests"
    __table_args__ = (Index("ix_succession_contact", "contact_id"), {"schema": SCHEMA})

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("suc"))
    contact_id: Mapped[str] = mapped_column(ForeignKey(f"{SCHEMA}.trusted_contacts.id", ondelete="CASCADE"))
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    effective_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|cancelled|activated
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_by: Mapped[str | None] = mapped_column(String(40))
