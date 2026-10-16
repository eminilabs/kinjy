"""Newsletters: people who asked, an unsubscribe that always works, and a send that is the creator's to
make and the platform's to carry out.

The rules this is built around, because a newsletter is the one feature here that sends *email to
strangers' inboxes* under the platform's name:

* **Nothing goes to an address that did not confirm.** Signing up writes a ``pending`` row and sends one
  confirmation mail; only following its link makes the address ``confirmed``. Anyone can type anybody's
  address into a form, and the confirmation mail is the only thing they can then cause to be sent.
* **The sign-up answers the same whatever it knew.** An address already subscribed, already pending, or
  new gets the same reply, so the form cannot be used to find out who is on a creator's list. And it is
  rate-limited, so it cannot be used to fill somebody's inbox with confirmation requests.
* **Leaving is one click, always, and takes effect at once** - also for an issue that is already being sent.
  Every mail carries the link and the standard ``List-Unsubscribe`` headers, so a mail client can do it.
* **The links are signed, not stored.** A database dump cannot confirm or cancel anybody. A confirmation
  link expires; an unsubscribe link never does.
* **Only a confirmed adult sends.** The text is the creator's, the sender is the platform, and the
  recipients are strangers; a minor's account does not do that.
* **The creator gets counts, not addresses.** They get a masked preview. The list is the subscribers'
  as much as theirs, and nothing about running a newsletter needs a creator to be able to read it out.
"""
from __future__ import annotations

import html
import logging
from datetime import datetime, timedelta, timezone

import httpx
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from common import agefeatures, mailer, settings
from common import entitlements
from common.auth import CurrentUser
from common.database import get_db

import models
import newsletter_jobs
from newsletter_links import link as _link, mask as _mask, sign, split_newsletter, verify

log = logging.getLogger("creator-service.newsletter")
router = APIRouter(tags=["newsletters"])

USER_URL = "http://user-service:8000"
# What the sign-up form may cause to be sent. Low on purpose: a real reader asks once.
CONFIRMATIONS_PER_CREATOR_PER_HOUR = 30
CONFIRMATIONS_PER_ADDRESS_PER_DAY = 5
RESEND_AFTER = timedelta(hours=1)

SAME_REPLY = {"status": "check_your_inbox", "message": "If that address can be added, a confirmation is on its way."}


# --- signed links: see newsletter_links.py -----


# --- the pages a link opens ---------------------------------------------------------

