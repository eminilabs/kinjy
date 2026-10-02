"""The reviewer's half of appeals. Local only, and deliberately so.

This test needs two staff accounts, and there is no API that grants the admin
role — by design. It promotes throwaway accounts with a direct UPDATE against
the development database, which is a reasonable thing to do to a local stack
and an unreasonable thing to do to production. So it refuses to run anywhere
else rather than leaving that decision to whoever types the command.

What it covers that the member-side test cannot:

* overturning actually restores reach — the teenager who could not see the post
  can see it afterwards, which is the only proof that an appeal did anything;
* the overturn is authoritative, so a later classifier pass cannot quietly
  re-impose the decision a human just found to be wrong;
* a reviewer cannot answer an appeal against their own decision.
"""
import os
import random
import string
import sys
import time
from datetime import date

import httpx
import psycopg2

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
SOCIAL = os.environ.get("KINJY_SOCIAL", "http://localhost:8203")
DSN = os.environ.get(
    "KINJY_DSN", "postgresql://kaluta:kaluta_dev_password@localhost:5445/kaluta"
)

if "localhost" not in BASE and "127.0.0.1" not in BASE:
    print("This test promotes accounts to admin. It only runs against a local stack.")
    sys.exit(2)

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


def register(age=30):
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"Demo {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"], f"{t}@example.com"


def promote(email):
    """Make this account staff, then sign in again for a token that says so."""
    with psycopg2.connect(DSN) as conn, conn.cursor() as cur:
        cur.execute("UPDATE auth.users SET role = 'admin' WHERE email = %s", (email,))
        conn.commit()
    r = c.post("/auth/login", json={"email": email, "password": "Sup3rStrong!Pass"})
    r.raise_for_status()
    return r.json()["tokens"]["access_token"]


def auth(t):
    return {"Authorization": f"Bearer {t}"}


probe = httpx.get(f"{SOCIAL}/health", timeout=10).json()
assert probe.get("service") == "social-service", f"wrong port: {probe}"
print("talking to social-service on the right port")

author_tok, author, _ = register()
teen_tok, _, _ = register(14)
_, _, admin_a_email = register()
_, _, admin_b_email = register()
admin_a = promote(admin_a_email)
admin_b = promote(admin_b_email)

r = c.get("/admin/moderation/appeals", headers=auth(admin_a))
check("a promoted account can read the queue", r.status_code == 200, r.text[:140])

print()
print("== overturning restores reach ==")
r = c.post("/posts", headers=auth(author_tok),
           json={"body": "Explicit sex and full nudes, link in bio", "visibility": "public"})
post_id = r.json().get("id") if r.status_code in (200, 201) else None
time.sleep(0.4)
r = c.get(f"/posts/{post_id}", headers=auth(teen_tok))
check("a 14-year-old cannot see the restricted post to begin with", r.status_code == 404,
      f"{r.status_code}")

r = c.get("/moderation/decisions", headers=auth(author_tok))
decision = next(
    (d for d in r.json().get("items", []) if d["content_id"] == post_id), None
)
check("the author has a decision to appeal", decision is not None, r.text[:160])
r = c.post(f"/moderation/decisions/{decision['id']}/appeal", headers=auth(author_tok),
           json={"grounds": "It is a link to my own licensed work."})
appeal_id = r.json().get("id") if r.status_code == 201 else None
check("the appeal opens", appeal_id is not None, r.text[:160])

r = c.get("/admin/moderation/appeals", headers=auth(admin_a))
queued = r.json().get("items", []) if r.status_code == 200 else []
mine = next((a for a in queued if a["id"] == appeal_id), None)
check("it is in the reviewer's queue", mine is not None, [a["id"] for a in queued][:4])
check("with the grounds the author gave",
      mine and "licensed" in (mine.get("grounds") or ""), mine)
check("and the rating that caused it", mine and mine.get("age_rating"), mine)
check("the queue reports how often we are wrong",
      "overturn_rate" in (r.json().get("stats") or {}), r.json().get("stats"))

r = c.post(f"/admin/moderation/appeals/{appeal_id}", headers=auth(admin_a),
           json={"overturn": True, "note": "Rated wrongly; it is a music video."})
check("the reviewer can overturn it", r.status_code == 200
      and r.json().get("status") == "overturned", r.text[:160])

time.sleep(0.4)
r = c.get(f"/posts/{post_id}", headers=auth(teen_tok))
check("the 14-year-old can now see it — the appeal did something",
      r.status_code == 200, f"{r.status_code}")

r = c.post(f"/admin/moderation/appeals/{appeal_id}", headers=auth(admin_b),
           json={"overturn": False})
check("an answered appeal cannot be answered again", r.status_code == 409,
      f"{r.status_code}")

r = c.get("/moderation/decisions", headers=auth(author_tok))
shown = next((d for d in r.json().get("items", []) if d["id"] == decision["id"]), {})
check("the author is shown the outcome",
      (shown.get("appeal") or {}).get("status") == "overturned", shown)
