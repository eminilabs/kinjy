"""The parts of a password reset that are decided before any network call.

What is checked here is the reasoning, not the plumbing: that a token is stored
as a digest and never in the clear, that a link stops being usable the moment it
is spent or superseded, and that the mailer refuses to pretend. The end-to-end
run against a live stack is in e2e_password_reset.py.
"""
from __future__ import annotations

import hashlib
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
for extra in (str(BACKEND), str(BACKEND / "auth-service")):
    if extra not in sys.path:
        sys.path.insert(0, extra)

from common import mailer, settings  # noqa: E402

import models  # noqa: E402


def _now():
    return datetime.now(timezone.utc)


def test_the_token_is_stored_as_a_digest_not_the_token():
    """A copy of this table must not let anyone take an account.

    The token in the member's mail is a credential for an hour. If the row held
    it in the clear, a database dump - or a backup, or a read-only reporting
    replica - would be a list of live account takeovers.
    """
    token = "a-secret-link-token-value"
    digest = hashlib.sha256(token.encode()).hexdigest()

    row = models.PasswordReset(
        id="pwr_1", user_id="usr_1", token_hash=digest,
        expires_at=_now() + timedelta(hours=1),
    )
    stored = " ".join(str(v) for v in vars(row).values() if v is not None)
    assert token not in stored
    assert row.token_hash == digest
    assert len(row.token_hash) == 64


def test_a_link_is_usable_once_and_only_while_it_lasts():
    fresh = models.PasswordReset(
        id="pwr_1", user_id="usr_1", token_hash="x" * 64,
        expires_at=_now() + timedelta(minutes=30),
    )
    assert fresh.usable

    spent = models.PasswordReset(
        id="pwr_2", user_id="usr_1", token_hash="y" * 64,
        expires_at=_now() + timedelta(minutes=30), used_at=_now(),
    )
    assert not spent.usable, "a used link must not work a second time"

    expired = models.PasswordReset(
        id="pwr_3", user_id="usr_1", token_hash="z" * 64,
        expires_at=_now() - timedelta(minutes=1),
    )
    assert not expired.usable, "an expired link must not work"

    # Asking for a new link retires the previous one. Two live links are two
    # chances for whoever should not have one.
    superseded = models.PasswordReset(
        id="pwr_4", user_id="usr_1", token_hash="w" * 64,
        expires_at=_now() + timedelta(minutes=30), invalidated_at=_now(),
    )
    assert not superseded.usable, "a superseded link must not work"


def test_the_mailer_refuses_rather_than_pretending(monkeypatch):
    """Nothing configured means nothing sent, and the caller is told.

    Silently succeeding here would be the worst failure of the whole flow: the
    member is told a link is on its way and waits for mail that was never
    handed to anything.
    """
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    monkeypatch.setattr(settings, "SMTP_FROM", "")
    assert not mailer.configured()
    with pytest.raises(mailer.MailError):
        mailer.send("someone@example.com", "Subject", "Body")


def test_a_configured_mailer_reports_itself_available(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "SMTP_FROM", "no-reply@example.com")
    assert mailer.configured()


def test_a_send_that_fails_raises_instead_of_returning(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "SMTP_FROM", "no-reply@example.com")

    def explode(*args, **kwargs):
        raise OSError("connection refused")

    monkeypatch.setattr(mailer.smtplib, "SMTP", explode)
    with pytest.raises(mailer.MailError):
        mailer.send("someone@example.com", "Subject", "Body")


def test_the_mail_carries_the_link_and_says_what_it_does():
    """The body is the only place the token exists outside the member's hands,
    and the only warning somebody gets that a stranger asked."""
    body = mailer.password_reset_body("Demo", "https://kinjy.com/reset-password?token=abc123")
    assert "https://kinjy.com/reset-password?token=abc123" in body
    # Someone who did not ask must be told plainly that doing nothing is safe,
    # or the mail reads like a breach notice and pushes them to click.
    assert "not you" in body.lower()
    assert "has not changed" in body.lower()
    # And someone who did ask should not be surprised by being signed out.
    assert "signs you out" in body.lower()
