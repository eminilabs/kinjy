"""The AI thread summary: refused when short, produced when long, gated like the thread.

What is NOT covered here: that a minor's summary is built only from replies a
minor may read (the handler feeds the model `_visible_replies` for the viewer,
and the mock provider offers no echo to assert it through the API), and that a
dead ai-service answers 503 (it cannot be stopped from a test).

Run against the live stack:  python backend/tests/e2e_thread_summary.py
"""
import random
import string
import sys
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
c = httpx.Client(base_url=BASE, timeout=60)
ok = True
MIN_REPLIES = 8


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


def register(age=30):
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"Demo {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"]


def auth(t):
    return {"Authorization": f"Bearer {t}"}


def thread_in(tok, community_kind=None, replies=0):
    body = {"name": f"Summary forum {tag()}"}
    if community_kind:
        cm = c.post("/communities", headers=auth(tok), json={
            "name": f"{community_kind} {tag()}", "description": "Tomatoes, compost and rain",
            "kind": community_kind,
        })
        cm.raise_for_status()
        body["community_id"] = cm.json()["id"]
    forum = c.post("/forums", headers=auth(tok), json=body)
    forum.raise_for_status()
    fid = forum.json()["id"]
    t = c.post(f"/forums/{fid}/threads", headers=auth(tok), json={
        "title": f"When to plant tomatoes {tag()}", "body": "Which week is safe after the last frost?",
    })
    t.raise_for_status()
    tid = t.json()["id"]
    for i in range(replies):
        c.post(f"/threads/{tid}/replies", headers=auth(tok),
               json={"body": f"Reply {i}: wait until the soil is warm, then harden the seedlings."}
               ).raise_for_status()
    return fid, tid


owner_tok, owner = register()
outsider_tok, _ = register()

print("\n== a short thread is refused, with a reason ==")
_, short_id = thread_in(owner_tok, replies=3)
r = c.get(f"/threads/{short_id}/summary", headers=auth(owner_tok))
check("the summary route answers 200", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
d = r.json()
check("short thread: summarised is false", d.get("summarised") is False, d)
check("short thread: a reason is given", bool(d.get("reason")), d)
check("short thread: the count is reported", d.get("replies_counted") == 3, d)

print("\n== a long thread is summarised ==")
public_forum, long_id = thread_in(owner_tok, replies=MIN_REPLIES + 2)
r = c.get(f"/threads/{long_id}/summary", headers=auth(owner_tok))
check("long thread: 200", r.status_code == 200, f"{r.status_code} {r.text[:160]}")
d = r.json()
check("long thread: summarised is true", d.get("summarised") is True, d)
check("long thread: there is summary text", bool(d.get("summary")), d)
check("long thread: replies_counted is the whole thread", d.get("replies_counted") == MIN_REPLIES + 2, d)
check("long thread: says it is AI generated", d.get("provenance") == "ai_generated", d)
check("long thread: the mock flag is a boolean", isinstance(d.get("mock"), bool), d)

print("\n== a stored summary reaches the list and detail only when it exists ==")
r = c.get(f"/threads/{long_id}", headers=auth(owner_tok))
check("detail carries the ai_summary field", r.status_code == 200 and "ai_summary" in r.json(), r.text[:120])
r = c.get(f"/forums/{public_forum}/threads", headers=auth(owner_tok))
items = r.json().get("items", []) if r.status_code == 200 else []
check("list carries the ai_summary field", bool(items) and "ai_summary" in items[0], r.text[:120])
if d.get("mock"):
    check("a mock summary is not stored", items and items[0]["ai_summary"] is None, items[:1])

print("\n== a signed-out viewer on a public thread ==")
r = c.get(f"/threads/{long_id}/summary")
check("anonymous gets an answer, not an error", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
check("and it states whether it summarised", "summarised" in r.json(), r.text[:120])

print("\n== the summary does not open a thread its reader cannot open ==")
_, secret_id = thread_in(owner_tok, community_kind="secret", replies=MIN_REPLIES + 1)
r = c.get(f"/threads/{secret_id}/summary", headers=auth(outsider_tok))
check("an outsider gets 404 on a secret community's thread", r.status_code == 404, f"{r.status_code}")
r = c.get(f"/threads/{secret_id}/summary")
check("so does a signed-out visitor", r.status_code == 404, f"{r.status_code}")
r = c.get(f"/threads/{secret_id}/summary", headers=auth(owner_tok))
check("the owner still gets the summary", r.status_code == 200 and r.json().get("summarised") is True,
      f"{r.status_code} {r.text[:120]}")
r = c.get("/threads/thr_doesnotexist/summary", headers=auth(owner_tok))
check("an unknown thread is 404", r.status_code == 404, f"{r.status_code}")

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
