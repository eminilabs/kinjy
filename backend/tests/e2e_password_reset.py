"""Recovering an account nobody can sign in to, end to end through real mail.

This is the one flow that has to work for somebody who is locked out, so it is
tested the way they experience it: ask with nothing but an address, read the
message that arrives, follow the link, and sign in again.

Needs a mail sink the stack can reach. Mailpit, on the stack's own network:

    docker run -d --name kinjy-mailpit --network kaluta_kaluta -p 8025:8025 axllent/mailpit

and in .env, then restart auth-service:

    SMTP_HOST=kinjy-mailpit
    SMTP_PORT=1025
    SMTP_FROM=no-reply@kinjy.test
    SMTP_STARTTLS=0

Without it the suite reports SKIP (exit 2) rather than passing on nothing: a
reset suite that goes green on an installation that cannot send mail is worse
than no suite at all.

Run:  python backend/tests/e2e_password_reset.py
"""
from __future__ import annotations

import os
import random
import re
import string
import sys
import time
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
MAILPIT = os.getenv("MAILPIT_API", "http://localhost:8025")
c = httpx.Client(base_url=BASE, timeout=30)
ok = True

FIRST = "Sup3rStrong!Pass"
RESET_TO = "Rec0vered-Pass!1"


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    ok = ok and bool(cond)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def register():
    t = "".join(random.choices(string.ascii_lowercase, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"rs{t}", "display_name": f"Reset {t}",
        "password": FIRST,
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
        "country": "US"})
    r.raise_for_status()
    return f"{t}@example.com", r.json()["tokens"]


def inbox_clear():
    httpx.delete(f"{MAILPIT}/api/v1/messages", timeout=10)


def wait_for_mail(to: str, seconds: float = 20) -> str | None:
    """The newest message body sent to this address, or None."""
    deadline = time.time() + seconds
    while time.time() < deadline:
        r = httpx.get(f"{MAILPIT}/api/v1/messages", timeout=10)
        for message in r.json().get("messages", []):
            if any(a.get("Address", "").lower() == to for a in message.get("To", [])):
                full = httpx.get(f"{MAILPIT}/api/v1/message/{message['ID']}", timeout=10)
                return full.json().get("Text", "")
        time.sleep(0.5)
    return None


# --- is this installation even able to do it? --------------------------------

r = c.get("/auth/password/reset-available")
if r.status_code != 200:
    print(f"SKIP: /auth/password/reset-available answered {r.status_code}")
    sys.exit(2)
if not r.json().get("available"):
    print("SKIP: no SMTP configured on this stack — see the docstring for the mail sink.")
    sys.exit(2)
try:
    httpx.get(f"{MAILPIT}/api/v1/messages", timeout=5)
except Exception as exc:
    print(f"SKIP: no mail sink reachable at {MAILPIT} ({exc})")
    sys.exit(2)

print("== a member who has forgotten their password")
email, device = register()
inbox_clear()

print("\n== asking says nothing about who has an account")
unknown = c.post("/auth/password/reset-request", json={"email": "nobody-here@example.com"})
known = c.post("/auth/password/reset-request", json={"email": email})
check("an unknown address is accepted", unknown.status_code == 202,
      (unknown.status_code, unknown.text[:160]))
check("a real address answers identically", known.status_code == unknown.status_code,
      (known.status_code, unknown.status_code))
check("and says the same thing", known.text == unknown.text, (known.text[:80], unknown.text[:80]))
check("no mail went to the unknown address",
      wait_for_mail("nobody-here@example.com", seconds=3) is None)

print("\n== the mail that arrives")
body = wait_for_mail(email)
check("a message reaches the member", body is not None, "nothing arrived")
link = re.search(r"https?://\S+/reset-password\?token=(\S+)", body or "")
check("it carries a reset link", link is not None, (body or "")[:200])
check("it tells somebody who did not ask that they are safe",
      "not you" in (body or "").lower() and "has not changed" in (body or "").lower())
token = link.group(1) if link else ""

print("\n== what an invented link gets")
r = c.post("/auth/password/reset", json={"token": "x" * 40, "new_password": RESET_TO})
check("an unknown token is refused", r.status_code == 400, (r.status_code, r.text[:160]))
r = c.post("/auth/password/reset", json={"token": token, "new_password": "short1!"})
check("a weak new password is refused", r.status_code == 422, (r.status_code, r.text[:160]))

print("\n== following the link")
r = c.post("/auth/password/reset", json={"token": token, "new_password": RESET_TO})
check("the reset succeeds", r.status_code == 200, (r.status_code, r.text[:200]))
check("it signs every session out", (r.json().get("sessions_ended", 0) if r.status_code == 200 else 0) >= 1,
      r.text[:160])

r = c.post("/auth/password/reset", json={"token": token, "new_password": "Y3tAnother!Pass"})
check("the same link cannot be used twice", r.status_code == 400, (r.status_code, r.text[:160]))

print("\n== the account afterwards")
r = c.post("/auth/login", json={"email": email, "password": FIRST})
check("the old password is dead", r.status_code == 401, (r.status_code, r.text[:160]))
r = c.post("/auth/login", json={"email": email, "password": RESET_TO})
check("the new password signs in", r.status_code == 200, (r.status_code, r.text[:160]))
r = c.post("/auth/refresh", json={"refresh_token": device["refresh_token"]})
check("the session from before cannot refresh", r.status_code == 401, (r.status_code, r.text[:160]))

print("\n== a newer link retires the older one")
inbox_clear()
email2, _ = register()
c.post("/auth/password/reset-request", json={"email": email2})
first_body = wait_for_mail(email2)
first_token = re.search(r"token=(\S+)", first_body or "")
inbox_clear()
c.post("/auth/password/reset-request", json={"email": email2})
second_body = wait_for_mail(email2)
second_token = re.search(r"token=(\S+)", second_body or "")
check("two requests give two different links",
      bool(first_token and second_token) and first_token.group(1) != second_token.group(1))
if first_token and second_token:
    r = c.post("/auth/password/reset",
               json={"token": first_token.group(1), "new_password": RESET_TO})
    check("the older link no longer works", r.status_code == 400, (r.status_code, r.text[:160]))
    r = c.post("/auth/password/reset",
               json={"token": second_token.group(1), "new_password": RESET_TO})
    check("the newest link does", r.status_code == 200, (r.status_code, r.text[:160]))

print("\n== asking over and over is capped")
inbox_clear()
email3, _ = register()
for _ in range(6):
    c.post("/auth/password/reset-request", json={"email": email3})
time.sleep(1)
sent = httpx.get(f"{MAILPIT}/api/v1/messages", timeout=10).json().get("messages", [])
mine = [m for m in sent if any(a.get("Address", "").lower() == email3 for a in m.get("To", []))]
check("six requests do not send six mails", len(mine) <= 3, f"{len(mine)} messages sent")

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