def _page(title: str, message: str, *, action: str | None = None, button: str = "", status: int = 200) -> HTMLResponse:
    """A plain page. Everything is escaped, there is no script, and the policy forbids loading anything."""
    form = (
        f'<form method="post" action="{html.escape(action, quote=True)}"><button type="submit">{html.escape(button)}</button></form>'
        if action else ""
    )
    body = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<title>{html.escape(title)}</title><style>body{{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;"
        "color:#1c1b19;background:#faf8f4}button{font:inherit;padding:.6rem 1.2rem;border-radius:2rem;border:0;background:#d9a648;"
        f"color:#1c1b19;font-weight:700;cursor:pointer}}</style></head><body><h1>{html.escape(title)}</h1><p>{html.escape(message)}</p>{form}"
        "<p><small>Kinjy</small></p></body></html>"
    )
    return HTMLResponse(
        body, status_code=status,
        headers={"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
                 "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


# --- people signing up ---------------------------------------------------------------

class SubscribeIn(BaseModel):
    email: str = Field(max_length=254)


def _creator(handle: str) -> tuple[str, str, str]:
    """(user id, handle, display name) of a creator who can have a newsletter, or a 404 that does not say why.

    Resolved on the server: the name that goes into a confirmation mail must be the creator's, not whatever a
    form said, or the platform's mail could be made to say anything."""
    try:
        response = httpx.get(f"{USER_URL}/users/{handle.lower()}", timeout=5)
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Try again in a moment") from None
    if response.status_code != 200:
        raise HTTPException(status_code=404, detail="No newsletter here")
    profile = response.json()
    if agefeatures.profile(profile["user_id"]).is_minor:
        raise HTTPException(status_code=404, detail="No newsletter here")  # a minor's account has none
    return profile["user_id"], profile["handle"], profile["display_name"]


@router.post("/creators/{handle}/newsletter/subscribe", status_code=202)
def subscribe(handle: str, payload: SubscribeIn, db: OrmSession = Depends(get_db)):
    """Ask to receive a creator's newsletter. Public. Sends one confirmation mail and nothing else."""
    try:
        email = validate_email(payload.email.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        raise HTTPException(status_code=422, detail="That does not look like an e-mail address") from None
    if not mailer.configured():
        raise HTTPException(status_code=503, detail="Newsletters are not available on this server yet")
    creator_id, creator_handle, display_name = _creator(handle)

    now = datetime.now(timezone.utc)
    row = db.scalar(
        select(models.NewsletterSubscriber).where(
            models.NewsletterSubscriber.creator_id == creator_id, models.NewsletterSubscriber.email == email
        )
    )
    if row is not None and row.status == "confirmed":
        return SAME_REPLY  # nothing to do, and nothing said that tells a stranger they are on the list
    if row is not None and row.confirmation_sent_at and now - row.confirmation_sent_at < RESEND_AFTER:
        return SAME_REPLY  # one confirmation an hour per address and creator

    recent = db.scalar(
        select(func.count()).select_from(models.NewsletterSubscriber).where(
            models.NewsletterSubscriber.creator_id == creator_id,
            models.NewsletterSubscriber.confirmation_sent_at > now - timedelta(hours=1),
        )
    ) or 0
    if recent >= CONFIRMATIONS_PER_CREATOR_PER_HOUR:
        raise HTTPException(status_code=429, detail="Too many sign-ups for this newsletter right now. Try again later.")
    to_this_address = db.scalar(
        select(func.count()).select_from(models.NewsletterSubscriber).where(
            models.NewsletterSubscriber.email == email,
            models.NewsletterSubscriber.confirmation_sent_at > now - timedelta(days=1),
        )
    ) or 0
    if to_this_address >= CONFIRMATIONS_PER_ADDRESS_PER_DAY:
        return SAME_REPLY  # enough mail to that address today; said to no one

    if row is None:
        row = models.NewsletterSubscriber(creator_id=creator_id, creator_handle=creator_handle, email=email)
        db.add(row)
    row.status = "pending"
    row.unsubscribed_at = None
    row.confirmation_sent_at = now
    db.flush()
    link = _link("confirm", sign(row.id, "confirm"))
    try:
        mailer.send(
            email,
            f"Confirm your subscription to {display_name}'s newsletter",
            f"Hello,\n\nSomeone - hopefully you - asked to receive {display_name}'s (@{creator_handle}) newsletter on Kinjy "
            f"at this address.\n\nTo confirm, open this link:\n\n{link}\n\nIf it was not you, do nothing: nothing will be "
            "sent to this address unless it is confirmed, and the link stops working on its own.\n\nKinjy\n",
        )
    except mailer.MailError:
        db.rollback()
        raise HTTPException(status_code=503, detail="The confirmation could not be sent right now. Try again later.") from None
    db.commit()
    return SAME_REPLY


@router.get("/creators/newsletter/confirm", response_class=HTMLResponse)
def confirm(token: str = "", db: OrmSession = Depends(get_db)):
    subscriber_id = verify(token, "confirm")
    row = db.get(models.NewsletterSubscriber, subscriber_id) if subscriber_id else None
    if row is None:
        return _page("This link does not work", "It may have expired. Ask for a new confirmation from the newsletter's page.", status=404)
    if row.status != "confirmed":
        row.status, row.confirmed_at, row.unsubscribed_at = "confirmed", datetime.now(timezone.utc), None
        db.commit()
    return _page("You are subscribed", f"You will receive @{row.creator_handle}'s newsletter. Every mail has a link to leave in one click.")


@router.get("/creators/newsletter/unsubscribe", response_class=HTMLResponse)
def unsubscribe_page(token: str = "", db: OrmSession = Depends(get_db)):
    """A page with a button, not the act itself: mail scanners follow links, and one that did would
    unsubscribe everyone it checked. The act is the POST below, which is also what a mail client's own
    "unsubscribe" button sends (List-Unsubscribe-Post)."""
    subscriber_id = verify(token, "unsubscribe")
    row = db.get(models.NewsletterSubscriber, subscriber_id) if subscriber_id else None
    if row is None:
        return _page("This link does not work", "Nothing was changed.", status=404)
    if row.status == "unsubscribed":
        return _page("You are unsubscribed", f"@{row.creator_handle}'s newsletter will not be sent to this address.")
    return _page(
        "Unsubscribe?", f"Stop receiving @{row.creator_handle}'s newsletter at this address.",
        action=_link("unsubscribe", token), button="Unsubscribe",
    )


@router.post("/creators/newsletter/unsubscribe", response_class=HTMLResponse)
def unsubscribe(token: str = "", db: OrmSession = Depends(get_db)):
    subscriber_id = verify(token, "unsubscribe")
    row = db.get(models.NewsletterSubscriber, subscriber_id) if subscriber_id else None
    if row is None:
        return _page("This link does not work", "Nothing was changed.", status=404)
    if row.status != "unsubscribed":
        row.status, row.unsubscribed_at = "unsubscribed", datetime.now(timezone.utc)
        db.commit()
    return _page("You are unsubscribed", f"@{row.creator_handle}'s newsletter will not be sent to this address.")


# --- the creator's side ------------------------------------------------------------------

@router.get("/creators/newsletter/subscribers")
def subscribers(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """How many people are on the list - not who. A masked preview is enough to see it is real."""
    counts = dict(
        db.execute(
            select(models.NewsletterSubscriber.status, func.count())
            .where(models.NewsletterSubscriber.creator_id == principal.user_id)
            .group_by(models.NewsletterSubscriber.status)
        ).all()
    )
    preview = db.scalars(
        select(models.NewsletterSubscriber.email)
        .where(models.NewsletterSubscriber.creator_id == principal.user_id, models.NewsletterSubscriber.status == "confirmed")
        .order_by(models.NewsletterSubscriber.confirmed_at.desc())
        .limit(10)
    ).all()
    return {
        "confirmed": counts.get("confirmed", 0),
        "waiting_for_confirmation": counts.get("pending", 0),
        "unsubscribed": counts.get("unsubscribed", 0),
        "preview": [_mask(e) for e in preview],
        "subscribe_path": f"/creators/{principal.handle}/newsletter/subscribe" if principal.handle else None,
        "can_send": mailer.configured(),
        "sending_allowed": not agefeatures.profile(principal.user_id).is_minor,
        "plan_allowed": entitlements.tier_of(principal.user_id) in ("basic", "premium"),
    }


class SendIn(BaseModel):
    # Either a Studio newsletter that is ready, or a subject and a body written here.
    output_id: int | None = None
    subject: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=20000)


@router.post("/creators/newsletter/send", status_code=202)
def send(payload: SendIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    # An adult rule, not an entry in the feature table: the text is the creator's, the sender the platform, the
    # recipients strangers.
    if agefeatures.profile(principal.user_id).is_minor:
        raise HTTPException(status_code=403, detail=agefeatures.REFUSAL)
    entitlements.require(principal.user_id, "newsletter_send")
    if not mailer.configured():
        raise HTTPException(status_code=503, detail="This server cannot send e-mail yet, so a newsletter cannot go out.")

    lang = "en"
    if payload.output_id is not None:
        output = db.get(models.PublishingOutput, payload.output_id)
        job = db.get(models.PublishingJob, output.job_id) if output else None
        if output is None or job is None or job.creator_id != principal.user_id:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        if output.target != "newsletter" or output.status != "ready" or not output.content:
            raise HTTPException(status_code=400, detail="That is not a newsletter that is ready to send.")
        if output.simulated:
            raise HTTPException(status_code=400, detail="A simulated translation cannot be sent to anybody.")
        subject, body = split_newsletter(output.content)
        lang = output.lang
    else:
        subject, body = (payload.subject or "").strip(), (payload.body or "").strip()
    if not subject or not body:
        raise HTTPException(status_code=400, detail="A newsletter needs a subject and some text.")

    confirmed = db.scalar(
        select(func.count()).select_from(models.NewsletterSubscriber).where(
            models.NewsletterSubscriber.creator_id == principal.user_id, models.NewsletterSubscriber.status == "confirmed"
        )
    ) or 0
    if confirmed == 0:
        raise HTTPException(status_code=400, detail="Nobody has confirmed a subscription yet.")
    if confirmed > settings.NEWSLETTER_MAX_RECIPIENTS:
        raise HTTPException(status_code=400, detail=f"A single issue goes to at most {settings.NEWSLETTER_MAX_RECIPIENTS} people.")

    now = datetime.now(timezone.utc)
    today = db.scalar(
        select(func.count()).select_from(models.NewsletterIssue).where(
            models.NewsletterIssue.creator_id == principal.user_id, models.NewsletterIssue.created_at > now - timedelta(days=1)
        )
    ) or 0
    if today >= settings.NEWSLETTER_MAX_ISSUES_PER_DAY:
        raise HTTPException(status_code=429, detail=f"At most {settings.NEWSLETTER_MAX_ISSUES_PER_DAY} issues in 24 hours.")
    running = db.scalar(
        select(func.count()).select_from(models.NewsletterIssue).where(
            models.NewsletterIssue.creator_id == principal.user_id, models.NewsletterIssue.status.in_(("queued", "sending"))
        )
    ) or 0
    if running:
        raise HTTPException(status_code=409, detail="An issue is still going out. Wait for it to finish.")

    issue = models.NewsletterIssue(
        creator_id=principal.user_id, creator_handle=principal.handle or principal.user_id,
        subject=subject, body=body, lang=lang, recipients=confirmed,
    )
    db.add(issue)
    db.commit()
    newsletter_jobs.submit(issue.id)
    return _issue_out(issue)


def _issue_out(issue: models.NewsletterIssue) -> dict:
    return {
        "id": issue.id, "subject": issue.subject, "status": issue.status, "recipients": issue.recipients,
        "sent": issue.sent, "failed": issue.failed, "skipped": issue.skipped, "error": issue.error,
        "created_at": issue.created_at, "finished_at": issue.finished_at,
    }


@router.get("/creators/newsletter/issues")
def issues(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.NewsletterIssue)
        .where(models.NewsletterIssue.creator_id == principal.user_id)
        .order_by(models.NewsletterIssue.created_at.desc())
        .limit(50)
    ).all()
    return {"items": [_issue_out(i) for i in rows]}


@router.get("/creators/newsletter/issues/{issue_id}")
def issue(issue_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    row = db.get(models.NewsletterIssue, issue_id)
    if row is None or row.creator_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Issue not found")
    return _issue_out(row)
