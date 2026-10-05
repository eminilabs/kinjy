"""Digital Graveyard — regressions found by the audit, against the live API.

Each section below is a defect that was real before it was fixed, written as the
scenario that exposed it. e2e_graveyard.py covers the feature; this covers what
the feature got wrong. Run it the same way, with the platform's .env loaded.
"""
import base64
import os
import random
import string
import time
from datetime import date, datetime, timedelta, timezone

import httpx

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
MEMORIAL = os.environ.get("KINJY_MEMORIAL", "http://localhost:8206")
c = httpx.Client(base_url=BASE, timeout=60)
ok = True

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
        "email": f"{t}@example.com", "handle": f"{name}{t}", "display_name": f"Audit {name} {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"]


def auth(t):
    return {"Authorization": f"Bearer {t}"} if t else {}


def notifications(tok):
    r = c.get("/notifications?limit=50", headers=auth(tok))
    return r.json().get("items", []) if r.status_code == 200 else []


def notified(tok, needle, tries=8):
    for _ in range(tries):
        if any(needle in ((i.get("title") or "") + " " + (i.get("body") or "")) for i in notifications(tok)):
            return True
        time.sleep(1)
    return False


def connect(a_tok, a_id, b_tok, b_id):
    """Two members become connected: naming someone an administrator is contact,
    and a member's default is to accept contact only from people they know."""
    c.post(f"/connections/{b_id}", headers=auth(a_tok), json={})
    c.post(f"/connections/{a_id}/respond?accept=true", headers=auth(b_tok))


def make(tok, **extra):
    r = c.post("/memorials", headers=auth(tok), json={"full_name": f"Audit {tag()}", **extra})
    r.raise_for_status()
    return r.json()


owner_tok, owner = register(40, "own")
second_tok, second = register(41, "sec")
third_tok, third = register(42, "thr")
minor_tok, minor = register(14, "min")
visitor_tok, visitor = register(30, "vis")

connect(owner_tok, owner["id"], second_tok, second["id"])
connect(owner_tok, owner["id"], third_tok, third["id"])

# ---------------------------------------------------------------------------
try:
    print("\n== the succession is a ranking, not a free-for-all ==")
    m = make(owner_tok)
    mid = m["id"]
    check("the creator ranks first", m.get("admin_rank") == 1, m.get("admin_rank"))
    c.post(f"/memorials/{mid}/admins/{second['id']}", headers=auth(owner_tok))
    c.post(f"/memorials/{mid}/admins/{third['id']}", headers=auth(owner_tok))
    check("the others rank in the order they were added",
          c.get(f"/memorials/{mid}", headers=auth(third_tok)).json().get("admin_rank") == 3)

    r = c.delete(f"/memorials/{mid}/admins/{owner['id']}", headers=auth(third_tok))
    check("the last in line cannot remove the first", r.status_code == 403, r.status_code)
    r = c.delete(f"/memorials/{mid}/admins/{second['id']}", headers=auth(third_tok))
    check("nor the one ahead of them", r.status_code == 403, r.status_code)
    admins = c.get(f"/memorials/{mid}/admins", headers=auth(owner_tok)).json()["items"]
    check("so all three are still there", [a["user_id"] for a in admins] == [owner["id"], second["id"], third["id"]],
          [a["user_id"] for a in admins])
    r = c.delete(f"/memorials/{mid}", headers=auth(third_tok))
    check("and only the first can still delete", r.status_code == 403, r.status_code)

    r = c.delete(f"/memorials/{mid}/admins/{third['id']}", headers=auth(second_tok))
    check("an administrator can remove one ranked below them", r.status_code == 204, r.status_code)
    c.post(f"/memorials/{mid}/admins/{third['id']}", headers=auth(owner_tok))
    r = c.delete(f"/memorials/{mid}/admins/{third['id']}", headers=auth(third_tok))
    check("and anyone can step down", r.status_code == 204, r.status_code)
    r = c.delete(f"/memorials/{mid}/admins/{second['id']}", headers=auth(owner_tok))
    check("the first can remove anyone", r.status_code == 204, r.status_code)
    c.delete(f"/memorials/{mid}", headers=auth(owner_tok))
except Exception as exc:  # one broken section must not hide the others
    check("this section ran to the end", False, repr(exc))

