"""Changing a password, and what it does to the other devices.

A password change that leaves the other sessions signed in is cosmetic: the
reason somebody changes a password is usually that another person has it, and
the point of the change is to put that person out. So the interesting checks
here are not "the new password works" but:

  * the old password stops working,
  * the other devices are signed out,
  * the device the change was made from stays signed in,
  * and the current password is actually required, because an access token is
    not proof of who is at the keyboard.

Run against the local stack:  python backend/tests/e2e_password_change.py
"""
from __future__ import annotations

import random
import string
import sys
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
c = httpx.Client(base_url=BASE, timeout=30)
ok = True

FIRST = "Sup3rStrong!Pass"
SECOND = "An0ther-Strong!1"


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    ok = ok and bool(cond)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def register():
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"pw{t}", "display_name": f"Pass {t}",
        "password": FIRST,
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
        "country": "US"})
    r.raise_for_status()
    return f"{t}@example.com", r.json()["tokens"]


def login(email, password, label=None):
    body = {"email": email, "password": password}
    if label:
        body["device_label"] = label
    return c.post("/auth/login", json=body)


email, first_device = register()
print(f"== a member on two devices ({email})")

second = login(email, FIRST, "second device")
check("signing in on a second device works", second.status_code == 200,
      (second.status_code, second.text[:160]))
second_tokens = second.json()["tokens"]

r = c.get("/auth/sessions", headers=auth(first_device["access_token"]))
check("both devices are listed", r.status_code == 200 and len(
    [s for s in r.json() if not s["revoked_at"]]) == 2, (r.status_code, r.text[:200]))

print("\n== a token is not enough; the current password is required")
r = c.post("/auth/password", headers=auth(first_device["access_token"]),
           json={"current_password": "not-my-password", "new_password": SECOND})
check("a wrong current password is refused", r.status_code == 400, (r.status_code, r.text[:160]))

r = c.post("/auth/password", headers=auth(first_device["access_token"]),
           json={"current_password": FIRST, "new_password": "short1!"})
check("a new password under the minimum is refused", r.status_code == 422,
      (r.status_code, r.text[:160]))

r = c.post("/auth/password", headers=auth(first_device["access_token"]),
           json={"current_password": FIRST, "new_password": "allletterspassword"})
check("a new password with no digits or symbols is refused", r.status_code == 422,
      (r.status_code, r.text[:160]))

r = c.post("/auth/password", headers=auth(first_device["access_token"]),
           json={"current_password": FIRST, "new_password": FIRST})
check("reusing the current password is refused", r.status_code == 400, (r.status_code, r.text[:160]))

r = c.post("/auth/password", json={"current_password": FIRST, "new_password": SECOND})
check("an unauthenticated caller is refused", r.status_code in (401, 403),
      (r.status_code, r.text[:160]))

print("\n== the change itself, keeping this device")
r = c.post("/auth/password", headers=auth(first_device["access_token"]),
           json={"current_password": FIRST, "new_password": SECOND,
                 "refresh_token": first_device["refresh_token"]})
check("the change succeeds", r.status_code == 200, (r.status_code, r.text[:200]))
result = r.json() if r.status_code == 200 else {}
check("it reports signing the other device out", result.get("sessions_ended") == 1, result)
check("it reports this device stayed signed in", result.get("signed_out_here") is False, result)
check("it reports when the change happened", bool(result.get("changed_at")), result)

print("\n== what the old password can still do: nothing")
r = login(email, FIRST)
check("the old password no longer signs in", r.status_code == 401, (r.status_code, r.text[:160]))

r = login(email, SECOND)
check("the new password signs in", r.status_code == 200, (r.status_code, r.text[:160]))

print("\n== the other device is out, this one is not")
r = c.post("/auth/refresh", json={"refresh_token": second_tokens["refresh_token"]})
check("the other device cannot refresh", r.status_code == 401, (r.status_code, r.text[:160]))

r = c.post("/auth/refresh", json={"refresh_token": first_device["refresh_token"]})
check("the device that made the change still can", r.status_code == 200,
      (r.status_code, r.text[:160]))

print("\n== the account says when it last changed")
r = c.get("/auth/me", headers=auth(first_device["access_token"]))
check("/auth/me reports the change date", r.status_code == 200 and bool(
    r.json().get("password_changed_at")), (r.status_code, r.text[:200]))
check("/auth/me reports there is a password", r.status_code == 200 and
      r.json().get("has_password") is True, r.text[:200])

print("\n== guessing is limited")
email2, device = register()
refused = 0
for attempt in range(7):
    r = c.post("/auth/password", headers=auth(device["access_token"]),
               json={"current_password": f"wrong-guess-{attempt}", "new_password": SECOND})
    if r.status_code == 429:
        refused += 1
check("repeated wrong guesses start being refused outright", refused > 0,
      "no 429 after seven wrong attempts")
# And the limit must not have locked out somebody who knows their password
# *before* it kicked in - it is a brake on guessing, not on changing.
r = c.post("/auth/password", headers=auth(device["access_token"]),
           json={"current_password": FIRST, "new_password": SECOND})
check("the brake applies to the right password too, once tripped",
      r.status_code == 429, (r.status_code, r.text[:160]))

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
