"""Kinjy · messaging-service — private messenger and notifications."""
from __future__ import annotations

import base64
import json
from datetime import datetime, timedelta, timezone

import logging

import httpx
from fastapi import Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session as OrmSession

from common import permissions
from common.auth import AdminUser, CurrentUser
from common.database import SessionLocal, get_db
from common.ids import new_id
from common.security import decode_token, ACCESS
from common.service import create_app

import agecheck
import models

log = logging.getLogger("messaging-service")
USER_URL = "http://user-service:8000"


def _profiles(user_ids: set[str]) -> dict[str, dict]:
    """Resolve everyone on the page in one call.

    The conversation list used to render `@usr_01M08QR6…` — a truncated raw id,
    which identifies nobody. One batch per response rather than one call per
    conversation.
    """
    if not user_ids:
        return {}
    try:
        response = httpx.post(
            f"{USER_URL}/internal/profiles", json={"ids": sorted(user_ids)}, timeout=5
        )
        response.raise_for_status()
        return response.json()["profiles"]
    except Exception as exc:
        log.warning("could not resolve conversation participants: %s", exc)
        return {}

MIGRATIONS = [
    f"ALTER TABLE {models.SCHEMA}.participants ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ",
    # Disappearing messages shipped their model without these, so every attempt
    # to create a conversation raised UndefinedColumn - and the caller saw it
    # as "could not verify permission", which points nowhere near the cause.
    f"ALTER TABLE {models.SCHEMA}.conversations "
    "ADD COLUMN IF NOT EXISTS disappear_after_seconds INTEGER DEFAULT 0",
    f"ALTER TABLE {models.SCHEMA}.messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ",
    # Conversations that already exist predate the request model, so everyone
    # in them is treated as having accepted. Retro-fitting a request state onto
    # live threads would silently block attachments between people who have
    # been talking for months.
    f"UPDATE {models.SCHEMA}.participants SET accepted_at = joined_at WHERE accepted_at IS NULL",
]

app = create_app(
    name="messaging-service",
    schema=models.SCHEMA,
    migrations=MIGRATIONS,
    description="End-to-end encrypted direct messages, group conversations, notifications.",
)

# In-process socket registry. Fine for a single replica; a multi-replica
# deployment fans out through Redis pub/sub instead.
_sockets: dict[str, set[WebSocket]] = {}

# --- the realtime hub ------------------------------------------------------
#
# This service owns the only WebSocket the browser opens, so it is where every
# live update converges rather than each service growing its own socket. A
# client subscribes to *topics*; other services push into them over the private
# network via /internal/broadcast, which the gateway refuses to proxy.
#
# Topics in use:
#   user:<id>   — implicit on connect: messages, notifications, invitations
#   post:<id>   — reactions, comments, reposts and views on one post
#   feed        — a post was published
#   shorts      — a short was published
#
# A socket only ever receives what it asked for: broadcasting every post event
# to every connection would make a busy instance flood idle tabs.
_topics: dict[str, set[WebSocket]] = {}


def _subscribe(socket: WebSocket, topics: list[str]) -> None:
    for topic in topics[:200]:
        _topics.setdefault(topic, set()).add(socket)


def _unsubscribe(socket: WebSocket, topics: list[str] | None = None) -> None:
    for topic in list(_topics) if topics is None else topics:
        members = _topics.get(topic)
        if not members:
            continue
        members.discard(socket)
        if not members:
            _topics.pop(topic, None)


async def _publish(topic: str, payload: dict) -> int:
    """Fan a payload out to a topic. Returns how many sockets received it."""
    delivered = 0
    for socket in list(_topics.get(topic, ())):
        try:
            await socket.send_json(payload)
            delivered += 1
        except Exception:
            # A socket that fails a send is gone; drop it rather than retry.
            _unsubscribe(socket, [topic])
    return delivered


class ConversationIn(BaseModel):
    participant_ids: list[str] = Field(min_length=1)
    kind: str = Field(default="direct", pattern="^(direct|group)$")
    title: str | None = None
    encrypted: bool = True


