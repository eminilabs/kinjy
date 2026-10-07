"""The thread list carries a short preview of each body, behind the same door.

Run against the live stack:  python backend/tests/e2e_thread_preview.py
"""
import random
import string
import sys
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


def register(age=30):
    t = tag()
    today = date.today()
    dob = date(today.year - age, today.month, min(today.day, 28)).isoformat()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"Demo {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": dob, "country": "US",
    })
    r.raise_for_status()
    return r.json()["tokens"]["access_token"]


def auth(t):
    return {"Authorization": f"Bearer {t}"}


owner = register()
outsider = register()

r = c.post("/forums", headers=auth(owner), json={"name": f"Preview {tag()}"})
r.raise_for_status()
forum = r.json()["id"]


def post(title, body):
    r = c.post(f"/forums/{forum}/threads", headers=auth(owner), json={"title": title, "body": body})
    r.raise_for_status()
    return r.json()["id"]


long_id = post("Long one", "word " * 200)
short_id = post("Short one", "Who is going on Saturday?")
lines_id = post("Lines one", "first line\n\n  second\tline\nthird")

print("\n== preview in the thread list ==")
r = c.get(f"/forums/{forum}/threads", headers=auth(owner))
check("list answers 200", r.status_code == 200, f"{r.status_code}")
items = {t["id"]: t for t in r.json()["items"]}

p = items[long_id]["preview"]
check("long body is cut to about 200 characters", 0 < len(p) <= 201, f"{len(p)}")
check("a cut preview ends in an ellipsis", p.endswith("…"), p[-5:])
check("short body comes back whole", items[short_id]["preview"] == "Who is going on Saturday?",
      items[short_id]["preview"])
check("line breaks and tabs become single spaces",
      items[lines_id]["preview"] == "first line second line third", repr(items[lines_id]["preview"]))

print("\n== the preview does not open a secret door ==")
r = c.post("/communities", headers=auth(owner), json={
    "name": f"secret {tag()}", "description": "Tomatoes, compost and rain", "kind": "secret",
})
r.raise_for_status()
cid = r.json()["id"]
r = c.post("/forums", headers=auth(owner), json={"name": f"Hidden {tag()}", "community_id": cid})
r.raise_for_status()
hidden = r.json()["id"]
c.post(f"/forums/{hidden}/threads", headers=auth(owner),
       json={"title": "Secret plans", "body": "Not for outsiders"}).raise_for_status()
r = c.get(f"/forums/{hidden}/threads", headers=auth(outsider))
check("an outsider still gets 404 on the secret forum's list", r.status_code == 404, f"{r.status_code}")
r = c.get(f"/forums/{hidden}/threads", headers=auth(owner))
check("the owner sees the preview there", r.status_code == 200
      and r.json()["items"][0]["preview"] == "Not for outsiders", f"{r.status_code} {r.text[:100]}")

print("\nALL CHECKS PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
