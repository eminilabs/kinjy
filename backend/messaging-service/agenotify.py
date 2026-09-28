"""Age-checking the text of a notification before it is delivered.

Notifications are listed in the specification alongside feeds and search, and
for a reason that is easy to miss: a notification quotes. "X replied: <the
first line of their reply>" carries the reply onto a lock screen, past every
gate the reply itself sits behind. The content was filtered; the notification
about it was not.

Two rules, and the second is the one that matters most:

1. Unsuitable text is **replaced**, not deleted. The member still learns that
   something happened and can go and look, where the ordinary gates apply.
2. Safety and account notifications are **never** touched. Redacting "your
   dispute was resolved" or "somebody signed in from a new device" to protect a
   teenager from strong language would be protecting them from the one message
   they most need to read.
"""
from __future__ import annotations

import logging

from common import ageclient, classifier
from common.agesafety import ContentRating, SafetyClassification, engine

log = logging.getLogger("messaging-service.agenotify")

# Kinds that always deliver exactly as written. Safety, money and account
# integrity: a member being kept in the dark about these is worse than a member
# reading a blunt word.
ALWAYS_VERBATIM = frozenset({
    "dispute_opened", "dispute_message", "dispute_resolved", "dispute_withdrawn",
    "dispute_arbitration", "order_funded", "order_delivered", "order_settled",
    "age_review", "child_safety", "account", "security", "login_alert",
    "payout", "kyc", "policy",
})

# What a redacted notification says instead. Neutral, and deliberately not an
# apology or an explanation: "a message we decided you should not read" invites
# the member to go looking for it somewhere else.
NEUTRAL_TITLE = "New activity"


def screen(user_id: str, kind: str, title: str, body: str | None) -> tuple[str, str | None, bool]:
    """Return the title and body to store, and whether anything was replaced.

    Fails towards delivering the notification: if the classifier or the age
    lookup throws, the member still gets told something happened. The linked
    content stays behind its own gate either way, so the cost of being wrong
    here is a blunt word on a lock screen rather than access to anything.
    """
    if kind in ALWAYS_VERBATIM:
        return title, body, False

    try:
        recipient = ageclient.age_profile(user_id)
        if not recipient.is_minor:
            return title, body, False

        verdict = classifier.classify(
            body=f"{title} {body or ''}", media_kinds=[], author_is_minor=False
        )
        rating = ContentRating(verdict.age_rating)
        allowed = engine.can_view_content(
            recipient,
            SafetyClassification(age_rating=rating, **verdict.levels),
        )
        if allowed.allowed:
            return title, body, False

        log.info("notification text redacted for a minor (kind=%s)", kind)
        return NEUTRAL_TITLE, None, True
    except Exception as exc:  # pragma: no cover - defensive
        log.error("notification screening failed, delivering as written: %s", exc)
        return title, body, False
