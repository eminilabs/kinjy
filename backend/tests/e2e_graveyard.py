"""The Digital Graveyard, against the live API.

A memorial is visited by people who never made an account — a QR code on a
headstone is scanned by whoever stands in front of it — and it is looked after
by a grieving family. Both halves are checked: what a visitor can reach and
leave, and what only the family can see, approve or change.

Run with the platform's .env loaded (JWT_SECRET): the death-verification queue
is for platform administrators, and no account here is one, so the test signs
an administrator token itself, the way a support tool would.
"""
import base64
import os
import random
import string
import sys
import time
from datetime import date, datetime, timedelta, timezone

import httpx

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
MEMORIAL = os.environ.get("KINJY_MEMORIAL", "http://localhost:8206")
c = httpx.Client(base_url=BASE, timeout=60)
ok = True

# A 1x1 PNG, enough for media-service to accept as an image.
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


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


def register(age, name="u"):
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"{name}{t}", "display_name": f"Grave {name} {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"]


def auth(t):
    return {"Authorization": f"Bearer {t}"} if t else {}


def connect(a_tok, a_id, b_tok, b_id):
    """Two members become connected: naming someone an administrator is contact,
    and a member's default is to accept contact only from people they know."""
    c.post(f"/connections/{b_id}", headers=auth(a_tok), json={})
    c.post(f"/connections/{a_id}/respond?accept=true", headers=auth(b_tok))


def upload_png(tok):
    r = c.post("/media/upload", headers=auth(tok), files={"file": ("p.png", PNG, "image/png")})
    r.raise_for_status()
    return r.json()["id"]


def notified(tok, needle, tries=8):
    for _ in range(tries):
        r = c.get("/notifications?limit=50", headers=auth(tok))
        items = r.json().get("items", []) if r.status_code == 200 else []
        if any(needle in ((i.get("title") or "") + " " + (i.get("body") or "")) for i in items):
            return True
        time.sleep(1)
    return False


owner_tok, owner = register(40, "own")
co_tok, co = register(41, "coa")
third_tok, third = register(42, "thr")
fourth_tok, fourth = register(43, "fou")
visitor_tok, visitor = register(30, "vis")
staff_tok, staff = register(45, "stf")

connect(owner_tok, owner["id"], co_tok, co["id"])
connect(owner_tok, owner["id"], third_tok, third["id"])

print("\n== a memorial is created with its dates checked ==")
r = c.post("/memorials", headers=auth(owner_tok), json={
    "full_name": "  Amina   Juma  ", "birth_date": "1940-03-02", "death_date": "2020-07-14",
})
check("create answers 201", r.status_code == 201, r.text[:200])
m = r.json() if r.status_code == 201 else {}
mid, qr = m.get("id"), m.get("qr_code")
check("the name is tidied", m.get("full_name") == "Amina Juma", m.get("full_name"))
check("its creator administers it", m.get("is_admin") is True, m)
check("its QR link points at a page that exists", m.get("qr_url", "").endswith(f"/memorial/{qr}"), m.get("qr_url"))
for label, body, code in (
    ("a blank name", {"full_name": "   "}, 422),
    ("a death in the future", {"full_name": "Future", "death_date": (date.today() + timedelta(days=3)).isoformat()}, 400),
    ("a death before the birth", {"full_name": "Odd", "birth_date": "1990-01-01", "death_date": "1980-01-01"}, 400),
    ("a faith style with no source", {"full_name": "Faith", "faith_style": "christian"}, 400),
):
    r = c.post("/memorials", headers=auth(owner_tok), json=body)
    check(f"{label} is refused", r.status_code == code, f"{r.status_code} {r.text[:120]}")
r = c.post("/memorials", headers=auth(owner_tok), json={"full_name": "Leap Day", "death_date": "2016-02-29"})
check("a death on 29 February can be recorded", r.status_code == 201, r.text[:160])
if r.status_code == 201:
    rem = c.get(f"/memorials/{r.json()['id']}/reminders", headers=auth(owner_tok)).json().get("items", [])
    check("and its anniversary reminders are scheduled", len(rem) >= 1, rem)
    c.delete(f"/memorials/{r.json()['id']}", headers=auth(owner_tok))

