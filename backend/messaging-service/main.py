"""Kinjy · messaging-service — private messenger and notifications."""
from __future__ import annotations

import asyncio
import base64
import json
import time
from datetime import datetime, timedelta, timezone

import logging

import httpx
from fastapi import Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select, true
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as OrmSession

import threading

from common import crypto, permissions
from common.auth import AdminUser, CurrentUser
from common.database import SessionLocal, get_db
from common.ids import new_id
from common.security import decode_token, ACCESS
from common.service import create_app

import agecheck
import agenotify
import models

log = logging.getLogger("messaging-service")
USER_URL = "http://user-service:8000"
MEDIA_URL = "http://media-service:8000"


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
    # Idempotent sends (a retried message is not delivered twice) and attachments.
    f"ALTER TABLE {models.SCHEMA}.messages ADD COLUMN IF NOT EXISTS client_id VARCHAR(64)",
    f"CREATE UNIQUE INDEX IF NOT EXISTS uq_message_sender_client_id "
    f"ON {models.SCHEMA}.messages (sender_id, client_id) WHERE client_id IS NOT NULL",
    *(
        f"ALTER TABLE {models.SCHEMA}.messages ADD COLUMN IF NOT EXISTS {column}"
        for column in (
            "media_id VARCHAR(40)",
            "media_kind VARCHAR(20)",
            "media_name VARCHAR(255)",
            "media_type VARCHAR(100)",
            "media_size BIGINT",
            # Which key sealed the row's text and file name; NULL is plaintext.
            "sealed_with VARCHAR(16)",
        )
    ),
    # A sealed name is longer than the name it hides.
    f"ALTER TABLE {models.SCHEMA}.messages ALTER COLUMN media_name TYPE TEXT",
]

app = create_app(
    name="messaging-service",
    schema=models.SCHEMA,
    migrations=MIGRATIONS,
    description="End-to-end encrypted direct messages, group conversations, notifications.",
    on_startup=[lambda: _start_sealing()],
)

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
#
# Every delivery goes through `_publish`. Chat used to write to a separate
# per-user socket registry, so a frame could reach a socket by one path and not
# the other; one path is also the only place Redis fan-out has to be added when
# this service runs more than one replica.
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


async def _publish_to_users(user_ids, payload: dict) -> dict[str, int]:
    """The same frame on each member's own channel. Returns deliveries per member."""
    return {
        uid: await _publish(f"user:{uid}", {**payload, "topic": f"user:{uid}"})
        for uid in dict.fromkeys(user_ids)
    }


def _participant_ids(db: OrmSession, conversation_id: str) -> list[str]:
    return list(
        db.scalars(
            select(models.Participant.user_id).where(
                models.Participant.conversation_id == conversation_id
            )
        ).all()
    )


# --- presence ----------------------------------------------------------------
#
# Online means "has at least one authenticated socket open", counted here
# because this service holds every socket. Kept in process, like the topic
# registry: a second replica needs both moved to Redis together (phase 4).
# `last_seen` is lost on restart and then reads as unknown, never as a
# fabricated time.
#
# Who may see it: accepted connections and anyone you share a conversation
# with. Presence is personal information; a stranger who knows your id learns
# nothing from it.
_online: dict[str, int] = {}
_last_seen: dict[str, datetime] = {}


async def _presence_audience(user_id: str) -> set[str]:
    with SessionLocal() as db:
        mine = select(models.Participant.conversation_id).where(
            models.Participant.user_id == user_id
        )
        audience = set(
            db.scalars(
                select(models.Participant.user_id).where(
                    models.Participant.conversation_id.in_(mine)
                )
            ).all()
        )
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            response = await client.get(f"{USER_URL}/internal/connections/{user_id}")
            response.raise_for_status()
            audience.update(response.json()["ids"])
    except Exception as exc:
        # Conversation partners still get told; connections without a thread
        # just see a stale dot until the next change.
        log.warning("presence audience incomplete for %s: %s", user_id, exc)
    blocked = await _blocked_with(user_id)
    if blocked is None:
        # Cannot tell who is blocked, so tell nobody: a stale dot is the
        # lesser harm next to showing a blocked person you are online.
        return set()
    audience -= blocked
    audience.discard(user_id)
    return audience


