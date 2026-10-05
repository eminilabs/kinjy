"""Sending mail, for the few things that must reach somebody who is locked out.

In-app notification is no use to a member who cannot sign in, which is the one
case this exists for. Plain SMTP is used rather than a provider's API so the
choice of provider lives in `.env` and not in the code.

Two rules:

* **Never pretend.** A send either happened or it raised. Swallowing the error
  turns "we emailed you a link" into a lie the member waits on.
* **Never log the secret.** The reset link is a credential for the length of its
  life; it belongs in the message body and nowhere else, logs included.
"""
from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from common import settings

log = logging.getLogger("kaluta.mailer")

TIMEOUT_SECONDS = 20


class MailError(Exception):
    """Could not hand the message to the mail server."""


def configured() -> bool:
    return settings.mail_configured()


def send(to: str, subject: str, body: str) -> None:
    """Send one plain-text message, or raise.

    Plain text only. A reset mail is three lines and a link; HTML would add a
    rendering surface and an excuse for the link to be dressed as something it
    is not, which is the shape of the phishing these mails get imitated by.
    """
    if not configured():
        raise MailError("No SMTP host is configured")

    message = EmailMessage()
    message["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM))
    message["To"] = to
    message["Subject"] = subject
    message["Auto-Submitted"] = "auto-generated"  # keeps vacation responders quiet
    message.set_content(body)

    try:
        if settings.SMTP_SSL:
            server = smtplib.SMTP_SSL(
                settings.SMTP_HOST, settings.SMTP_PORT,
                timeout=TIMEOUT_SECONDS, context=ssl.create_default_context(),
            )
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=TIMEOUT_SECONDS)
        with server:
            server.ehlo()
            if settings.SMTP_STARTTLS and not settings.SMTP_SSL:
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
    except Exception as exc:
        # The address is not logged either: pairing "reset requested" with an
        # address in a log file rebuilds exactly the list this flow refuses to
        # confirm over the API.
        log.error("could not send mail (%s): %s", subject, exc)
        raise MailError("Could not send the message") from exc


def password_reset_body(display_name: str, link: str) -> str:
    """The one message this platform sends, so it is worth getting right.

    It has to serve two people at once. The member who asked needs the link and
    no ceremony. The member who did *not* ask needs to be told, in the same
    breath, that doing nothing is the safe choice - otherwise the mail reads as
    a breach notice and frightens them into clicking, which is the reflex every
    phishing copy of this mail depends on.
    """
    return (
        f"Hello {display_name},\n\n"
        "Someone asked to reset the password on your Kinjy account. If that was "
        "you, open this link within the hour:\n\n"
        f"{link}\n\n"
        "Opening it signs you out everywhere, including any device you did not "
        "recognise.\n\n"
        "If it was not you, you do not need to do anything - the link only works "
        "once and expires on its own. Your password has not changed.\n\n"
        "Kinjy\n"
    )
