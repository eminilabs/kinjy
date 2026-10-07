"""The thread list obeys the age engine, not only the coarser SQL filter.

`agecommunity.restrict_query` keeps a minor's list short by excluding the clearly
forbidden ratings, but it is looser than the engine behind `GET /threads/{id}`:
it ignores the category ceilings of the youngest teens and an unknown age facing
13+ content. So the list used to show the card (title, author) of a thread whose
page answered 404. Under test:
  - the list shows exactly the threads the thread page would open, for a signed-out
    reader, a 13-year-old, a 15-year-old and an adult;
  - paging counts only what the viewer may read, so `limit` and `offset` cannot be
    used to find out that something is hidden.

Run against the live stack:  python backend/tests/e2e_forum_list_age.py
"""
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
    if not cond:
        ok = False


def tag():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def born(age):
    t = date.today()
    return date(t.year - age, t.month, min(t.day, 28)).isoformat()


def register(age):
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"Demo {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
    })
    r.raise_for_status()
    return r.json()["tokens"]["access_token"]


def auth(t):
    return {"Authorization": f"Bearer {t}"} if t else {}


def make(path, tok, body):
    r = c.post(path, headers=auth(tok), json=body)
    r.raise_for_status()
    return r.json()["id"]


def listed(forum, tok=None, **params):
    r = c.get(f"/forums/{forum}/threads", params=params, headers=auth(tok))
    r.raise_for_status()
    return [t["id"] for t in r.json()["items"]]


def opens(thread, tok=None):
    return c.get(f"/threads/{thread}", headers=auth(tok)).status_code == 200


adult, teen15, teen13 = register(30), register(15), register(13)
forum = make("/forums", adult, {"name": f"List age {tag()}"})

# Oldest first, so the hidden ones are the NEWEST and rank above the readable one.
plain = make(f"/forums/{forum}/threads", adult, {"title": "Picnic planning", "body": "Who is coming on Sunday?"})
time.sleep(0.2)
drinks = make(f"/forums/{forum}/threads", adult, {"title": "Vodka night planning", "body": "Who is getting drunk on Friday?"})
time.sleep(0.2)
explicit = make(f"/forums/{forum}/threads", adult, {"title": "Adults only", "body": "Full nudes and explicit sex, check my onlyfans"})
time.sleep(0.5)

print("\n== the list shows what the thread page would open ==")
for name, tok in (("a signed-out reader", None), ("a 13-year-old", teen13), ("a 15-year-old", teen15), ("an adult", adult)):
    ids = listed(forum, tok)
    openable = [t for t in (plain, drinks, explicit) if opens(t, tok)]
    check(f"{name}: the list is exactly the threads that open", sorted(ids) == sorted(openable), (ids, openable))

check("an adult sees all three", len(listed(forum, adult)) == 3)
check("a signed-out reader sees only the picnic", listed(forum) == [plain], listed(forum))
check("a 13-year-old does not get the alcohol thread", drinks not in listed(forum, teen13), listed(forum, teen13))

print("\n== paging counts only what is readable ==")
check("limit=1 returns the readable thread, not an empty page",
      listed(forum, limit=1) == [plain], listed(forum, limit=1))
check("offset=1 is past the end for a reader who may read one thread", listed(forum, limit=5, offset=1) == [])
full = listed(forum, teen15)
one_by_one = [x for i in range(len(full) + 2) for x in listed(forum, teen15, limit=1, offset=i)]
check("paging a teenager's list one thread at a time gives their whole list, in order",
      one_by_one == full and len(full) >= 1, (one_by_one, full))
check("an adult is not slowed or changed: limit=2 gives the two newest",
      listed(forum, adult, limit=2) == [explicit, drinks], listed(forum, adult, limit=2))

print("\n== the sorts follow the same rule ==")
r = c.post(f"/threads/{drinks}/replies", headers=auth(adult), json={"body": "Bring snacks please."}); r.raise_for_status()
c.post(f"/replies/{r.json()['id']}/accept", headers=auth(adult))
check("sort=unanswered for a signed-out reader still hides the alcohol thread",
      drinks not in listed(forum, sort="unanswered") and drinks not in listed(forum, sort="trending"))

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
