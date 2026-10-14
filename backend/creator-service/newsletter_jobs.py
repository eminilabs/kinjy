"""Sending an issue: one mail per confirmed subscriber, on a worker, and safe to stop and start again.

The request that starts a send only writes the issue and returns; the mails go out here, one at a time and a
little apart (SMTP servers and receiving ones both look badly on a burst). Three properties matter more than speed:

* **Nobody is written to twice - at most once each.** An attempt is recorded in ``newsletter_deliveries``
  (under a uniqueness constraint) *before* the mail is handed over, and updated after. An issue resumed
  after a crash or a deploy skips everyone it has a row for. A row still "attempting" on resume is a mail
  whose fate is unknown: it is marked ``unknown`` and counted as left out, not sent again - one subscriber
  may miss an issue after a crash; none receives it twice. ``recover()`` resumes whatever was "sending".
* **Leaving takes effect at once.** The subscriber's status is read again just before their mail, so somebody who
  unsubscribed while the issue was going out does not get it.
* **A failure is a number and a short reason, never a stack trace or an address** in a log or a response.
"""
from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from common import mailer, settings
from common.database import SessionLocal

import models
from newsletter_links import link, sign

log = logging.getLogger("creator-service.newsletter")

# One worker: the mails of one issue go out one after another, and two issues at once would only make
# each look more like a burst. (A creator can have one issue going out at a time anyway.)
_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="newsletter")


def submit(issue_id: str) -> None:
    _pool.submit(_guarded, issue_id)


def recover() -> None:
    """On startup: resume what was going out when the service stopped."""
    with SessionLocal() as db:
        ids = db.scalars(select(models.NewsletterIssue.id).where(models.NewsletterIssue.status.in_(("queued", "sending")))).all()
    for issue_id in ids:
        log.warning("resuming newsletter issue %s", issue_id)
        submit(issue_id)


def _guarded(issue_id: str) -> None:
    try:
        run(issue_id)
    except Exception:
        log.exception("newsletter issue %s crashed", issue_id)
        with SessionLocal() as db:
            issue = db.get(models.NewsletterIssue, issue_id)
            if issue is not None and issue.status in ("queued", "sending"):
                issue.status, issue.error, issue.finished_at = "failed", "The send stopped unexpectedly.", datetime.now(timezone.utc)
                db.commit()


def _message(issue: models.NewsletterIssue, unsubscribe_url: str) -> str:
    footer = [
        "—",
        f"You are receiving this from @{issue.creator_handle} on Kinjy because you asked for their newsletter and confirmed it.",
        f"Leave in one click: {unsubscribe_url}",
    ]
    if settings.NEWSLETTER_POSTAL_ADDRESS:
        footer.append(settings.NEWSLETTER_POSTAL_ADDRESS)
    return issue.body.rstrip() + "\n\n" + "\n".join(footer) + "\n"


def run(issue_id: str) -> None:
    with SessionLocal() as db:
        issue = db.get(models.NewsletterIssue, issue_id)
        if issue is None or issue.status not in ("queued", "sending"):
            return
        issue.status = "sending"
        db.commit()
        if not mailer.configured():
            issue.status, issue.error, issue.finished_at = "failed", "This server cannot send e-mail.", datetime.now(timezone.utc)
            db.commit()
            return

        # Whatever a previous run was in the middle of when it stopped: unknown, and left alone.
        ambiguous = db.execute(
            update(models.NewsletterDelivery)
            .where(models.NewsletterDelivery.issue_id == issue_id, models.NewsletterDelivery.status == "attempting")
            .values(status="unknown")
        ).rowcount
        if ambiguous:
            db.execute(update(models.NewsletterIssue).where(models.NewsletterIssue.id == issue_id).values(skipped=models.NewsletterIssue.skipped + ambiguous))
            log.warning("issue %s: %d message(s) were in flight when the last run stopped; not sent again", issue_id, ambiguous)
        db.commit()
        reached = set(db.scalars(select(models.NewsletterDelivery.subscriber_id).where(models.NewsletterDelivery.issue_id == issue_id)).all())
        audience = db.scalars(
            select(models.NewsletterSubscriber.id)
            .where(models.NewsletterSubscriber.creator_id == issue.creator_id, models.NewsletterSubscriber.status == "confirmed")
            .order_by(models.NewsletterSubscriber.id)
        ).all()

        for subscriber_id in audience:
            if subscriber_id in reached:
                continue
            db.expire_all()  # read them as they are now: somebody may have left a moment ago
            subscriber = db.get(models.NewsletterSubscriber, subscriber_id)
            still_confirmed = subscriber is not None and subscriber.status == "confirmed"
            try:
                # The attempt is written down first: a crash after this line and before the next is "unknown", never a repeat.
                db.add(models.NewsletterDelivery(issue_id=issue_id, subscriber_id=subscriber_id, status="attempting" if still_confirmed else "skipped"))
                db.commit()
            except IntegrityError:
                db.rollback()  # somebody else wrote it down; nothing to add
                continue
            outcome = "skipped"
            if still_confirmed:
                url = link("unsubscribe", sign(subscriber.id, "unsubscribe"))
                try:
                    mailer.send(
                        subscriber.email, issue.subject, _message(issue, url),
                        headers={
                            "List-Unsubscribe": f"<{url}>",
                            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                            "Precedence": "bulk",
                        },
                    )
                    outcome = "sent"
                except mailer.MailError:
                    outcome = "failed"
                db.execute(
                    update(models.NewsletterDelivery)
                    .where(models.NewsletterDelivery.issue_id == issue_id, models.NewsletterDelivery.subscriber_id == subscriber_id)
                    .values(status=outcome)
                )
            column = {"sent": models.NewsletterIssue.sent, "failed": models.NewsletterIssue.failed, "skipped": models.NewsletterIssue.skipped}[outcome]
            db.execute(update(models.NewsletterIssue).where(models.NewsletterIssue.id == issue_id).values({column.key: column + 1}))
            db.commit()
            if outcome == "sent":
                time.sleep(settings.NEWSLETTER_SEND_INTERVAL_SECONDS)

        db.refresh(issue)
        issue.finished_at = datetime.now(timezone.utc)
        issue.status = "failed" if issue.sent == 0 and issue.failed else "partial" if issue.failed else "sent"
        if issue.status == "failed":
            issue.error = "The mail server refused every message."
        elif issue.failed:
            issue.error = f"{issue.failed} message(s) could not be handed to the mail server."
        db.commit()
        log.info("newsletter issue %s: %d sent, %d failed, %d left before their turn", issue_id, issue.sent, issue.failed, issue.skipped)