async def _blocked_with(user_id: str) -> set[str] | None:
    """Everyone on either side of a block with this member; None if unknown."""
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            response = await client.get(f"{USER_URL}/internal/blocks/{user_id}")
            response.raise_for_status()
            return set(response.json()["ids"])
    except Exception as exc:
        log.warning("block list unavailable for %s: %s", user_id, exc)
        return None


async def _announce_presence(user_id: str, online: bool) -> None:
    seen = _last_seen.get(user_id)
    await _publish_to_users(
        await _presence_audience(user_id),
        {
            "type": "presence",
            "user_id": user_id,
            "online": online,
            "last_seen": seen.isoformat() if seen else None,
        },
    )


@app.get("/presence", tags=["presence"])
async def presence(ids: str, principal: CurrentUser):
    """Online state for a comma-separated list of members.

    Anyone outside the caller's audience is simply left out of the answer —
    not reported offline, which would itself be a claim about them.
    """
    wanted = [i for i in ids.split(",") if i][:200]
    audience = await _presence_audience(principal.user_id)
    return {
        "items": {
            uid: {
                "online": _online.get(uid, 0) > 0,
                "last_seen": _last_seen[uid].isoformat() if uid in _last_seen else None,
            }
            for uid in wanted
            if uid in audience
        }
    }


class ConversationIn(BaseModel):
    participant_ids: list[str] = Field(min_length=1)
    kind: str = Field(default="direct", pattern="^(direct|group)$")
    title: str | None = None
    encrypted: bool = True


class MessageIn(BaseModel):
    ciphertext_b64: str | None = None
    body: str | None = Field(default=None, max_length=10_000)
    kind: str = Field(default="text", pattern="^(text|media|call_event)$")
    # An uploaded asset's id. Its URL, type, name and size are looked up from
    # media-service, which is why no client-supplied URL is accepted: a message
    # must not be able to embed an arbitrary address as a "photo".
    media_id: str | None = Field(default=None, max_length=40)
    lang: str | None = None
    # See models.Message.client_id: makes a retried send idempotent.
    client_id: str | None = Field(default=None, max_length=64)


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
    read_state: dict[str, dict[str, str | None]] = {}
    for m in memberships:
        members.setdefault(m.conversation_id, []).append(m.user_id)
        read_state.setdefault(m.conversation_id, {})[m.user_id] = (
            m.last_read_at.isoformat() if m.last_read_at else None
        )

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

    # The newest message of each thread in one query (Postgres DISTINCT ON),
    # so the list can say what was last said rather than only when.
    latest = {
        m.conversation_id: m
        for m in db.scalars(
            select(models.Message)
            .where(
                models.Message.conversation_id.in_(ids),
                or_(
                    models.Message.expires_at.is_(None),
                    models.Message.expires_at > datetime.now(timezone.utc),
                ),
            )
            .order_by(models.Message.conversation_id, models.Message.created_at.desc())
            .distinct(models.Message.conversation_id)
        ).all()
    }

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
                # How far each participant has read — what "Seen" is drawn from.
                "read_state": read_state.get(r.id, {}),
                # Encryption at rest is on: stored sealed, but readable by the
                # server. Distinct from `encrypted` (end to end) — the UI must
                # never let one pass for the other.
                "sealed_at_rest": crypto.enabled(),
                "last_message": (
                    {
                        "sender_id": latest[r.id].sender_id,
                        "preview": _preview(latest[r.id])[:120],
                        "media_kind": latest[r.id].media_kind,
                        "created_at": latest[r.id].created_at,
                    }
                    if r.id in latest
                    else None
                ),
            }
            for r in rows
        ]
    }


