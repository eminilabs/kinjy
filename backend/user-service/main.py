"""Kinjy · user-service — profiles, follows, circles, preferences, blocks."""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timezone

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.orm import Session as OrmSession

from common import ageclient, notify
from common.auth import CurrentUser, MaybeUser
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import agediscovery
import models
import parental

AUTH_URL = "http://auth-service:8000"

log = logging.getLogger("user-service")

# Columns added to Preferences after the first deploy. create_all never
# alters an existing table, so without these the privacy work shipped a model
# the database did not have - and /internal/permissions returned 500 for every
# pair of members, which silently turned every permission check on the platform
# into "could not verify".
MIGRATIONS = [
    f"ALTER TABLE {models.SCHEMA}.preferences "
    "ADD COLUMN IF NOT EXISTS who_can_see_family VARCHAR(20) DEFAULT 'family'",
    f"ALTER TABLE {models.SCHEMA}.preferences "
    "ADD COLUMN IF NOT EXISTS family_tree_shared BOOLEAN DEFAULT TRUE",
]

app = create_app(
    name="user-service",
    schema=models.SCHEMA,
    migrations=MIGRATIONS,
    description="Profiles, follow graph, Circles, preferences.",
)


# --- schemas ---------------------------------------------------------------

class ProfileOut(BaseModel):
    user_id: str
    handle: str
    display_name: str
    bio: str | None = None
    avatar_url: str | None = None
    cover_url: str | None = None
    country: str | None = None
    city: str | None = None
    languages: str = "en"
    is_creator: bool = False
    verified: bool = False
    followers_count: int = 0
    following_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=120)
    bio: str | None = Field(default=None, max_length=2000)
    avatar_url: str | None = None
    cover_url: str | None = None
    country: str | None = Field(default=None, max_length=2)
    state: str | None = None
    city: str | None = None
    neighborhood: str | None = None
    languages: str | None = None
    lang: str | None = None


class CircleIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    kind: str = Field(default="custom", pattern="^(family|close_friends|business|customers|smart|custom)$")
    color: str | None = None
    rule: dict | None = None


class CircleOut(BaseModel):
    id: str
    owner_id: str
    name: str
    kind: str
    color: str | None
    members_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PreferencesIn(BaseModel):
    default_feed_mode: str | None = None
    algorithm_id: str | None = None
    display_mode: str | None = Field(default=None, pattern="^(cloud|light|dark|system)$")
    data_saver: bool | None = None
    reduced_motion: bool | None = None
    autoplay_media: bool | None = None
    wellbeing_enabled: bool | None = None
    daily_limit_minutes: int | None = None
    age_mode: str | None = Field(default=None, pattern="^(child|teen|adult)$")
    translation_auto: bool | None = None
    interest_topics: list[str] | None = None
    who_can_invite: str | None = Field(default=None, pattern="^(everyone|connections|nobody)$")
    who_can_message: str | None = Field(default=None, pattern="^(everyone|connections|nobody)$")
    who_can_add_family: str | None = Field(default=None, pattern="^(everyone|connections|nobody)$")
    who_can_add_community: str | None = Field(default=None, pattern="^(everyone|connections|nobody)$")
    who_can_see_family: str | None = Field(default=None, pattern="^(family|connections|everyone)$")
    family_tree_shared: bool | None = None
    discoverable: bool | None = None
    assistant_visible: bool | None = None


# --- helpers ---------------------------------------------------------------

def _ensure_profile(db: OrmSession, user_id: str) -> models.Profile:
    """Profiles are materialised on demand from auth-service so a member never
    hits a 404 on their own profile because an event was missed."""
    profile = db.get(models.Profile, user_id)
    if profile is not None:
        return profile
    try:
        response = httpx.get(f"{AUTH_URL}/internal/users/{user_id}", timeout=5)
        response.raise_for_status()
        data = response.json()
    except Exception:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile = models.Profile(
        user_id=user_id,
        handle=data["handle"],
        display_name=data["display_name"],
        country=data.get("country"),
        lang=data.get("lang", "en"),
        verified=bool(data.get("kyc_verified")),
    )
    db.add(profile)
    # Only when absent. Preferences and Profile are separate rows with separate
    # lifetimes: a member can have saved settings while their profile row was
    # never materialised, and inserting blindly then violates the primary key
    # and fails the whole request — which is how one unmaterialised author
    # blanked out every author on the page.
    if db.get(models.Preferences, user_id) is None:
        db.add(models.Preferences(user_id=user_id))
    db.commit()
    db.refresh(profile)
    return profile


# --- profiles --------------------------------------------------------------