print("\n== a public memorial is open to anyone; a private one to its family only ==")
check("a visitor without an account can open it", c.get(f"/memorials/{mid}").status_code == 200)
check("and reach it by its QR code", c.get(f"/memorials/qr/{qr}").status_code == 200)
r = c.post("/memorials", headers=auth(owner_tok), json={"full_name": "Kept Private", "visibility": "private"})
priv = r.json()["id"]
priv_qr = r.json()["qr_code"]
check("a private memorial is a 404 to another member", c.get(f"/memorials/{priv}", headers=auth(visitor_tok)).status_code == 404)
check("and to a visitor", c.get(f"/memorials/{priv}").status_code == 404)
check("and by its QR code", c.get(f"/memorials/qr/{priv_qr}").status_code == 404)
check("and its tributes", c.get(f"/memorials/{priv}/tributes").status_code == 404)
check("nobody can leave one there", c.post(f"/memorials/{priv}/tributes", json={"kind": "candle"}).status_code == 404)
listing = [x["id"] for x in c.get("/memorials?q=Kept Private&limit=50").json()["items"]]
check("it is not in the public listing", priv not in listing, listing)
mine = [x["id"] for x in c.get("/memorials?mine=true&limit=100", headers=auth(owner_tok)).json()["items"]]
check("but it is in its administrator's own list", priv in mine and mid in mine, mine)
r = c.patch(f"/memorials/{priv}", headers=auth(owner_tok), json={"visibility": "public"})
check("making it public opens it", r.status_code == 200 and c.get(f"/memorials/{priv}").status_code == 200, r.text[:160])
c.delete(f"/memorials/{priv}", headers=auth(owner_tok))

print("\n== tributes: a gesture goes up, words wait for the family ==")
r = c.post(f"/memorials/{mid}/tributes", json={"kind": "candle", "author_name": "Somebody Rude"})
check("a visitor's candle is placed at once", r.status_code == 201 and r.json()["status"] == "approved", r.text[:160])
items = c.get(f"/memorials/{mid}/tributes").json()["items"]
check("signed simply 'A visitor' — a candle carries no typed name", items and items[0]["author_name"] == "A visitor", items[:1])
r = c.post(f"/memorials/{mid}/tributes", json={"kind": "message", "author_name": "Cousin Ama", "body": "Rest well, auntie."})
anon_msg = r.json().get("id")
check("a visitor's message is held for approval", r.status_code == 201 and r.json()["status"] == "pending", r.text[:160])
check("and is not on the page yet", anon_msg not in [x["id"] for x in c.get(f"/memorials/{mid}/tributes").json()["items"]])
r = c.post(f"/memorials/{mid}/tributes", headers=auth(visitor_tok),
           json={"kind": "message", "author_name": "Someone Else", "body": "With love from Kigoma."})
member_msg = r.json().get("id")
check("a member's message is held too while the memorial moderates", r.json().get("status") == "pending", r.text[:160])
check("the family is told a tribute is waiting", notified(owner_tok, "is waiting for you"))
check("a message needs words", c.post(f"/memorials/{mid}/tributes", json={"kind": "message", "body": "  "}).status_code == 400)
check("a non-admin cannot see the queue", c.get(f"/memorials/{mid}/tributes/pending", headers=auth(visitor_tok)).status_code == 403)
queue = c.get(f"/memorials/{mid}/tributes/pending", headers=auth(owner_tok)).json()["items"]
qids = {x["id"]: x for x in queue}
check("the administrator sees both waiting", anon_msg in qids and member_msg in qids, list(qids))
check("the member signs with their own name, not a typed one",
      qids.get(member_msg, {}).get("author_name") == visitor["display_name"], qids.get(member_msg))