async def _attachment(media_id: str, sender_id: str) -> dict:
    """The asset as media-service knows it — and only if the sender uploaded it."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{MEDIA_URL}/internal/assets/{media_id}")
    except Exception as exc:
        log.warning("media-service unreachable for %s: %s", media_id, exc)
        raise HTTPException(status_code=503, detail="Could not verify the attachment. Try again shortly.")
    if response.status_code == 404:
        raise HTTPException(status_code=400, detail="That attachment does not exist")
    response.raise_for_status()
    asset = response.json()
    # Someone else's upload is not yours to forward by id, however it was found.
    if asset.get("owner_id") != sender_id:
        raise HTTPException(status_code=403, detail="You can only attach files you uploaded")
    return asset


# --- encryption at rest ---------------------------------------------------------
#
# The text of a message and the name of its attachment are sealed on the way
# into the database and opened on the way out; nothing else in this service
# handles ciphertext. See common/crypto.py for what this does and does not
# protect against.

def _seal(message: models.Message, body: str | None, name: str | None) -> None:
    """Set body and attachment name — sealed when a key is configured."""
    if not crypto.enabled() or (body is None and name is None):
        message.body, message.media_name, message.sealed_with = body, name, None
        return
    key_id = None
    message.body = message.media_name = None
    if body is not None:
        key_id, message.body = crypto.seal_text(body, f"msg:{message.id}:body")
    if name is not None:
        key_id, message.media_name = crypto.seal_text(name, f"msg:{message.id}:name")
    message.sealed_with = key_id


def _plain(message: models.Message, strict: bool = False) -> tuple[str | None, str | None]:
    """(body, attachment name) in the clear.

    A value that cannot be opened — its key was removed from the keyring —
    comes back as None rather than as ciphertext, and is logged; ``strict``
    raises instead, for callers that would otherwise overwrite it.
    """
    if not message.sealed_with:
        return message.body, message.media_name
    try:
        body = (
            crypto.open_text(message.sealed_with, message.body, f"msg:{message.id}:body")
            if message.body is not None
            else None
        )
        name = (
            crypto.open_text(message.sealed_with, message.media_name, f"msg:{message.id}:name")
            if message.media_name is not None
            else None
        )
        return body, name
    except crypto.DecryptionError as exc:
        if strict:
            raise
        log.error("message %s could not be decrypted: %s", message.id, exc)
        return None, None


def _start_sealing() -> None:
    crypto.require_in_production("messaging-service")
    if crypto.enabled():
        # In the background: a large backlog must not hold the service's boot.
        threading.Thread(target=_seal_backlog, name="seal-backlog", daemon=True).start()


def _seal_backlog() -> None:
    """Seal what was written before encryption was on, and re-seal what an older
    key sealed, in batches. Idempotent: every boot runs it, and a finished
    backlog costs one empty query."""
    active = crypto.keyring().active_id
    sealed = failed_total = 0
    unreadable: set[str] = set()
    while True:
        with SessionLocal() as db:
            rows = db.scalars(
                select(models.Message)
                .where(
                    models.Message.encrypted.is_(False),
                    models.Message.id.not_in(unreadable) if unreadable else true(),
                    or_(
                        (models.Message.sealed_with.is_(None))
                        & (models.Message.body.is_not(None) | models.Message.media_name.is_not(None)),
                        models.Message.sealed_with != active,
                    ),
                )
                .limit(500)
                .with_for_update(skip_locked=True)
            ).all()
            if not rows:
                break
            for message in rows:
                try:
                    body, name = _plain(message, strict=True)
                except crypto.DecryptionError:
                    # Its key is gone. Leave it exactly as it is — re-sealing
                    # "nothing" over it would destroy the only copy.
                    unreadable.add(message.id)
                    failed_total += 1
                    continue
                _seal(message, body, name)
                sealed += 1
            db.commit()

    # Notification previews used to carry message text in the clear.
    with SessionLocal() as db:
        db.execute(
            models.Notification.__table__.update()
            .where(models.Notification.kind == "message", models.Notification.body.is_not(None))
            .values(body=None)
        )
        db.commit()
    if sealed or failed_total:
        log.info("sealed %d existing messages with key %s; %d could not be opened", sealed, active, failed_total)


def _media_fields(message: models.Message) -> dict:
    """The attachment as every response and frame describes it.

    The link is signed: attachments are private, and only someone who can read
    this message is ever handed one (common/crypto.py, signed media links).
    """
    return {
        "media_url": (
            crypto.sign_media_url(message.media_url, message.media_id)
            if message.media_url and message.media_id
            else message.media_url
        ),
        "media_kind": message.media_kind,
        "media_name": _plain(message)[1],
        "media_type": message.media_type,
        "media_size": message.media_size,
    }


MEDIA_LABELS = {"image": "a photo", "video": "a video", "audio": "a voice or audio message",
                "document": "a document", "file": "a file"}


def _preview(message: models.Message) -> str:
    """One line for a notification or the conversation list — never ciphertext."""
    if message.encrypted:
        return "Encrypted message"
    text = (_plain(message)[0] or "").strip()
    if message.media_kind:
        label = MEDIA_LABELS.get(message.media_kind, "a file")
        return f"Sent {label}" + (f": {text}" if text else "")
    return text


@app.post("/conversations/{conversation_id}/messages", status_code=201, tags=["messages"])
async def send_message(
    conversation_id: str,
    payload: MessageIn,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    sender = _member(db, conversation_id, principal.user_id)
    conversation = db.get(models.Conversation, conversation_id)
    _purge_expired(db, conversation_id)

    if conversation.kind == "direct":
        # Asked on every message, not only when the thread was created: a
        # block, or `who_can_message` turned to "nobody", has to end an
        # existing conversation too — otherwise the setting protects nobody
        # from the one person they already talk to. Fails closed, like every
        # other permission check.
        other = next(
            (uid for uid in _participant_ids(db, conversation_id) if uid != principal.user_id), None
        )
        if other:
            allowed, reason = await asyncio.to_thread(
                permissions.check, principal.user_id, other, "can_message", "message this member"
            )
            if not allowed:
                raise HTTPException(status_code=403, detail=reason)

    if payload.client_id:
        # A retry of a send whose response was lost: answer with what is
        # already stored rather than storing it — and announcing it — twice.
        existing = db.scalar(
            select(models.Message).where(
                models.Message.sender_id == principal.user_id,
                models.Message.client_id == payload.client_id,
            )
        )
        if existing is not None:
            return {
                "id": existing.id,
                "created_at": existing.created_at,
                "client_id": existing.client_id,
                "duplicate": True,
            }

    if conversation.encrypted:
        if payload.media_id:
            # The file would sit on the server in the clear, which is exactly
            # what an encrypted room promises will not happen.
            raise HTTPException(
                status_code=400,
                detail="Attachments cannot be sent in an end-to-end encrypted conversation yet.",
            )
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
    elif not (payload.body and payload.body.strip()) and not payload.media_id:
        raise HTTPException(status_code=400, detail="A message needs text or an attachment")

    attachment = await _attachment(payload.media_id, principal.user_id) if payload.media_id else None

    # Text first. An attachment sent before the other side accepted has already
    # been seen by the time anybody can report it.
    if payload.media_id or payload.kind not in ("text", ""):
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
        kind="media" if attachment else payload.kind,
        media_url=attachment["url"] if attachment else None,
        media_id=attachment["id"] if attachment else None,
        media_kind=attachment["kind"] if attachment else None,
        media_type=attachment["content_type"] if attachment else None,
        media_size=attachment["size_bytes"] if attachment else None,
        lang=payload.lang,
        client_id=payload.client_id,
        # The deadline is computed from the room's setting, not sent by the
        # client: letting the sender choose would let them set a shorter timer
        # than the room agreed to, or none at all.
        expires_at=(
            datetime.now(timezone.utc) + timedelta(seconds=conversation.disappear_after_seconds)
            if conversation.disappear_after_seconds
            else None
        ),
    )
    _seal(
        message,
        None if conversation.encrypted else payload.body,
        attachment["filename"] if attachment else None,
    )
    db.add(message)
    now = datetime.now(timezone.utc)
    conversation.last_message_at = now
    # Writing into a thread means having read it: the sender's own message
    # must never count as unread for them.
    sender.last_read_at = now
    try:
        db.commit()
    except IntegrityError:
        # Two retries raced past the lookup above; the unique index kept one.
        db.rollback()
        existing = db.scalar(
            select(models.Message).where(
                models.Message.sender_id == principal.user_id,
                models.Message.client_id == payload.client_id,
            )
        )
        return {
            "id": existing.id,
            "created_at": existing.created_at,
            "client_id": existing.client_id,
            "duplicate": True,
        }

    # Everyone in the room, the sender included: their other tabs and devices
    # must show what they just sent, not only the one that sent it.
    participants = _participant_ids(db, conversation_id)
    deliveries = await _publish_to_users(
        participants,
        {
            "type": "message",
            "conversation_id": conversation_id,
            "message_id": message.id,
            # Lets the sending tab swap its pending bubble for this one.
            "client_id": message.client_id,
            "sender_id": principal.user_id,
            "encrypted": message.encrypted,
            # The body travels only for conversations that are not
            # end-to-end encrypted; for E2E ones the server has no
            # plaintext to send and the client fetches the ciphertext.
            "body": None if message.encrypted else _plain(message)[0],
            "kind": message.kind,
            **_media_fields(message),
            "created_at": message.created_at.isoformat(),
        },
    )

    # Someone with no socket open would otherwise learn about this only by
    # opening Messages on the off chance. One waiting notification per thread
    # is enough: ten messages in a row are one reason to come back, not ten.
    link = f"/messages?c={conversation_id}"
    offline = [uid for uid in participants if uid != principal.user_id and not deliveries.get(uid)]
    for uid in offline:
        waiting = db.scalar(
            select(models.Notification.id).where(
                models.Notification.user_id == uid,
                models.Notification.kind == "message",
                models.Notification.link == link,
                models.Notification.read_at.is_(None),
            )
        )
        if waiting is None:
            db.add(
                models.Notification(
                    user_id=uid,
                    kind="message",
                    title=f"New message from @{principal.handle}" if principal.handle else "New message",
                    # Never the text of an encrypted message: the server has none.
                    # Nor any text at all while encryption at rest is on: the
                    # notification table would be a plaintext copy of the
                    # messages the key is protecting.
                    body=None if message.encrypted or crypto.enabled() else _preview(message)[:140],
                    link=link,
                )
            )
    if offline:
        db.commit()

    return {"id": message.id, "created_at": message.created_at, "client_id": message.client_id}


@app.post("/conversations/{conversation_id}/read", tags=["messages"])
async def mark_conversation_read(
    conversation_id: str,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    """Record that the member has read the thread up to now, and say so.

    Everyone in the room is told — the other side to draw "Seen", the reader's
    own other tabs to clear the unread badge they are still showing.
    """
    participant = _member(db, conversation_id, principal.user_id)
    participant.last_read_at = datetime.now(timezone.utc)
    db.commit()
    await _publish_to_users(
        _participant_ids(db, conversation_id),
        {
            "type": "read",
            "conversation_id": conversation_id,
            "user_id": principal.user_id,
            "read_at": participant.last_read_at.isoformat(),
        },
    )
    return {"read_at": participant.last_read_at}


@app.get("/conversations/{conversation_id}/messages", tags=["messages"])
def list_messages(
    conversation_id: str,
    principal: CurrentUser,
    limit: int = 50,
    before: str | None = None,
    after: str | None = None,
    db: OrmSession = Depends(get_db),
):
    """A page of the thread, oldest first.

    ``before`` pages back through history. ``after`` is the catch-up a client
    makes when its socket comes back: everything sent while it was away, so a
    reconnect does not silently drop what arrived during the gap.
    """
    _member(db, conversation_id, principal.user_id)
    # Before serving, not after: an expired message must never be in a response.
    _purge_expired(db, conversation_id)
    stmt = select(models.Message).where(models.Message.conversation_id == conversation_id)
    if before:
        stmt = stmt.where(models.Message.id < before)
    if after:
        # Compared on time, not id: ids share a millisecond prefix but their
        # random tail does not order two messages sent in the same millisecond.
        # The anchor itself comes back too; the client already de-duplicates.
        anchor = db.scalar(
            select(models.Message.created_at).where(
                models.Message.id == after,
                models.Message.conversation_id == conversation_id,
            )
        )
        stmt = stmt.where(
            models.Message.created_at >= anchor if anchor else models.Message.id > after
        )
        # Catch-up wants the oldest missed messages first, not the newest page.
        rows = db.scalars(stmt.order_by(models.Message.created_at.asc()).limit(min(limit, 100))).all()
    else:
        rows = list(reversed(db.scalars(
            stmt.order_by(models.Message.created_at.desc()).limit(min(limit, 100))
        ).all()))

    # Fetching is not reading. A catch-up in a background tab, or a page of
    # history, must not tell the other side "Seen": the client posts /read
    # when the thread is actually on screen.
    return {
        "items": [
            {
                "id": r.id,
                "sender_id": r.sender_id,
                "encrypted": r.encrypted,
                # The server hands back what it stored; only the client can decrypt.
                "ciphertext_b64": base64.b64encode(r.ciphertext).decode() if r.ciphertext else None,
                "body": _plain(r)[0],
                "kind": r.kind,
                **_media_fields(r),
                "created_at": r.created_at,
            }
            for r in rows
        ]
    }


# Close codes the client acts on. 4401 means "get a fresh access token and
# come back", so it must only ever mean that.
WS_UNAUTHORIZED = 4401
AUTH_FRAME_TIMEOUT_S = 10
# A socket closing is not a member leaving: token refreshes and page reloads
# reconnect within a second or two, and announcing "offline, online" for each
# would make every dot flicker. Only a gap longer than this is announced.
OFFLINE_GRACE_S = 5
# Typing frames from one socket for one thread are relayed at most this often.
TYPING_MIN_INTERVAL_S = 2.0

_announced_online: set[str] = set()
# Strong references to fire-and-forget tasks; asyncio only keeps weak ones.
_background: set[asyncio.Task] = set()


def _in_background(coro) -> None:
    task = asyncio.create_task(coro)
    _background.add(task)
    task.add_done_callback(_background.discard)


def _socket_opened(user_id: str) -> None:
    _online[user_id] = _online.get(user_id, 0) + 1
    if user_id not in _announced_online:
        _announced_online.add(user_id)
        # Telling the audience involves a call to user-service; the socket
        # should not wait on it before it can deliver anything.
        _in_background(_announce_presence(user_id, True))


async def _socket_closed(user_id: str) -> None:
    _online[user_id] = max(0, _online.get(user_id, 0) - 1)
    if _online[user_id]:
        return
    left_at = datetime.now(timezone.utc)
    await asyncio.sleep(OFFLINE_GRACE_S)
    if _online.get(user_id, 0) == 0 and user_id in _announced_online:
        _announced_online.discard(user_id)
        _last_seen[user_id] = left_at
        await _announce_presence(user_id, False)


async def _relay_typing(socket_state: dict, user_id: str, conversation_id: str) -> None:
    """Tell the others in a thread that this member is typing.

    Membership is checked once per thread per socket, then remembered: a
    typing frame arrives every couple of seconds while someone writes.
    """
    now = time.monotonic()
    last = socket_state["typing_at"].get(conversation_id, 0.0)
    if now - last < TYPING_MIN_INTERVAL_S:
        return
    socket_state["typing_at"][conversation_id] = now

    members = socket_state["members"].get(conversation_id)
    if members is None:
        with SessionLocal() as db:
            members = _participant_ids(db, conversation_id)
        if user_id not in members:
            return  # not your conversation: say nothing, not even "no"
        socket_state["members"][conversation_id] = members
    # Re-read at most every 30 s, so a block made mid-conversation takes hold
    # without a lookup on every keystroke burst.
    if now - socket_state.get("blocked_at", -1e9) > 30:
        socket_state["blocked"] = await _blocked_with(user_id)
        socket_state["blocked_at"] = now
    blocked = socket_state["blocked"]
    if blocked is None:
        return  # unknown: typing is a courtesy, not worth the risk
    await _publish_to_users(
        [m for m in members if m != user_id and m not in blocked],
        {"type": "typing", "conversation_id": conversation_id, "user_id": user_id},
    )


async def _close_quietly(socket: WebSocket, code: int) -> None:
    """Close, unless the other side already has — which is not an error."""
    try:
        await socket.close(code=code)
    except RuntimeError:
        pass


@app.websocket("/ws")
async def websocket(socket: WebSocket):
    """Live delivery.

    The access token arrives in the **first frame** — ``{"action": "auth",
    "token": …}`` — not in the URL. Browsers cannot set headers on a WebSocket
    handshake, and a token in the query string is written to every proxy's
    access log on the way here.

    The socket lives only as long as the token it was opened with. At expiry
    the server closes it with 4401; the client refreshes and reconnects, then
    catches up on anything sent in between. Otherwise a socket opened once
    would keep delivering long after the session behind it was gone.
    """
    await socket.accept()
    try:
        first = json.loads(await asyncio.wait_for(socket.receive_text(), AUTH_FRAME_TIMEOUT_S))
    except WebSocketDisconnect:
        return  # gone before saying who it was; nothing to close
    except (asyncio.TimeoutError, ValueError):
        await _close_quietly(socket, WS_UNAUTHORIZED)
        return
    claims = (
        decode_token(str(first.get("token", "")), expected_type=ACCESS)
        if isinstance(first, dict) and first.get("action") == "auth"
        else None
    )
    if not claims:
        await _close_quietly(socket, WS_UNAUTHORIZED)
        return

    user_id = str(claims["sub"])
    expires_at = float(claims.get("exp", 0)) or None
    # Your own channel is not opt-in: a member should not have to ask to be
    # told they were messaged.
    _subscribe(socket, [f"user:{user_id}"])
    state: dict = {"typing_at": {}, "members": {}}
    _socket_opened(user_id)

    try:
        await socket.send_json({"type": "ready", "topics": [f"user:{user_id}"]})
        while True:
            remaining = expires_at - time.time() if expires_at else None
            if remaining is not None and remaining <= 0:
                await _close_quietly(socket, WS_UNAUTHORIZED)
                break
            try:
                raw = await asyncio.wait_for(socket.receive_text(), remaining)
            except asyncio.TimeoutError:
                # The token ran out while the socket sat idle.
                await _close_quietly(socket, WS_UNAUTHORIZED)
                break
            # Anything unparseable is treated as a keep-alive ping rather than
            # a reason to drop the connection.
            try:
                frame = json.loads(raw)
            except Exception:
                continue
            if not isinstance(frame, dict):
                continue
            action = frame.get("action")
            if action == "typing":
                conversation_id = frame.get("conversation_id")
                if isinstance(conversation_id, str) and conversation_id:
                    await _relay_typing(state, user_id, conversation_id)
                continue
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
        _unsubscribe(socket)
        # In the background: the grace period must not hold this handler open.
        _in_background(_socket_closed(user_id))


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
    # A notification quotes. "X replied: <their first line>" carries the reply
    # onto a lock screen, past every gate the reply itself sits behind - the
    # content was filtered and the notification about it was not.
    #
    # Screened before the row is built, so the stored copy and the live push
    # below carry the same text. Screening only one of them would mean the
    # socket showed what the notification list did not.
    title, body, redacted = agenotify.screen(user_id, kind, title, body)

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
    return {"id": notification.id, "unread": unread, "redacted": redacted}
