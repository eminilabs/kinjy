"""The knowledge page of a forum can include its sub-forums' entries.

`GET /forums/{id}/knowledge?include_sub=true` adds the entries of the forum's
descendants, each item naming its forum. Without the flag nothing changes. Every
descendant passes the same door as a direct read, so a sub-forum the viewer may
not enter contributes nothing, and the per-entry age gate still applies.

Run against the live stack:  python backend/tests/e2e_knowledge_sub.py
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
    body.setdefault("name", f"Garden {tag()}")
    r = c.post("/forums", headers=auth(tok), json=body)
    r.raise_for_status()
    return r.json()["id"]


def answered(owner_tok, helper_tok, forum_id, word):
    """A thread in `forum_id` whose helper reply the owner accepts."""
    r = c.post(f"/forums/{forum_id}/threads", headers=auth(owner_tok),
               json={"title": f"Question {word}", "body": "Details of the problem."})
    r.raise_for_status()
    t = r.json()["id"]
    r = c.post(f"/threads/{t}/replies", headers=auth(helper_tok), json={"body": f"Answer {word}"})
    r.raise_for_status()
    c.post(f"/threads/{t}/replies/{r.json()['id']}/accept", headers=auth(owner_tok)).raise_for_status()
    return t


def entries(forum_id, tok=None, **params):
    r = c.get(f"/forums/{forum_id}/knowledge", headers=auth(tok) if tok else {}, params=params)
    return r


owner_tok, owner = register()
member_tok, _ = register()
outsider_tok, _ = register()
teen_tok, _ = register(15)

print("\n== a public community: parent, child and grandchild ==")
pub = community(owner_tok, "public")
c.post(f"/communities/{pub}/join", headers=auth(member_tok)).raise_for_status()
p = forum(owner_tok, community_id=pub)
ch = forum(owner_tok, parent_id=p)
g = forum(owner_tok, parent_id=ch)
w_p, w_c, w_g = tag(), tag(), tag()
answered(owner_tok, member_tok, p, w_p)
t_c = answered(owner_tok, member_tok, ch, w_c)
answered(owner_tok, member_tok, g, w_g)

r = entries(p, owner_tok)
check("by default only the forum's own entry", r.status_code == 200 and len(r.json()["items"]) == 1, r.text[:200])
check("every item carries its forum", r.json()["items"][0]["forum_id"] == p and r.json()["items"][0]["forum_name"],
      str(r.json()["items"][0]))
r = entries(p, owner_tok, include_sub="true")
items = r.json()["items"] if r.status_code == 200 else []
check("include_sub=true adds the child and grandchild", len(items) == 3, str(len(items)))
by_forum = {i["forum_id"]: i for i in items}
check("each entry says where it came from", set(by_forum) == {p, ch, g}
      and all(i["forum_name"] for i in items), str(by_forum))
check("the child's entry is the one of the child's thread", by_forum.get(ch, {}).get("source_thread_id") == t_c)
r = entries(ch, owner_tok, include_sub="true")
check("a middle forum includes only what is below it", {i["forum_id"] for i in r.json()["items"]} == {ch, g},
      r.text[:200])
check("include_sub=false is the old behaviour",
      len(entries(p, owner_tok, include_sub="false").json()["items"]) == 1)
check("search still filters across sub-forums",
      [i["forum_id"] for i in entries(p, owner_tok, include_sub="true", q=w_g).json()["items"]] == [g])

print("\n== stewards and others ==")
check("a steward still sees can_review on every item", all(i["can_review"] for i in items), str(items))
mine = entries(p, member_tok, include_sub="true").json()["items"]
check("a plain member reads them all, without the buttons",
      len(mine) == 3 and not any(i["can_review"] for i in mine), str(mine))
anon = entries(p, None, include_sub="true")
check("a signed-out reader of a public community reads them", anon.status_code == 200 and len(anon.json()["items"]) == 3,
      anon.text[:120])
teen = entries(p, teen_tok, include_sub="true")
check("a minor reads the suitable ones", teen.status_code == 200 and len(teen.json()["items"]) == 3, teen.text[:120])

print("\n== a sub-forum the viewer cannot enter contributes nothing ==")
sec = community(owner_tok, "secret")
sp = forum(owner_tok, community_id=sec)
sc = forum(owner_tok, parent_id=sp)
answered(owner_tok, owner_tok, sc, tag())
check("the secret parent is a 404 to an outsider, include_sub or not",
      entries(sp, outsider_tok, include_sub="true").status_code == 404)
check("and to a signed-out reader", entries(sp, None, include_sub="true").status_code == 404)
check("the owner reads the secret child through its parent",
      len(entries(sp, owner_tok, include_sub="true").json()["items"]) == 1)

priv = community(owner_tok, "private")
c.post(f"/communities/{priv}/join", headers=auth(member_tok))
r = c.get(f"/communities/{priv}/members", headers=auth(owner_tok))
for m in (r.json().get("items", []) if r.status_code == 200 else []):
    if m.get("status") == "pending":
        c.post(f"/communities/{priv}/members/{m['user_id']}", headers=auth(owner_tok), json={"action": "approve"})
pp = forum(owner_tok, community_id=priv)
pc = forum(owner_tok, parent_id=pp)
answered(owner_tok, owner_tok, pc, tag())
r = entries(pp, outsider_tok, include_sub="true")
check("a private parent stays closed to an outsider (403)", r.status_code == 403, f"{r.status_code}")
check("its sub-forum's entries do not leak to the outsider through any route",
      entries(pc, outsider_tok).status_code == 403)
check("the owner sees the private child's entry via the parent",
      len(entries(pp, owner_tok, include_sub="true").json()["items"]) == 1)

# An open sub-forum is enterable by anyone, yet its closed parent still is not:
# opening the child must not open the parent's own knowledge page.
op = forum(owner_tok, parent_id=pp, inherit_access=False)
answered(owner_tok, owner_tok, op, tag())
check("an opened sub-forum is readable on its own", entries(op, outsider_tok).status_code == 200)
check("but its closed parent is not opened by it", entries(pp, outsider_tok, include_sub="true").status_code == 403)

print("\nALL CHECKS PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