check("the visitor's typed name is kept", qids.get(anon_msg, {}).get("author_name") == "Cousin Ama", qids.get(anon_msg))
r = c.post(f"/memorials/{mid}/tributes/{member_msg}/moderate?decision=approved", headers=auth(visitor_tok))
check("a non-admin cannot approve", r.status_code == 403, r.status_code)
for t in (anon_msg, member_msg):
    c.post(f"/memorials/{mid}/tributes/{t}/moderate?decision=approved", headers=auth(owner_tok))
shown = [x["id"] for x in c.get(f"/memorials/{mid}/tributes").json()["items"]]
check("approved, both appear", anon_msg in shown and member_msg in shown, shown)
check("the member is told theirs is up", notified(visitor_tok, "is on the memorial"))
c.post(f"/memorials/{mid}/tributes/{anon_msg}/moderate?decision=rejected", headers=auth(owner_tok))
check("an approved tribute can be taken down again",
      anon_msg not in [x["id"] for x in c.get(f"/memorials/{mid}/tributes").json()["items"]])
r = c.patch(f"/memorials/{mid}", headers=auth(owner_tok), json={"moderation": "open"})
check("the family can open the guest book", r.status_code == 200 and r.json()["moderation"] == "open", r.text[:160])
r = c.post(f"/memorials/{mid}/tributes", headers=auth(visitor_tok), json={"kind": "message", "body": "Open now."})
check("then a member's words go up at once", r.json().get("status") == "approved", r.text[:160])
r = c.post(f"/memorials/{mid}/tributes", json={"kind": "message", "body": "Passer-by."})
check("but a visitor's still wait", r.json().get("status") == "pending", r.text[:160])

print("\n== the family edits the page; files must be their own ==")
r = c.patch(f"/memorials/{mid}", headers=auth(visitor_tok), json={"biography": "hijack"})
check("a non-admin cannot edit", r.status_code == 403, r.status_code)
r = c.patch(f"/memorials/{mid}", headers=auth(owner_tok), json={"biography": "  A teacher in Kigoma for forty years.  "})
check("the biography is saved, trimmed", r.json().get("biography") == "A teacher in Kigoma for forty years.", r.text[:160])
r = c.patch(f"/memorials/{mid}", headers=auth(owner_tok), json={"death_date": "1930-01-01"})
check("a death before the birth is refused on edit too", r.status_code == 400, r.text[:160])
photo = upload_png(owner_tok)
r = c.patch(f"/memorials/{mid}", headers=auth(owner_tok), json={"photo_media_id": photo})
check("a portrait can be added", r.status_code == 200 and r.json().get("photo_url"), r.text[:200])
anon_view = c.get(f"/memorials/{mid}").json()
check("a visitor is given a signed link to it", "s=" in (anon_view.get("photo_url") or "") and "v=anon" in anon_view["photo_url"], anon_view.get("photo_url"))
img = httpx.get(anon_view["photo_url"], timeout=30)
check("which opens", img.status_code == 200 and img.content == PNG, img.status_code)
unsigned = anon_view["photo_url"].split("?")[0]
check("while the bare link does not", httpx.get(unsigned, timeout=30).status_code == 404)
theirs = upload_png(visitor_tok)
r = c.patch(f"/memorials/{mid}", headers=auth(owner_tok), json={"photo_media_id": theirs})
check("somebody else's file cannot be attached", r.status_code == 400, r.text[:160])
r = c.patch(f"/memorials/{mid}", headers=auth(owner_tok), json={"photo_media_id": None})
check("and the portrait can be removed", r.status_code == 200 and r.json().get("photo_url") is None, r.text[:160])
r = c.post(f"/memorials/{mid}/tributes", headers=auth(visitor_tok), json={"kind": "photo", "media_id": theirs})
check("a member can share their own photo as a tribute", r.status_code == 201, r.text[:160])
r = c.post(f"/memorials/{mid}/tributes", json={"kind": "photo", "media_id": theirs})
check("a visitor without an account cannot", r.status_code == 401, r.text[:160])

