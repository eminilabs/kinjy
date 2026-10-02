"""A sub-forum inherits the door of its parent forum, and the parent's community.

Today `parent_id` is only a pointer: a child forum created without `community_id`
is free-standing, so it is open to everyone even when its parent sits in a secret
community. The rule under test: a child (and a grandchild) answers to the same
community door as its parent, cannot be attached to a different community, and
cannot hang under a parent that does not exist.

Run against the live stack:  python backend/tests/e2e_forum_inheritance.py
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


def forum(tok, **body):
    body.setdefault("name", f"forum {tag()}")
    return c.post("/forums", headers=auth(tok), json=body)


def thread(tok, forum_id):
    r = c.post(f"/forums/{forum_id}/threads", headers=auth(tok),
               json={"title": f"Hello {tag()}", "body": "Who is going on Saturday?"})
    return r


def setup(kind):
    """An owner, an outsider, a community of `kind`, its forum P, child C, grandchild G."""
    owner_tok, owner = register()
    out_tok, out = register()
    cid = community(owner_tok, kind)
    r = forum(owner_tok, community_id=cid)
    check(f"[{kind}] owner creates parent forum P", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
    p = r.json().get("id")
    r = forum(owner_tok, parent_id=p)
    check(f"[{kind}] owner creates child C with no community_id", r.status_code == 201,
          f"{r.status_code} {r.text[:120]}")
    ch = r.json().get("id")
    r = forum(owner_tok, parent_id=ch)
    check(f"[{kind}] owner creates grandchild G under C", r.status_code == 201,
          f"{r.status_code} {r.text[:120]}")
    g = r.json().get("id")
    for fid in (ch, g):
        thread(owner_tok, fid)
    return owner_tok, out_tok, cid, p, ch, g


def door_tests(kind, want):
    print(f"\n== {kind} community: child and grandchild share the parent's door ==")
    owner_tok, out_tok, cid, p, ch, g = setup(kind)
    for name, fid in (("child C", ch), ("grandchild G", g)):
        r = c.get(f"/forums/{fid}/threads", headers=auth(out_tok))
        check(f"outsider reading threads in {name} answers {want}", r.status_code == want,
              f"{r.status_code}")
        r = c.get(f"/forums/{fid}/threads")
        check(f"signed-out visitor reading {name} answers {want}", r.status_code == want,
              f"{r.status_code}")
        r = c.get(f"/forums/{fid}/threads", headers=auth(owner_tok))
        check(f"owner reads {name} (200)", r.status_code == 200, f"{r.status_code}")
    r = c.post(f"/forums/{ch}/threads", headers=auth(out_tok), json={"title": "Let me in", "body": "Posting"})
    check(f"outsider starting a thread in C answers {want}", r.status_code == want, f"{r.status_code}")

    # listing
    r = c.get(f"/forums?parent_id={p}", headers=auth(out_tok))
    ids = [f["id"] for f in r.json().get("items", [])] if r.status_code == 200 else []
    if kind == "secret":
        check("C is not listed to an outsider under P", ch not in ids, ids)
        r = c.get(f"/forums?parent_id={p}")
        anon = [f["id"] for f in r.json().get("items", [])] if r.status_code == 200 else []
        check("C is not listed to a signed-out visitor under P", ch not in anon, anon)
    r = c.get(f"/forums?parent_id={p}", headers=auth(owner_tok))
    own = [f["id"] for f in r.json().get("items", [])] if r.status_code == 200 else []
    check("owner sees C listed under P", ch in own, own)

    # discovery
    r = c.get("/discover?limit=10", headers=auth(out_tok))
    disc = [f["id"] for f in r.json().get("forums", [])] if r.status_code == 200 else []
    check("discover answers 200", r.status_code == 200, r.text[:120])
    check("discover does not offer C", ch not in disc, disc)
    check("discover does not offer G", g not in disc, disc)

    # creating under P
    r = forum(out_tok, parent_id=p)
    check(f"outsider cannot create a child under P ({want})", r.status_code == want,
          f"{r.status_code} {r.text[:120]}")
    r = forum(out_tok, parent_id=ch)
    check(f"outsider cannot create a grandchild under C ({want})", r.status_code == want,
          f"{r.status_code} {r.text[:120]}")


door_tests("secret", 404)
door_tests("private", 403)

print("\n== a child cannot be attached to someone else's community ==")
owner_tok, owner = register()
out_tok, out = register()
owner_c = community(owner_tok, "public")
free_parent = forum(out_tok).json().get("id")
r = forum(out_tok, parent_id=free_parent, community_id=owner_c)
check("child of a free-standing parent, attached to another's community: 403",
      r.status_code == 403, f"{r.status_code} {r.text[:120]}")

print("\n== a child's community must match its parent's ==")
owner_tok, owner = register()
comm_a = community(owner_tok, "public")
comm_b = community(owner_tok, "public")
pa = forum(owner_tok, community_id=comm_a).json().get("id")
r = forum(owner_tok, parent_id=pa, community_id=comm_b)
check("child with a different community_id than its parent: 400", r.status_code == 400,
      f"{r.status_code} {r.text[:120]}")
r = forum(owner_tok, parent_id=pa, community_id=comm_a)
check("child with the same community_id as its parent: 201", r.status_code == 201,
      f"{r.status_code} {r.text[:120]}")

print("\n== a parent that does not exist ==")
r = forum(owner_tok, parent_id="frm_doesnotexist")
check("parent_id of a missing forum: 404", r.status_code == 404, f"{r.status_code} {r.text[:120]}")

print("\n== public community: the child stays open, a banned member is shut out ==")
owner_tok, owner = register()
out_tok, out = register()
member_tok, member = register()
pub = community(owner_tok, "public")
p = forum(owner_tok, community_id=pub).json().get("id")
r = forum(owner_tok, parent_id=p)
check("owner creates a child of the public forum", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
ch = r.json().get("id")
r = forum(owner_tok, parent_id=ch)
check("owner creates a grandchild", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
g = r.json().get("id")
for fid in (ch, g):
    thread(owner_tok, fid)
for name, fid in (("child", ch), ("grandchild", g)):
    r = c.get(f"/forums/{fid}/threads", headers=auth(out_tok))
    check(f"outsider reads the public {name} (200)", r.status_code == 200, f"{r.status_code}")
    r = c.get(f"/forums/{fid}/threads")
    check(f"signed-out visitor reads the public {name} (200)", r.status_code == 200, f"{r.status_code}")
r = c.post(f"/communities/{pub}/join", headers=auth(member_tok))
check("the member joins the public community", r.status_code == 200, f"{r.status_code}")
r = c.get(f"/forums/{ch}/threads", headers=auth(member_tok))
check("the member reads the child (200)", r.status_code == 200, f"{r.status_code}")
r = c.post(f"/communities/{pub}/members/{member['id']}", headers=auth(owner_tok), json={"action": "ban"})
check("the owner bans the member", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
for name, fid in (("child", ch), ("grandchild", g)):
    r = c.get(f"/forums/{fid}/threads", headers=auth(member_tok))
    check(f"the banned member reading the {name} answers 403", r.status_code == 403, f"{r.status_code}")
r = c.get(f"/forums/{ch}/threads", headers=auth(out_tok))
check("another outsider still reads the child (200)", r.status_code == 200, f"{r.status_code}")

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
