"""Who may open a forum in a community.

Until now only the owner and moderators could attach a forum to a community, so
an ordinary member of a public community could not start one. The rule under
test: any active member may, by default; the owner chooses at creation (and may
change it) whether it stays open to every member or is kept to the owner and
moderators; opening a sub-forum to everyone stays with those who run the
community; outsiders, pending and banned people never open one.

Run against the live stack:  python backend/tests/e2e_forum_creation.py
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


def community(tok, kind="public", **extra):
    r = c.post("/communities", headers=auth(tok), json={
        "name": f"{kind} {tag()}", "description": "Tomatoes, compost and rain", "kind": kind, **extra,
    })
    r.raise_for_status()
    return r.json()["id"]


def forum(tok, **body):
    body.setdefault("name", f"forum {tag()}")
    return c.post("/forums", headers=auth(tok), json=body)


owner_tok, owner = register()
member_tok, member = register()
outsider_tok, outsider = register()
pending_tok, pending = register()

print("\n== by default any active member may open a forum ==")
open_c = community(owner_tok)
r = c.get(f"/communities/{open_c}", headers=auth(owner_tok))
check("a new community defaults to members", r.json().get("forum_creation") == "members", r.text[:160])
c.post(f"/communities/{open_c}/join", headers=auth(member_tok)).raise_for_status()
r = forum(member_tok, community_id=open_c)
check("a member opens a forum in the community", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
member_forum = r.json().get("id")
r = forum(outsider_tok, community_id=open_c)
check("an outsider cannot", r.status_code == 403, f"{r.status_code} {r.text[:120]}")
r = forum(member_tok, parent_id=member_forum)
check("a member adds a sub-forum", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
r = forum(member_tok, parent_id=member_forum, inherit_access=False)
check("but cannot open a sub-forum to everyone", r.status_code == 403, f"{r.status_code} {r.text[:120]}")
r = forum(owner_tok, parent_id=member_forum, inherit_access=False)
check("the owner can", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
r = c.get("/communities/mine", headers=auth(member_tok))
mine = {i["id"]: i for i in r.json().get("items", [])}
check("my communities carries the rule", mine.get(open_c, {}).get("forum_creation") == "members", r.text[:200])

print("\n== a pending request is not a member ==")
private_c = community(owner_tok, "private")
c.post(f"/communities/{private_c}/join", headers=auth(pending_tok)).raise_for_status()
r = forum(pending_tok, community_id=private_c)
check("a pending requester cannot open a forum", r.status_code == 403, f"{r.status_code} {r.text[:120]}")

print("\n== the owner can keep it to owner and moderators at creation ==")
strict_c = community(owner_tok, forum_creation="stewards")
r = c.get(f"/communities/{strict_c}", headers=auth(owner_tok))
check("the community stores the choice", r.json().get("forum_creation") == "stewards", r.text[:160])
c.post(f"/communities/{strict_c}/join", headers=auth(member_tok)).raise_for_status()
r = forum(member_tok, community_id=strict_c)
check("a member is refused", r.status_code == 403, f"{r.status_code} {r.text[:120]}")
r = forum(owner_tok, community_id=strict_c)
check("the owner opens one", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
strict_forum = r.json().get("id")
r = forum(member_tok, parent_id=strict_forum)
check("a member is refused a sub-forum too", r.status_code == 403, f"{r.status_code} {r.text[:120]}")
r = c.post(f"/communities/{strict_c}/members/{member['id']}", headers=auth(owner_tok), json={"action": "promote"})
check("the owner promotes the member", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
r = forum(member_tok, community_id=strict_c)
check("a moderator may open a forum", r.status_code == 201, f"{r.status_code} {r.text[:120]}")

print("\n== the owner can change the rule later ==")
r = c.patch(f"/communities/{open_c}", headers=auth(member_tok), json={"forum_creation": "stewards"})
check("a member cannot change it", r.status_code == 403, f"{r.status_code} {r.text[:120]}")
r = c.patch(f"/communities/{open_c}", headers=auth(owner_tok), json={"forum_creation": "stewards"})
check("the owner switches to stewards", r.status_code == 200 and r.json().get("forum_creation") == "stewards",
      f"{r.status_code} {r.text[:120]}")
r = forum(member_tok, community_id=open_c)
check("members are now refused", r.status_code == 403, f"{r.status_code} {r.text[:120]}")
r = c.patch(f"/communities/{open_c}", headers=auth(owner_tok), json={"forum_creation": "members"})
r = forum(member_tok, community_id=open_c)
check("and welcome again when the owner switches back", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
r = c.patch(f"/communities/{open_c}", headers=auth(owner_tok), json={"forum_creation": "everyone"})
check("an unknown value is refused", r.status_code == 422, f"{r.status_code}")
r = c.post("/communities", headers=auth(owner_tok), json={"name": f"bad {tag()}", "forum_creation": "nobody"})
check("an unknown value at creation is refused", r.status_code == 422, f"{r.status_code}")

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