print("\n== the life timeline ==")
for body, code, label in (
    ({"year": 1962, "title": "Married Juma"}, 201, "a year alone is enough"),
    ({"year": 1965, "month": 9, "day": 1, "title": "First day as a teacher"}, 201, "a full date is kept"),
    ({"year": 1970, "month": 2, "day": 30, "title": "Impossible"}, 400, "30 February is refused"),
    ({"year": 1970, "day": 4, "title": "No month"}, 400, "a day without its month is refused"),
    ({"year": date.today().year + 1, "title": "Later"}, 400, "a year in the future is refused"),
    ({"year": 1980, "title": "   "}, 422, "a blank title is refused"),
):
    r = c.post(f"/memorials/{mid}/events", headers=auth(owner_tok), json=body)
    check(label, r.status_code == code, f"{r.status_code} {r.text[:120]}")
r = c.post(f"/memorials/{mid}/events", headers=auth(visitor_tok), json={"year": 1990, "title": "x"})
check("a non-admin cannot add a moment", r.status_code == 403, r.status_code)
ev = c.get(f"/memorials/{mid}/events").json()["items"]
check("a visitor reads the timeline in order", [e["year"] for e in ev] == [1962, 1965], ev)
c.delete(f"/memorials/{mid}/events/{ev[0]['id']}", headers=auth(owner_tok))
check("a moment can be removed", len(c.get(f"/memorials/{mid}/events").json()["items"]) == 1)

print("\n== the grave location is captured, never invented ==")
r = c.post(f"/memorials/{mid}/location", headers=auth(owner_tok), json={"lat": -4.88, "lng": 29.63, "label": "Kigoma cemetery"})
check("coordinates typed from memory are not verified", r.status_code == 200 and r.json()["verified"] is False, r.text[:160])
r = c.post(f"/memorials/{mid}/location", headers=auth(owner_tok), json={"lat": -4.88, "lng": 29.63, "captured_on_site": True, "accuracy_m": 12})
check("captured on site, they are", r.json().get("verified") is True, r.text[:160])
r = c.post(f"/memorials/{mid}/location", headers=auth(visitor_tok), json={"lat": 1, "lng": 1})
check("a non-admin cannot move the grave", r.status_code == 403, r.status_code)
check("the location can be cleared", c.delete(f"/memorials/{mid}/location", headers=auth(owner_tok)).status_code == 204)

print("\n== up to three administrators, with a succession ==")
r = c.post(f"/memorials/{mid}/admins/{co['id']}", headers=auth(owner_tok))
check("a second administrator is added", r.status_code == 201 and r.json()["succession_order"] == 2, r.text[:160])
check("and told so", notified(co_tok, "You now look after the memorial"))
check("and receives the anniversary reminders",
      len(c.get(f"/memorials/{mid}/reminders", headers=auth(co_tok)).json().get("items", [])) >= 1)
r = c.post(f"/memorials/{mid}/admins/usr_nobody", headers=auth(owner_tok))
check("an unknown member cannot be added", r.status_code == 404, r.text[:160])
c.post(f"/memorials/{mid}/admins/{third['id']}", headers=auth(owner_tok))
r = c.post(f"/memorials/{mid}/admins/{fourth['id']}", headers=auth(owner_tok))
check("a fourth is refused", r.status_code == 400, r.text[:160])
check("a second administrator cannot delete the memorial",
      c.delete(f"/memorials/{mid}", headers=auth(co_tok)).status_code == 403)
c.delete(f"/memorials/{mid}/admins/{co['id']}", headers=auth(owner_tok))
admins = c.get(f"/memorials/{mid}/admins", headers=auth(owner_tok)).json()["items"]
check("removing one closes up the succession", [a["succession_order"] for a in admins] == [1, 2], admins)
check("and stops their reminders", c.get(f"/memorials/{mid}/reminders", headers=auth(co_tok)).status_code == 403)
c.delete(f"/memorials/{mid}/admins/{third['id']}", headers=auth(owner_tok))
r = c.delete(f"/memorials/{mid}/admins/{owner['id']}", headers=auth(owner_tok))
check("the last administrator cannot leave", r.status_code == 400, r.text[:160])

