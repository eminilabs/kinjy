"""Kinjy · community-service — communities, groups, forums, knowledge base."""
from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session as OrmSession

import logging

import httpx

from common import events
from common import notify
from common import permissions
from common.auth import CurrentUser, MaybeUser
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import agecommunity
import models

log = logging.getLogger("community-service")
MESSAGING_URL = "http://messaging-service:8000"


USER_URL = "http://user-service:8000"
AI_URL = "http://ai-service:8000"

# Below this a thread is short enough to read. Summarising six replies wastes a
# model call and tells the reader nothing they could not get by scrolling.
SUMMARY_MIN_REPLIES = 8


def _profiles(user_ids: set[str]) -> dict[str, dict]:
    """Resolve everyone on the page in one call rather than one call per row."""
    if not user_ids:
        return {}
    try:
        response = httpx.post(
            f"{USER_URL}/internal/profiles", json={"ids": sorted(user_ids)}, timeout=5
        )
        response.raise_for_status()
        return response.json()["profiles"]
    except Exception as exc:
        log.warning("could not resolve community members: %s", exc)
        return {}


def _live(topic: str, event: str, **data) -> None:
    """Push a live update. Best-effort: a hub outage costs liveness, not a reply."""
    try:
        httpx.post(
            f"{MESSAGING_URL}/internal/broadcast",
            json={"topic": topic, "type": event, "data": data},
            timeout=1.5,
        )
    except Exception as exc:
        log.debug("live update dropped (%s %s): %s", topic, event, exc)


MIGRATIONS = [
    f"ALTER TABLE {models.SCHEMA}.forums ADD COLUMN IF NOT EXISTS inherit_access BOOLEAN DEFAULT TRUE",
    f"ALTER TABLE {models.SCHEMA}.communities "
    "ADD COLUMN IF NOT EXISTS forum_creation VARCHAR(20) DEFAULT 'members'",
    f"ALTER TABLE {models.SCHEMA}.threads ADD COLUMN IF NOT EXISTS duplicate_of VARCHAR(40)",
    f"ALTER TABLE {models.SCHEMA}.replies ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ",
    f"ALTER TABLE {models.SCHEMA}.knowledge_entries ADD COLUMN IF NOT EXISTS source_reply_id VARCHAR(40)",
]

app = create_app(
    name="community-service",
    schema=models.SCHEMA,
    migrations=MIGRATIONS,
    description="Communities and groups, geographic + topic forums, forum-to-knowledge.",
)

GEO_SCOPES = ["global", "continent", "region", "country", "state", "district", "city", "neighborhood"]


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:60] or new_id("c")[:12]


class CommunityIn(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    description: str = ""
    kind: str = Field(default="public", pattern="^(public|private|secret|paid)$")
    price_usd: float | None = None
    lang: str = "en"
    country: str | None = None
    city: str | None = None
    # Who may open a forum here: "members" (default) or "stewards" (owner and moderators).
    forum_creation: str = Field(default="members", pattern="^(members|stewards)$")


class ForumIn(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    description: str = ""
    parent_id: str | None = None
    hierarchy: str = Field(default="topic", pattern="^(topic|geographic)$")
    scope: str | None = None
    scope_value: str | None = None
    community_id: str | None = None
    # Sub-forums only. True (the default): same door as the parent. False: open
    # to everyone, whatever the parent's door is.
    inherit_access: bool = True


class ThreadIn(BaseModel):
    title: str = Field(min_length=3, max_length=300)
    body: str = Field(min_length=1)
    lang: str = "en"


class ReplyIn(BaseModel):
    body: str = Field(min_length=1)
    parent_id: str | None = None
    lang: str = "en"


# --- communities -----------------------------------------------------------

@app.post("/communities", status_code=201, tags=["communities"])
async def create_community(payload: CommunityIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    if payload.kind == "paid" and not payload.price_usd:
        raise HTTPException(status_code=400, detail="A paid community needs a price")

    slug = _slugify(payload.name)
    if db.scalar(select(models.Community).where(models.Community.slug == slug)):
        slug = f"{slug}-{new_id('x')[-4:].lower()}"

    community = models.Community(
        id=new_id("cmy"), slug=slug, owner_id=principal.user_id, members_count=1, **payload.model_dump()
    )
    db.add(community)
    db.flush()
    db.add(
        models.Membership(
            community_id=community.id, user_id=principal.user_id, role="owner", status="active"
        )
    )
    db.flush()
    agecommunity.classify_community(db, community)
    db.commit()
    await events.publish("community.created", {"community_id": community.id, "kind": community.kind})
    return {"id": community.id, "slug": community.slug, "kind": community.kind}


@app.get("/communities", tags=["communities"])
def list_communities(
    principal: MaybeUser,
    q: str | None = None,
    country: str | None = None,
    limit: int = 30,
    offset: int = 0,
    db: OrmSession = Depends(get_db),
):
    # Secret communities are never listed — only reachable by direct link for
    # members. Filtering them here rather than in the client is the whole point.
    stmt = select(models.Community).where(models.Community.kind != "secret")
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(func.lower(models.Community.name).like(like), func.lower(models.Community.description).like(like))
        )
    if country:
        stmt = stmt.where(models.Community.country == country.upper())

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(models.Community.members_count.desc()).limit(min(limit, 100)).offset(offset)
    ).all()
    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "slug": r.slug,
                "name": r.name,
                "description": r.description,
                "kind": r.kind,
                "price_usd": str(r.price_usd) if r.price_usd else None,
                "members_count": r.members_count,
                "country": r.country,
                "city": r.city,
            }
            for r in rows
        ],
    }


class InviteIn(BaseModel):
    user_id: str


