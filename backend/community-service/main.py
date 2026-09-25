"""Kinjy · community-service — communities, groups, forums, knowledge base."""
from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
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


app = create_app(
    name="community-service",
    schema=models.SCHEMA,
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


class ForumIn(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    description: str = ""
    parent_id: str | None = None
    hierarchy: str = Field(default="topic", pattern="^(topic|geographic)$")
    scope: str | None = None
    scope_value: str | None = None
    community_id: str | None = None


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
        raise HTTPException(status_code=403, detail="Join the community before inviting others")

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
    if community.kind == "paid":
        raise HTTPException(
            status_code=402,
            detail="This community requires a purchase. Complete checkout in commerce-service first.",
        )

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
    if membership is None or membership.role not in ("owner", "moderator") or membership.status != "active":
        raise HTTPException(status_code=403, detail="Only the owner or a moderator can do that")
    return community


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
    if action == "approve":
        if membership.status != "pending":
            raise HTTPException(status_code=400, detail="That request is not pending")
        membership.status = "active"
        community.members_count += 1
    elif action == "reject":
        db.delete(membership)
    elif action == "ban":
        if membership.status == "active":
            community.members_count = max(0, community.members_count - 1)
        membership.status = "banned"
    elif action == "unban":
        membership.status = "active"
        community.members_count += 1
    elif action == "promote":
        membership.role = "moderator"
    elif action == "demote":
        membership.role = "member"

    db.commit()

    if action == "approve":
        notify.notify(
            user_id,
            kind="community_approved",
            title=f"You were admitted to {community.name}",
            link=f"/communities?open={community_id}",
        )
    return {"ok": True, "action": action}


# --- forums ----------------------------------------------------------------

@app.post("/forums", status_code=201, tags=["forums"])
def create_forum(payload: ForumIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    if payload.hierarchy == "geographic" and payload.scope not in GEO_SCOPES:
        raise HTTPException(status_code=400, detail=f"scope must be one of: {', '.join(GEO_SCOPES)}")

    slug = _slugify(payload.name)
    if db.scalar(select(models.Forum).where(models.Forum.slug == slug)):
        slug = f"{slug}-{new_id('x')[-4:].lower()}"
    forum = models.Forum(id=new_id("frm"), slug=slug, **payload.model_dump())
    db.add(forum)
    db.commit()
    return {"id": forum.id, "slug": forum.slug}


@app.get("/discover", tags=["discovery"])
def suggestions(principal: MaybeUser, limit: int = 4, db: OrmSession = Depends(get_db)):
    """Communities and forums the member has not joined yet.

    Secret communities never appear here — they are reachable by direct link
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

    forums = db.scalars(
        select(models.Forum)
        .order_by(models.Forum.threads_count.desc(), models.Forum.created_at.desc())
        .limit(min(limit, 10))
    ).all()

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
    hierarchy: str | None = None,
    parent_id: str | None = None,
    scope: str | None = None,
    db: OrmSession = Depends(get_db),
):
    stmt = select(models.Forum)
    if hierarchy:
        stmt = stmt.where(models.Forum.hierarchy == hierarchy)
    if parent_id:
        stmt = stmt.where(models.Forum.parent_id == parent_id)
    elif parent_id is None and scope is None:
        stmt = stmt.where(models.Forum.parent_id.is_(None))
    if scope:
        stmt = stmt.where(models.Forum.scope == scope)

    rows = db.scalars(stmt.order_by(models.Forum.threads_count.desc())).all()
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
                "threads_count": r.threads_count,
            }
            for r in rows
        ],
    }


@app.post("/forums/{forum_id}/threads", status_code=201, tags=["forums"])
async def create_thread(
    forum_id: str, payload: ThreadIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    forum = db.get(models.Forum, forum_id)
    if forum is None:
        raise HTTPException(status_code=404, detail="Forum not found")

    thread = models.Thread(
        id=new_id("thr"), forum_id=forum_id, author_id=principal.user_id, **payload.model_dump()
    )
    db.add(thread)
    forum.threads_count += 1
    db.commit()

    # ai-service picks this up to suggest duplicates and a summary.
    await events.publish(
        "forum.thread_created",
        {"thread_id": thread.id, "forum_id": forum_id, "title": thread.title, "lang": thread.lang},
    )
    return {"id": thread.id, "created_at": thread.created_at}


@app.get("/forums/{forum_id}/threads", tags=["forums"])
def list_threads(forum_id: str, limit: int = 30, offset: int = 0, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.Thread)
        .where(models.Thread.forum_id == forum_id, models.Thread.status == "open")
        .order_by(models.Thread.pinned.desc(), models.Thread.last_activity_at.desc())
        .limit(min(limit, 100))
        .offset(offset)
    ).all()
    return {
        "items": [
            {
                "id": r.id,
                "title": r.title,
                "author_id": r.author_id,
                "replies_count": r.replies_count,
                "views_count": r.views_count,
                "pinned": r.pinned,
                "ai_summary": r.ai_summary,
                "duplicate_of": r.duplicate_of,
                "last_activity_at": r.last_activity_at,
            }
            for r in rows
        ]
    }


@app.get("/threads/{thread_id}", tags=["forums"])
def get_thread(thread_id: str, db: OrmSession = Depends(get_db)):
    thread = db.get(models.Thread, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    thread.views_count += 1
    replies = db.scalars(
        select(models.Reply)
        .where(models.Reply.thread_id == thread_id, models.Reply.status == "published")
        .order_by(models.Reply.accepted_answer.desc(), models.Reply.created_at)
    ).all()
    db.commit()
    return {
        "id": thread.id,
        "title": thread.title,
        "body": thread.body,
        "author_id": thread.author_id,
        "lang": thread.lang,
        "ai_summary": thread.ai_summary,
        "locked": thread.locked,
        "replies": [
            {
                "id": r.id,
                "author_id": r.author_id,
                "parent_id": r.parent_id,
                "body": r.body,
                "upvotes": r.upvotes,
                "accepted_answer": r.accepted_answer,
                "created_at": r.created_at,
            }
            for r in replies
        ],
    }


@app.post("/threads/{thread_id}/replies", status_code=201, tags=["forums"])
def add_reply(thread_id: str, payload: ReplyIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    thread = db.get(models.Thread, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread.locked:
        raise HTTPException(status_code=403, detail="This thread is locked")

    reply = models.Reply(
        id=new_id("rpl"), thread_id=thread_id, author_id=principal.user_id, **payload.model_dump()
    )
    db.add(reply)
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


@app.get("/threads/{thread_id}/summary", tags=["forums"])
def thread_summary(thread_id: str, lang: str = "en", db: OrmSession = Depends(get_db)):
    """Digest a long thread.

    The blueprint's promise is "two honest lines", and *honest* is the load-
    bearing word: the summary is generated from the replies themselves and
    carries where it came from, so a reader can tell a machine wrote it and how
    many posts it stands on.

    Short threads are refused rather than summarised. A digest of six replies is
    a worse version of scrolling, and pretending otherwise would put a
    machine-written paragraph in front of text nobody needed help with.
    """
    thread = db.get(models.Thread, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    replies = db.scalars(
        select(models.Reply)
        .where(models.Reply.thread_id == thread_id)
        .order_by(models.Reply.created_at)
    ).all()

    if len(replies) < SUMMARY_MIN_REPLIES:
        return {
            "summarised": False,
            "reason": f"only {len(replies)} replies — short enough to read",
            "replies_counted": len(replies),
        }

    # A bounded window: the opening frames the question, the tail carries where
    # it landed, and the middle of a hundred-post thread is mostly repetition.
    excerpt = "\n".join(
        [f"{thread.title}"]
        + [r.body[:400] for r in replies[:15]]
        + (["…"] + [r.body[:400] for r in replies[-10:]] if len(replies) > 25 else [])
    )

    try:
        response = httpx.post(
            f"{AI_URL}/ai/run",
            json={
                "task": "summarize",  # the gateway's spelling, not ours
                "prompt": (
                    "Summarise this forum discussion in at most two sentences. "
                    "State what was asked and what was concluded. If no conclusion "
                    "was reached, say so rather than inventing one." + chr(10) * 2 + excerpt
                ),
                "lang": lang,
            },
            timeout=25,
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
                detail = exc.response.json().get("detail", detail)
            except Exception:
                pass
        log.warning("thread summary failed for %s: %s", thread_id, exc)
        raise HTTPException(status_code=503, detail=detail)

    return {
        "summarised": True,
        "summary": result.get("output") or result.get("text"),
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
def knowledge(forum_id: str, q: str | None = None, limit: int = 20, db: OrmSession = Depends(get_db)):
    """Structured knowledge distilled from discussions — always with citations."""
    stmt = select(models.KnowledgeEntry).where(models.KnowledgeEntry.forum_id == forum_id)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(models.KnowledgeEntry.question).like(like),
                func.lower(models.KnowledgeEntry.answer).like(like),
            )
        )
    rows = db.scalars(stmt.order_by(models.KnowledgeEntry.confidence.desc()).limit(min(limit, 100))).all()
    return {
        "items": [
            {
                "id": r.id,
                "question": r.question,
                "answer": r.answer,
                "lang": r.lang,
                "confidence": float(r.confidence),
                "sources": [t for t in r.source_thread_ids.split(",") if t],
                "reviewed": r.reviewed_by is not None,
            }
            for r in rows
        ]
    }
