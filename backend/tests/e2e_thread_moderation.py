"""Thread moderation: pin, lock, duplicate.

Stewards (owner or moderator) of the thread's community pin, lock and mark
duplicates. Everyone else is refused; an outsider to a secret community gets the
404 reading would give. A locked thread stays readable but takes no replies,
except from stewards. A forum outside any community has no moderators.

Run against the live stack:  python backend/tests/e2e_thread_moderation.py
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


def community(tok, kind):
    r = c.post("/communities", headers=auth(tok), json={
        "name": f"{kind} {tag()}", "description": "Tomatoes, compost and rain", "kind": kind,
    })
    r.raise_for_status()
    return r.json()["id"]


def forum(tok, community_id=None):
    body = {"name": f"forum {tag()}"}
    if community_id:
        body["community_id"] = community_id
    r = c.post("/forums", headers=auth(tok), json=body)
    r.raise_for_status()
    return r.json()["id"]


def thread(tok, forum_id, title=None):
    r = c.post(f"/forums/{forum_id}/threads", headers=auth(tok),
               json={"title": title or f"thread {tag()}", "body": "How do I stake tomatoes?"})
    r.raise_for_status()
    return r.json()["id"]


def reply(tok, thread_id, parent_id=None):
    body = {"body": "Use a tall cage"}
    if parent_id:
        body["parent_id"] = parent_id
    return c.post(f"/threads/{thread_id}/replies", headers=auth(tok), json=body)


def ids(tok, forum_id):
    r = c.get(f"/forums/{forum_id}/threads", headers=auth(tok))
    r.raise_for_status()
    return [t["id"] for t in r.json()["items"]]


owner_tok, owner = register()
mod_tok, mod = register()
member_tok, member = register()
outsider_tok, outsider = register()

pub = community(owner_tok, "public")
for tok in (mod_tok, member_tok):
    c.post(f"/communities/{pub}/join", headers=auth(tok)).raise_for_status()
r = c.post(f"/communities/{pub}/members/{mod['id']}", headers=auth(owner_tok), json={"action": "promote"})
check("the owner promotes a moderator", r.status_code == 200, f"{r.status_code} {r.text[:120]}")

f1 = forum(owner_tok, pub)
t1 = thread(member_tok, f1, "first")
t2 = thread(member_tok, f1, "second")
t3 = thread(member_tok, f1, "third")

print("\n== pin ==")
# t3 was created last, so it leads the listing until something is pinned.
check("newest thread leads before any pin", ids(member_tok, f1)[0] == t3, str(ids(member_tok, f1)))
r = c.post(f"/threads/{t1}/pin", headers=auth(member_tok))
check("a plain member cannot pin", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/threads/{t1}/pin", headers=auth(mod_tok))
check("a moderator pins", r.status_code == 200 and r.json()["pinned"] is True, f"{r.status_code} {r.text[:120]}")
listing = c.get(f"/forums/{f1}/threads", headers=auth(member_tok)).json()["items"]
check("the pinned thread sorts first", listing[0]["id"] == t1 and listing[0]["pinned"] is True, str(listing[:1]))
check("the rest keep their order", [t["id"] for t in listing[1:3]] == [t3, t2], str([t["id"] for t in listing]))
r = c.get(f"/threads/{t1}", headers=auth(member_tok))
check("the detail exposes pinned", r.json().get("pinned") is True, r.text[:120])
r = c.delete(f"/threads/{t1}/pin", headers=auth(owner_tok))
check("the owner unpins", r.status_code == 200 and r.json()["pinned"] is False, f"{r.status_code}")
check("unpinned thread returns to its place", ids(member_tok, f1)[0] == t3, str(ids(member_tok, f1)))

print("\n== lock ==")
r = c.post(f"/threads/{t2}/lock", headers=auth(member_tok))
check("a plain member cannot lock", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/threads/{t2}/lock", headers=auth(mod_tok))
check("a moderator locks", r.status_code == 200 and r.json()["locked"] is True, f"{r.status_code}")
r = c.get(f"/threads/{t2}", headers=auth(member_tok))
check("a locked thread stays readable and exposes locked", r.status_code == 200 and r.json()["locked"] is True, f"{r.status_code}")
check("the author is refused a reply", reply(member_tok, t2).status_code == 403, "author could reply")
check("another member is refused a reply", reply(outsider_tok, t2).status_code in (403, 404), "member could reply")
check("a moderator may still reply", reply(mod_tok, t2).status_code == 201, "steward refused")
check("the owner may still reply", reply(owner_tok, t2).status_code == 201, "owner refused")
r = c.delete(f"/threads/{t2}/lock", headers=auth(member_tok))
check("a plain member cannot unlock", r.status_code == 403, f"{r.status_code}")
r = c.delete(f"/threads/{t2}/lock", headers=auth(mod_tok))
check("a moderator unlocks", r.status_code == 200 and r.json()["locked"] is False, f"{r.status_code}")
check("replies work again", reply(member_tok, t2).status_code == 201, "still refused")

print("\n== duplicate ==")
r = c.post(f"/threads/{t3}/duplicate", headers=auth(member_tok), json={"original_id": t1})
check("a plain member cannot mark a duplicate", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/threads/{t3}/duplicate", headers=auth(mod_tok), json={"original_id": t3})
check("a thread cannot duplicate itself", r.status_code == 400, f"{r.status_code}")
r = c.post(f"/threads/{t3}/duplicate", headers=auth(mod_tok), json={"original_id": t1})
check("a moderator marks a duplicate", r.status_code == 200 and r.json()["duplicate_of"]["id"] == t1,
      f"{r.status_code} {r.text[:160]}")
r = c.get(f"/threads/{t3}", headers=auth(member_tok))
d = r.json()
check("the duplicate stays readable", r.status_code == 200, f"{r.status_code}")
check("it exposes the original's id and title",
      d.get("duplicate_of") == {"id": t1, "title": "first"}, str(d.get("duplicate_of")))
check("it is locked", d.get("locked") is True, str(d.get("locked")))
check("it takes no replies from a member", reply(member_tok, t3).status_code == 403, "reply accepted")
check("it is still in the listing", t3 in ids(member_tok, f1), "hidden")
r = c.post(f"/threads/{t2}/duplicate", headers=auth(mod_tok), json={"original_id": t3})
check("cannot point at a thread that is itself a duplicate", r.status_code == 400, f"{r.status_code}")
r = c.post(f"/threads/{t1}/duplicate", headers=auth(mod_tok), json={"original_id": t2})
check("cannot turn an original into a duplicate", r.status_code == 400, f"{r.status_code}")

other_c = community(owner_tok, "public")
other_f = forum(owner_tok, other_c)
other_t = thread(owner_tok, other_f)
r = c.post(f"/threads/{t2}/duplicate", headers=auth(owner_tok), json={"original_id": other_t})
check("a duplicate of a thread in another community is refused", r.status_code == 400, f"{r.status_code}")

r = c.delete(f"/threads/{t3}/duplicate", headers=auth(member_tok))
check("a plain member cannot un-mark", r.status_code == 403, f"{r.status_code}")
r = c.delete(f"/threads/{t3}/duplicate", headers=auth(mod_tok))
check("a moderator un-marks", r.status_code == 200 and r.json()["duplicate_of"] is None, f"{r.status_code}")
d = c.get(f"/threads/{t3}", headers=auth(member_tok)).json()
check("duplicate_of is cleared", d.get("duplicate_of") is None, str(d.get("duplicate_of")))
check("the lock is left for a steward to lift", d.get("locked") is True, str(d.get("locked")))

print("\n== secret community: an outsider cannot tell ==")
sec = community(owner_tok, "secret")
sec_f = forum(owner_tok, sec)
sec_t = thread(owner_tok, sec_f)
for path in ("pin", "lock"):
    r = c.post(f"/threads/{sec_t}/{path}", headers=auth(outsider_tok))
    check(f"outsider {path} answers 404", r.status_code == 404, f"{r.status_code}")
r = c.post(f"/threads/{sec_t}/duplicate", headers=auth(outsider_tok), json={"original_id": sec_t})
check("outsider duplicate answers 404", r.status_code == 404, f"{r.status_code}")

print("\n== a forum outside any community has no moderators ==")
free_f = forum(owner_tok)
free_t = thread(owner_tok, free_f)
r = c.post(f"/threads/{free_t}/pin", headers=auth(owner_tok))
check("not even its author may pin", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/threads/{free_t}/lock", headers=auth(mod_tok))
check("a steward elsewhere may not lock", r.status_code == 403, f"{r.status_code}")

print("\n== a banned steward has no rights ==")
r = c.post(f"/communities/{pub}/members/{mod['id']}", headers=auth(owner_tok), json={"action": "ban"})
check("the owner bans the moderator", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
r = c.post(f"/threads/{t1}/pin", headers=auth(mod_tok))
check("the banned moderator cannot pin", r.status_code in (403, 404), f"{r.status_code}")
r = c.delete(f"/threads/{t2}/lock", headers=auth(mod_tok))
check("the banned moderator cannot unlock", r.status_code in (403, 404), f"{r.status_code}")

print("\nALL CHECKS PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
