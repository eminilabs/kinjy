from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from common.database import Base
from common.ids import new_id

SCHEMA = "social"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (
        Index("ix_post_author_created", "author_id", "created_at"),
        Index("ix_post_geo", "country", "city"),
        {"schema": SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("pst"))
    author_id: Mapped[str] = mapped_column(String(40), index=True)
    body: Mapped[str] = mapped_column(Text, default="")
    lang: Mapped[str] = mapped_column(String(5), default="en")
    format: Mapped[str] = mapped_column(String(20), default="text")  # text|image|video|audio|article|carousel

    # Audience (blueprint module D): public, a named circle, or followers only.
    visibility: Mapped[str] = mapped_column(String(20), default="public")  # public|followers|circle|community
    circle_id: Mapped[str | None] = mapped_column(String(40), index=True)
    community_id: Mapped[str | None] = mapped_column(String(40), index=True)

    # Geographic discovery ladder.
    country: Mapped[str | None] = mapped_column(String(2))
    city: Mapped[str | None] = mapped_column(String(120))
    neighborhood: Mapped[str | None] = mapped_column(String(120))

    topics: Mapped[str | None] = mapped_column(String(255))  # csv

    # Provenance labels (blueprint §17). Never inferred silently — the composer
    # sets it and edits bump it.
    provenance: Mapped[str] = mapped_column(String(20), default="original")
    # Declared by the author, like provenance. The platform cannot reliably
    # classify maturity from pixels or prose, so it asks rather than guesses —
    # and age_mode filters on the answer.
    mature: Mapped[bool] = mapped_column(Boolean, default=False)
    # original|edited|ai_assisted|ai_generated|verified_source
    c2pa_manifest: Mapped[str | None] = mapped_column(Text)

    # A repost is a post in its own right — it has its own author, timestamp
    # and audience, and a quote repost has its own body. Modelling it as a
    # separate table would have meant two things to merge in every feed query.
    repost_of: Mapped[str | None] = mapped_column(String(40), index=True)

    series_id: Mapped[str | None] = mapped_column(String(40), index=True)
    episode_number: Mapped[int | None] = mapped_column(Integer)

    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    comments_count: Mapped[int] = mapped_column(Integer, default=0)
    reposts_count: Mapped[int] = mapped_column(Integer, default=0)
    views_count: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[str] = mapped_column(String(20), default="published")  # draft|published|hidden|removed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PostMedia(Base):
    __tablename__ = "post_media"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[str] = mapped_column(ForeignKey(f"{SCHEMA}.posts.id", ondelete="CASCADE"), index=True)
    media_id: Mapped[str] = mapped_column(String(40))
    url: Mapped[str] = mapped_column(String(500))
    kind: Mapped[str] = mapped_column(String(20))
    alt_text: Mapped[str | None] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(Integer, default=0)
    # Measured by the client from the file it just picked, because the server
    # would need ffprobe to learn the same thing. The player uses them to frame
    # a clip without a layout jump, and the shorts feed uses the ratio to tell a
    # portrait clip from a landscape one.
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    duration_seconds: Mapped[float | None] = mapped_column(Float)


class PostView(Base):
    """One row per member per post.

    Counted once and only once: a views figure that climbed every time a card
    scrolled past would measure scrolling, not reading. Signed-out views are
    not recorded — there is no one to deduplicate against, and inventing a
    per-session identity to inflate the number would be the same lie.
    """

    __tablename__ = "post_views"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_view"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[str] = mapped_column(String(40), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_reaction"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[str] = mapped_column(String(40), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="like")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("cmt"))
    post_id: Mapped[str] = mapped_column(String(40), index=True)
    author_id: Mapped[str] = mapped_column(String(40), index=True)
    parent_id: Mapped[str | None] = mapped_column(String(40))
    # Nesting is capped at MAX_COMMENT_DEPTH; deeper replies re-attach to the
    # deepest allowed ancestor and name their addressee instead of indenting
    # further, so a long exchange stays readable at any width.
    depth: Mapped[int] = mapped_column(Integer, default=0)
    reply_to: Mapped[str | None] = mapped_column(String(40))
    body: Mapped[str] = mapped_column(Text)
    lang: Mapped[str] = mapped_column(String(5), default="en")
    status: Mapped[str] = mapped_column(String(20), default="published")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class FeedSignal(Base):
    """Explicit user control over ranking (blueprint §1).

    "Show less like this" is a stored, honoured signal — not a hint the ranker
    may ignore. That is the whole point of the user-controlled algorithm.
    """

    __tablename__ = "feed_signals"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    kind: Mapped[str] = mapped_column(String(30))  # less_like_this|more_like_this|mute_topic|mute_author
    target_type: Mapped[str] = mapped_column(String(20))  # post|author|topic
    target_id: Mapped[str] = mapped_column(String(80))
    weight: Mapped[float] = mapped_column(Float, default=-1.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Algorithm(Base):
    """The Algorithm Marketplace (blueprint §2). Built-ins are seeded at boot;
    developers publish their own through the developer platform."""

    __tablename__ = "algorithms"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    author_id: Mapped[str | None] = mapped_column(String(40))
    builtin: Mapped[bool] = mapped_column(Boolean, default=False)
    # Ranking weights, applied transparently so "Why am I seeing this?" can
    # quote the actual reason rather than a generated excuse.
    weight_recency: Mapped[float] = mapped_column(Float, default=1.0)
    weight_affinity: Mapped[float] = mapped_column(Float, default=0.0)
    weight_engagement: Mapped[float] = mapped_column(Float, default=0.0)
    weight_locality: Mapped[float] = mapped_column(Float, default=0.0)
    weight_family: Mapped[float] = mapped_column(Float, default=0.0)
    weight_new_creator: Mapped[float] = mapped_column(Float, default=0.0)
    topic_filter: Mapped[str | None] = mapped_column(String(255))
    format_filter: Mapped[str | None] = mapped_column(String(60))
    installs: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


BUILTIN_ALGORITHMS = [
    dict(id="chronological", name="Chronological", description="Strict reverse-chronological. No ranking at all.", weight_recency=1.0),
    dict(id="friends_first", name="Friends First", description="People you follow, newest first.", weight_recency=0.7, weight_affinity=1.0),
    dict(id="family_first", name="Family First", description="Family circle above everything else.", weight_recency=0.5, weight_family=1.5),
    dict(id="local_news", name="Local News", description="Your city and neighborhood first.", weight_recency=0.6, weight_locality=1.5),
    dict(id="business", name="Business", description="Business and professional topics.", weight_recency=0.5, weight_engagement=0.6, topic_filter="business,finance,entrepreneurship"),
    dict(id="technology", name="Technology", description="Technology and AI topics.", weight_recency=0.5, weight_engagement=0.6, topic_filter="technology,ai,science"),
    dict(id="entertainment", name="Entertainment", description="Music, film, sport, culture.", weight_recency=0.5, weight_engagement=0.8, topic_filter="entertainment,music,sport"),
    dict(id="learning", name="Learning", description="Education and long-form explanation.", weight_recency=0.3, weight_engagement=0.4, topic_filter="education,learning,howto"),
    dict(id="positive", name="Positive Content", description="Filters out content flagged as distressing.", weight_recency=0.6, weight_engagement=0.3),
    dict(id="long_form", name="Long-form", description="Articles and long videos only.", weight_recency=0.5, format_filter="article,video"),
    dict(id="video_only", name="Video Only", description="Video posts only.", weight_recency=0.7, format_filter="video"),
    dict(id="audio_only", name="Audio Only", description="Audio posts and podcasts only.", weight_recency=0.7, format_filter="audio"),
    dict(id="new_creators", name="New Creators", description="Boosts creators you have never seen.", weight_recency=0.6, weight_new_creator=1.5),
    dict(id="global_discovery", name="Global Discovery", description="Content from outside your country.", weight_recency=0.5, weight_locality=-1.0),
]


class ContentSafetyClassification(Base):
    """How suitable one post is, graded per category rather than flagged.

    This replaces the single boolean that used to carry the whole decision.
    One flag cannot tell a beach photograph from pornography, or a news report
    of a war from gore posted for its own sake, and a platform that grades them
    alike gets both decisions wrong - it hides journalism from adults and shows
    children the other thing.

    ``age_rating`` is the summary the fast path reads; the levels are what a
    reviewer, an appeal and a per-tier ceiling actually work from.
    """

    __tablename__ = "content_safety"
    __table_args__ = (
        Index("ix_content_safety_rating", "age_rating"),
        Index("ix_content_safety_review", "human_review_status"),
        UniqueConstraint("content_id", name="uq_content_safety_content"),
        {"schema": SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("csc"))
    content_id: Mapped[str] = mapped_column(String(40), index=True)
    content_kind: Mapped[str] = mapped_column(String(20), default="post")  # post|media|comment|short

    # GENERAL | TEEN_13_PLUS | TEEN_16_PLUS | ADULT_18_PLUS | PROHIBITED | UNCLASSIFIED
    age_rating: Mapped[str] = mapped_column(String(20), default="UNCLASSIFIED")

    # 0 none .. 3 extreme
    sexual_content_level: Mapped[int] = mapped_column(Integer, default=0)
    nudity_level: Mapped[int] = mapped_column(Integer, default=0)
    violence_level: Mapped[int] = mapped_column(Integer, default=0)
    graphic_content_level: Mapped[int] = mapped_column(Integer, default=0)
    drugs_level: Mapped[int] = mapped_column(Integer, default=0)
    alcohol_level: Mapped[int] = mapped_column(Integer, default=0)
    gambling_level: Mapped[int] = mapped_column(Integer, default=0)
    dangerous_activity_level: Mapped[int] = mapped_column(Integer, default=0)
    self_harm_risk: Mapped[int] = mapped_column(Integer, default=0)
    hate_or_abuse_risk: Mapped[int] = mapped_column(Integer, default=0)
    # Anything above 1 here stops the content reaching anybody, at any age, and
    # routes it to the child-safety escalation rather than ordinary moderation.
    exploitation_risk: Mapped[int] = mapped_column(Integer, default=0)

    classifier_source: Mapped[str] = mapped_column(String(60), default="")
    classifier_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    human_review_status: Mapped[str] = mapped_column(String(20), default="none")
    # {"DE": "ADULT_18_PLUS"} - may only ever tighten, never loosen.
    jurisdiction_overrides: Mapped[str] = mapped_column(Text, default="{}")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
