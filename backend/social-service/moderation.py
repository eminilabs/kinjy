"""Reports, the decisions they feed, and appeals against those decisions.

Three things that only make sense together.

**Reports** are evidence. Enough of them pull a permissive rating back behind
an age wall pending review; none of them can release anything. That asymmetry
is the whole defence against brigading, and it is `reclassify_on_report`'s
contract, written months ago and until now never called by anything.

**Decisions** are the record. Every restriction is written down — what was
restricted, whose it was, what rating caused it, and who decided. Before this,
a refused comment was rolled back entire: the comment, its classification, all
of it, leaving the author with "contact support" about something that no longer
existed anywhere in the system. You cannot appeal against nothing, and a
platform that does not keep its own refusals cannot measure how often it is
wrong.

**Appeals** are the correction. Four rules do the work:

1. *Only the person restricted may appeal*, and only once per decision.
2. *Whoever made the decision may not decide the appeal.* For an automatic
   decision that means any human; for a human's decision it means a different
   human. An appeal reviewed by its own author is a rubber stamp with extra
   steps.
3. *Child-safety escalations are not appealable here.* They are not a harsher
   tier of ordinary moderation — they leave this system entirely, and an appeals
   queue is not where that material should be re-read by general staff.
4. *Overturning is authoritative.* It writes the human review fields, so the
   next classifier pass cannot quietly re-impose the decision that was just
   found to be wrong.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from common import classifier
from common.ids import new_id

import models

log = logging.getLogger("social-service.moderation")

# How long an appeal may sit before it is late. Not a hard limit — nothing
# auto-grants — but overdue appeals sort to the front of the queue and are
# counted, because the failure mode of an appeals process is not wrong answers,
# it is no answer.
APPEAL_SLA = timedelta(days=3)

REPORT_REASONS = frozenset({
    "sexual", "violence", "hate", "self_harm", "child_safety", "spam", "other",
})

# Reasons that are not an ordinary content complaint. These are routed the
# moment they arrive rather than waiting for a third report.
URGENT_REASONS = frozenset({"child_safety", "self_harm"})


def now() -> datetime:
    return datetime.now(timezone.utc)


def _classification(db: OrmSession, content_id: str):
    return db.scalar(
        select(models.ContentSafetyClassification).where(
            models.ContentSafetyClassification.content_id == content_id
        )
    )


# ---------------------------------------------------------------------------
# Decisions
# ---------------------------------------------------------------------------

def record_decision(
    db: OrmSession,
    *,
    subject_id: str,
    content_id: str,
    content_kind: str,
    action: str,
    age_rating: str,
    decided_by: str = "automatic",
    body_snapshot: str | None = None,
    appealable: bool = True,
) -> models.ModerationDecision:
    """Write down a restriction so it can be seen, appealed and counted.

    `body_snapshot` is what makes a refused comment reviewable at all, since
    the comment itself was never stored. It is dropped when the decision is not
    appealable, which in practice means a child-safety escalation: that text
    does not belong in a table ordinary reviewers read, and there is no appeal
    path for it here regardless.
    """
    decision = models.ModerationDecision(
        id=new_id("mdc"),
        subject_id=subject_id,
        content_id=content_id,
        content_kind=content_kind,
        action=action,
        age_rating=age_rating,
        decided_by=decided_by,
        body_snapshot=body_snapshot if appealable else None,
        appealable=appealable,
    )
    db.add(decision)
    return decision


def decisions_for(db: OrmSession, subject_id: str, limit: int = 50) -> list:
    return list(
        db.scalars(
            select(models.ModerationDecision)
            .where(models.ModerationDecision.subject_id == subject_id)
            .order_by(models.ModerationDecision.created_at.desc())
            .limit(min(limit, 200))
        ).all()
    )


def decision_out(decision: models.ModerationDecision, appeal=None) -> dict:
    return {
        "id": decision.id,
        "content_id": decision.content_id,
        "content_kind": decision.content_kind,
        "action": decision.action,
        "age_rating": decision.age_rating,
        "decided_by": "automatic" if decision.decided_by == "automatic" else "a reviewer",
        "appealable": decision.appealable,
        "created_at": decision.created_at,
        "appeal": None if appeal is None else {
            "id": appeal.id,
            "status": appeal.status,
            "created_at": appeal.created_at,
            "answered_at": appeal.answered_at,
            "reviewer_note": appeal.reviewer_note,
        },
    }


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

def file_report(
    db: OrmSession,
    *,
    content_id: str,
    content_kind: str,
    reporter_id: str,
    author_id: str | None,
    reason: str,
    note: str | None,
) -> dict:
    """Record a report and apply what reports are allowed to do.

    Returns what happened, but says nothing to the reporter about the outcome
    beyond "received". Telling a reporter that their report did or did not move
    a rating turns reporting into a probe: report, watch the answer, learn the
    threshold, organise around it.
    """
    if reason not in REPORT_REASONS:
        reason = "other"

    existing = db.scalar(
        select(models.ContentReport).where(
            models.ContentReport.content_id == content_id,
            models.ContentReport.reporter_id == reporter_id,
        )
    )
    if existing is None:
        db.add(models.ContentReport(
            id=new_id("rpt"), content_id=content_id, content_kind=content_kind,
            reporter_id=reporter_id, reason=reason, note=(note or None),
        ))
        db.flush()

    # The author's own report is filed but never counted towards a restriction:
    # otherwise "report your own post three times" is a way to force a review
    # queue, and a bored account can fill the queue on its own.
    count = db.scalar(
        select(func.count()).select_from(models.ContentReport).where(
            models.ContentReport.content_id == content_id,
            models.ContentReport.reporter_id != (author_id or ""),
        )
    ) or 0

    urgent = reason in URGENT_REASONS
    row = _classification(db, content_id)
    raised = False

    if row is not None:
        # A human has already looked at this. Reports do not overrule them —
        # if they did, enough reports would undo any review, which is the same
        # brigading problem one step further along.
        if row.human_review_status == "confirmed":
            log.info("reports on %s left alone: already reviewed by a human", content_id)
        else:
            new_rating = classifier.reclassify_on_report(row.age_rating, count)
            if new_rating is not None and new_rating != row.age_rating:
                row.age_rating = new_rating
                row.human_review_status = "pending"
                row.classifier_source = "reports"
                raised = True
                if author_id:
                    record_decision(
                        db, subject_id=author_id, content_id=content_id,
                        content_kind=content_kind, action="restricted_by_reports",
                        age_rating=new_rating,
                    )
            elif urgent and row.human_review_status != "pending":
                # One credible child-safety or self-harm report is enough to
                # get a human to look, even though it is not enough to change
                # a rating. Waiting for a third report here would be absurd.
                row.human_review_status = "pending"

    if urgent:
        log.error(
            "urgent report (%s) on %s by %s — routed for immediate review",
            reason, content_id, reporter_id,
        )

    db.commit()
    return {"recorded": True, "urgent": urgent, "count": count, "raised": raised}


# ---------------------------------------------------------------------------
# Appeals
# ---------------------------------------------------------------------------

def open_appeal(
    db: OrmSession, decision: models.ModerationDecision, appellant_id: str, grounds: str | None
) -> models.ModerationAppeal:
    appeal = models.ModerationAppeal(
        id=new_id("apl"),
        decision_id=decision.id,
        appellant_id=appellant_id,
        grounds=(grounds or None),
        due_at=now() + APPEAL_SLA,
    )
    db.add(appeal)
    return appeal


def appeal_for(db: OrmSession, decision_id: str) -> models.ModerationAppeal | None:
    return db.scalar(
        select(models.ModerationAppeal).where(
            models.ModerationAppeal.decision_id == decision_id
        )
    )


def may_review(decision: models.ModerationDecision, reviewer_id: str) -> str | None:
    """Why this reviewer may not decide this appeal, or None if they may."""
    if decision.decided_by == reviewer_id:
        return "This appeal is against your own decision. Someone else has to answer it."
    return None


def overturn(db: OrmSession, decision: models.ModerationDecision, reviewer_id: str) -> None:
    """Undo the restriction, and make the undoing stick.

    Writing the human-review fields matters as much as changing the rating: a
    later classifier pass reads them and leaves confirmed content alone, so
    without this the machine would quietly re-impose the decision a human just
    found to be wrong.
    """
    row = _classification(db, decision.content_id)
    if row is not None:
        row.age_rating = "GENERAL"
        # The graded levels have to go too. The engine applies a per-category
        # ceiling on top of the summary rating, so clearing `age_rating` alone
        # leaves sexual_content_level at 2 and the content still invisible to
        # every minor - an overturn that reads as success in the decision
        # record and changes nothing about who can see the post. The levels are
        # what the reviewer actually disagreed with.
        for field in (
            "sexual_content_level", "nudity_level", "violence_level",
            "graphic_content_level", "drugs_level", "alcohol_level",
            "gambling_level", "dangerous_activity_level",
            "self_harm_risk", "hate_or_abuse_risk",
        ):
            setattr(row, field, 0)
        # exploitation_risk is deliberately not touched. Nothing with a real
        # exploitation signal reaches this function - those decisions are not
        # appealable - and a reviewer clearing that flag by hand should be a
        # separate, specialist act rather than a side effect of an appeal.
        row.human_review_status = "confirmed"
        row.classifier_source = f"human:{reviewer_id}"
        row.classifier_confidence = 1.0

    if decision.content_kind == "post":
        post = db.get(models.Post, decision.content_id)
        if post is not None and post.status == "withheld":
            post.status = "published"

    log.info("appeal overturned on %s by %s", decision.content_id, reviewer_id)


def queue(db: OrmSession, limit: int = 50) -> list:
    """Open appeals, latest deadline last. Overdue ones come first."""
    return list(
        db.scalars(
            select(models.ModerationAppeal)
            .where(models.ModerationAppeal.status == "open")
            .order_by(models.ModerationAppeal.due_at)
            .limit(min(limit, 200))
        ).all()
    )


def stats(db: OrmSession) -> dict:
    """How often we are wrong, which is the only number that matters here."""
    answered = db.scalar(
        select(func.count()).select_from(models.ModerationAppeal).where(
            models.ModerationAppeal.status != "open"
        )
    ) or 0
    overturned = db.scalar(
        select(func.count()).select_from(models.ModerationAppeal).where(
            models.ModerationAppeal.status == "overturned"
        )
    ) or 0
    open_count = db.scalar(
        select(func.count()).select_from(models.ModerationAppeal).where(
            models.ModerationAppeal.status == "open"
        )
    ) or 0
    overdue = db.scalar(
        select(func.count()).select_from(models.ModerationAppeal).where(
            models.ModerationAppeal.status == "open",
            models.ModerationAppeal.due_at < now(),
        )
    ) or 0
    return {
        "open": open_count,
        "overdue": overdue,
        "answered": answered,
        "overturned": overturned,
        "overturn_rate": round(overturned / answered, 3) if answered else None,
    }