try:
    print("\n== naming someone an administrator is contact, and follows the contact rules ==")
    m = make(owner_tok)
    mid = m["id"]
    r = c.post(f"/memorials/{mid}/admins/{minor['id']}", headers=auth(owner_tok))
    check("an adult cannot name an unconnected minor", r.status_code == 403, f"{r.status_code} {r.text[:120]}")
    check("and no word of it reaches the minor",
          not any("You now look after" in (i.get("title") or "") for i in notifications(minor_tok)))
    check("the refusal does not say why", "14" not in r.text and "minor" not in r.text.lower(), r.text[:160])
    r = c.post(f"/memorials/{mid}/admins/{second['id']}", headers=auth(owner_tok))
    check("another adult is still fine", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
    c.delete(f"/memorials/{mid}", headers=auth(owner_tok))
except Exception as exc:  # one broken section must not hide the others
    check("this section ran to the end", False, repr(exc))

try:
    print("\n== a family's own words do not wait for the family ==")
    m = make(owner_tok)  # moderation defaults to pending_approval
    mid = m["id"]
    r = c.post(f"/memorials/{mid}/tributes", headers=auth(owner_tok), json={"kind": "message", "body": "From the family."})
    check("an administrator's message goes up at once", r.status_code == 201 and r.json()["status"] == "approved",
          r.text[:160])
    r = c.post(f"/memorials/{mid}/tributes", headers=auth(visitor_tok), json={"kind": "message", "body": "From a member."})
    check("while a member's still waits", r.json().get("status") == "pending", r.text[:160])
    check("so the queue holds only what needs a decision",
          len(c.get(f"/memorials/{mid}/tributes/pending", headers=auth(owner_tok)).json()["items"]) == 1)
except Exception as exc:  # one broken section must not hide the others
    check("this section ran to the end", False, repr(exc))

try:
    print("\n== the guest book is not buried under candles ==")
    for _ in range(4):
        c.post(f"/memorials/{mid}/tributes", json={"kind": "candle"})
    c.post(f"/memorials/{mid}/tributes", json={"kind": "flower"})
    r = c.get(f"/memorials/{mid}/tributes?kind=message,photo")
    check("a list can ask for words and pictures only", r.status_code == 200 and
          {t["kind"] for t in r.json()["items"]} <= {"message", "photo"} and len(r.json()["items"]) == 1, r.text[:200])
    check("and says how many there are", r.json().get("total") == 1, r.json().get("total"))
    check("whatever the filter, the counts stay whole", r.json()["counts"].get("candle") == 4, r.json()["counts"])
    check("an unknown kind is refused, not ignored", c.get(f"/memorials/{mid}/tributes?kind=bogus").status_code == 422)
    for i in range(3):
        c.post(f"/memorials/{mid}/tributes", headers=auth(owner_tok), json={"kind": "message", "body": f"Memory {i}"})
    page1 = c.get(f"/memorials/{mid}/tributes?kind=message&limit=2").json()
    page2 = c.get(f"/memorials/{mid}/tributes?kind=message&limit=2&offset=2").json()
    ids = [t["id"] for t in page1["items"] + page2["items"]]
    check("pages follow one another without repeating", len(ids) == len(set(ids)) == 4 and page2["total"] == 4,
          (len(ids), page2.get("total")))
except Exception as exc:  # one broken section must not hide the others
    check("this section ran to the end", False, repr(exc))

try:
    print("\n== a location is only 'captured at the grave' if the device was precise enough ==")
    r = c.post(f"/memorials/{mid}/location", headers=auth(owner_tok),
               json={"lat": -4.88, "lng": 29.63, "captured_on_site": True, "accuracy_m": 12})
    check("a precise fix at the grave is verified", r.status_code == 200 and r.json()["verified"] is True, r.text[:160])
    check("and says how precise", r.json().get("accuracy_m") == 12, r.json())
    r = c.post(f"/memorials/{mid}/location", headers=auth(owner_tok),
               json={"lat": -4.88, "lng": 29.63, "captured_on_site": True, "accuracy_m": 4000})
    check("a coarse one — a desktop's network guess — is not", r.json().get("verified") is False, r.text[:160])
    r = c.post(f"/memorials/{mid}/location", headers=auth(owner_tok),
               json={"lat": -4.88, "lng": 29.63, "captured_on_site": True})
    check("a claim with no accuracy at all is not either", r.json().get("verified") is False, r.text[:160])
    r = c.post(f"/memorials/{mid}/location", headers=auth(owner_tok),
               json={"lat": -4.88, "lng": 29.63, "captured_on_site": True, "accuracy_m": -3})
    check("an impossible accuracy is refused", r.status_code == 422, r.status_code)
    shown = c.get(f"/memorials/{mid}").json()["grave"]
    check("a refused save changes nothing", shown.get("accuracy_m") is None and shown["verified"] is False, shown)
except Exception as exc:  # one broken section must not hide the others
    check("this section ran to the end", False, repr(exc))

try:
    print("\n== what is asked for is checked before it reaches a database or another service ==")
    r = c.post("/memorials", headers=auth(owner_tok), json={"full_name": "Long Id", "person_id": "p" * 200})
    check("an over-long person id is a 422, not a 500", r.status_code == 422, r.status_code)
    r = c.patch(f"/memorials/{mid}", headers=auth(owner_tok), json={"photo_media_id": "../../health"})
    check("a media id cannot be a path", r.status_code == 422, r.status_code)
    r = c.patch(f"/memorials/{mid}", headers=auth(owner_tok), json={"audio_media_id": "x" * 500})
    check("nor a novel", r.status_code == 422, r.status_code)
except Exception as exc:  # one broken section must not hide the others
    check("this section ran to the end", False, repr(exc))

try:
    print("\n== a death is reported once per person, not once per click ==")
    r1 = c.post(f"/memorials/{mid}/report-death", headers=auth(visitor_tok), json={"evidence": "A certificate from the registry."})
    r2 = c.post(f"/memorials/{mid}/report-death", headers=auth(visitor_tok), json={"evidence": "A certificate from the registry."})
    check("the first report is taken", r1.status_code == 201, r1.text[:160])
    check("the same person's second is not queued again", r2.status_code == 409, f"{r2.status_code} {r2.text[:160]}")
    r3 = c.post(f"/memorials/{mid}/report-death", headers=auth(second_tok), json={"evidence": "I was at the funeral, in Kigoma."})
    check("someone else can add their own", r3.status_code == 201, r3.text[:160])
except Exception as exc:  # one broken section must not hide the others
    check("this section ran to the end", False, repr(exc))

try:
    print("\n== a stranger's words are not pushed at a child ==")
    secret = f"zebra{tag()}"
    kid = make(minor_tok)
    c.post(f"/memorials/{kid['id']}/tributes", json={"kind": "message", "body": f"Thinking of you {secret}"})
    check("the child is told something is waiting", notified(minor_tok, "is waiting for you"))
    check("but not what a stranger wrote",
          not any(secret in ((i.get("body") or "") + (i.get("title") or "")) for i in notifications(minor_tok)))
    adult = make(owner_tok)
    c.post(f"/memorials/{adult['id']}/tributes", json={"kind": "message", "body": f"Thinking of you {secret}"})
    check("an adult still gets the preview", notified(owner_tok, secret))
    c.delete(f"/memorials/{kid['id']}", headers=auth(minor_tok))
    c.delete(f"/memorials/{adult['id']}", headers=auth(owner_tok))
except Exception as exc:  # one broken section must not hide the others
    check("this section ran to the end", False, repr(exc))

try:
    print("\n== reminders keep coming after a long outage ==")
    target = None
    for ahead in range(12, 27):
        d = date.today() + timedelta(days=ahead)
        if d.day <= 28:
            target = d
            break
    r = c.post("/memorials", headers=auth(owner_tok), json={
        "full_name": f"Outage {tag()}", "death_date": date(2015, target.month, target.day).isoformat(),
    })
    rid = r.json()["id"]
    due = c.get(f"/memorials/{rid}/reminders", headers=auth(owner_tok)).json()["items"]
    check("all three reminders are scheduled", len(due) == 3, len(due))
    last = max(d["due_at"] for d in due)
    at = (datetime.fromisoformat(last.replace("Z", "+00:00")) + timedelta(minutes=1)).isoformat()
    r = httpx.post(f"{MEMORIAL}/internal/reminders/sweep", params={"now": at}, timeout=60)
    check("a sweep after a long silence sends what is still worth sending", r.status_code == 200 and r.json()["sent"] >= 1,
          r.text[:160])
    nxt = c.get(f"/memorials/{rid}/reminders", headers=auth(owner_tok)).json()["items"]
    check("and the series carries on into next year", len(nxt) >= 1 and all(d["due_at"] > last for d in nxt), nxt)
    c.delete(f"/memorials/{rid}", headers=auth(owner_tok))
    c.delete(f"/memorials/{mid}", headers=auth(owner_tok))
except Exception as exc:  # one broken section must not hide the others
    check("this section ran to the end", False, repr(exc))

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
raise SystemExit(0 if ok else 1)
