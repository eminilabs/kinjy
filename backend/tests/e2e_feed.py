"""The home feed against the live API.

Run: python backend/tests/e2e_feed.py
"""
import random
import string
import sys
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
c = httpx.Client(base_url=BASE, timeout=60)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    if not cond:
        ok = False


def tag():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def register(age=30):
    t = tag()
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"fd{t}", "display_name": f"Feed {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": date(today.year - age, 1, 15).isoformat(),
        "country": "FR",
    })
    r.raise_for_status()
    d = r.json()
    return {"Authorization": f"Bearer {d['tokens']['access_token']}"}, d["user"]


def feed(headers, mode, **params):
    return c.get("/feed", headers=headers, params={"mode": mode, "limit": 50, **params})


def ids(response):
    return {item["id"] for item in response.json().get("items", [])}


reader, _ = register()
author, author_user = register()
stranger, _ = register()

post = c.post("/posts", headers=author, json={"body": f"From the author {tag()}", "visibility": "public"})
post.raise_for_status()
post_id = post.json()["id"]

print("== following nobody")
r = feed(reader, "following")
check("200", r.status_code == 200, r.text[:200])
check("says why it is empty", r.json().get("empty_reason") == "not_following_anyone", r.json())

print("== following someone")
r = c.post(f"/users/{author_user['id']}/follow", headers=reader)
check("follow -> 201", r.status_code == 201, r.text[:200])
r = feed(reader, "following")
check("their post is in my Following feed", post_id in ids(r), r.json())
check("and the feed is not marked empty", "empty_reason" not in r.json(), r.json())
check("someone else's Following feed does not show it",
      post_id not in ids(feed(stranger, "following")))

print("== the follow counts in ranked feeds too")
why = c.get(f"/feed/why/{post_id}", headers=reader, params={"algorithm_id": "friends_first", "mode": "for_you"})
factors = {f["factor"] for f in why.json().get("factors", [])}
check("For You knows I follow the author (affinity)", "affinity" in factors, why.json())
why = c.get(f"/feed/why/{post_id}", headers=stranger, params={"algorithm_id": "friends_first", "mode": "for_you"})
check("…and a stranger gets no affinity",
      "affinity" not in {f["factor"] for f in why.json().get("factors", [])}, why.json())

print("== unfollowing")
c.delete(f"/users/{author_user['id']}/follow", headers=reader)
r = feed(reader, "following")
check("empty again, with the reason", r.json().get("empty_reason") == "not_following_anyone", r.json())

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