check("and the reviewer's reason",
      "music video" in ((shown.get("appeal") or {}).get("reviewer_note") or ""), shown)

print()
print("== the overturn outranks the classifier ==")
r = httpx.post(f"{SOCIAL}/internal/classification-backfill", timeout=30)
time.sleep(0.4)
r = c.get(f"/posts/{post_id}", headers=auth(teen_tok))
check("a later classification pass does not re-impose it", r.status_code == 200,
      f"{r.status_code}")

print()
print("== nobody answers an appeal against their own decision ==")
r = c.post("/posts", headers=auth(author_tok),
           json={"body": "A perfectly ordinary post about gardening.", "visibility": "public"})
second = r.json().get("id") if r.status_code in (200, 201) else None
time.sleep(0.3)
r = c.post(f"/admin/classification/{second}/review", headers=auth(admin_a),
           json={"age_rating": "ADULT_18_PLUS"})
check("a reviewer can restrict a post by hand", r.status_code == 200, r.text[:160])

r = c.get("/moderation/decisions", headers=auth(author_tok))
human = next(
    (d for d in r.json().get("items", [])
     if d["content_id"] == second and d["action"] == "human_review"), None
)
check("the author is told a person decided it", human is not None, r.text[:200])
check("and that it was a reviewer rather than the machine",
      human and human["decided_by"] == "a reviewer", human)

appeal2 = None
if human:
    r = c.post(f"/moderation/decisions/{human['id']}/appeal", headers=auth(author_tok),
               json={"grounds": "It is about tomatoes."})
    appeal2 = r.json().get("id") if r.status_code == 201 else None
check("the author can appeal a human decision", appeal2 is not None, r.text[:160])

r = c.post(f"/admin/moderation/appeals/{appeal2}", headers=auth(admin_a),
           json={"overturn": True})
check("the reviewer who made it cannot decide the appeal", r.status_code == 403,
      f"{r.status_code} {r.text[:140]}")
check("and is told why", "your own" in r.text.lower(), r.text[:140])

r = c.post(f"/admin/moderation/appeals/{appeal2}", headers=auth(admin_b),
           json={"overturn": True, "note": "Tomatoes."})
check("a different reviewer can", r.status_code == 200, f"{r.status_code} {r.text[:140]}")

print()
print("== upholding is recorded too ==")
r = c.post("/posts", headers=auth(author_tok),
           json={"body": "Explicit sex, full nudes, onlyfans link", "visibility": "public"})
third = r.json().get("id") if r.status_code in (200, 201) else None
time.sleep(0.4)
r = c.get("/moderation/decisions", headers=auth(author_tok))
d3 = next((d for d in r.json().get("items", []) if d["content_id"] == third), None)
r = c.post(f"/moderation/decisions/{d3['id']}/appeal", headers=auth(author_tok),
           json={"grounds": "no"})
appeal3 = r.json().get("id")
r = c.post(f"/admin/moderation/appeals/{appeal3}", headers=auth(admin_b),
           json={"overturn": False, "note": "The rating is right."})
check("an appeal can be upheld", r.status_code == 200
      and r.json().get("status") == "upheld", r.text[:160])
r = c.get(f"/posts/{third}", headers=auth(teen_tok))
check("and the restriction stays", r.status_code == 404, f"{r.status_code}")

r = c.get("/admin/moderation/appeals", headers=auth(admin_b))
stats = r.json().get("stats", {})
check("upheld appeals are counted, not only the successful ones",
      (stats.get("answered") or 0) >= 3, stats)
check("and the overturn rate is a real number", isinstance(stats.get("overturn_rate"), float),
      stats)

print()
print("== a reviewer's rating does not vouch for a later edit ==")
r = c.post("/posts", headers=auth(author_tok), json={"body": "Sunday hike by the lake", "visibility": "public"})
edited = r.json().get("id") if r.status_code in (200, 201) else None
time.sleep(0.4)
r = c.post(f"/admin/classification/{edited}/review", headers=auth(admin_a), json={"age_rating": "GENERAL"})
check("a reviewer confirms a harmless post as GENERAL", r.status_code == 200, r.text[:160])
r = c.patch(f"/posts/{edited}", headers=auth(author_tok),
            json={"body": "Explicit sex and full nudes, link in bio", "visibility": "public"})
check("the author then edits it into adult content", r.status_code == 200, r.text[:160])
r = c.get(f"/posts/{edited}", headers=auth(teen_tok))
check("the 14-year-old can no longer open it, confirmed rating or not", r.status_code == 404, f"{r.status_code}")
r = httpx.get(f"{SOCIAL}/internal/classification/{edited}", timeout=10)
check("and it is back in front of a reviewer", r.json().get("human_review_status") == "pending", r.text[:200])

print()
print("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE")
sys.exit(0 if ok else 1)
