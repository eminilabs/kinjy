"""A post shared outside Kinjy, and the invitation riding on the link.

The chain this covers: a member shares a public post, the link carries their
referral code, somebody with no account opens the post, joins from it, and the
sharer is recorded as their sponsor - which is what the direct 20% programme
pays on.

The frontend builds the link and the sign-up form passes the code; what is
checked here is everything underneath, because that is where being wrong costs
somebody money or shows a minor a post they should not see:

  * a post is readable by a visitor with no account at all,
  * only if it is public - a shared link is not a way around an audience,
  * and not if the age rating says otherwise, since a visitor is UNKNOWN and
    the engine treats UNKNOWN as a minor,
  * the code resolves to the sharer, and lands as `invited_by`.

Run against the local stack:  python backend/tests/e2e_share_referral.py
"""
from __future__ import annotations

import random
import string
import sys
import time
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
c = httpx.Client(base_url=BASE, timeout=30)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    ok = ok and bool(cond)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def register(prefix, referral_code=None, age=30):
    t = "".join(random.choices(string.ascii_lowercase, k=8))
    today = date.today()
    body = {
        "email": f"{t}@example.com", "handle": f"{prefix}{t}", "display_name": f"{prefix} {t}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(today.year - age, today.month, min(today.day, 28)).isoformat(),
        "country": "US",
    }
    if referral_code:
        body["referral_code"] = referral_code
    return c.post("/auth/register", json=body)


print("== a member with a post and an invitation code")
r = register("shr")
r.raise_for_status()
sharer = r.json()
token = sharer["tokens"]["access_token"]
code = sharer["user"]["referral_code"]
check("the sharer has a referral code", bool(code), sharer["user"])

r = c.post("/posts", headers=auth(token),
           json={"body": "Sunrise over the lake this morning.", "visibility": "public"})
check("a public post is created", r.status_code == 201, (r.status_code, r.text[:160]))
public_post = r.json()["id"]

r = c.post("/posts", headers=auth(token),
           json={"body": "Only my followers see this.", "visibility": "followers"})
followers_post = r.json()["id"] if r.status_code == 201 else ""
time.sleep(0.4)

print("\n== what a visitor with no account can open")
r = c.get(f"/posts/{public_post}")
check("a public post opens for a visitor", r.status_code == 200, (r.status_code, r.text[:160]))

r = c.get(f"/posts/{followers_post}")
check("a followers-only post does not", r.status_code == 404, (r.status_code, r.text[:160]))
# 404 rather than 403 on purpose: "exists but not for you" tells somebody which
# links are worth passing on.

r = c.get("/posts/pst_does_not_exist")
check("and a missing post looks the same as a forbidden one", r.status_code == 404,
      (r.status_code, r.text[:160]))

print("\n== a shared link is not a way past the age gate")
r = c.post("/posts", headers=auth(token),
           json={"body": "Explicit sex and full nudes, link in bio", "visibility": "public",
                 "mature": True})
adult_post = r.json()["id"] if r.status_code == 201 else ""
# Classification is asynchronous; give it a moment to land.
for _ in range(20):
    time.sleep(0.5)
    if c.get(f"/posts/{adult_post}").status_code == 404:
        break
r = c.get(f"/posts/{adult_post}")
check("an adult post is not served to a signed-out visitor", r.status_code == 404,
      (r.status_code, r.text[:200]))
r = c.get(f"/posts/{adult_post}", headers=auth(token))
check("while its own author still sees it", r.status_code == 200, (r.status_code, r.text[:160]))

print("\n== joining from the link credits the sharer")
r = register("new", referral_code=code)
check("somebody can join with the code from the link", r.status_code == 201,
      (r.status_code, r.text[:200]))
joined = r.json() if r.status_code == 201 else {}
check("and the sharer is recorded as their sponsor",
      joined.get("user", {}).get("invited_by") == sharer["user"]["id"],
      (joined.get("user", {}).get("invited_by"), sharer["user"]["id"]))

r = c.get("/auth/me", headers=auth(joined["tokens"]["access_token"]))
check("which survives a fresh read of the account",
      r.status_code == 200 and r.json().get("invited_by") == sharer["user"]["id"],
      r.text[:200])

print("\n== a code that means nothing")
r = register("bad", referral_code="ZZZZZZZZ")
check("an unknown code is refused rather than silently ignored", r.status_code == 400,
      (r.status_code, r.text[:160]))
# The web app treats this as the signal to drop a code it had only remembered
# from a link, so a stale one cannot stop somebody creating an account.

print("\n== the code is case-insensitive, since links get retyped")
r = register("low", referral_code=code.lower())
check("a lowercased code still credits the sharer",
      r.status_code == 201 and r.json()["user"]["invited_by"] == sharer["user"]["id"],
      (r.status_code, r.text[:200]))

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
