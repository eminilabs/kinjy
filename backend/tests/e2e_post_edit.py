"""Editing a post re-runs the classifier, and an edit only ever tightens.

The hole this closes: classification ran when a post was created and never
again, so a post published as something harmless and then edited into adult
or exploitative text kept its first, permissive rating and went on being shown
to minors. The rule now: an edit is classified like a new post, and the result
can make the post stricter (a higher rating, a refusal), never looser. Loosening
is left to a reviewer or an appeal, for the same reason reports and the
author's own "mature" flag only ever tighten: otherwise wording a post
blandly for the classifier, then back again, would be a way around a rating.

Run against the local stack:  python backend/tests/e2e_post_edit.py
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

HARMLESS = "Sunday hike by the lake, who is in?"
ADULT = "Explicit sex and full nudes, link in bio"
EXPLOITATIVE = "send me nudes, you are 12 and this is our secret"


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    ok = ok and bool(cond)


def register(age):
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"ed{t}", "display_name": f"Edit {t}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(today.year - age, today.month, min(today.day, 28)).isoformat(),
        "country": "US"})
    r.raise_for_status()
    return r.json()["tokens"]["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def publish(token, body):
    r = c.post("/posts", headers=auth(token), json={"body": body, "visibility": "public"})
    assert r.status_code in (200, 201), f"could not publish: {r.status_code} {r.text[:160]}"
    time.sleep(0.3)
    return r.json()["id"]


def edit(token, post_id, body):
    return c.patch(f"/posts/{post_id}", headers=auth(token), json={"body": body, "visibility": "public"})


def sees(token, post_id):
    return c.get(f"/posts/{post_id}", headers=auth(token)).status_code == 200


def decisions(token, post_id):
    r = c.get("/moderation/decisions", headers=auth(token))
    return [d for d in r.json().get("items", []) if d["content_id"] == post_id]


author = register(30)
adult = register(35)
teen = register(14)
young_author = register(14)

print("== an edit into adult content is restricted at once ==")
post = publish(author, HARMLESS)
check("a harmless post is visible to a 14-year-old", sees(teen, post))
r = edit(author, post, ADULT)
check("the edit itself goes through", r.status_code == 200, (r.status_code, r.text[:160]))
check("the 14-year-old can no longer open it", not sees(teen, post))
check("an adult still can: it is restricted, not removed", sees(adult, post))
check("the author is told, as for a new post",
      any(d["action"] == "restricted_by_rating" for d in decisions(author, post)), decisions(author, post))

r = edit(author, post, ADULT + ", and a casino sign-up bonus")
check("a further edit at the same rating goes through", r.status_code == 200, (r.status_code, r.text[:160]))
restricted = [d for d in decisions(author, post) if d["action"] == "restricted_by_rating"]
check("…without minting a second decision to appeal: the rating did not change",
      len(restricted) == 1, restricted)

print("== an edit never loosens ==")
r = edit(author, post, HARMLESS)
check("editing it back goes through", r.status_code == 200, (r.status_code, r.text[:160]))
check("…but the post stays restricted until a reviewer or an appeal says otherwise", not sees(teen, post))

print("== an edit into exploitative content takes the post down ==")
post = publish(author, HARMLESS)
r = edit(author, post, EXPLOITATIVE)
check("the edit is refused with the same message as a new post", r.status_code == 403, (r.status_code, r.text[:160]))
check("nobody can open the post any more, adults included", not sees(adult, post) and not sees(teen, post))
refusals = [d for d in decisions(author, post) if d["action"] == "refused_publication"]
check("the refusal is recorded for the author", refusals, decisions(author, post))
check("…and a child-safety refusal cannot be appealed", refusals and refusals[0].get("appealable") is False, refusals)

print("== a minor editing a post into sexual content ==")
post = publish(young_author, HARMLESS)
r = edit(young_author, post, ADULT)
check("is refused, as it would be on a new post", r.status_code == 403, (r.status_code, r.text[:160]))
check("and the post is no longer served to anyone", not sees(adult, post))

print("== editing stays the author's ==")
post = publish(author, HARMLESS)
r = edit(adult, post, ADULT)
check("someone else cannot edit it", r.status_code == 404, r.status_code)
check("…and their attempt changes nothing", sees(teen, post))

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