@app.get("/users/me", response_model=ProfileOut, tags=["profiles"])
def my_profile(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    return ProfileOut.model_validate(_ensure_profile(db, principal.user_id))


@app.patch("/users/me", response_model=ProfileOut, tags=["profiles"])
def update_profile(payload: ProfileUpdate, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    profile = _ensure_profile(db, principal.user_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(profile, key, value.upper() if key == "country" else value)
    db.commit()
    db.refresh(profile)
    return ProfileOut.model_validate(profile)


# Declared before /users/{handle}: FastAPI matches in order, and the
# parameterised route would otherwise read "suggestions" as a handle.
@app.get("/users/suggestions", tags=["discovery"])
def people_suggestions(principal: CurrentUser, limit: int = 5, db: OrmSession = Depends(get_db)):
    """People worth following.

    Ranked by follower count, which is the only signal available before there is
    a real graph to mine — and stated as such in the UI rather than dressed up as
    personalisation. Anyone already followed, blocked, or blocking is excluded.

    Minors are not suggested to unrelated adults. Suggestion is where most
    unwanted contact starts, so the cheapest place to stop it is before the
    suggestion is made rather than after somebody acts on it.
    """
    following = set(
        db.scalars(select(models.Follow.followee_id).where(models.Follow.follower_id == principal.user_id)).all()
    )
    blocked = set(
        db.scalars(select(models.Block.blocked_id).where(models.Block.user_id == principal.user_id)).all()
    )
    blocking = set(
        db.scalars(select(models.Block.user_id).where(models.Block.blocked_id == principal.user_id)).all()
    )
    excluded = following | blocked | blocking | {principal.user_id}

    # Over-fetched because minors are trimmed out below for adult viewers, and a
    # page that comes back three-quarters empty is worse than one extra query.
    rows = db.scalars(
        select(models.Profile)
        .where(models.Profile.user_id.not_in(excluded) if excluded else True)
        .order_by(models.Profile.followers_count.desc(), models.Profile.created_at.desc())
        .limit(agediscovery.widened(min(limit, 20), 60))
    ).all()
    rows = agediscovery.filter_profiles(principal.user_id, list(rows), min(limit, 20))

    return {
        "reason": "most_followed",
        "items": [
            {
                "user_id": r.user_id,
                "handle": r.handle,
                "display_name": r.display_name,
                "bio": r.bio,
                "avatar_url": r.avatar_url,
                "city": r.city,
                "country": r.country,
                "followers_count": r.followers_count,
                "verified": r.verified,
            }
            for r in rows
        ],
    }


# Declared before /users/{handle} — FastAPI matches in order, and the
# parameterised route would otherwise read "search" as a handle.
@app.get("/users/search", tags=["discovery"])
def search_people(
    q: str,
    principal: CurrentUser,
    limit: int = 10,
    db: OrmSession = Depends(get_db),
):
    """Find someone by handle or name.

    Starting a conversation used to require pasting a raw ``usr_…`` id, which no
    member has and no screen shows — so the messenger was effectively unusable
    for anyone you had not already talked to.

    `discoverable` is honoured here, not just by the suggestions rail: a member
    who turned it off should not surface in a stranger's search. Blocks work in
    both directions — someone you blocked is hidden, and so is someone who
    blocked you, because appearing in their search is exactly what they refused.

    And an adult searching does not find minors at all. A teenager searching
    still finds everybody, including other teenagers: the restriction protects
    the people being listed, not the person looking.
    """
    query = q.strip().lower()
    if len(query) < 2:
        return {"items": []}

    blocked = set(
        db.scalars(select(models.Block.blocked_id).where(models.Block.user_id == principal.user_id)).all()
    )
    blocking = set(
        db.scalars(select(models.Block.user_id).where(models.Block.blocked_id == principal.user_id)).all()
    )
    excluded = blocked | blocking | {principal.user_id}

    like = f"%{query}%"
    # `discoverable` lives on Preferences, not Profile, so this is an outer join:
    # a member whose preferences row was never materialised must still be
    # findable, and an inner join would silently hide them.
    rows = db.scalars(
        select(models.Profile)
        .outerjoin(models.Preferences, models.Preferences.user_id == models.Profile.user_id)
        .where(
            or_(models.Preferences.discoverable.is_(True), models.Preferences.user_id.is_(None)),
            models.Profile.user_id.not_in(excluded),
            or_(
                func.lower(models.Profile.handle).like(like),
                func.lower(models.Profile.display_name).like(like),
            ),
        )
        .order_by(models.Profile.followers_count.desc())
        .limit(agediscovery.widened(min(limit, 25), 75))
    ).all()
    rows = agediscovery.filter_profiles(principal.user_id, list(rows), min(limit, 25))

    return {
        "items": [
            {
                "user_id": r.user_id,
                "handle": r.handle,
                "display_name": r.display_name,
                "avatar_url": r.avatar_url,
                "verified": r.verified,
                "city": r.city,
            }
            for r in rows
        ]
    }


@app.get("/users/{handle}", response_model=ProfileOut, tags=["profiles"])
def public_profile(handle: str, db: OrmSession = Depends(get_db)):
    profile = db.scalar(select(models.Profile).where(models.Profile.handle == handle.lower()))
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileOut.model_validate(profile)


# --- follow graph ----------------------------------------------------------

@app.post("/users/{user_id}/follow", status_code=201, tags=["follows"])
def follow(user_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    if user_id == principal.user_id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")
    if db.scalar(
        select(models.Block).where(
            models.Block.user_id == user_id, models.Block.blocked_id == principal.user_id
        )
    ):
        raise HTTPException(status_code=403, detail="You cannot follow this account")

    exists = db.scalar(
        select(models.Follow).where(
            models.Follow.follower_id == principal.user_id, models.Follow.followee_id == user_id
        )
    )
    if exists:
        return {"following": True, "already": True}

    db.add(models.Follow(follower_id=principal.user_id, followee_id=user_id))
    for uid, column in ((user_id, "followers_count"), (principal.user_id, "following_count")):
        profile = db.get(models.Profile, uid)
        if profile is not None:
            setattr(profile, column, getattr(profile, column) + 1)
    db.commit()

    mine = db.get(models.Profile, principal.user_id)
    notify.notify(
        user_id,
        kind="follow",
        title=f"{mine.display_name if mine else 'Someone'} started following you",
        link=f"/u/{mine.handle}" if mine else None,
    )
    return {"following": True}


@app.delete("/users/{user_id}/follow", status_code=204, tags=["follows"])
def unfollow(user_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    removed = db.execute(
        delete(models.Follow).where(
            models.Follow.follower_id == principal.user_id, models.Follow.followee_id == user_id
        )
    ).rowcount
    if removed:
        for uid, column in ((user_id, "followers_count"), (principal.user_id, "following_count")):
            profile = db.get(models.Profile, uid)
            if profile is not None:
                setattr(profile, column, max(0, getattr(profile, column) - 1))
    db.commit()


@app.get("/users/me/following", tags=["follows"])
def following(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    ids = db.scalars(
        select(models.Follow.followee_id).where(models.Follow.follower_id == principal.user_id)
    ).all()
    return {"count": len(ids), "user_ids": list(ids)}


# --- circles ---------------------------------------------------------------

@app.get("/circles", response_model=list[CircleOut], tags=["circles"])
def list_circles(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.Circle).where(models.Circle.owner_id == principal.user_id).order_by(models.Circle.created_at)
    ).all()
    return [CircleOut.model_validate(row) for row in rows]


@app.post("/circles", response_model=CircleOut, status_code=201, tags=["circles"])
def create_circle(payload: CircleIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    circle = models.Circle(
        id=new_id("cir"),
        owner_id=principal.user_id,
        name=payload.name,
        kind=payload.kind,
        color=payload.color,
        rule=json.dumps(payload.rule) if payload.rule else None,
    )
    db.add(circle)
    db.commit()
    db.refresh(circle)
    return CircleOut.model_validate(circle)


@app.post("/circles/{circle_id}/members/{member_id}", status_code=201, tags=["circles"])
def add_to_circle(circle_id: str, member_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    circle = db.get(models.Circle, circle_id)
    if circle is None or circle.owner_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Circle not found")
    if db.scalar(
        select(models.CircleMember).where(
            models.CircleMember.circle_id == circle_id, models.CircleMember.member_id == member_id
        )
    ):
        return {"added": False, "already": True}
    db.add(models.CircleMember(circle_id=circle_id, member_id=member_id))
    circle.members_count += 1
    db.commit()
    return {"added": True, "members_count": circle.members_count}


@app.delete("/circles/{circle_id}/members/{member_id}", status_code=204, tags=["circles"])
def remove_from_circle(circle_id: str, member_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    circle = db.get(models.Circle, circle_id)
    if circle is None or circle.owner_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Circle not found")
    removed = db.execute(
        delete(models.CircleMember).where(
            models.CircleMember.circle_id == circle_id, models.CircleMember.member_id == member_id
        )
    ).rowcount
    if removed:
        circle.members_count = max(0, circle.members_count - 1)
    db.commit()


@app.delete("/circles/{circle_id}", status_code=204, tags=["circles"])
def delete_circle(circle_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    circle = db.get(models.Circle, circle_id)
    if circle is None or circle.owner_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Circle not found")
    db.delete(circle)
    db.commit()


# --- preferences -----------------------------------------------------------

# ---------------------------------------------------------------------------
# Parental supervision
# ---------------------------------------------------------------------------

class SupervisionInviteIn(BaseModel):
    """Either side may start it; the other has to agree."""

    other_handle: str = Field(min_length=3, max_length=40)


class SupervisionAnswerIn(BaseModel):
    approve: bool


class TimeLimitIn(BaseModel):
    daily_limit_minutes: int | None = Field(default=None, ge=0, le=1440)


@app.get("/supervision/disclosure", tags=["supervision"])
def supervision_disclosure():
    """What a parent can and cannot see, in plain words.

    Public, and returned by the API rather than buried in a policy document,
    so neither the parent nor the teenager has to take anybody's word for what
    was agreed. Read it before inviting, read it before accepting.
    """
    return parental.disclosure()


@app.get("/supervision", tags=["supervision"])
def my_supervision(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Every supervision link this member is part of, from either side."""
    links = parental.links_for(db, principal.user_id)
    # A teenager sees their own requests and the answers, including the refusals.
    # A setting that will not move with no record of why is how a teenager learns
    # to look for a way round the product instead of asking.
    requests = db.scalars(
        select(models.SupervisionRequest)
        .where(
            or_(
                models.SupervisionRequest.teen_id == principal.user_id,
                models.SupervisionRequest.parent_id == principal.user_id,
            )
        )
        .order_by(models.SupervisionRequest.created_at.desc())
        .limit(50)
    ).all()
    return {
        "items": [parental.link_out(link, principal.user_id) for link in links],
        "requests": [
            {
                "id": r.id, "setting": r.setting, "requested_value": r.requested_value,
                "status": r.status, "created_at": r.created_at, "answered_at": r.answered_at,
                "role": "parent" if r.parent_id == principal.user_id else "teen",
            }
            for r in requests
        ],
        "disclosure": parental.disclosure(),
    }


@app.post("/supervision/invite", status_code=201, tags=["supervision"])
def invite_supervision(
    payload: SupervisionInviteIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """Invite somebody into a supervision link.

    Whoever is the minor becomes the supervised party; the ages decide the
    roles, not whoever happened to send the invitation. A parent cannot
    nominate themselves as the teenager, and a teenager inviting an adult is
    asking to be supervised rather than to supervise.
    """
    other = db.scalar(
        select(models.Profile).where(models.Profile.handle == payload.other_handle.strip().lower())
    )
    if other is None or other.user_id == principal.user_id:
        raise HTTPException(status_code=404, detail="No such member")

    me = ageclient.age_profile(principal.user_id)
    them = ageclient.age_profile(other.user_id)

    if me.is_minor and them.is_minor:
        raise HTTPException(
            status_code=400,
            detail="A supervising adult has to be an adult account.",
        )
    if not me.is_minor and not them.is_minor:
        raise HTTPException(
            status_code=400,
            detail="Supervision is for accounts under 18.",
        )

    teen_id, parent_id = (
        (principal.user_id, other.user_id) if me.is_minor else (other.user_id, principal.user_id)
    )

    if parental.active_link(db, teen_id) is not None:
        raise HTTPException(status_code=409, detail="This account already has a supervising adult.")

    existing = db.scalar(
        select(models.ParentalSupervision).where(
            models.ParentalSupervision.teen_id == teen_id,
            models.ParentalSupervision.parent_id == parent_id,
            models.ParentalSupervision.status == "invited",
        )
    )
    if existing is not None:
        return {**parental.link_out(existing, principal.user_id), "existing": True}

    link = models.ParentalSupervision(
        id=new_id("sup"), teen_id=teen_id, parent_id=parent_id,
        status="invited", invited_by=principal.user_id,
    )
    db.add(link)
    db.commit()

    other_id = teen_id if principal.user_id == parent_id else parent_id
    notify.notify(
        other_id, "supervision_invite",
        "Someone invited you to a supervision link",
        body="Read what it does and does not share before you accept.",
        link="/settings/supervision",
    )
    return {**parental.link_out(link, principal.user_id), "existing": False}


@app.post("/supervision/{link_id}/answer", tags=["supervision"])
def answer_supervision(
    link_id: str, payload: SupervisionAnswerIn, principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    """Accept or decline an invitation. Only the invited side may answer."""
    link = db.get(models.ParentalSupervision, link_id)
    if link is None or principal.user_id not in (link.teen_id, link.parent_id):
        raise HTTPException(status_code=404, detail="Not found")
    if principal.user_id == link.invited_by:
        raise HTTPException(status_code=403, detail="The other person has to answer this.")
    if link.status != "invited":
        raise HTTPException(status_code=409, detail="This invitation has already been answered.")

    link.status = "active" if payload.approve else "declined"
    if payload.approve:
        link.accepted_at = parental.now()
    db.commit()

    notify.notify(
        link.invited_by, "supervision_answer",
        "Your supervision invitation was accepted" if payload.approve
        else "Your supervision invitation was declined",
        link="/settings/supervision",
    )
    return parental.link_out(link, principal.user_id)


@app.post("/supervision/{link_id}/end", tags=["supervision"])
def end_supervision(link_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """End supervision. Either side may, and the other is told.

    The teenager can do this themselves on purpose: supervision somebody cannot
    leave is not supervision. What leaving does **not** do is unlock anything —
    the account returns to the defaults for its age, so removing a parent is
    never the way to get permissions.
    """
    link = db.get(models.ParentalSupervision, link_id)
    if link is None or principal.user_id not in (link.teen_id, link.parent_id):
        raise HTTPException(status_code=404, detail="Not found")
    if link.status not in ("invited", "active"):
        raise HTTPException(status_code=409, detail="This link has already ended.")

    link.status = "ended"
    link.ended_at = parental.now()
    link.ended_by = principal.user_id
    parental.revert_to_strictest(db, link.teen_id)
    db.commit()

    other = link.parent_id if principal.user_id == link.teen_id else link.teen_id
    notify.notify(
        other, "supervision_ended", "A supervision link has ended",
        link="/settings/supervision",
    )
    return {
        **parental.link_out(link, principal.user_id),
        "note": "Settings were returned to the defaults for this account's age group.",
    }


@app.get("/supervision/{link_id}/view", tags=["supervision"])
def supervised_view(link_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """What the parent is shown. Exactly the list in the disclosure.

    There is no endpoint here for messages, contacts, posts or searches, and
    that is the design rather than an omission: a teenager who believes their
    parent can read their private messages stops using private messages for the
    things private messages are for, including telling somebody that an adult
    is pressuring them.
    """
    link = db.get(models.ParentalSupervision, link_id)
    if link is None or link.parent_id != principal.user_id or link.status != "active":
        raise HTTPException(status_code=404, detail="Not found")

    prefs = db.get(models.Preferences, link.teen_id)
    usage = db.scalar(
        select(models.Usage).where(
            models.Usage.user_id == link.teen_id,
            models.Usage.day == date.today(),
        )
    )
    pending = db.scalars(
        select(models.SupervisionRequest).where(
            models.SupervisionRequest.supervision_id == link.id
        ).order_by(models.SupervisionRequest.created_at.desc()).limit(25)
    ).all()

    return {
        "supervision": parental.link_out(link, principal.user_id),
        "settings": {
            "who_can_message": getattr(prefs, "who_can_message", None),
            "who_can_invite": getattr(prefs, "who_can_invite", None),
            "discoverable": getattr(prefs, "discoverable", None),
            "sensitive_content": "blocked_for_this_age_group",
        },
        "time": {
            "daily_limit_minutes": link.daily_limit_minutes
            or getattr(prefs, "daily_limit_minutes", None),
            "minutes_today": getattr(usage, "minutes", 0) if usage else 0,
        },
        "requests": [
            {
                "id": r.id, "setting": r.setting, "requested_value": r.requested_value,
                "status": r.status, "created_at": r.created_at,
            }
            for r in pending
        ],
        "not_included": parental.CANNOT_SEE,
    }


@app.post("/supervision/{link_id}/time-limit", tags=["supervision"])
def set_time_limit(
    link_id: str, payload: TimeLimitIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """The one setting a parent may change directly."""
    link = db.get(models.ParentalSupervision, link_id)
    if link is None or link.parent_id != principal.user_id or link.status != "active":
        raise HTTPException(status_code=404, detail="Not found")
    link.daily_limit_minutes = payload.daily_limit_minutes
    prefs = db.get(models.Preferences, link.teen_id)
    if prefs is not None:
        prefs.daily_limit_minutes = payload.daily_limit_minutes
    db.commit()
    notify.notify(
        link.teen_id, "supervision_time_limit",
        "Your daily time limit was changed",
        link="/settings/supervision",
    )
    return {"daily_limit_minutes": link.daily_limit_minutes}


@app.post("/supervision/requests/{request_id}", tags=["supervision"])
def answer_request(
    request_id: str, payload: SupervisionAnswerIn, principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    """A parent answering a request to loosen a safety setting."""
    request = db.get(models.SupervisionRequest, request_id)
    if request is None or request.parent_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Not found")
    if request.status != "pending":
        raise HTTPException(status_code=409, detail="This has already been answered.")

    request.status = "approved" if payload.approve else "declined"
    request.answered_at = parental.now()

    if payload.approve:
        prefs = db.get(models.Preferences, request.teen_id)
        if prefs is not None and hasattr(prefs, request.setting):
            value = request.requested_value
            if value in ("True", "False"):
                value = value == "True"
            setattr(prefs, request.setting, value)
    db.commit()

    notify.notify(
        request.teen_id, "supervision_request_answered",
        "Your request was approved" if payload.approve else "Your request was declined",
        link="/settings/supervision",
    )
    return {"id": request.id, "status": request.status}


@app.get("/preferences", tags=["preferences"])
def get_preferences(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    prefs = db.get(models.Preferences, principal.user_id)
    if prefs is None:
        prefs = models.Preferences(user_id=principal.user_id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return _prefs_out(prefs)


def _prefs_out(prefs: models.Preferences) -> dict:
    data = {c.name: getattr(prefs, c.name) for c in models.Preferences.__table__.columns}
    # Sent as a list because that is what it is; the csv is a storage detail.
    data["interest_topics"] = [t for t in (prefs.interest_topics or "").split(",") if t]
    return data


@app.patch("/preferences", tags=["preferences"])
def set_preferences(payload: PreferencesIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    prefs = db.get(models.Preferences, principal.user_id)
    if prefs is None:
        prefs = models.Preferences(user_id=principal.user_id)
        db.add(prefs)
    # A supervised younger teen may always make their own account *stricter*
    # without asking. Loosening a safety setting goes to their parent instead
    # of being applied — and it is recorded either way, so the teenager can see
    # what was refused rather than finding a setting that will not move.
    held: list[dict] = []

    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is None:
            continue
        refused = parental.refusal(db, principal.user_id, key, value)
        if refused:
            raise HTTPException(status_code=403, detail=refused)
        if parental.needs_approval(db, principal.user_id, key, value):
            link = parental.active_link(db, principal.user_id)
            request = parental.open_request(db, link, key, value)
            held.append({"setting": key, "requested_value": str(value), "request_id": request.id})
            notify.notify(
                link.parent_id, "supervision_request",
                "A setting change is waiting for you",
                link="/settings/supervision",
            )
            continue
        if key == "interest_topics":
            # Stored as csv, normalised the same way post topics are, so a
            # declared interest and a hashtag on a post compare as equal.
            value = ",".join(
                sorted({t.strip().lower() for t in value if t.strip()})
            ) or None
        setattr(prefs, key, value)
    db.commit()
    db.refresh(prefs)
    out = _prefs_out(prefs)
    if held:
        out["awaiting_approval"] = held
        out["note"] = "Some changes need approval from the adult supervising this account."
    return out


# --- blocks ----------------------------------------------------------------

@app.post("/users/{user_id}/block", status_code=201, tags=["safety"])
def block(user_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    if user_id == principal.user_id:
        raise HTTPException(status_code=400, detail="You cannot block yourself")
    if not db.scalar(
        select(models.Block).where(
            models.Block.user_id == principal.user_id, models.Block.blocked_id == user_id
        )
    ):
        db.add(models.Block(user_id=principal.user_id, blocked_id=user_id))
    # Blocking severs the follow relation in both directions.
    db.execute(
        delete(models.Follow).where(
            ((models.Follow.follower_id == principal.user_id) & (models.Follow.followee_id == user_id))
            | ((models.Follow.follower_id == user_id) & (models.Follow.followee_id == principal.user_id))
        )
    )
    db.commit()
    return {"blocked": True}


@app.delete("/users/{user_id}/block", status_code=204, tags=["safety"])
def unblock(user_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    db.execute(
        delete(models.Block).where(
            models.Block.user_id == principal.user_id, models.Block.blocked_id == user_id
        )
    )
    db.commit()


# --- internal --------------------------------------------------------------

@app.get("/internal/preferences/{user_id}", tags=["internal"])
def internal_preferences(user_id: str, db: OrmSession = Depends(get_db)):
    """The settings other services need to honour.

    Enforcement lives with whoever serves the content — a feed that ignores
    `age_mode` is not made safe by a client that hides what it was sent.
    """
    prefs = _prefs(db, user_id)
    return {
        "age_mode": prefs.age_mode,
        "data_saver": prefs.data_saver,
        "autoplay_media": prefs.autoplay_media,
        "reduced_motion": prefs.reduced_motion,
        "wellbeing_enabled": prefs.wellbeing_enabled,
        "daily_limit_minutes": prefs.daily_limit_minutes,
        "translation_auto": prefs.translation_auto,
        "who_can_see_family": prefs.who_can_see_family,
        "family_tree_shared": prefs.family_tree_shared,
        # The feed ranker reads these to score a post up, and to open on the
        # mode and algorithm the member actually chose.
        "interest_topics": [t for t in (prefs.interest_topics or "").split(",") if t],
        "default_feed_mode": prefs.default_feed_mode,
        "algorithm_id": prefs.algorithm_id,
    }


# --- wellbeing --------------------------------------------------------------

class HeartbeatIn(BaseModel):
    """Minutes of *active* use since the last beat, clamped by the server."""

    minutes: float = Field(default=1.0, ge=0, le=10)


# The client beats once a minute while the tab is visible; the ceiling for a
# beat with nothing to compare against.
BEAT_MINUTES = 1.0


@app.post("/wellbeing/heartbeat", tags=["wellbeing"])
def wellbeing_heartbeat(payload: HeartbeatIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Count time against the member's daily limit.

    Kept server-side so the limit survives a reload, a second tab and a new
    device — a counter in localStorage is undone by anything that clears it,
    which makes the limit a suggestion rather than a limit.

    The increment is clamped: a client claiming 600 minutes in one beat cannot
    burn the day's allowance, and one claiming 0 cannot stop the clock, because
    the server also refuses beats that arrive faster than they could be real.
    """
    prefs = _prefs(db, principal.user_id)
    today = datetime.now(timezone.utc).date()
    row = db.get(models.Usage, (principal.user_id, today))
    if row is None:
        row = models.Usage(user_id=principal.user_id, day=today, minutes=0.0)
        db.add(row)

    now = datetime.now(timezone.utc)
    if row.last_beat_at is not None:
        elapsed = (now - row.last_beat_at).total_seconds() / 60
        # Never credit more time than has actually passed since the last beat.
        payload.minutes = min(payload.minutes, max(0.0, elapsed))
    else:
        # First beat of the day has nothing to measure against, so cap it at one
        # beat interval. Otherwise a client could open the tab and immediately
        # claim the whole allowance — or claim it was never used.
        payload.minutes = min(payload.minutes, BEAT_MINUTES)

    row.minutes = float(row.minutes) + payload.minutes
    row.last_beat_at = now
    db.commit()

    limit = prefs.daily_limit_minutes
    over = bool(prefs.wellbeing_enabled and limit and row.minutes >= limit)
    return {
        "enabled": prefs.wellbeing_enabled,
        "minutes_today": round(row.minutes, 1),
        "limit_minutes": limit,
        "remaining_minutes": round(max(0.0, limit - row.minutes), 1) if limit else None,
        "over_limit": over,
    }


@app.get("/wellbeing", tags=["wellbeing"])
def wellbeing_status(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    prefs = _prefs(db, principal.user_id)
    today = datetime.now(timezone.utc).date()
    row = db.get(models.Usage, (principal.user_id, today))
    minutes = float(row.minutes) if row else 0.0
    limit = prefs.daily_limit_minutes
    return {
        "enabled": prefs.wellbeing_enabled,
        "minutes_today": round(minutes, 1),
        "limit_minutes": limit,
        "remaining_minutes": round(max(0.0, limit - minutes), 1) if limit else None,
        "over_limit": bool(prefs.wellbeing_enabled and limit and minutes >= limit),
    }


@app.get("/internal/audience/{user_id}", tags=["internal"])
def audience(user_id: str, db: OrmSession = Depends(get_db)):
    """Who this member's content may reach — used by social-service to build feeds."""
    followers = db.scalars(select(models.Follow.follower_id).where(models.Follow.followee_id == user_id)).all()
    circles = db.scalars(select(models.Circle.id).where(models.Circle.owner_id == user_id)).all()
    blocked = db.scalars(select(models.Block.blocked_id).where(models.Block.user_id == user_id)).all()
    return {"followers": list(followers), "circles": list(circles), "blocked": list(blocked)}


# --- connections ------------------------------------------------------------

PRIVACY_CHOICES = ("everyone", "connections", "nobody")


class ConnectIn(BaseModel):
    message: str | None = Field(default=None, max_length=500)


def _connection_between(db: OrmSession, a: str, b: str) -> models.Connection | None:
    """The row for this pair, whichever way round it was created."""
    return db.scalar(
        select(models.Connection).where(
            or_(
                and_(models.Connection.requester_id == a, models.Connection.addressee_id == b),
                and_(models.Connection.requester_id == b, models.Connection.addressee_id == a),
            )
        )
    )


def _prefs(db: OrmSession, user_id: str) -> models.Preferences:
    prefs = db.get(models.Preferences, user_id)
    if prefs is None:
        prefs = models.Preferences(user_id=user_id)
        db.add(prefs)
        db.commit()
    return prefs


def _allowed(setting: str, connected: bool) -> bool:
    if setting == "everyone":
        return True
    if setting == "connections":
        return connected
    return False


@app.post("/connections/{user_id}", status_code=201, tags=["connections"])
def send_invitation(
    user_id: str, payload: ConnectIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """Ask to connect. The other person decides."""
    if user_id == principal.user_id:
        raise HTTPException(status_code=400, detail="You cannot connect with yourself")

    if db.scalar(
        select(models.Block).where(
            or_(
                and_(models.Block.user_id == user_id, models.Block.blocked_id == principal.user_id),
                and_(models.Block.user_id == principal.user_id, models.Block.blocked_id == user_id),
            )
        )
    ):
        raise HTTPException(status_code=403, detail="You cannot invite this member")

    # The addressee's setting decides whether the invitation may even be sent.
    if not _allowed(_prefs(db, user_id).who_can_invite, connected=False):
        raise HTTPException(
            status_code=403, detail="This member is not accepting connection invitations"
        )

    existing = _connection_between(db, principal.user_id, user_id)
    if existing:
        if existing.status == "accepted":
            return {"status": "accepted", "already": True}
        if existing.status == "pending":
            # They already invited us — accepting is the obvious intent.
            if existing.addressee_id == principal.user_id:
                existing.status = "accepted"
                existing.responded_at = datetime.now(timezone.utc)
                db.commit()
                return {"status": "accepted", "note": "They had already invited you."}
            return {"status": "pending", "already": True}
        # A previous decline can be retried.
        existing.requester_id = principal.user_id
        existing.addressee_id = user_id
        existing.status = "pending"
        existing.message = payload.message
        existing.responded_at = None
        db.commit()
        return {"status": "pending"}

    db.add(
        models.Connection(
            requester_id=principal.user_id, addressee_id=user_id, message=payload.message
        )
    )
    db.commit()

    mine = db.get(models.Profile, principal.user_id)
    notify.notify(
        user_id,
        kind="invitation",
        title=f"{mine.display_name if mine else 'Someone'} wants to connect",
        body=payload.message,
        link="/dashboard?tab=privacy",
    )
    return {"status": "pending"}


@app.get("/connections", tags=["connections"])
def list_connections(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.Connection).where(
            or_(
                models.Connection.requester_id == principal.user_id,
                models.Connection.addressee_id == principal.user_id,
            )
        )
    ).all()

    ids = {r.requester_id for r in rows} | {r.addressee_id for r in rows}
    profiles = {
        p.user_id: {"handle": p.handle, "display_name": p.display_name, "avatar_url": p.avatar_url}
        for p in db.scalars(select(models.Profile).where(models.Profile.user_id.in_(ids))).all()
    }

    def shape(row: models.Connection, other: str) -> dict:
        return {
            "id": row.id,
            "user_id": other,
            "profile": profiles.get(other),
            "status": row.status,
            "message": row.message,
            "created_at": row.created_at,
        }

    return {
        "incoming": [
            shape(r, r.requester_id)
            for r in rows
            if r.status == "pending" and r.addressee_id == principal.user_id
        ],
        "outgoing": [
            shape(r, r.addressee_id)
            for r in rows
            if r.status == "pending" and r.requester_id == principal.user_id
        ],
        "accepted": [
            shape(r, r.addressee_id if r.requester_id == principal.user_id else r.requester_id)
            for r in rows
            if r.status == "accepted"
        ],
    }


@app.post("/connections/{user_id}/respond", tags=["connections"])
def respond(user_id: str, accept: bool, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    row = _connection_between(db, principal.user_id, user_id)
    # Only the person who was invited may answer.
    if row is None or row.status != "pending" or row.addressee_id != principal.user_id:
        raise HTTPException(status_code=404, detail="No invitation to answer")
    row.status = "accepted" if accept else "declined"
    row.responded_at = datetime.now(timezone.utc)
    db.commit()

    # Only an acceptance is announced. Telling someone they were declined
    # serves nobody, and the blueprint's connection model is opt-in on both
    # sides — a refusal is allowed to be quiet.
    if accept:
        mine = db.get(models.Profile, principal.user_id)
        notify.notify(
            row.requester_id,
            kind="connection_accepted",
            title=f"{mine.display_name if mine else 'Someone'} accepted your invitation",
            body="You can now message each other.",
            link=f"/u/{mine.handle}" if mine else "/messages",
        )
    return {"status": row.status}


@app.delete("/connections/{user_id}", status_code=204, tags=["connections"])
def disconnect(user_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    row = _connection_between(db, principal.user_id, user_id)
    if row is not None:
        db.delete(row)
        db.commit()


@app.get("/internal/permissions/{actor_id}/{target_id}", tags=["internal"])
def permissions(actor_id: str, target_id: str, db: OrmSession = Depends(get_db)):
    """What ``actor`` may do to ``target``.

    The single place those rules live. messaging-service, family-service and
    community-service ask here rather than each re-deriving "are they
    connected?" — three copies of that logic would drift, and the one that
    drifts is the one that leaks.
    """
    if actor_id == target_id:
        return {
            "connected": True, "can_message": True, "can_add_family": True,
            "can_add_community": True, "can_invite": False, "reason": "self",
        }

    blocked = db.scalar(
        select(models.Block).where(
            or_(
                and_(models.Block.user_id == target_id, models.Block.blocked_id == actor_id),
                and_(models.Block.user_id == actor_id, models.Block.blocked_id == target_id),
            )
        )
    )
    if blocked:
        return {
            "connected": False, "can_message": False, "can_add_family": False,
            "can_add_community": False, "can_invite": False, "reason": "blocked",
        }

    row = _connection_between(db, actor_id, target_id)
    connected = row is not None and row.status == "accepted"
    prefs = _prefs(db, target_id)

    return {
        "connected": connected,
        "pending": row.status == "pending" if row else False,
        "invited_by_me": bool(row and row.requester_id == actor_id and row.status == "pending"),
        "can_message": _allowed(prefs.who_can_message, connected),
        "can_add_family": _allowed(prefs.who_can_add_family, connected),
        "can_add_community": _allowed(prefs.who_can_add_community, connected),
        "can_invite": not row and _allowed(prefs.who_can_invite, False),
        "reason": "connected" if connected else "not_connected",
    }


@app.get("/connections/with/{user_id}", tags=["connections"])
def my_permissions(user_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """The same answer, for the signed-in member's own UI."""
    return permissions(principal.user_id, user_id, db)


class ProfileIds(BaseModel):
    ids: list[str] = Field(default_factory=list, max_length=300)


class ProfileSeed(BaseModel):
    user_id: str
    handle: str
    display_name: str
    country: str | None = None
    lang: str = "en"
    verified: bool = False


@app.post("/internal/profiles/seed", tags=["internal"])
def seed_profile(payload: ProfileSeed, db: OrmSession = Depends(get_db)):
    """Create a profile from data the caller already has.

    auth-service calls this the moment an account exists. It **pushes** the
    fields rather than asking us to fetch them, because the pull version
    deadlocks: user-service would call back into auth-service while auth-service
    is still inside the registration request, and a single-worker service then
    waits on itself until the timeout.
    """
    if db.get(models.Profile, payload.user_id) is not None:
        return {"created": False}
    db.add(
        models.Profile(
            user_id=payload.user_id,
            handle=payload.handle,
            display_name=payload.display_name,
            country=payload.country,
            lang=payload.lang,
            verified=payload.verified,
        )
    )
    if db.get(models.Preferences, payload.user_id) is None:
        db.add(models.Preferences(user_id=payload.user_id))
    db.commit()
    return {"created": True}


@app.post("/internal/profiles", tags=["internal"])
def profiles_by_id(payload: ProfileIds, db: OrmSession = Depends(get_db)):
    """Resolve many ids at once.

    Comment threads need a handle per author; asking for them one by one would
    be a request per row.
    """
    if not payload.ids:
        return {"profiles": {}}
    rows = db.scalars(select(models.Profile).where(models.Profile.user_id.in_(payload.ids))).all()

    # Profiles are materialised lazily, and only by the member's *own* request.
    # An author who had not yet opened their profile therefore resolved to
    # nothing here, and every surface showing their content — the feed, comment
    # threads, the shorts reel — fell back to a raw `usr_…` id and a blank
    # avatar. Materialising on read fixes all of them at once.
    missing = set(payload.ids) - {r.user_id for r in rows}
    for user_id in missing:
        try:
            rows = [*rows, _ensure_profile(db, user_id)]
        except HTTPException:
            # No such account upstream: skip it rather than fail the whole batch,
            # which would blank out every other author on the page.
            log.warning("could not materialise profile for %s", user_id)
    return {
        "profiles": {
            r.user_id: {
                "handle": r.handle,
                "display_name": r.display_name,
                "avatar_url": r.avatar_url,
                "verified": r.verified,
            }
            for r in rows
        }
    }


@app.get("/internal/stats", tags=["internal"])
def stats(db: OrmSession = Depends(get_db)):
    return {
        "profiles": db.scalar(select(func.count()).select_from(models.Profile)) or 0,
        "follows": db.scalar(select(func.count()).select_from(models.Follow)) or 0,
        "circles": db.scalar(select(func.count()).select_from(models.Circle)) or 0,
    }