class MessageIn(BaseModel):
    ciphertext_b64: str | None = None
    body: str | None = None
    kind: str = Field(default="text", pattern="^(text|media|call_event)$")
    media_url: str | None = None
    lang: str | None = None


def _purge_expired(db: OrmSession, conversation_id: str | None = None) -> int:
    """Delete what has expired, for real.

    Called on every read and every write of a conversation rather than from a
    cron job: a sweeper that runs every five minutes leaves a five-minute window
    in which a "disappeared" message is still in the database and still
    returned by the API. Deleting on the path that would otherwise serve it
    closes that window.
    """
    stmt = delete(models.Message).where(
        models.Message.expires_at.is_not(None),
        models.Message.expires_at <= datetime.now(timezone.utc),
    )
    if conversation_id:
        stmt = stmt.where(models.Message.conversation_id == conversation_id)
    removed = db.execute(stmt).rowcount or 0
    if removed:
        db.commit()
    return removed


def _member(db: OrmSession, conversation_id: str, user_id: str) -> models.Participant:
    participant = db.scalar(
        select(models.Participant).where(
            models.Participant.conversation_id == conversation_id,
            models.Participant.user_id == user_id,
        )
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return participant


def _accept(db: OrmSession, conversation_id: str, user_id: str) -> None:
    """Mark a participant as having accepted. Idempotent."""
    row = db.scalar(
        select(models.Participant).where(
            models.Participant.conversation_id == conversation_id,
            models.Participant.user_id == user_id,
        )
    )
    if row is not None and row.accepted_at is None:
        row.accepted_at = datetime.now(timezone.utc)


@app.post("/conversations/{conversation_id}/accept", tags=["messages"])
def accept_conversation(
    conversation_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """Accept a message request, which unlocks attachments from the sender."""
    _member(db, conversation_id, principal.user_id)
    _accept(db, conversation_id, principal.user_id)
    db.commit()
    return {"id": conversation_id, "accepted": True}


@app.get("/admin/contact-risk", tags=["admin"])
def contact_risk(_: AdminUser, limit: int = 50, db: OrmSession = Depends(get_db)):
    """Accounts whose contact attempts towards minors look like a pattern.

    A queue for humans, not a verdict. Ranked by how many *distinct* minors
    refused them, because ten attempts at one person is a different behaviour
    from one attempt at ten people.
    """
    since = datetime.now(timezone.utc) - agecheck.RISK_WINDOW
    rows = db.execute(
        select(
            models.ContactAttempt.sender_id,
            func.count(func.distinct(models.ContactAttempt.recipient_id)),
            func.count(),
        )
        .where(
            models.ContactAttempt.outcome == "refused_adult_to_minor",
            models.ContactAttempt.created_at >= since,
        )
        .group_by(models.ContactAttempt.sender_id)
        .order_by(func.count(func.distinct(models.ContactAttempt.recipient_id)).desc())
        .limit(min(limit, 200))
    ).all()
    return {
        "window_days": agecheck.RISK_WINDOW.days,
        "items": [
            {
                "sender_id": sender,
                "distinct_minors_refused": distinct,
                "total_attempts": total,
                "risk_score": agecheck.risk_score(db, sender),
                "note": "A signal for review. Not a finding about the person.",
            }
            for sender, distinct, total in rows
        ],
    }


@app.post("/conversations", status_code=201, tags=["messages"])
def create_conversation(payload: ConversationIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    members = sorted({*payload.participant_ids, principal.user_id})
    if payload.kind == "direct" and len(members) != 2:
        raise HTTPException(status_code=400, detail="A direct conversation has exactly two participants")

    # Whether you may message someone is their decision, not ours. user-service
    # owns that rule; asking it here is what makes the privacy setting real
    # rather than a checkbox the UI honours and the API ignores.
    for member in members:
        if member == principal.user_id:
            continue
        allowed, reason = permissions.check(principal.user_id, member, 'can_message', 'message this member')
        if not allowed:
            raise HTTPException(status_code=403, detail=reason)

        # And the layer the recipient cannot set for themselves. A teenager who
        # has left their messages open to anyone has not thereby agreed to
        # unknown adults, and their own setting is not the whole answer.
        age_ok, age_reason = agecheck.may_open_conversation(db, principal.user_id, member)
        if not age_ok:
            db.commit()   # keep the attempt record even though the call fails
            raise HTTPException(status_code=403, detail=age_reason)

    if payload.kind == "direct":
        # Reuse the existing thread rather than creating a duplicate.
        existing = db.execute(
            select(models.Participant.conversation_id)
            .where(models.Participant.user_id.in_(members))
            .group_by(models.Participant.conversation_id)
            .having(func.count() == 2)
        ).scalars().all()
        for cid in existing:
            conversation = db.get(models.Conversation, cid)
            if conversation and conversation.kind == "direct":
                return {"id": cid, "existing": True}

    conversation = models.Conversation(
        id=new_id("cnv"),
        kind=payload.kind,
        title=payload.title,
        created_by=principal.user_id,
        encrypted=payload.encrypted,
    )
    db.add(conversation)
    db.flush()
    for uid in members:
        db.add(
            models.Participant(
                conversation_id=conversation.id,
                user_id=uid,
                role="owner" if uid == principal.user_id else "member",
                # Starting a conversation is consent to it; being added to one
                # is not. Everybody else accepts by replying or by accepting.
                accepted_at=datetime.now(timezone.utc) if uid == principal.user_id else None,
            )
        )
    db.commit()
    return {"id": conversation.id, "encrypted": conversation.encrypted, "existing": False}


# --- calls ------------------------------------------------------------------
#
# Voice and video, honestly scoped.
#
# What this does: carries the WebRTC handshake — offer, answer, ICE candidates,
# hang-up — between two members over the socket they already have. That is
# *signalling*, and it is genuinely all a 1:1 call needs from a server, because
# the audio and video travel directly between the two browsers and never touch
# this machine.
#
# What this does NOT do, and what would be dishonest to imply:
#   * **No TURN server.** Two peers behind symmetric NATs (many mobile networks,
#     most corporate firewalls) cannot reach each other directly, and the call
#     will fail to connect. A TURN relay is the fix and it is not deployed.
#   * **No group calls.** Three or more participants need a media server (SFU);
#     mesh peer-to-peer collapses past three people.
#   * **No recording, no fallback to PSTN.**
#
# The client is expected to say so when a connection fails rather than spinning.

CALL_SIGNALS = ("offer", "answer", "candidate", "hangup", "reject", "busy")


class CallSignalIn(BaseModel):
    conversation_id: str
    signal: str = Field(pattern="^(offer|answer|candidate|hangup|reject|busy)$")
    # Opaque to the server: SDP or an ICE candidate, passed through untouched.
    payload: dict = Field(default_factory=dict)
    media: str = Field(default="audio", pattern="^(audio|video)$")


@app.post("/calls/signal", tags=["calls"])
async def call_signal(
    body: CallSignalIn,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    """Relay one WebRTC signal to the other people in the conversation.

    The server never inspects the payload — an SDP offer is opaque to it, which
    is the point: signalling a call must not become a place where the platform
    learns what is in it.
    """
    _member(db, body.conversation_id, principal.user_id)

    recipients = db.scalars(
        select(models.Participant.user_id).where(
            models.Participant.conversation_id == body.conversation_id,
            models.Participant.user_id != principal.user_id,
        )
    ).all()
    if len(recipients) > 1 and body.signal == "offer":
        raise HTTPException(
            status_code=400,
            detail="Group calls need a media server, which is not deployed. One-to-one only for now.",
        )

    delivered = 0
    for uid in recipients:
        delivered += await _publish(
            f"user:{uid}",
            {
                "type": "call",
                "topic": f"user:{uid}",
                "signal": body.signal,
                "conversation_id": body.conversation_id,
                "from": principal.user_id,
                "media": body.media,
                "payload": body.payload,
            },
        )

    # A ring nobody is holding a socket for is a call that will never be picked
    # up; the caller should hear that immediately rather than after 30 seconds.
    return {"delivered": delivered, "reachable": delivered > 0}


class DisappearIn(BaseModel):
    """0 keeps messages. Otherwise a whole number of seconds."""

    seconds: int = Field(ge=0, le=60 * 60 * 24 * 30)


@app.post("/conversations/{conversation_id}/disappearing", tags=["messages"])
async def set_disappearing(
    conversation_id: str,
    payload: DisappearIn,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    """Turn disappearing messages on or off for this room.

    Any participant may set it, and everyone is told: a timer one person can
    change silently is a trap rather than a privacy feature. Messages already
    sent are left alone — retroactively deleting what people believed was kept
    would be the same betrayal in the other direction.
    """
    _member(db, conversation_id, principal.user_id)
    conversation = db.get(models.Conversation, conversation_id)
    conversation.disappear_after_seconds = payload.seconds
    db.commit()

    recipients = db.scalars(
        select(models.Participant.user_id).where(
            models.Participant.conversation_id == conversation_id
        )
    ).all()
    for uid in recipients:
        await _publish(
            f"user:{uid}",
            {
                "type": "disappearing_changed",
                "topic": f"user:{uid}",
                "conversation_id": conversation_id,
                "seconds": payload.seconds,
                "actor": principal.user_id,
            },
        )
    return {"seconds": payload.seconds}


@app.get("/conversations", tags=["messages"])
def list_conversations(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    ids = db.scalars(
        select(models.Participant.conversation_id).where(models.Participant.user_id == principal.user_id)
    ).all()
    rows = db.scalars(
        select(models.Conversation)
        .where(models.Conversation.id.in_(ids))
        .order_by(models.Conversation.last_message_at.desc())
    ).all()

    # Participants for every conversation in one query, not one per row.
    memberships = db.scalars(
        select(models.Participant).where(models.Participant.conversation_id.in_(ids))
    ).all()
    members: dict[str, list[str]] = {}
    for m in memberships:
        members.setdefault(m.conversation_id, []).append(m.user_id)

    profiles = _profiles({uid for uids in members.values() for uid in uids})

    # Unread = messages from someone else, newer than my last read — in one
    # grouped query. The cutoff differs per conversation, so it comes from the
    # join on my own participant row rather than from a Python loop issuing a
    # count per conversation.
    unread_rows = db.execute(
        select(models.Message.conversation_id, func.count())
        .join(
            models.Participant,
            (models.Participant.conversation_id == models.Message.conversation_id)
            & (models.Participant.user_id == principal.user_id),
        )
        .where(
            models.Message.conversation_id.in_(ids),
            models.Message.sender_id != principal.user_id,
            or_(
                models.Participant.last_read_at.is_(None),
                models.Message.created_at > models.Participant.last_read_at,
            ),
        )
        .group_by(models.Message.conversation_id)
    ).all()
    unread = {conversation_id: count for conversation_id, count in unread_rows}

    return {
        "items": [
            {
                "id": r.id,
                "kind": r.kind,
                "title": r.title,
                "encrypted": r.encrypted,
                "last_message_at": r.last_message_at,
                "participants": members.get(r.id, []),
                # Resolved names and avatars, so the list can show people.
                "profiles": {
                    uid: profiles.get(uid) for uid in members.get(r.id, []) if profiles.get(uid)
                },
                "unread": unread.get(r.id, 0),
            }
            for r in rows
        ]
    }


@app.post("/conversations/{conversation_id}/messages", status_code=201, tags=["messages"])
async def send_message(
    conversation_id: str,
    payload: MessageIn,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    _member(db, conversation_id, principal.user_id)
    conversation = db.get(models.Conversation, conversation_id)
    _purge_expired(db, conversation_id)

    if conversation.encrypted:
        if not payload.ciphertext_b64:
            raise HTTPException(
                status_code=400,
                detail="This conversation is end-to-end encrypted: send ciphertext_b64, not plaintext.",
            )
        if payload.body:
            raise HTTPException(
                status_code=400,
                detail="Refusing to store plaintext in an encrypted conversation.",
            )
    elif not payload.body:
        raise HTTPException(status_code=400, detail="body is required")

    # Text first. An attachment sent before the other side accepted has already
    # been seen by the time anybody can report it.
    if payload.media_url or payload.kind not in ("text", ""):
        media_ok, media_reason = agecheck.may_send_media(db, principal.user_id, conversation_id)
        if not media_ok:
            raise HTTPException(status_code=403, detail=media_reason)

    # Replying accepts the conversation: it is a clearer statement of consent
    # than any button, and it is what people actually do.
    _accept(db, conversation_id, principal.user_id)

    message = models.Message(
        id=new_id("msg"),
        conversation_id=conversation_id,
        sender_id=principal.user_id,
        encrypted=conversation.encrypted,
        ciphertext=base64.b64decode(payload.ciphertext_b64) if payload.ciphertext_b64 else None,
        body=None if conversation.encrypted else payload.body,
        kind=payload.kind,
        media_url=payload.media_url,
        lang=payload.lang,
        # The deadline is computed from the room's setting, not sent by the
        # client: letting the sender choose would let them set a shorter timer
        # than the room agreed to, or none at all.
        expires_at=(
            datetime.now(timezone.utc) + timedelta(seconds=conversation.disappear_after_seconds)
            if conversation.disappear_after_seconds
            else None
        ),
    )
    db.add(message)
    conversation.last_message_at = datetime.now(timezone.utc)
    db.commit()

    recipients = db.scalars(
        select(models.Participant.user_id).where(
            models.Participant.conversation_id == conversation_id,
            models.Participant.user_id != principal.user_id,
        )
    ).all()
    for uid in recipients:
        for socket in list(_sockets.get(uid, ())):
            try:
                await socket.send_json(
                    {
                        "type": "message",
                        "conversation_id": conversation_id,
                        "message_id": message.id,
                        "sender_id": principal.user_id,
                        "encrypted": message.encrypted,
                        # The body travels only for conversations that are not
                        # end-to-end encrypted; for E2E ones the server has no
                        # plaintext to send and the client fetches the ciphertext.
                        "body": None if message.encrypted else message.body,
                        "created_at": message.created_at.isoformat(),
                    }
                )
            except Exception:
                _sockets.get(uid, set()).discard(socket)

    return {"id": message.id, "created_at": message.created_at}


@app.get("/conversations/{conversation_id}/messages", tags=["messages"])
def list_messages(
    conversation_id: str,
    principal: CurrentUser,
    limit: int = 50,
    before: str | None = None,
    db: OrmSession = Depends(get_db),
):
    participant = _member(db, conversation_id, principal.user_id)
    # Before serving, not after: an expired message must never be in a response.
    _purge_expired(db, conversation_id)
    stmt = select(models.Message).where(models.Message.conversation_id == conversation_id)
    if before:
        stmt = stmt.where(models.Message.id < before)
    rows = db.scalars(stmt.order_by(models.Message.created_at.desc()).limit(min(limit, 100))).all()

    participant.last_read_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "items": [
            {
                "id": r.id,
                "sender_id": r.sender_id,
                "encrypted": r.encrypted,
                # The server hands back what it stored; only the client can decrypt.
                "ciphertext_b64": base64.b64encode(r.ciphertext).decode() if r.ciphertext else None,
                "body": r.body,
                "kind": r.kind,
                "media_url": r.media_url,
                "created_at": r.created_at,
            }
            for r in reversed(rows)
        ]
    }


@app.websocket("/ws")
async def websocket(socket: WebSocket, token: str = ""):
    """Live delivery. The token is passed as a query param because browsers
    cannot set headers on a WebSocket handshake."""
    claims = decode_token(token, expected_type=ACCESS)
    if not claims:
        await socket.close(code=4401)
        return

    user_id = str(claims["sub"])
    await socket.accept()
    _sockets.setdefault(user_id, set()).add(socket)
    # Your own channel is not opt-in: a member should not have to ask to be
    # told they were messaged.
    _subscribe(socket, [f"user:{user_id}"])
    await socket.send_json({"type": "ready", "topics": [f"user:{user_id}"]})

    try:
        while True:
            raw = await socket.receive_text()
            # Anything unparseable is treated as a keep-alive ping rather than
            # a reason to drop the connection.
            try:
                frame = json.loads(raw)
            except Exception:
                continue
            action = frame.get("action")
            topics = [t for t in frame.get("topics", []) if isinstance(t, str)]
            # A client may not subscribe to another member's private channel.
            topics = [t for t in topics if not (t.startswith("user:") and t != f"user:{user_id}")]
            if action == "subscribe":
                _subscribe(socket, topics)
                await socket.send_json({"type": "subscribed", "topics": topics})
            elif action == "unsubscribe":
                _unsubscribe(socket, topics)
    except WebSocketDisconnect:
        pass
    finally:
        _sockets.get(user_id, set()).discard(socket)
        _unsubscribe(socket)


class BroadcastIn(BaseModel):
    topic: str
    type: str
    data: dict = Field(default_factory=dict)


@app.post("/internal/broadcast", tags=["internal"])
async def internal_broadcast(payload: BroadcastIn):
    """Push a live update into a topic.

    Internal: the gateway never proxies ``/internal/*``, so only services on the
    private network can reach it. Callers treat it as best-effort — a hub that
    is down must slow nothing and fail nothing, it only costs liveness.
    """
    delivered = await _publish(
        payload.topic, {"type": payload.type, "topic": payload.topic, **payload.data}
    )
    return {"delivered": delivered}


# --- notifications ---------------------------------------------------------

@app.get("/notifications", tags=["notifications"])
def notifications(principal: CurrentUser, unread_only: bool = False, limit: int = 50, db: OrmSession = Depends(get_db)):
    stmt = select(models.Notification).where(models.Notification.user_id == principal.user_id)
    if unread_only:
        stmt = stmt.where(models.Notification.read_at.is_(None))
    rows = db.scalars(stmt.order_by(models.Notification.created_at.desc()).limit(min(limit, 200))).all()
    unread = db.scalar(
        select(func.count())
        .select_from(models.Notification)
        .where(models.Notification.user_id == principal.user_id, models.Notification.read_at.is_(None))
    ) or 0
    return {
        "unread": unread,
        "items": [
            {
                "id": r.id,
                "kind": r.kind,
                "title": r.title,
                "body": r.body,
                "link": r.link,
                "read": r.read_at is not None,
                "created_at": r.created_at,
            }
            for r in rows
        ],
    }


@app.post("/notifications/read", tags=["notifications"])
def mark_read(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    for row in db.scalars(
        select(models.Notification).where(
            models.Notification.user_id == principal.user_id, models.Notification.read_at.is_(None)
        )
    ).all():
        row.read_at = now
    db.commit()
    return {"read": True}


@app.post("/internal/notify", status_code=201, tags=["internal"])
async def internal_notify(
    user_id: str,
    kind: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    lang: str = "en",
    db: OrmSession = Depends(get_db),
):
    """Store a notification, then deliver it live.

    Stored first, pushed second, and in that order deliberately: a socket that
    is not open must not lose the notification, and one that is open should not
    have to poll to learn about it. A member who was offline finds it waiting;
    a member who is looking sees it arrive.
    """
    notification = models.Notification(
        user_id=user_id, kind=kind, title=title, body=body, link=link, lang=lang
    )
    db.add(notification)
    db.commit()

    unread = db.scalar(
        select(func.count())
        .select_from(models.Notification)
        .where(models.Notification.user_id == user_id, models.Notification.read_at.is_(None))
    ) or 0

    await _publish(
        f"user:{user_id}",
        {
            "type": "notification",
            "topic": f"user:{user_id}",
            "id": notification.id,
            "kind": kind,
            "title": title,
            "body": body,
            "link": link,
            "unread": unread,
            "created_at": notification.created_at.isoformat(),
        },
    )
    return {"id": notification.id, "unread": unread}