@app.post("/communities/{community_id}/invite", status_code=201, tags=["communities"])
def invite_member(
    community_id: str, payload: InviteIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """Pull someone into a community — only if they allow it.

    Joining yourself is your own decision; being *added* by someone else is
    theirs, which is what who_can_add_community protects.
    """
    community = db.get(models.Community, community_id)
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")

    inviter = db.scalar(
        select(models.Membership).where(
            models.Membership.community_id == community_id,
            models.Membership.user_id == principal.user_id,
            models.Membership.status == "active",
        )
    )
    if inviter is None:
        if community.kind == "secret":
            raise HTTPException(status_code=404, detail="Community not found")
        raise HTTPException(status_code=403, detail="Join the community before inviting others")
    if community.kind == "paid":
        # An invitation would hand out a paid seat for free. The invitee buys it.
        raise HTTPException(status_code=402, detail="Members of a paid community join by purchase")

    allowed, reason = permissions.check(
        principal.user_id, payload.user_id, "can_add_community", "add this member to a community"
    )
    if not allowed:
        raise HTTPException(status_code=403, detail=reason)

    existing = db.scalar(
        select(models.Membership).where(
            models.Membership.community_id == community_id,
            models.Membership.user_id == payload.user_id,
        )
    )
    if existing:
        return {"invited": False, "status": existing.status, "already": True}

    db.add(models.Membership(community_id=community_id, user_id=payload.user_id, status="active"))
    community.members_count += 1
    db.commit()
    return {"invited": True, "status": "active"}


@app.post("/communities/{community_id}/join", tags=["communities"])
def join(community_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    community = db.get(models.Community, community_id)
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")

    existing = db.scalar(
        select(models.Membership).where(
            models.Membership.community_id == community_id,
            models.Membership.user_id == principal.user_id,
        )
    )
    if existing:
        if existing.status == "banned":
            raise HTTPException(status_code=403, detail="You are banned from this community")
        return {"joined": True, "status": existing.status, "already": True}

    if community.kind == "secret":
        # Knowing the id is not an invitation. A secret community is entered only
        # when a member adds you, and anyone else is told it does not exist.
        raise HTTPException(status_code=404, detail="Community not found")

    if community.kind == "paid":
        # Joining is a purchase. The seat is granted by payment-service once the
        # payment settles (see `grant_paid_membership`), never by this call.
        raise HTTPException(
            status_code=402,
            detail=(
                f"This community costs ${community.price_usd}. Start checkout with purpose "
                f"'community_membership' and reference '{community_id}'."
            ),
        )

    status = "pending" if community.kind == "private" else "active"
    db.add(models.Membership(community_id=community_id, user_id=principal.user_id, status=status))
    if status == "active":
        community.members_count += 1
    db.commit()

    # A pending request nobody is told about is a request into a void. The
    # owner and every moderator hear it.
    if status == "pending":
        stewards = db.scalars(
            select(models.Membership.user_id).where(
                models.Membership.community_id == community_id,
                models.Membership.role.in_(("owner", "moderator")),
                models.Membership.status == "active",
            )
        ).all()
        notify.notify_many(
            stewards,
            kind="community_request",
            title=f"Someone asked to join {community.name}",
            link=f"/communities?open={community_id}&tab=requests",
        )
    return {"joined": status == "active", "status": status}


# --- paid membership (called by payment-service, never by a browser) --------


@app.get("/internal/communities/{community_id}/offer", tags=["internal"])
def membership_offer(community_id: str, user_id: str, db: OrmSession = Depends(get_db)):
    """What a seat costs, and whether `user_id` may buy one."""
    community = db.get(models.Community, community_id)
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")
    membership = _membership(db, community_id, user_id)
    return {
        "kind": community.kind,
        "price_usd": str(community.price_usd) if community.price_usd is not None else None,
        "owner_id": community.owner_id,
        "member_status": membership.status if membership else None,
    }


@app.post("/internal/communities/{community_id}/members", tags=["internal"])
def grant_paid_membership(community_id: str, payload: dict, db: OrmSession = Depends(get_db)):
    """A paid seat has been paid for: make the buyer an active member.

    409 when the buyer already holds a seat or is banned, so payment-service
    refunds instead of recognising revenue for a seat that was not granted.
    """
    user_id = payload.get("user_id")
    community = db.get(models.Community, community_id)
    if community is None or community.kind != "paid" or not user_id:
        raise HTTPException(status_code=404, detail="Paid community not found")
    existing = _membership(db, community_id, user_id)
    if existing is not None and existing.status != "pending":
        raise HTTPException(status_code=409, detail=f"Membership is already {existing.status}")
    if existing is None:
        db.add(models.Membership(community_id=community_id, user_id=user_id, status="active"))
    else:
        existing.status = "active"
    community.members_count += 1
    db.commit()
    return {"status": "active", "owner_id": community.owner_id}


# --- governance ------------------------------------------------------------
#
# "Real governance" was a promise with no mechanism: a private community turned
# every request into a `pending` row and offered nobody a way to answer it, so
# joining a private community was a request into a void. These are the answers.


def _membership(db: OrmSession, community_id: str, user_id: str) -> models.Membership | None:
    return db.scalar(
        select(models.Membership).where(
            models.Membership.community_id == community_id,
            models.Membership.user_id == user_id,
        )
    )


def _require_steward(db: OrmSession, community_id: str, user_id: str) -> models.Community:
    """Only an owner or moderator may act on the membership of others."""
    community = db.get(models.Community, community_id)
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")
    membership = _membership(db, community_id, user_id)
    if community.kind == "secret" and (membership is None or membership.status != "active"):
        # A 403 would confirm that this secret community exists.
        raise HTTPException(status_code=404, detail="Community not found")
    if membership is None or membership.role not in ("owner", "moderator") or membership.status != "active":
        raise HTTPException(status_code=403, detail="Only the owner or a moderator can do that")
    return community


MAX_FORUM_DEPTH = 8


def _forum_chain(db: OrmSession, forum: models.Forum) -> list[models.Forum] | None:
    """The forum and its ancestors, nearest first.

    None when the chain is broken: a parent that no longer exists, a cycle, or
    nesting deeper than any real forum. The caller treats that as closed.
    """
    chain, seen = [forum], {forum.id}
    while chain[-1].parent_id:
        parent = db.get(models.Forum, chain[-1].parent_id)
        if parent is None or parent.id in seen or len(chain) >= MAX_FORUM_DEPTH:
            return None
        chain.append(parent)
        seen.add(parent.id)
    return chain


def _forum_access(db: OrmSession, forum: models.Forum, principal) -> None:
    """Raise unless `principal` may enter `forum`.

    A sub-forum has its parent's door: every community along the chain up to the
    root must admit the viewer. A forum with no community anywhere on its chain
    is open. Reading the whole chain, rather than trusting the child's own
    `community_id`, is what stops a sub-forum with no community of its own from
    sitting open under a secret parent.
    """
    chain = _forum_chain(db, forum)
    if chain is None:
        # A broken chain is a data fault. Fail closed.
        raise HTTPException(status_code=404, detail="Forum not found")
    for community_id in _gated_communities(chain):
        _community_door(db, community_id, principal)
    opener = _opening_forum(chain)
    if opener is not None and opener.community_id:
        # Opened to everyone, but a ban from the community still holds.
        membership = _membership(db, opener.community_id, principal.user_id) if principal else None
        if membership is not None and membership.status == "banned":
            raise HTTPException(status_code=403, detail="You are banned from this community")


def _opening_forum(chain: list[models.Forum]) -> models.Forum | None:
    """The nearest forum on the chain whose creator opened it, if any."""
    return next((f for f in chain if f.inherit_access is False), None)


def _gated_communities(chain: list[models.Forum]) -> set[str]:
    """Communities whose door applies to the forum at the head of `chain`.

    A chain shares one community (a sub-forum is created in its parent's), so an
    opened forum anywhere on it opens the forum asked for, and the sub-forums
    that inherit from it. The forums above it keep their own door.
    """
    if _opening_forum(chain) is not None:
        return set()
    return {f.community_id for f in chain if f.community_id}


def _community_door(db: OrmSession, community_id: str, principal) -> None:
    """Raise unless `principal` may enter a community's forums.

    Public stays open, private and paid are for active members, secret answers
    404 to everyone else — the same rule `get_community` applies, for the same
    reason: a 403 would confirm that the forum exists.

    Banned members lose even a public community's forums. Without that, a ban
    only removed the member from a list and left every thread open to them.
    """
    community = db.get(models.Community, community_id)
    if community is None:
        # A forum pointing at nothing is a data fault. Fail closed.
        raise HTTPException(status_code=404, detail="Forum not found")
    membership = _membership(db, community.id, principal.user_id) if principal else None
    active = membership is not None and membership.status == "active"
    banned = membership is not None and membership.status == "banned"
    if active or (community.kind == "public" and not banned):
        return
    if community.kind == "secret":
        raise HTTPException(status_code=404, detail="Forum not found")
    raise HTTPException(status_code=403, detail="This forum is for members of its community")


def _get_forum_or_404(db: OrmSession, forum_id: str) -> models.Forum:
    forum = db.get(models.Forum, forum_id)
    if forum is None:
        raise HTTPException(status_code=404, detail="Forum not found")
    return forum


def _thread_for(db: OrmSession, thread_id: str, principal) -> models.Thread:
    """Load a thread the viewer is allowed to reach, or 404."""
    thread = db.get(models.Thread, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    forum = db.get(models.Forum, thread.forum_id)
    if forum is None or thread.status != "open":
        # No forum is a data fault, and a thread that is not open (removed or
        # held back) is not served by id either. Both fail closed.
        raise HTTPException(status_code=404, detail="Thread not found")
    try:
        _forum_access(db, forum, principal)
    except HTTPException as exc:
        # Whatever the reason, a thread that is out of reach does not exist.
        raise HTTPException(status_code=404, detail="Thread not found") from exc
    return thread


def _can_enter(db: OrmSession, forum: models.Forum, principal) -> bool:
    try:
        _forum_access(db, forum, principal)
    except HTTPException:
        return False
    return True


def _can_enter_or_listed(db: OrmSession, forum: models.Forum, principal) -> bool:
    """Whether a forum appears in the plain listing.

    Looser than entering on purpose: a private community's forum is listed so
    a member of the public can see it exists and ask to join, as the community
    itself is. A secret one, or a child of one, is not.
    """
    chain = _forum_chain(db, forum)
    if chain is None:
        return False
    for community_id in _gated_communities(chain):
        community = db.get(models.Community, community_id)
        if community is None:
            return False
        if community.kind != "secret":
            continue
        membership = _membership(db, community_id, principal.user_id) if principal else None
        if membership is None or membership.status != "active":
            return False
    return True


def _visible_replies(db: OrmSession, age, replies: list[models.Reply]) -> list[models.Reply]:
    """Replies a viewer of this age may read. Rated one by one: an unsuitable
    answer removes that answer, not the whole discussion."""
    if not age.is_minor:
        return replies
    from common.agesafety import engine as _engine
    ratings = agecommunity.classifications_for(db, [r.id for r in replies])
    return [r for r in replies if _engine.can_view_content(age, ratings.get(r.id)).allowed]


@app.get("/communities/mine", tags=["communities"])
def my_communities(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """The communities I belong to or have asked to join, newest first.

    Declared before `/communities/{community_id}` so "mine" is not read as an id.
    """
    rows = db.execute(
        select(models.Community, models.Membership)
        .join(models.Membership, models.Membership.community_id == models.Community.id)
        .where(
            models.Membership.user_id == principal.user_id,
            models.Membership.status.in_(("active", "pending")),
        )
        .order_by(models.Membership.joined_at.desc())
    ).all()
    return {
        "items": [
            {
                "id": c.id,
                "slug": c.slug,
                "name": c.name,
                "description": c.description,
                "kind": c.kind,
                "price_usd": str(c.price_usd) if c.price_usd is not None else None,
                "members_count": c.members_count,
                "forum_creation": c.forum_creation or "members",
                "avatar_url": c.avatar_url,
                "my_role": m.role,
                "my_status": m.status,
                "joined_at": m.joined_at,
            }
            for c, m in rows
        ]
    }


@app.get("/communities/{community_id}", tags=["communities"])
def get_community(community_id: str, principal: MaybeUser, db: OrmSession = Depends(get_db)):
    """One community.

    A secret community is reachable by direct link *for its members only* —
    that is what makes it secret rather than merely unlisted. Everyone else
    gets a 404 rather than a 403: confirming that an id exists would leak the
    very fact the tier is meant to hide.
    """
    community = db.get(models.Community, community_id)
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")

    membership = _membership(db, community_id, principal.user_id) if principal else None
    if community.kind == "secret" and (membership is None or membership.status != "active"):
        raise HTTPException(status_code=404, detail="Community not found")

    return {
        "id": community.id,
        "slug": community.slug,
        "name": community.name,
        "description": community.description,
        "kind": community.kind,
        "price_usd": str(community.price_usd) if community.price_usd is not None else None,
        "country": community.country,
        "city": community.city,
        "members_count": community.members_count,
        "forum_creation": community.forum_creation or "members",
        "avatar_url": community.avatar_url,
        "my_role": membership.role if membership else None,
        "my_status": membership.status if membership else None,
    }


@app.get("/communities/{community_id}/members", tags=["governance"])
def list_members(
    community_id: str,
    principal: CurrentUser,
    status: str | None = None,
    db: OrmSession = Depends(get_db),
):
    """The roll, and the queue waiting on it. Stewards only."""
    _require_steward(db, community_id, principal.user_id)
    stmt = select(models.Membership).where(models.Membership.community_id == community_id)
    if status:
        stmt = stmt.where(models.Membership.status == status)
    rows = db.scalars(stmt.order_by(models.Membership.joined_at.desc())).all()

    profiles = _profiles({r.user_id for r in rows})
    return {
        "items": [
            {
                "user_id": r.user_id,
                "role": r.role,
                "status": r.status,
                "joined_at": r.joined_at,
                "profile": profiles.get(r.user_id),
            }
            for r in rows
        ]
    }


class MemberActionIn(BaseModel):
    action: str = Field(pattern="^(approve|reject|ban|unban|promote|demote)$")


@app.post("/communities/{community_id}/members/{user_id}", tags=["governance"])
def act_on_member(
    community_id: str,
    user_id: str,
    payload: MemberActionIn,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    """Approve, reject, ban or change the role of one member."""
    community = _require_steward(db, community_id, principal.user_id)
    membership = _membership(db, community_id, user_id)
    if membership is None:
        raise HTTPException(status_code=404, detail="That person is not in this community")

    # The owner is not answerable to a moderator, and not to themselves either.
    if membership.role == "owner":
        raise HTTPException(status_code=403, detail="The owner cannot be acted on")

    action = payload.action
    is_owner = _membership(db, community_id, principal.user_id).role == "owner"
    if not is_owner and (action in ("promote", "demote") or membership.role == "moderator"):
        # Only the owner changes roles, and moderators are peers, not subordinates.
        raise HTTPException(status_code=403, detail="Only the owner can do that")

    if action == "approve":
        if membership.status != "pending":
            raise HTTPException(status_code=400, detail="That request is not pending")
        membership.status = "active"
        community.members_count += 1
    elif action == "reject":
        # Rejecting an active member would drift the count, and rejecting a
        # banned one would erase the ban.
        if membership.status != "pending":
            raise HTTPException(status_code=400, detail="That request is not pending")
        db.delete(membership)
    elif action == "ban":
        if membership.status == "active":
            community.members_count = max(0, community.members_count - 1)
        # A pending request is banned rather than rejected, so it cannot simply be re-sent.
        membership.status = "banned"
        membership.role = "member"
    elif action == "unban":
        if membership.status != "banned":
            raise HTTPException(status_code=400, detail="That person is not banned")
        membership.status = "active"
        membership.role = "member"
        community.members_count += 1
    elif action == "promote":
        if membership.status != "active" or membership.role != "member":
            raise HTTPException(status_code=400, detail="Only an active member can be promoted")
        membership.role = "moderator"
    elif action == "demote":
        if membership.role != "moderator":
            raise HTTPException(status_code=400, detail="That person is not a moderator")
        membership.role = "member"

    db.commit()

    if action == "approve":
        notify.notify(
            user_id,
            kind="community_approved",
            title=f"You were admitted to {community.name}",
            link=f"/communities?open={community_id}",
        )
    elif action in ("reject", "ban"):
        # A secret community's name must not reach someone who cannot see it.
        subject = "a community" if community.kind == "secret" else community.name
        notify.notify(
            user_id,
            kind=f"community_{'rejected' if action == 'reject' else 'banned'}",
            title=(
                f"Your request to join {subject} was declined"
                if action == "reject"
                else f"You were removed from {subject}"
            ),
            link="/communities",
        )
    return {"ok": True, "action": action}


# --- forums ----------------------------------------------------------------

def _require_forum_creator(db: OrmSession, community_id: str, user_id: str) -> models.Community:
    """Who may open a forum in a community.

    Owner and moderators always. Any other active member too, unless the owner
    set the community to "stewards". Pending, banned and outsiders never: a
    forum is a lasting thing in somebody else's community.
    """
    community = db.get(models.Community, community_id)
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")
    membership = _membership(db, community_id, user_id)
    if membership is None or membership.status != "active":
        raise HTTPException(status_code=403, detail="Only members of this community can open a forum in it")
    if membership.role in ("owner", "moderator") or (community.forum_creation or "members") == "members":
        return community
    raise HTTPException(status_code=403, detail="Only the owner or a moderator can open a forum in this community")


@app.post("/forums", status_code=201, tags=["forums"])
def create_forum(payload: ForumIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    if payload.hierarchy == "geographic" and payload.scope not in GEO_SCOPES:
        raise HTTPException(status_code=400, detail=f"scope must be one of: {', '.join(GEO_SCOPES)}")

    data = payload.model_dump()
    if not payload.inherit_access and not payload.parent_id:
        raise HTTPException(status_code=400, detail="Only a sub-forum can have an access of its own")

    if payload.parent_id:
        parent = db.get(models.Forum, payload.parent_id)
        if parent is None:
            raise HTTPException(status_code=404, detail="Parent forum not found")
        # Whoever cannot enter the parent cannot add to it, and is told no more
        # than a reader would be: a secret parent is a 404.
        _forum_access(db, parent, principal)
        chain = _forum_chain(db, parent)
        if chain is None or len(chain) >= MAX_FORUM_DEPTH:
            raise HTTPException(status_code=400, detail="Forums cannot be nested that deeply")
        inherited = next((f.community_id for f in chain if f.community_id), None)
        # Rights first, consistency second: someone with no say in the named
        # community is refused as such, not told how it differs from the parent.
        if payload.community_id:
            _require_forum_creator(db, payload.community_id, principal.user_id)
        if not payload.inherit_access and inherited:
            # Opening a sub-forum to everyone is a decision about the community's
            # content, so it stays with those who run it, whoever may add forums.
            _require_steward(db, inherited, principal.user_id)
        if payload.community_id and payload.community_id != inherited:
            raise HTTPException(
                status_code=400,
                detail="A sub-forum belongs to the same community as its parent",
            )
        # Written down as well as inherited at read time, so the plain
        # community_id filters in the listings stay true for new rows.
        data["community_id"] = inherited

    # A forum may only be attached to a community by someone the community lets
    # open one. Without this, anyone could hang a forum on somebody else's.
    if data["community_id"]:
        _require_forum_creator(db, data["community_id"], principal.user_id)

    slug = _slugify(payload.name)
    if db.scalar(select(models.Forum).where(models.Forum.slug == slug)):
        slug = f"{slug}-{new_id('x')[-4:].lower()}"
    forum = models.Forum(id=new_id("frm"), slug=slug, **data)
    db.add(forum)
    db.commit()
    return {"id": forum.id, "slug": forum.slug}


@app.get("/discover", tags=["discovery"])
def suggestions(principal: MaybeUser, limit: int = 4, db: OrmSession = Depends(get_db)):
    """Communities and forums the member has not joined yet.

    Secret communities never appear here — they are entered by invitation
    only, and a suggestion list is exactly the leak that would undo that.
    """
    joined: set[str] = set()
    if principal:
        joined = set(
            db.scalars(
                select(models.Membership.community_id).where(models.Membership.user_id == principal.user_id)
            ).all()
        )

    communities = db.scalars(
        select(models.Community)
        .where(
            models.Community.kind != "secret",
            models.Community.id.not_in(joined) if joined else True,
        )
        .order_by(models.Community.members_count.desc(), models.Community.created_at.desc())
        .limit(min(limit, 10))
    ).all()

    # A suggestion is an invitation, so only forums anyone may enter are offered:
    # free-standing ones, those of public communities, and the viewer's own.
    open_door = or_(
        models.Forum.community_id.is_(None),
        models.Forum.community_id.in_(
            select(models.Community.id).where(models.Community.kind == "public")
        ),
    )
    if principal:
        open_door = or_(
            open_door,
            models.Forum.community_id.in_(
                select(models.Membership.community_id).where(
                    models.Membership.user_id == principal.user_id,
                    models.Membership.status == "active",
                )
            ),
        )
    forums = db.scalars(
        select(models.Forum)
        .where(open_door)
        .order_by(models.Forum.threads_count.desc(), models.Forum.created_at.desc())
        .limit(min(limit, 10) * 3)
    ).all()
    # Over-fetched, then judged on the whole chain: a child of a private or
    # secret forum, or a forum from a community the viewer is banned from, is
    # not an invitation they can accept.
    forums = [f for f in forums if _can_enter(db, f, principal)][: min(limit, 10)]

    # A minor is not shown a community whose whole subject is adult. Judged on
    # what the community says about itself, not on any one message inside it:
    # a door is adult because of what it advertises, and one heated thread in a
    # gardening group does not make the group adult.
    age = agecommunity.viewer(principal.user_id if principal else None)
    communities = [c for c in communities if agecommunity.community_is_listable(db, age, c)]

    return {
        "reason": "most_active",
        "communities": [
            {
                "id": c.id,
                "slug": c.slug,
                "name": c.name,
                "description": c.description,
                "kind": c.kind,
                "members_count": c.members_count,
                "country": c.country,
            }
            for c in communities
        ],
        "forums": [
            {
                "id": f.id,
                "slug": f.slug,
                "name": f.name,
                "hierarchy": f.hierarchy,
                "scope": f.scope,
                "threads_count": f.threads_count,
            }
            for f in forums
        ],
    }


@app.get("/forums", tags=["forums"])
def list_forums(
    principal: MaybeUser,
    hierarchy: str | None = None,
    parent_id: str | None = None,
    scope: str | None = None,
    community_id: str | None = None,
    db: OrmSession = Depends(get_db),
):
    stmt = select(models.Forum)
    # A secret community's forum is not listed to outsiders, only to its members.
    secret = select(models.Community.id).where(models.Community.kind == "secret")
    if principal:
        mine = select(models.Membership.community_id).where(
            models.Membership.user_id == principal.user_id,
            models.Membership.status == "active",
        )
        stmt = stmt.where(
            or_(
                models.Forum.community_id.is_(None),
                models.Forum.community_id.not_in(secret),
                models.Forum.community_id.in_(mine),
            )
        )
    else:
        stmt = stmt.where(
            or_(models.Forum.community_id.is_(None), models.Forum.community_id.not_in(secret))
        )
    if hierarchy:
        stmt = stmt.where(models.Forum.hierarchy == hierarchy)
    if community_id:
        stmt = stmt.where(models.Forum.community_id == community_id)
    if parent_id:
        stmt = stmt.where(models.Forum.parent_id == parent_id)
    elif parent_id is None and scope is None:
        stmt = stmt.where(models.Forum.parent_id.is_(None))
    if scope:
        stmt = stmt.where(models.Forum.scope == scope)

    rows = db.scalars(stmt.order_by(models.Forum.threads_count.desc())).all()
    # The query above only knows each row's own community. A sub-forum's door
    # is its parent's, so the chain is walked here: a child of a secret forum
    # is not listed to someone who could not open the parent.
    rows = [r for r in rows if _can_enter_or_listed(db, r, principal)]

    # Which community each forum belongs to, and what the viewer is to it, so a
    # screen can tell "my communities' forums" from the rest without a call per row.
    community_ids = {r.community_id for r in rows if r.community_id}
    communities = (
        {c.id: c for c in db.scalars(select(models.Community).where(models.Community.id.in_(community_ids))).all()}
        if community_ids
        else {}
    )
    mine = {}
    if principal and community_ids:
        mine = {
            m.community_id: m
            for m in db.scalars(
                select(models.Membership).where(
                    models.Membership.user_id == principal.user_id,
                    models.Membership.community_id.in_(community_ids),
                )
            ).all()
        }

    def community_view(r: models.Forum) -> dict | None:
        c = communities.get(r.community_id) if r.community_id else None
        if c is None:
            return None
        m = mine.get(c.id)
        return {
            "id": c.id,
            "name": c.name,
            "kind": c.kind,
            "my_role": m.role if m else None,
            "my_status": m.status if m else None,
        }

    return {
        "geo_scopes": GEO_SCOPES,
        "items": [
            {
                "id": r.id,
                "slug": r.slug,
                "name": r.name,
                "hierarchy": r.hierarchy,
                "scope": r.scope,
                "scope_value": r.scope_value,
                "parent_id": r.parent_id,
                "community": community_view(r),
                "community_id": r.community_id,
                "inherit_access": r.inherit_access is not False,
                "threads_count": r.threads_count,
            }
            for r in rows
        ],
    }


@app.post("/forums/{forum_id}/threads", status_code=201, tags=["forums"])
async def create_thread(
    forum_id: str, payload: ThreadIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    forum = _get_forum_or_404(db, forum_id)
    _forum_access(db, forum, principal)

    thread = models.Thread(
        id=new_id("thr"), forum_id=forum_id, author_id=principal.user_id, **payload.model_dump()
    )
    db.add(thread)
    db.flush()

    # Classified before it is committed. A thread that appears first and is
    # rated a moment later was readable by everybody for that moment.
    verdict = agecommunity.classify_and_store(
        db, thread.id, "thread", f"{thread.title} {thread.body}", principal.user_id
    )
    if verdict.block_publication:
        db.rollback()
        if verdict.escalate_child_safety:
            log.error("child-safety escalation on a thread by %s", principal.user_id)
        raise HTTPException(
            status_code=403,
            detail="This cannot be published. If you believe this is a mistake, contact support.",
        )

    forum.threads_count += 1
    db.commit()

    # ai-service picks this up to suggest duplicates and a summary.
    await events.publish(
        "forum.thread_created",
        {"thread_id": thread.id, "forum_id": forum_id, "title": thread.title, "lang": thread.lang},
    )
    return {"id": thread.id, "created_at": thread.created_at}


def _preview(body: str | None, limit: int = 200) -> str:
    """Body flattened to one line and cut for a list row."""
    text = " ".join((body or "").split())
    return text if len(text) <= limit else text[:limit].rstrip() + "…"


@app.get("/forums/{forum_id}/threads", tags=["forums"])
def list_threads(
    forum_id: str,
    principal: MaybeUser,
    limit: int = 30,
    offset: int = 0,
    db: OrmSession = Depends(get_db),
):
    """Threads in a forum, age-filtered before ordering and paging.

    This endpoint took no viewer at all until now, which is why it needed
    fixing: a surface with no idea who is asking cannot decide what they may
    see, and the answer it gave was the same for a 13-year-old and an adult.
    """
    # Unknown and out-of-reach forums answer the same 404, so the answer cannot
    # be used to tell a secret forum from one that was never created.
    _forum_access(db, _get_forum_or_404(db, forum_id), principal)

    age = agecommunity.viewer(principal.user_id if principal else None)
    stmt = select(models.Thread).where(
        models.Thread.forum_id == forum_id, models.Thread.status == "open"
    )
    stmt = agecommunity.restrict_query(stmt, models.Thread, age)
    rows = db.scalars(
        stmt.order_by(models.Thread.pinned.desc(), models.Thread.last_activity_at.desc())
        .limit(min(limit, 100))
        .offset(offset)
    ).all()
    return {
        "items": [
            {
                "id": r.id,
                "title": r.title,
                # Rows were already cut by restrict_query, so a preview is only
                # ever the body of a thread this viewer may open.
                "preview": _preview(r.body),
                "author_id": r.author_id,
                "replies_count": r.replies_count,
                "views_count": r.views_count,
                "pinned": r.pinned,
                "ai_summary": None if age.is_minor else r.ai_summary,
                "duplicate_of": r.duplicate_of,
                "last_activity_at": r.last_activity_at,
            }
            for r in rows
        ]
    }


@app.get("/threads/{thread_id}", tags=["forums"])
def get_thread(thread_id: str, principal: MaybeUser, db: OrmSession = Depends(get_db)):
    thread = _thread_for(db, thread_id, principal)

    # A direct link bypasses the listing entirely, so the gate runs here too.
    # 404 rather than 403: confirming a thread exists but is out of reach tells
    # somebody which links are worth passing to a minor.
    age = agecommunity.viewer(principal.user_id if principal else None)
    if not agecommunity.visible(db, age, thread.id):
        raise HTTPException(status_code=404, detail="Thread not found")

    thread.views_count += 1
    replies = db.scalars(
        select(models.Reply)
        .where(models.Reply.thread_id == thread_id, models.Reply.status == "published")
        .order_by(models.Reply.accepted_answer.desc(), models.Reply.created_at)
    ).all()
    # Replies are separately rated: one unsuitable answer in an otherwise fine
    # thread should remove that answer, not the whole discussion.
    replies = _visible_replies(db, age, replies)
    scores, mine = _vote_tallies(db, [r.id for r in replies], principal.user_id if principal else None)
    db.commit()
    return {
        "id": thread.id,
        "title": thread.title,
        "body": thread.body,
        "author_id": thread.author_id,
        "lang": thread.lang,
        "ai_summary": None if age.is_minor else thread.ai_summary,
        "locked": thread.locked,
        "pinned": thread.pinned,
        "duplicate_of": _duplicate_ref(db, thread),
        # Tells the screen whether to offer the moderation buttons; the routes
        # check the same rule again, so this is a convenience, not the gate.
        "can_moderate": bool(principal) and _is_thread_steward(db, thread, principal.user_id),
        "accepted_reply_id": next((r.id for r in replies if r.accepted_answer), None),
        "replies": [
            {
                "id": r.id,
                "author_id": r.author_id,
                "parent_id": r.parent_id,
                "body": r.body,
                "upvotes": r.upvotes,
                "accepted_answer": r.accepted_answer,
                "score": scores.get(r.id, 0),
                "my_vote": mine.get(r.id, 0),
                "created_at": r.created_at,
                "edited": r.edited_at is not None,
                "edited_at": r.edited_at,
            }
            for r in replies
        ],
    }


@app.post("/threads/{thread_id}/replies", status_code=201, tags=["forums"])
def add_reply(thread_id: str, payload: ReplyIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    thread = _thread_for(db, thread_id, principal)
    if thread.locked and not _is_thread_steward(db, thread, principal.user_id):
        raise HTTPException(status_code=403, detail="This thread is locked")

    # A reply may only answer a reply in the same thread. Otherwise a member of
    # one thread could aim a reply at an id from another, and the author of that
    # other reply would be notified with this body.
    if payload.parent_id:
        target = db.get(models.Reply, payload.parent_id)
        if target is None or target.thread_id != thread_id:
            raise HTTPException(status_code=400, detail="That reply is not in this thread")

    reply = models.Reply(
        id=new_id("rpl"), thread_id=thread_id, author_id=principal.user_id, **payload.model_dump()
    )
    db.add(reply)
    db.flush()

    verdict = agecommunity.classify_and_store(
        db, reply.id, "reply", reply.body, principal.user_id
    )
    if verdict.block_publication:
        db.rollback()
        if verdict.escalate_child_safety:
            log.error("child-safety escalation on a reply by %s", principal.user_id)
        raise HTTPException(
            status_code=403,
            detail="This cannot be published. If you believe this is a mistake, contact support.",
        )

    thread.replies_count += 1
    thread.last_activity_at = datetime.now(timezone.utc)
    db.commit()

    # Live, on the thread anyone reading it is subscribed to. A forum where a
    # reply only appears on refresh is a mailing list with extra steps.
    _live(
        f"thread:{thread_id}",
        "reply",
        thread_id=thread_id,
        reply_id=reply.id,
        author_id=principal.user_id,
        parent_id=reply.parent_id,
        replies_count=thread.replies_count,
    )

    # The thread's author, and the person being replied to, hear about it even
    # when they are not looking at the page.
    parent = db.get(models.Reply, reply.parent_id) if reply.parent_id else None
    for target in {thread.author_id, parent.author_id if parent else None} - {principal.user_id, None}:
        notify.notify(
            target,
            kind="forum_reply",
            title="New reply in a thread you are in",
            body=payload.body[:140],
            link=f"/forums?thread={thread_id}",
        )
    return {"id": reply.id}


# --- thread moderation: pin, lock, duplicate --------------------------------

def _thread_community_id(db: OrmSession, thread: models.Thread) -> str | None:
    """The community whose stewards moderate this thread, if any.

    Nearest community on the forum's chain, so a sub-forum with no community of
    its own is still moderated by the community of its parent.
    """
    forum = db.get(models.Forum, thread.forum_id)
    chain = _forum_chain(db, forum) if forum else None
    return next((f.community_id for f in chain or [] if f.community_id), None)


def _is_thread_steward(db: OrmSession, thread: models.Thread, user_id: str) -> bool:
    community_id = _thread_community_id(db, thread)
    if not community_id:
        return False
    membership = _membership(db, community_id, user_id)
    return (
        membership is not None
        and membership.role in ("owner", "moderator")
        and membership.status == "active"
    )


def _moderated_thread(db: OrmSession, thread_id: str, principal) -> models.Thread:
    """A thread the caller may moderate.

    Same gate as reading (an outsider, or a banned member, gets the 404 `_thread_for`
    gives), then the steward check. A forum outside any community has no stewards,
    so nobody moderates it: not even the thread's author.
    """
    thread = _thread_for(db, thread_id, principal)
    community_id = _thread_community_id(db, thread)
    if not community_id:
        raise HTTPException(status_code=403, detail="Forums outside a community have no moderators")
    _require_steward(db, community_id, principal.user_id)
    return thread


def _duplicate_ref(db: OrmSession, thread: models.Thread) -> dict | None:
    """The original a duplicate points at, for readers to follow."""
    if not thread.duplicate_of:
        return None
    original = db.get(models.Thread, thread.duplicate_of)
    if original is None or original.status != "open":
        return None
    return {"id": original.id, "title": original.title}


@app.post("/threads/{thread_id}/pin", tags=["moderation"])
def pin_thread(thread_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    thread = _moderated_thread(db, thread_id, principal)
    thread.pinned = True
    db.commit()
    return {"id": thread.id, "pinned": True}


@app.delete("/threads/{thread_id}/pin", tags=["moderation"])
def unpin_thread(thread_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    thread = _moderated_thread(db, thread_id, principal)
    thread.pinned = False
    db.commit()
    return {"id": thread.id, "pinned": False}


@app.post("/threads/{thread_id}/lock", tags=["moderation"])
def lock_thread(thread_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Readable, but closed to replies for everyone except the stewards."""
    thread = _moderated_thread(db, thread_id, principal)
    thread.locked = True
    db.commit()
    return {"id": thread.id, "locked": True}


@app.delete("/threads/{thread_id}/lock", tags=["moderation"])
def unlock_thread(thread_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    thread = _moderated_thread(db, thread_id, principal)
    thread.locked = False
    db.commit()
    return {"id": thread.id, "locked": False}


class DuplicateIn(BaseModel):
    original_id: str


@app.post("/threads/{thread_id}/duplicate", tags=["moderation"])
def mark_duplicate(
    thread_id: str, payload: DuplicateIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """Point a thread at the original it repeats, and lock it.

    The duplicate stays open and readable; readers are sent to the original by
    `duplicate_of`. Chains are refused so there is always one original to land on.
    """
    thread = _moderated_thread(db, thread_id, principal)
    if payload.original_id == thread.id:
        raise HTTPException(status_code=400, detail="A thread cannot be a duplicate of itself")
    # Reachable by the steward, like the thread itself. 404 when it is not.
    original = _thread_for(db, payload.original_id, principal)
    if _thread_community_id(db, original) != _thread_community_id(db, thread):
        raise HTTPException(status_code=400, detail="The original must be in the same community")
    if original.duplicate_of:
        raise HTTPException(status_code=400, detail="That thread is itself a duplicate; use its original")
    if db.scalar(select(models.Thread.id).where(models.Thread.duplicate_of == thread.id).limit(1)):
        raise HTTPException(status_code=400, detail="Other threads are duplicates of this one")
    thread.duplicate_of = original.id
    thread.locked = True
    db.commit()
    return {"id": thread.id, "duplicate_of": _duplicate_ref(db, thread), "locked": True}


@app.delete("/threads/{thread_id}/duplicate", tags=["moderation"])
def unmark_duplicate(thread_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Clear the duplicate mark. The lock is left for a steward to lift."""
    thread = _moderated_thread(db, thread_id, principal)
    thread.duplicate_of = None
    db.commit()
    return {"id": thread.id, "duplicate_of": None, "locked": thread.locked}



# --- accepted answer and votes ----------------------------------------------


class VoteIn(BaseModel):
    # +1, -1, or 0 to take the vote back.
    value: int = Field(ge=-1, le=1)


def _vote_tallies(db: OrmSession, reply_ids: list[str], user_id: str | None):
    """Score per reply and the viewer's own vote, in two queries for the whole page."""
    if not reply_ids:
        return {}, {}
    scores = dict(
        db.execute(
            select(models.ReplyVote.reply_id, func.sum(models.ReplyVote.value))
            .where(models.ReplyVote.reply_id.in_(reply_ids))
            .group_by(models.ReplyVote.reply_id)
        ).all()
    )
    scores = {k: int(v) for k, v in scores.items()}
    mine: dict[str, int] = {}
    if user_id:
        mine = dict(
            db.execute(
                select(models.ReplyVote.reply_id, models.ReplyVote.value).where(
                    models.ReplyVote.reply_id.in_(reply_ids), models.ReplyVote.user_id == user_id
                )
            ).all()
        )
    return scores, mine


def _reachable_reply(db: OrmSession, thread_id: str, reply_id: str, principal):
    """The thread (404 when out of reach) and a reply of it the viewer may see.

    A reply from another thread, a removed one, or one a minor may not read
    all answer 404: none of them exist as far as this caller is concerned.
    """
    thread = _thread_for(db, thread_id, principal)
    reply = db.get(models.Reply, reply_id)
    if reply is None or reply.thread_id != thread.id or reply.status != "published":
        raise HTTPException(status_code=404, detail="Reply not found")
    age = agecommunity.viewer(principal.user_id)
    # The thread too: a reply rated fine can sit in a thread a minor may not read.
    if not agecommunity.visible(db, age, thread.id) or not _visible_replies(db, age, [reply]):
        raise HTTPException(status_code=404, detail="Reply not found")
    return thread, reply


def _require_thread_owner_or_steward(db: OrmSession, thread: models.Thread, principal) -> None:
    """The thread's author, or an owner/moderator of the community it sits in."""
    if thread.author_id == principal.user_id:
        return
    forum = db.get(models.Forum, thread.forum_id)
    chain = _forum_chain(db, forum) if forum else None
    for community_id in ([f.community_id for f in chain if f.community_id] if chain else []):
        membership = _membership(db, community_id, principal.user_id)
        if membership and membership.role in ("owner", "moderator") and membership.status == "active":
            return
    raise HTTPException(status_code=403, detail="Only the thread's author or a moderator can do that")


@app.post("/threads/{thread_id}/replies/{reply_id}/accept", tags=["forums"])
def accept_reply(thread_id: str, reply_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Mark a reply as the answer. One per thread: accepting another moves the
    mark. The asker may accept any reply of the thread, their own included
    (a follow-up from the asker is often what solved it)."""
    thread, reply = _reachable_reply(db, thread_id, reply_id, principal)
    _require_thread_owner_or_steward(db, thread, principal)
    for other in db.scalars(
        select(models.Reply).where(models.Reply.thread_id == thread.id, models.Reply.accepted_answer.is_(True))
    ).all():
        if other.id != reply.id:
            other.accepted_answer = False
    reply.accepted_answer = True
    db.flush()
    _kb_sync(db, thread, reply)
    db.commit()
    return {"accepted_reply_id": reply.id}


@app.delete("/threads/{thread_id}/replies/{reply_id}/accept", tags=["forums"])
def unaccept_reply(thread_id: str, reply_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    thread, reply = _reachable_reply(db, thread_id, reply_id, principal)
    _require_thread_owner_or_steward(db, thread, principal)
    reply.accepted_answer = False
    db.flush()
    _kb_sync(db, thread, reply)
    db.commit()
    return {"accepted_reply_id": None}


@app.put("/threads/{thread_id}/replies/{reply_id}/vote", tags=["forums"])
def vote_reply(
    thread_id: str, reply_id: str, payload: VoteIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """One vote per user per reply. Repeating a vote changes nothing, a different
    value replaces it, 0 removes it. Votes are on replies only; threads have no score."""
    thread, reply = _reachable_reply(db, thread_id, reply_id, principal)
    if reply.author_id == principal.user_id:
        raise HTTPException(status_code=403, detail="You cannot vote on your own reply")
    vote = db.scalar(
        select(models.ReplyVote).where(
            models.ReplyVote.reply_id == reply.id, models.ReplyVote.user_id == principal.user_id
        )
    )
    if payload.value == 0:
        if vote is not None:
            db.delete(vote)
    elif vote is not None:
        vote.value = payload.value
    else:
        db.add(models.ReplyVote(reply_id=reply.id, user_id=principal.user_id, value=payload.value))
    db.flush()
    scores, _ = _vote_tallies(db, [reply.id], None)
    # Keep the legacy counter in step with the votes, inside the same transaction.
    reply.upvotes = int(
        db.scalar(
            select(func.count()).select_from(models.ReplyVote).where(
                models.ReplyVote.reply_id == reply.id, models.ReplyVote.value > 0
            )
        )
        or 0
    )
    # A vote only moves the confidence of an entry that exists: it must not bring
    # back one a steward deleted.
    _kb_sync(db, thread, reply, create=False)
    db.commit()
    return {"reply_id": reply.id, "score": scores.get(reply.id, 0), "my_vote": payload.value}


@app.get("/threads/{thread_id}/summary", tags=["forums"])
def thread_summary(
    thread_id: str, principal: MaybeUser, lang: str = "en", db: OrmSession = Depends(get_db)
):
    """Digest a long thread.

    The blueprint's promise is "two honest lines", and *honest* is the load-
    bearing word: the summary is generated from the replies themselves and
    carries where it came from, so a reader can tell a machine wrote it and how
    many posts it stands on.

    Short threads are refused rather than summarised. A digest of six replies is
    a worse version of scrolling, and pretending otherwise would put a
    machine-written paragraph in front of text nobody needed help with.
    """
    thread = _thread_for(db, thread_id, principal)

    # The summary is built from the text itself, so it must obey the same gates
    # as reading the thread: a digest of a thread you cannot open is a way to
    # open it.
    age = agecommunity.viewer(principal.user_id if principal else None)
    if not agecommunity.visible(db, age, thread.id):
        raise HTTPException(status_code=404, detail="Thread not found")

    replies = _visible_replies(
        db,
        age,
        db.scalars(
            select(models.Reply)
            .where(models.Reply.thread_id == thread_id, models.Reply.status == "published")
            .order_by(models.Reply.created_at)
        ).all(),
    )

    if len(replies) < SUMMARY_MIN_REPLIES:
        return {
            "summarised": False,
            "reason": f"Too short to summarise: {len(replies)} replies, it needs at least {SUMMARY_MIN_REPLIES}",
            "replies_counted": len(replies),
            "min_replies": SUMMARY_MIN_REPLIES,
        }

    # A bounded window: the opening frames the question, the tail carries where
    # it landed, and the middle of a hundred-post thread is mostly repetition.
    excerpt = "\n".join(
        [f"{thread.title}", thread.body[:600]]
        + [r.body[:400] for r in replies[:15]]
        + (["…"] + [r.body[:400] for r in replies[-10:]] if len(replies) > 25 else [])
    )

    try:
        response = httpx.post(
            f"{AI_URL}/ai/run",
            json={
                "task": "summarize",  # the gateway's spelling, not ours
                # Discussion first, instruction last: the mock provider echoes
                # the first sentence it is given, and that should be the thread's.
                "prompt": (
                    excerpt + chr(10) * 2
                    + "Summarise this forum discussion in at most two sentences. "
                    "State what was asked and what was concluded. If no conclusion "
                    "was reached, say so rather than inventing one."
                ),
                "lang": lang,
            },
            # A dead ai-service must fail in seconds, not hold the page for 25.
            timeout=httpx.Timeout(25, connect=3),
        )
        response.raise_for_status()
        result = response.json()
    except Exception as exc:
        # The upstream reason travels with the error. A flat "unavailable"
        # hid a plain spelling mistake in the task name behind what looked
        # like an outage.
        detail = "The summariser is unavailable right now"
        if isinstance(exc, httpx.HTTPStatusError):
            try:
                detail = str(exc.response.json().get("detail", detail))
            except Exception:
                pass
        log.warning("thread summary failed for %s: %s", thread_id, exc)
        raise HTTPException(status_code=503, detail=detail)

    summary = (result.get("output") or result.get("text") or "").strip()
    if not summary:
        raise HTTPException(status_code=503, detail="The summariser returned nothing")

    # Kept for the thread list, but only when it is safe to show there: built by
    # an adult (so from every reply), from a real model (a mock's echo would
    # fill the list with noise). The list and detail then serve it to adults
    # only, so a minor never reads a digest of replies they cannot see.
    if not age.is_minor and not result.get("mock"):
        thread.ai_summary = summary
        db.commit()

    return {
        "summarised": True,
        "summary": summary,
        "replies_counted": len(replies),
        # Named so the reader can weigh it. A mock provider says so here rather
        # than passing its output off as a real model's.
        "provider": result.get("provider"),
        "model": result.get("model"),
        "mock": bool(result.get("mock")),
        "provenance": "ai_generated",
    }


# --- knowledge base --------------------------------------------------------

@app.get("/forums/{forum_id}/knowledge", tags=["knowledge"])
def knowledge(
    forum_id: str,
    principal: MaybeUser,
    q: str | None = None,
    reviewed: bool | None = None,
    limit: int = 20,
    include_sub: bool = False,
    db: OrmSession = Depends(get_db),
):
    """Structured knowledge distilled from discussions — always with citations.

    Reviewed entries first, then by confidence. By default only this forum's own
    entries; `include_sub=true` adds those of its sub-forums the viewer may enter
    (a closed or secret one contributes nothing, so it cannot leak through its
    parent), each item saying which forum it came from. An entry whose thread or
    reply this viewer's age may not read is left out, like the discussion itself.
    """
    forum = _get_forum_or_404(db, forum_id)
    _forum_access(db, forum, principal)
    forums = {forum.id: forum}
    if include_sub:
        level = [forum.id]
        for _ in range(MAX_FORUM_DEPTH):
            children = db.scalars(select(models.Forum).where(models.Forum.parent_id.in_(level))).all()
            level = [f.id for f in children if f.id not in forums]
            for f in children:
                if f.id not in forums and _can_enter(db, f, principal):
                    forums[f.id] = f
            if not level:
                break
    stmt = select(models.KnowledgeEntry).where(models.KnowledgeEntry.forum_id.in_(list(forums)))
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(models.KnowledgeEntry.question).like(like),
                func.lower(models.KnowledgeEntry.answer).like(like),
            )
        )
    if reviewed is not None:
        has_review = models.KnowledgeEntry.reviewed_by.is_not(None)
        stmt = stmt.where(has_review if reviewed else ~has_review)
    rows = db.scalars(
        stmt.order_by(
            case((models.KnowledgeEntry.reviewed_by.is_(None), 1), else_=0),
            models.KnowledgeEntry.confidence.desc(),
            models.KnowledgeEntry.created_at.desc(),
        ).limit(500)
    ).all()

    threads = {
        t.id: t
        for t in db.scalars(
            select(models.Thread).where(
                models.Thread.id.in_({r.source_thread_ids for r in rows}), models.Thread.status == "open"
            )
        ).all()
    }
    rows = [r for r in rows if r.source_thread_ids in threads]
    age = agecommunity.viewer(principal.user_id if principal else None)
    if age.is_minor:
        ids = [r.source_thread_ids for r in rows] + [r.source_reply_id for r in rows if r.source_reply_id]
        allowed = {i["id"] for i in agecommunity.filter_items(db, age, [{"id": i} for i in ids])}
        rows = [
            r for r in rows
            if r.source_thread_ids in allowed and (not r.source_reply_id or r.source_reply_id in allowed)
        ]

    can_review = bool(principal) and _is_forum_steward(db, forum, principal.user_id)
    return {
        "items": [
            {
                "id": r.id,
                "forum_id": r.forum_id,
                "forum_name": forums[r.forum_id].name,
                "question": r.question,
                "answer": r.answer,
                "lang": r.lang,
                "confidence": float(r.confidence),
                "sources": [r.source_thread_ids],
                "source_thread_id": r.source_thread_ids,
                "source_thread_title": threads[r.source_thread_ids].title,
                "source_reply_id": r.source_reply_id,
                "reviewed": r.reviewed_by is not None,
                "reviewed_by": r.reviewed_by,
                "created_at": r.created_at,
                "can_review": can_review,
            }
            for r in rows[: max(1, min(limit, 100))]
        ]
    }


def _kb_confidence(net_votes: int) -> float:
    """What the community's own signal says about an accepted answer.

    0.50 when the asker or a moderator accepted it. Net votes move it: up to
    +0.40 as they pile up (n / (n + 4), so the first votes count most), down to
    -0.30 for a downvoted one. Capped at 0.90, never 1.0: certainty is what a
    steward's review adds, and the listing puts reviewed entries first.
    """
    n = abs(net_votes)
    swing = (0.40 if net_votes > 0 else -0.30) * n / (n + 4)
    return round(min(0.90, 0.50 + swing), 3)


def _kb_trim(text: str, limit: int) -> str:
    text = text.strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _kb_question(thread: models.Thread) -> str:
    """The title, plus the body when it carries detail the title does not."""
    body = thread.body.strip()
    if not body or body == thread.title.strip():
        return thread.title
    return f"{thread.title}\n\n{_kb_trim(body, 400)}"


def _kb_sync(
    db: OrmSession, thread: models.Thread, reply: models.Reply, *, create: bool = True, refresh_text: bool = False
) -> None:
    """Bring the thread's entry in line with `reply`, the caller's own transaction.

    A live entry needs an open thread and a published, accepted reply. Anything
    else removes this reply's entry (a reviewed one too: the steward vouched for
    an answer that is no longer the answer). `create=False` is for the hooks that
    only keep an entry true (votes, edits), so a steward's delete is not undone by
    the next vote. `refresh_text` re-copies the wording from the discussion and
    drops the reviewed mark: a reviewer approved other words.
    """
    entries = db.scalars(
        select(models.KnowledgeEntry).where(models.KnowledgeEntry.source_thread_ids == thread.id)
    ).all()
    mine = next((e for e in entries if e.source_reply_id == reply.id), None)
    if not (thread.status == "open" and reply.status == "published" and reply.accepted_answer):
        if mine is not None:
            db.delete(mine)
        return
    forum = db.get(models.Forum, thread.forum_id)
    if forum is None or _forum_chain(db, forum) is None:
        return
    if create:
        # The accept route moved the mark: the previous answer's entry goes.
        for e in entries:
            if e is not mine:
                db.delete(e)
    question, answer = _kb_question(thread), _kb_trim(reply.body, 4000)
    if mine is None:
        if not create:
            return
        mine = models.KnowledgeEntry(
            forum_id=thread.forum_id,
            question=question,
            answer=answer,
            lang=thread.lang,
            source_thread_ids=thread.id,
            source_reply_id=reply.id,
        )
        db.add(mine)
    elif refresh_text and (mine.question, mine.answer) != (question, answer):
        mine.question, mine.answer, mine.lang = question, answer, thread.lang
        mine.reviewed_by = None
    scores, _ = _vote_tallies(db, [reply.id], None)
    mine.confidence = _kb_confidence(scores.get(reply.id, 0))


def _kb_resync_thread(db: OrmSession, thread: models.Thread) -> None:
    """After the thread's own words changed: re-copy the question."""
    reply = db.scalar(
        select(models.Reply).where(
            models.Reply.thread_id == thread.id,
            models.Reply.accepted_answer.is_(True),
            models.Reply.status == "published",
        )
    )
    if reply is not None:
        _kb_sync(db, thread, reply, create=False, refresh_text=True)


def _forum_community_id(db: OrmSession, forum: models.Forum) -> str | None:
    chain = _forum_chain(db, forum)
    return next((f.community_id for f in chain or [] if f.community_id), None)


def _is_forum_steward(db: OrmSession, forum: models.Forum, user_id: str) -> bool:
    community_id = _forum_community_id(db, forum)
    membership = _membership(db, community_id, user_id) if community_id else None
    return (
        membership is not None
        and membership.role in ("owner", "moderator")
        and membership.status == "active"
    )


def _steward_entry(db: OrmSession, entry_id: str, principal) -> models.KnowledgeEntry:
    """An entry the caller may review.

    The door first, so an outsider gets what reading the forum gives (404 for a
    secret community, 403 for a closed one, 403 for a ban), then the steward
    check. A forum outside any community has no stewards.
    """
    entry = db.get(models.KnowledgeEntry, entry_id)
    forum = db.get(models.Forum, entry.forum_id) if entry else None
    if forum is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    _forum_access(db, forum, principal)
    community_id = _forum_community_id(db, forum)
    if not community_id:
        raise HTTPException(status_code=403, detail="Forums outside a community have no moderators")
    _require_steward(db, community_id, principal.user_id)
    return entry


class KnowledgeEditIn(BaseModel):
    question: str | None = Field(default=None, min_length=1, max_length=2000)
    answer: str | None = Field(default=None, min_length=1, max_length=8000)


# Under /forums on purpose: the gateway already routes that prefix here.
@app.post("/forums/knowledge/{entry_id}/review", tags=["knowledge"])
def review_knowledge(entry_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    entry = _steward_entry(db, entry_id, principal)
    entry.reviewed_by = principal.user_id
    db.commit()
    return {"id": entry.id, "reviewed": True, "reviewed_by": entry.reviewed_by}


@app.patch("/forums/knowledge/{entry_id}", tags=["knowledge"])
def edit_knowledge(
    entry_id: str, payload: KnowledgeEditIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """A steward corrects the wording. The citations stay, and the correction
    counts as a review by whoever made it."""
    entry = _steward_entry(db, entry_id, principal)
    if payload.question is None and payload.answer is None:
        raise HTTPException(status_code=400, detail="Nothing to change")
    if payload.question is not None:
        entry.question = payload.question.strip()
    if payload.answer is not None:
        entry.answer = payload.answer.strip()
    entry.reviewed_by = principal.user_id
    db.flush()
    # An entry has no rating of its own: a minor sees it through its source, so
    # the new wording tightens (or is refused against) that source's rating.
    _rate_edit(
        db, entry.source_reply_id or entry.source_thread_ids, "reply",
        f"{entry.question} {entry.answer}", principal.user_id,
    )
    db.commit()
    return {
        "id": entry.id,
        "question": entry.question,
        "answer": entry.answer,
        "reviewed": True,
        "reviewed_by": entry.reviewed_by,
    }


@app.delete("/forums/knowledge/{entry_id}", tags=["knowledge"])
def delete_knowledge(entry_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    entry = _steward_entry(db, entry_id, principal)
    db.delete(entry)
    db.commit()
    return {"deleted": True, "id": entry_id}


# --- secret communities: invitation with acceptance, and invite links -------
#
# The direct add (`invite_member`) stays. These are the two other doors into a
# secret community. Neither is reachable from the community id alone.

INVITATION_TTL = timedelta(days=14)


def _secret_for_member(db: OrmSession, community_id: str, user_id: str, steward: bool = False) -> models.Community:
    """The secret community, or the refusal that leaks the least.

    A non-member is told it does not exist, exactly as `get_community` does.
    """
    community = db.get(models.Community, community_id)
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")
    if community.kind != "secret":
        raise HTTPException(status_code=400, detail="Only a secret community uses this")
    membership = _membership(db, community_id, user_id)
    if membership is None or membership.status != "active":
        raise HTTPException(status_code=404, detail="Community not found")
    if steward and membership.role not in ("owner", "moderator"):
        raise HTTPException(status_code=403, detail="Only the owner or a moderator can do that")
    return community


class InvitationIn(BaseModel):
    user_id: str


@app.post("/communities/{community_id}/invitations", status_code=201, tags=["communities"])
def create_invitation(
    community_id: str, payload: InvitationIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """Invite someone to a secret community. They are not added until they accept."""
    community = _secret_for_member(db, community_id, principal.user_id)
    if payload.user_id == principal.user_id:
        raise HTTPException(status_code=400, detail="You cannot invite yourself")
    if payload.user_id not in _profiles({payload.user_id}):
        raise HTTPException(status_code=404, detail="User not found")

    # The invitee consents, so an unaccepted connection is fine. A block is not.
    perm = permissions.get(principal.user_id, payload.user_id)
    if perm is None:
        raise HTTPException(status_code=503, detail="Could not verify permission to invite. Try again shortly.")
    if perm.get("reason") == "blocked":
        raise HTTPException(status_code=403, detail="You cannot invite this member.")

    # Banned and already-in answer alike, so the reply tells the inviter nothing
    # about the roll that they could not already see.
    existing = _membership(db, community_id, payload.user_id)
    if existing is not None and existing.status in ("active", "banned"):
        raise HTTPException(status_code=409, detail="This person cannot be invited to this community")

    now = datetime.now(timezone.utc)
    pending = db.scalar(
        select(models.CommunityInvitation).where(
            models.CommunityInvitation.community_id == community_id,
            models.CommunityInvitation.invitee_id == payload.user_id,
            models.CommunityInvitation.status == "pending",
            models.CommunityInvitation.expires_at > now,
        )
    )
    if pending is not None:
        raise HTTPException(status_code=409, detail="This person already has a pending invitation")

    invitation = models.CommunityInvitation(
        community_id=community_id,
        inviter_id=principal.user_id,
        invitee_id=payload.user_id,
        expires_at=now + INVITATION_TTL,
    )
    db.add(invitation)
    db.commit()
    notify.notify(
        payload.user_id,
        kind="community_invitation",
        title=f"You were invited to {community.name}",
        link="/communities?tab=invitations",
    )
    return {"id": invitation.id, "status": "pending", "expires_at": invitation.expires_at}


@app.get("/communities/me/invitations", tags=["communities"])
def my_invitations(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Invitations waiting on me. Expired ones are not shown."""
    now = datetime.now(timezone.utc)
    rows = db.scalars(
        select(models.CommunityInvitation)
        .where(
            models.CommunityInvitation.invitee_id == principal.user_id,
            models.CommunityInvitation.status == "pending",
            models.CommunityInvitation.expires_at > now,
        )
        .order_by(models.CommunityInvitation.created_at.desc())
    ).all()
    communities = {
        c.id: c
        for c in db.scalars(
            select(models.Community).where(models.Community.id.in_([r.community_id for r in rows]))
        ).all()
    }
    profiles = _profiles({r.inviter_id for r in rows})
    return {
        "items": [
            {
                "id": r.id,
                "community_id": r.community_id,
                "community_name": communities[r.community_id].name if r.community_id in communities else None,
                "inviter": profiles.get(r.inviter_id),
                "expires_at": r.expires_at,
                "created_at": r.created_at,
            }
            for r in rows
        ]
    }


def _my_pending_invitation(db: OrmSession, invitation_id: str, user_id: str) -> models.CommunityInvitation:
    """Someone else's invitation, a spent one and an expired one all read as missing."""
    invitation = db.get(models.CommunityInvitation, invitation_id)
    if (
        invitation is None
        or invitation.invitee_id != user_id
        or invitation.status != "pending"
        or invitation.expires_at <= datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=404, detail="Invitation not found")
    return invitation


@app.post("/communities/invitations/{invitation_id}/accept", tags=["communities"])
def accept_invitation(invitation_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    invitation = _my_pending_invitation(db, invitation_id, principal.user_id)
    community = db.get(models.Community, invitation.community_id)
    if community is None or community.kind != "secret":
        raise HTTPException(status_code=404, detail="Invitation not found")

    existing = _membership(db, community.id, principal.user_id)
    if existing is not None and existing.status == "banned":
        raise HTTPException(status_code=403, detail="You are banned from this community")
    if existing is None:
        db.add(models.Membership(community_id=community.id, user_id=principal.user_id, status="active"))
        community.members_count += 1
    elif existing.status != "active":
        existing.status = "active"
        community.members_count += 1
    invitation.status = "accepted"
    invitation.responded_at = datetime.now(timezone.utc)
    db.commit()
    return {"joined": True, "status": "active", "community_id": community.id}


@app.post("/communities/invitations/{invitation_id}/decline", tags=["communities"])
def decline_invitation(invitation_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    invitation = _my_pending_invitation(db, invitation_id, principal.user_id)
    invitation.status = "declined"
    invitation.responded_at = datetime.now(timezone.utc)
    db.commit()
    return {"declined": True}


class InviteLinkIn(BaseModel):
    max_uses: int | None = Field(default=None, ge=1, le=100000)
    expires_at: datetime | None = None


def _link_view(link: models.CommunityInviteLink) -> dict:
    """Never carries the token: only its hash is stored."""
    return {
        "id": link.id,
        "community_id": link.community_id,
        "max_uses": link.max_uses,
        "uses": link.uses,
        "expires_at": link.expires_at,
        "revoked": link.revoked_at is not None,
        "created_at": link.created_at,
    }


@app.post("/communities/{community_id}/links", status_code=201, tags=["communities"])
def create_invite_link(
    community_id: str, payload: InviteLinkIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """Mint an invite link. The raw token is returned here and nowhere else."""
    _secret_for_member(db, community_id, principal.user_id, steward=True)
    expires_at = payload.expires_at
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="expires_at must be in the future")

    token = secrets.token_urlsafe(32)
    link = models.CommunityInviteLink(
        community_id=community_id,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        created_by=principal.user_id,
        max_uses=payload.max_uses,
        expires_at=expires_at,
    )
    db.add(link)
    db.commit()
    return {**_link_view(link), "token": token}


@app.get("/communities/{community_id}/links", tags=["communities"])
def list_invite_links(community_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    _secret_for_member(db, community_id, principal.user_id, steward=True)
    rows = db.scalars(
        select(models.CommunityInviteLink)
        .where(models.CommunityInviteLink.community_id == community_id)
        .order_by(models.CommunityInviteLink.created_at.desc())
    ).all()
    return {"items": [_link_view(r) for r in rows]}


@app.delete("/communities/{community_id}/links/{link_id}", tags=["communities"])
def revoke_invite_link(
    community_id: str, link_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    _secret_for_member(db, community_id, principal.user_id, steward=True)
    link = db.get(models.CommunityInviteLink, link_id)
    if link is None or link.community_id != community_id:
        raise HTTPException(status_code=404, detail="Link not found")
    if link.revoked_at is None:
        link.revoked_at = datetime.now(timezone.utc)
        db.commit()
    return {"revoked": True}


class RedeemIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)


@app.post("/communities/links/redeem", tags=["communities"])
def redeem_invite_link(payload: RedeemIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Enter a secret community with a link's token.

    An unknown, revoked, expired or used-up token all answer the same 404, so
    the reply never says which.
    """
    not_found = HTTPException(status_code=404, detail="Invite link not found")
    link = db.scalar(
        select(models.CommunityInviteLink)
        .where(models.CommunityInviteLink.token_hash == hashlib.sha256(payload.token.encode()).hexdigest())
        .with_for_update()
    )
    now = datetime.now(timezone.utc)
    if (
        link is None
        or link.revoked_at is not None
        or (link.expires_at is not None and link.expires_at <= now)
        or (link.max_uses is not None and link.uses >= link.max_uses)
    ):
        raise not_found
    community = db.get(models.Community, link.community_id)
    if community is None or community.kind != "secret":
        raise not_found

    existing = _membership(db, community.id, principal.user_id)
    if existing is not None and existing.status == "banned":
        raise HTTPException(status_code=403, detail="You are banned from this community")
    if existing is not None and existing.status == "active":
        # Already in: report it, and do not spend a use.
        return {"joined": True, "status": "active", "already": True, "community_id": community.id}

    if existing is None:
        db.add(models.Membership(community_id=community.id, user_id=principal.user_id, status="active"))
    else:
        existing.status = "active"
    community.members_count += 1
    link.uses += 1
    db.commit()
    return {"joined": True, "status": "active", "community_id": community.id}


# --- edit, delete and leave --------------------------------------------------
#
# Until here nothing could be taken back: a member could not leave, a thread or
# reply could not be corrected or removed, a community could not be changed or
# closed. Every route below goes through the same gates as reading first, so an
# outsider (or a banned member) meets the 404 they already meet everywhere else.

from common import ageclient, classifier
from common.agesafety import rating_strictness
from sqlalchemy import delete as sql_delete


class CommunityEditIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=140)
    description: str | None = None
    avatar_url: str | None = Field(default=None, max_length=500)
    country: str | None = Field(default=None, max_length=2)
    city: str | None = Field(default=None, max_length=120)
    price_usd: float | None = None
    # Accepted only to be refused with a clear message when it differs.
    kind: str | None = None
    forum_creation: str | None = Field(default=None, pattern="^(members|stewards)$")


class ThreadEditIn(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=300)
    body: str | None = Field(default=None, min_length=1)


class ReplyEditIn(BaseModel):
    body: str = Field(min_length=1)


REFUSED_TEXT = "This cannot be published. If you believe this is a mistake, contact support."


def _rate_edit(db: OrmSession, content_id: str, kind: str, text: str, author_id: str) -> None:
    """Rate edited text like new text, but only ever tighten what is in force.

    Same rule as an edited post in social-service: otherwise wording something
    blandly for the classifier and then editing it back would be a way round
    any rating. Raises 403 (after rolling back the edit) when the text is one
    that could not be published in the first place.
    """
    row = db.scalar(
        select(models.ContentSafetyClassification)
        .where(models.ContentSafetyClassification.content_id == content_id)
        .with_for_update()
    )
    if row is None:
        # Never rated: in effect new content, judged as such.
        result = agecommunity.classify_and_store(db, content_id, kind, text, author_id)
    else:
        result = classifier.classify(
            body=text or "",
            media_kinds=[],
            author_is_minor=ageclient.age_profile(author_id).is_minor,
        )
        tightened = False
        if rating_strictness(result.age_rating) > rating_strictness(row.age_rating):
            row.age_rating = result.age_rating
            tightened = True
        for field_name, level in result.levels.items():
            if level > (getattr(row, field_name) or 0):
                setattr(row, field_name, level)
                tightened = True
        if result.exploitation_risk > (row.exploitation_risk or 0):
            row.exploitation_risk = result.exploitation_risk
            tightened = True
        if tightened:
            # Whatever a reviewer confirmed, it was not the text that is there now.
            row.human_review_status = "pending"
            row.classifier_source = f"edit:{result.classifier_source}"
            row.classifier_confidence = result.classifier_confidence
    if result.block_publication:
        db.rollback()
        if result.escalate_child_safety:
            log.error("child-safety escalation on an edited %s by %s", kind, author_id)
        raise HTTPException(status_code=403, detail=REFUSED_TEXT)


def _community_for_member_action(db: OrmSession, community_id: str, user_id: str):
    """The community and the caller's membership, with the 404 discipline.

    A missing community, and a secret one the caller is not an active member of,
    answer the same 404.
    """
    community = db.get(models.Community, community_id)
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")
    membership = _membership(db, community_id, user_id)
    if community.kind == "secret" and (membership is None or membership.status != "active"):
        raise HTTPException(status_code=404, detail="Community not found")
    return community, membership


def _owned_community(db: OrmSession, community_id: str, user_id: str) -> models.Community:
    community, membership = _community_for_member_action(db, community_id, user_id)
    if membership is None or membership.status != "active" or membership.role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can do that")
    return community


@app.post("/communities/{community_id}/leave", tags=["communities"])
def leave_community(community_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """An active member or a pending requester steps out.

    The owner cannot (delete the community instead), and a banned member cannot:
    leaving would erase the ban and let them walk back in.
    """
    community, membership = _community_for_member_action(db, community_id, principal.user_id)
    if membership is None:
        raise HTTPException(status_code=409, detail="You are not a member of this community")
    if membership.status == "banned":
        raise HTTPException(status_code=403, detail="You are banned from this community and cannot leave it")
    if membership.role == "owner":
        raise HTTPException(
            status_code=409,
            detail="The owner cannot leave. Delete the community instead.",
        )
    was_active = membership.status == "active"
    db.delete(membership)
    if was_active:
        community.members_count = max(0, community.members_count - 1)
    db.commit()
    message = "You left the community."
    if community.kind == "paid" and was_active:
        message = "You left the community. Your payment is not refunded, and joining again means paying again."
    elif not was_active:
        message = "Your request was withdrawn."
    return {"left": True, "community_id": community.id, "message": message}


@app.patch("/communities/{community_id}", tags=["communities"])
def edit_community(
    community_id: str, payload: CommunityEditIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    community = _owned_community(db, community_id, principal.user_id)
    sent = payload.model_fields_set
    if payload.kind is not None and payload.kind != community.kind:
        raise HTTPException(status_code=400, detail="The kind of a community cannot be changed")
    if "price_usd" in sent:
        if community.kind != "paid":
            raise HTTPException(status_code=400, detail="Only a paid community has a price")
        if not payload.price_usd or payload.price_usd <= 0:
            raise HTTPException(status_code=400, detail="A paid community needs a price above zero")
        community.price_usd = payload.price_usd
    if payload.name is not None:
        community.name = payload.name.strip()
        if len(community.name) < 2:
            raise HTTPException(status_code=400, detail="The name is too short")
    if payload.description is not None:
        community.description = payload.description
    if payload.forum_creation is not None:
        community.forum_creation = payload.forum_creation
    if "avatar_url" in sent:
        community.avatar_url = payload.avatar_url or None
    if "country" in sent:
        community.country = payload.country.upper() if payload.country else None
    if "city" in sent:
        community.city = payload.city or None
    db.flush()
    _rate_edit(
        db, community.id, "community", f"{community.name} {community.description}", community.owner_id
    )
    db.commit()
    return {
        "id": community.id,
        "slug": community.slug,
        "name": community.name,
        "description": community.description,
        "kind": community.kind,
        "price_usd": str(community.price_usd) if community.price_usd is not None else None,
        "forum_creation": community.forum_creation or "members",
        "country": community.country,
        "city": community.city,
        "avatar_url": community.avatar_url,
    }


@app.delete("/communities/{community_id}", tags=["communities"])
async def delete_community(community_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Close a community for good, with everything inside it. Owner only.

    A paid community that still has other active members is refused: they paid
    to be in it, and there is no refund path to close it with.
    """
    community = _owned_community(db, community_id, principal.user_id)
    if community.kind == "paid":
        others = db.scalar(
            select(func.count()).select_from(models.Membership).where(
                models.Membership.community_id == community.id,
                models.Membership.status == "active",
                models.Membership.user_id != principal.user_id,
            )
        )
        if others:
            raise HTTPException(
                status_code=409,
                detail="Members have paid to be here. Remove them or wait until they leave before deleting this community.",
            )

    # No foreign keys: every dependent row is removed by hand, in this one transaction.
    forum_ids = set(
        db.scalars(select(models.Forum.id).where(models.Forum.community_id == community.id)).all()
    )
    while True:
        children = set(
            db.scalars(select(models.Forum.id).where(models.Forum.parent_id.in_(forum_ids))).all()
        ) - forum_ids if forum_ids else set()
        if not children:
            break
        forum_ids |= children
    thread_ids = (
        list(db.scalars(select(models.Thread.id).where(models.Thread.forum_id.in_(forum_ids))).all())
        if forum_ids
        else []
    )
    reply_ids = (
        list(db.scalars(select(models.Reply.id).where(models.Reply.thread_id.in_(thread_ids))).all())
        if thread_ids
        else []
    )
    if reply_ids:
        db.execute(sql_delete(models.ReplyVote).where(models.ReplyVote.reply_id.in_(reply_ids)))
        db.execute(sql_delete(models.Reply).where(models.Reply.id.in_(reply_ids)))
    if thread_ids:
        db.execute(sql_delete(models.Thread).where(models.Thread.id.in_(thread_ids)))
    if forum_ids:
        db.execute(sql_delete(models.KnowledgeEntry).where(models.KnowledgeEntry.forum_id.in_(forum_ids)))
        db.execute(sql_delete(models.Forum).where(models.Forum.id.in_(forum_ids)))
    db.execute(
        sql_delete(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id.in_([community.id, *thread_ids, *reply_ids])
        )
    )
    db.execute(sql_delete(models.CommunityInvitation).where(models.CommunityInvitation.community_id == community.id))
    db.execute(sql_delete(models.CommunityInviteLink).where(models.CommunityInviteLink.community_id == community.id))
    db.execute(sql_delete(models.Membership).where(models.Membership.community_id == community.id))
    db.delete(community)
    db.commit()
    await events.publish("community.deleted", {"community_id": community_id})
    return {"deleted": True, "id": community_id}


def _own_text_thread(
    db: OrmSession, thread_id: str, principal, *, author_may_see_own: bool = False
) -> tuple[models.Thread, bool]:
    """`_thread_for` plus the age gate `get_thread` applies: a minor does not
    reach by id what they could not read. An author may still remove their own
    words (`author_may_see_own`), since taking text down is never the harm."""
    thread = _thread_for(db, thread_id, principal)
    age = agecommunity.viewer(principal.user_id)
    own = author_may_see_own and thread.author_id == principal.user_id
    if not own and not agecommunity.visible(db, age, thread.id):
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread, _is_thread_steward(db, thread, principal.user_id)


@app.patch("/threads/{thread_id}", tags=["forums"])
def edit_thread(thread_id: str, payload: ThreadEditIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """The author corrects their own thread. A steward may not rewrite someone
    else's words; they can lock or remove the thread instead."""
    thread, steward = _own_text_thread(db, thread_id, principal)
    if thread.author_id != principal.user_id:
        raise HTTPException(status_code=403, detail="Only the author can edit this thread")
    if thread.locked and not steward:
        raise HTTPException(status_code=403, detail="This thread is locked")
    if payload.title is None and payload.body is None:
        raise HTTPException(status_code=400, detail="Nothing to change")
    if payload.title is not None:
        thread.title = payload.title
    if payload.body is not None:
        thread.body = payload.body
    db.flush()
    _rate_edit(db, thread.id, "thread", f"{thread.title} {thread.body}", principal.user_id)
    _kb_resync_thread(db, thread)
    db.commit()
    return {"id": thread.id, "title": thread.title, "body": thread.body}


@app.delete("/threads/{thread_id}", tags=["forums"])
def delete_thread(thread_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Its author or a steward removes it. Soft: `_thread_for` answers 404 for a
    thread that is not open, so it leaves every surface at once."""
    thread, steward = _own_text_thread(db, thread_id, principal, author_may_see_own=True)
    if thread.author_id != principal.user_id and not steward:
        raise HTTPException(status_code=403, detail="Only the author or a moderator can delete this thread")
    thread.status = "removed"
    db.execute(
        sql_delete(models.KnowledgeEntry).where(models.KnowledgeEntry.source_thread_ids == thread.id)
    )
    forum = db.get(models.Forum, thread.forum_id)
    if forum is not None:
        forum.threads_count = max(0, forum.threads_count - 1)
    db.commit()
    return {"deleted": True, "id": thread.id}


@app.patch("/threads/{thread_id}/replies/{reply_id}", tags=["forums"])
def edit_reply(
    thread_id: str, reply_id: str, payload: ReplyEditIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    thread, reply = _reachable_reply(db, thread_id, reply_id, principal)
    if reply.author_id != principal.user_id:
        raise HTTPException(status_code=403, detail="Only the author can edit this reply")
    if thread.locked and not _is_thread_steward(db, thread, principal.user_id):
        raise HTTPException(status_code=403, detail="This thread is locked")
    reply.body = payload.body
    reply.edited_at = datetime.now(timezone.utc)
    db.flush()
    _rate_edit(db, reply.id, "reply", reply.body, principal.user_id)
    _kb_sync(db, thread, reply, create=False, refresh_text=True)
    db.commit()
    return {"id": reply.id, "body": reply.body, "edited": True, "edited_at": reply.edited_at}


@app.delete("/threads/{thread_id}/replies/{reply_id}", tags=["forums"])
def delete_reply(thread_id: str, reply_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Its author or a steward removes it. Soft, like a thread. Replies that
    answered it stay: `parent_id` is only a pointer and nothing resolves it."""
    thread, reply = _reachable_reply(db, thread_id, reply_id, principal)
    if reply.author_id != principal.user_id and not _is_thread_steward(db, thread, principal.user_id):
        raise HTTPException(status_code=403, detail="Only the author or a moderator can delete this reply")
    reply.status = "removed"
    reply.accepted_answer = False
    reply.upvotes = 0
    db.execute(sql_delete(models.ReplyVote).where(models.ReplyVote.reply_id == reply.id))
    db.execute(sql_delete(models.KnowledgeEntry).where(models.KnowledgeEntry.source_reply_id == reply.id))
    thread.replies_count = max(0, thread.replies_count - 1)
    db.commit()
    return {"deleted": True, "id": reply.id, "accepted_reply_id": None}