print("\n== anniversary reminders are actually sent ==")
soon = date.today() + timedelta(days=2)
r = c.post("/memorials", headers=auth(owner_tok), json={
    "full_name": f"Reminder {tag()}", "death_date": date(2015, soon.month, min(soon.day, 28)).isoformat(),
})
rid = r.json()["id"]
rname = r.json()["full_name"]
due = c.get(f"/memorials/{rid}/reminders", headers=auth(owner_tok)).json()["items"]
check("only reminders still ahead are scheduled", due and all(datetime.fromisoformat(d["due_at"].replace("Z", "+00:00")) > datetime.now(timezone.utc) for d in due), due)
last = max(due, key=lambda d: d["due_at"])
at = (datetime.fromisoformat(last["due_at"].replace("Z", "+00:00")) + timedelta(minutes=1)).isoformat()
r = httpx.post(f"{MEMORIAL}/internal/reminders/sweep", params={"now": at}, timeout=60)
check("the sweep sends what is due", r.status_code == 200 and r.json()["sent"] >= 1, r.text[:160])
check("the family receives it", notified(owner_tok, f"the anniversary of {rname}"))
nxt = c.get(f"/memorials/{rid}/reminders", headers=auth(owner_tok)).json()["items"]
check("and next year's are scheduled", nxt and all(d["due_at"][:4] > str(date.today().year) or d["due_at"] > last["due_at"] for d in nxt), nxt)
r = httpx.post(f"{MEMORIAL}/internal/reminders/sweep", params={"now": at}, timeout=60)
check("a second sweep sends nothing twice", r.json().get("sent") == 0, r.text[:160])
c.delete(f"/memorials/{rid}", headers=auth(owner_tok))

print("\n== a reported death is verified by the platform ==")
r = c.post(f"/memorials/{mid}/report-death", headers=auth(visitor_tok), json={"evidence": "short"})
check("a report needs real evidence", r.status_code == 422, r.status_code)
doc = upload_png(visitor_tok)
r = c.post(f"/memorials/{mid}/report-death", headers=auth(visitor_tok),
           json={"evidence": "Death certificate from Kigoma district office.", "document_media_id": doc})
check("a member can report it", r.status_code == 201 and r.json()["death_status"] == "reported", r.text[:160])
check("the queue is for platform staff only", c.get("/admin/memorials/death-reports", headers=auth(visitor_tok)).status_code in (401, 403))
sys.path.insert(0, "/app")
from common import security  # noqa: E402

staff_admin = security.create_access_token(user_id=staff["id"], role="admin", handle=staff["handle"])
queue = c.get("/admin/memorials/death-reports", headers=auth(staff_admin)).json()["items"]
entry = next((x for x in queue if x["id"] == mid), None)
check("staff see it with the evidence", entry and entry["reports"][0]["evidence"].startswith("Death certificate"), queue[:1])
check("and a signed link to the document", entry and "s=" in (entry["reports"][0]["document_url"] or ""), entry)
r = c.post(f"/admin/memorials/{mid}/review", headers=auth(staff_admin))
check("taking it under review", r.json().get("death_status") == "under_review", r.text[:160])
check("the family sees that someone is looking", c.get(f"/memorials/{mid}").json()["death_status"] == "under_review")
r = c.post(f"/admin/memorials/{mid}/verify-death?outcome=verified", headers=auth(staff_admin))
check("verifying it", r.json().get("death_status") == "verified", r.text[:160])
check("the family is told", notified(owner_tok, "is verified"))
r = c.post(f"/memorials/{mid}/report-death", headers=auth(visitor_tok), json={"evidence": "Another certificate copy."})
check("a verified death cannot be reported again", r.status_code == 400, r.text[:160])

print("\n== deleting ==")
check("the first administrator can delete", c.delete(f"/memorials/{mid}", headers=auth(owner_tok)).status_code == 204)
check("and it is gone", c.get(f"/memorials/{mid}").status_code == 404)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
