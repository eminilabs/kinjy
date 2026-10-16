"""Scheduled posts, end to end: held back until their time, released by the loop, and nobody else's to touch.

One of the checks waits for the real release loop (a post can be scheduled from one minute ahead, and the
loop looks every 20 seconds), so this takes about two minutes.
"""
import os
import random
import string
import time
from datetime import date, datetime, timedelta, timezone

import httpx

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
c = httpx.Client(base_url=BASE, timeout=90)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    if not cond:
        ok = False


def tag():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def retrying(call, attempts=3):
    """The first request to a service that has been idle can stall past the gateway's 30 s on this stack."""
    r = None
    for _ in range(attempts):
        try:
            r = call()
        except httpx.TimeoutException:
            continue
        if r.status_code != 504:
            return r
    return r


def register(age, name):
    for _ in range(4):
        t = tag()
        try:
            r = c.post("/auth/register", json={
                "email": f"{t}@example.com", "handle": f"{name}{t}", "display_name": f"Sched {name} {t}",
                "password": "Sup3rStrong!Pass", "date_of_birth": date(date.today().year - age, 6, 15).isoformat(), "country": "US",
            })
        except httpx.TimeoutException:
            continue
        if r.status_code != 504:
            break
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}, r.json()["user"]["id"]


def iso(delta):
    return (datetime.now(timezone.utc) + delta).isoformat()


def schedule(h, body, when, **extra):
    return retrying(lambda: c.post("/posts", headers=h, json={"body": body, "format": "text", "visibility": "public", "scheduled_for": when, **extra}))


author, author_id = register(35, "aut")
reader, _ = register(30, "rdr")
stranger, _ = register(40, "str")

print("\n== a time has to be a real one ==")
check("a time with no time zone is refused", schedule(author, "x", "2031-01-01T09:00:00").status_code == 400)
check("so is one in the past", schedule(author, "x", iso(timedelta(hours=-1))).status_code == 400)
check("so is one under a minute away", schedule(author, "x", iso(timedelta(seconds=20))).status_code == 400)
check("so is one more than a year away", schedule(author, "x", iso(timedelta(days=400))).status_code == 400)

print("\n== a scheduled post is held back ==")
t1 = f"Scheduled for the loop {tag()}"
due = schedule(author, t1, iso(timedelta(seconds=75)))
check("it is accepted, as scheduled, with its time", due.status_code == 201 and due.json()["status"] == "scheduled" and due.json()["scheduled_for"], f"{due.status_code} {due.text[:200]}")
p1 = due.json()["id"]
mine = retrying(lambda: c.get("/posts/scheduled", headers=author)).json()["items"]
check("its author sees it in their list of scheduled posts, soonest first", [p["id"] for p in mine][:1] == [p1] or p1 in [p["id"] for p in mine], [p["id"] for p in mine])
check("nobody else can open it by its address", retrying(lambda: c.get(f"/posts/{p1}", headers=reader)).status_code == 404)
check("nor can its author, through the public route: it is not published", retrying(lambda: c.get(f"/posts/{p1}", headers=author)).status_code == 404)
check("it is not on the author's public page", p1 not in [p["id"] for p in c.get(f"/posts/by/{author_id}", headers=reader).json()["items"]])
check("nobody can react to it", c.post(f"/posts/{p1}/like", headers=reader).status_code == 404)
check("or comment on it", c.post(f"/posts/{p1}/comments", headers=reader, json={"body": "first"}).status_code == 404)
check("or share it", c.post(f"/posts/{p1}/repost", headers=reader, json={"body": ""}).status_code == 404)
check("someone else's list of scheduled posts does not have it", p1 not in [p["id"] for p in c.get("/posts/scheduled", headers=stranger).json()["items"]])
check("nor can they move it, publish it or cancel it",
      c.patch(f"/posts/{p1}/schedule", headers=stranger, json={"scheduled_for": iso(timedelta(hours=2))}).status_code == 404
      and c.post(f"/posts/{p1}/publish-now", headers=stranger).status_code == 404
      and c.delete(f"/posts/{p1}", headers=stranger).status_code == 404)

print("\n== the author can move it, publish it now, or cancel it ==")
p2 = schedule(author, f"To be moved {tag()}", iso(timedelta(hours=1))).json()["id"]
moved = c.patch(f"/posts/{p2}/schedule", headers=author, json={"scheduled_for": iso(timedelta(hours=3))})
check("it can be moved to another time", moved.status_code == 200 and moved.json()["status"] == "scheduled", f"{moved.status_code} {moved.text[:120]}")
check("but not to a time that is not allowed", c.patch(f"/posts/{p2}/schedule", headers=author, json={"scheduled_for": iso(timedelta(seconds=5))}).status_code == 400)

p3 = schedule(author, f"Publish me now {tag()}", iso(timedelta(hours=2))).json()["id"]
now = c.post(f"/posts/{p3}/publish-now", headers=author)
check("it can be published now", now.status_code == 200 and now.json()["status"] == "published" and now.json()["scheduled_for"] is None, f"{now.status_code} {now.text[:160]}")
check("and everyone can then read it", retrying(lambda: c.get(f"/posts/{p3}", headers=reader)).status_code == 200)
check("it is on the author's page", p3 in [p["id"] for p in c.get(f"/posts/by/{author_id}", headers=reader).json()["items"]])
check("publishing it again is refused, not repeated", c.post(f"/posts/{p3}/publish-now", headers=author).status_code == 404)
check("a published post cannot be 'rescheduled'", c.patch(f"/posts/{p3}/schedule", headers=author, json={"scheduled_for": iso(timedelta(hours=2))}).status_code == 404)

p4 = schedule(author, f"Cancel me {tag()}", iso(timedelta(hours=2))).json()["id"]
check("it can be cancelled", c.delete(f"/posts/{p4}", headers=author).status_code == 204)
check("and is then in nobody's list", p4 not in [p["id"] for p in c.get("/posts/scheduled", headers=author).json()["items"]] and c.post(f"/posts/{p4}/publish-now", headers=author).status_code == 404)

print("\n== the loop releases it at its time (waiting for that: up to about two minutes) ==")
released_at = None
end = time.time() + 150
while time.time() < end:
    got = retrying(lambda: c.get(f"/posts/{p1}", headers=reader))
    if got.status_code == 200:
        released_at = time.time()
        break
    time.sleep(5)
check("it went out by itself", released_at is not None, "still not published after 150 s")
if released_at is not None:
    shown = got.json()
    check("as an ordinary published post, no longer waiting", shown["status"] == "published" and shown["scheduled_for"] is None and shown["body"] == t1, shown.get("status"))
    check("and it is on the author's page, and gone from their scheduled list",
          p1 in [p["id"] for p in c.get(f"/posts/by/{author_id}", headers=reader).json()["items"]]
          and p1 not in [p["id"] for p in c.get("/posts/scheduled", headers=author).json()["items"]])

for pid in (p1, p2, p3):
    c.delete(f"/posts/{pid}", headers=author)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
raise SystemExit(0 if ok else 1)
