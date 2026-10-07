"""A community's forum answers to the community's door.

Until now `community_id` on a forum was stored and never consulted: anyone could
read and post in the forum of a secret community, anyone could attach a forum to
somebody else's community, and the thread summary opened a thread its reader
could not otherwise see.

Run against the live stack:  python backend/tests/e2e_forum_access.py
"""
import random
import string
import sys
import time
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


def connect(a_tok, b_tok, a_id, b_id):
    """Invitations to a community are only accepted from connections."""
    c.post(f"/connections/{b_id}", headers=auth(a_tok), json={}).raise_for_status()
    c.post(f"/connections/{a_id}/respond?accept=true", headers=auth(b_tok)).raise_for_status()


def community(tok, kind):
    r = c.post("/communities", headers=auth(tok), json={
        "name": f"{kind} {tag()}", "description": "Tomatoes, compost and rain", "kind": kind,
    })
    r.raise_for_status()
    return r.json()["id"]


owner_tok, owner = register()
outsider_tok, outsider = register()
member_tok, member = register()

secret_c = community(owner_tok, "secret")
private_c = community(owner_tok, "private")
public_c = community(owner_tok, "public")

print("\n== only a steward may hang a forum on a community ==")
r = c.post("/forums", headers=auth(outsider_tok),
           json={"name": f"Hijack {tag()}", "community_id": public_c})
check("an outsider cannot attach a forum to someone's community", r.status_code == 403,
      f"{r.status_code} {r.text[:120]}")
r = c.post("/forums", headers=auth(owner_tok),
           json={"name": f"Ghost {tag()}", "community_id": "cmy_doesnotexist"})
check("attaching to a community that does not exist is refused", r.status_code == 404,
      f"{r.status_code}")

forums, threads = {}, {}
for kind, cid in (("secret", secret_c), ("private", private_c), ("public", public_c)):
    r = c.post("/forums", headers=auth(owner_tok),
               json={"name": f"{kind} forum {tag()}", "community_id": cid})
    check(f"the owner creates a {kind} forum", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
    forums[kind] = r.json().get("id")
    r = c.post(f"/forums/{forums[kind]}/threads", headers=auth(owner_tok),
               json={"title": f"Hello {kind}", "body": "Who is going on Saturday?"})
    check(f"the owner opens a thread in it", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
    threads[kind] = r.json().get("id")

open_forum = c.post("/forums", headers=auth(owner_tok), json={"name": f"Free {tag()}"}).json()["id"]

print("\n== knowing a secret community's id is not an invitation ==")
r = c.post(f"/communities/{secret_c}/join", headers=auth(outsider_tok))
check("joining a secret community by id answers 404", r.status_code == 404, f"{r.status_code} {r.text[:100]}")
r = c.get(f"/communities/{secret_c}", headers=auth(outsider_tok))
check("and it is still not readable", r.status_code == 404, f"{r.status_code}")
connect(owner_tok, member_tok, owner["id"], member["id"])
r = c.post(f"/communities/{secret_c}/invite", headers=auth(owner_tok), json={"user_id": member["id"]})
check("a member's invitation does let someone in", r.status_code == 201, f"{r.status_code} {r.text[:100]}")
r = c.get(f"/communities/{secret_c}", headers=auth(member_tok))
check("the invited person now reads it", r.status_code == 200, f"{r.status_code}")

print("\n== an outsider is kept out of secret and private forums ==")
for kind, want in (("secret", 404), ("private", 403), ("public", 200)):
    r = c.get(f"/forums/{forums[kind]}/threads", headers=auth(outsider_tok))
    check(f"listing the {kind} forum answers {want}", r.status_code == want, f"{r.status_code}")
for kind, want in (("secret", 404), ("private", 404), ("public", 200)):
    r = c.get(f"/threads/{threads[kind]}", headers=auth(outsider_tok))
    check(f"a direct link to the {kind} thread answers {want}", r.status_code == want, f"{r.status_code}")
for kind, want in (("secret", 404), ("private", 404), ("public", 201)):
    r = c.post(f"/threads/{threads[kind]}/replies", headers=auth(outsider_tok),
               json={"body": "I would like to come"})
    check(f"replying in the {kind} thread answers {want}", r.status_code == want, f"{r.status_code}")
for kind, want in (("secret", 404), ("private", 403)):
    r = c.post(f"/forums/{forums[kind]}/threads", headers=auth(outsider_tok),
               json={"title": "Let me in", "body": "Posting anyway"})
    check(f"starting a thread in the {kind} forum answers {want}", r.status_code == want, f"{r.status_code}")
for kind, want in (("secret", 404), ("private", 404)):
    r = c.get(f"/threads/{threads[kind]}/summary", headers=auth(outsider_tok))
    check(f"the {kind} thread's summary does not open it ({want})", r.status_code == want, f"{r.status_code}")
for kind, want in (("secret", 404), ("private", 403)):
    r = c.get(f"/forums/{forums[kind]}/knowledge", headers=auth(outsider_tok))
    check(f"the {kind} forum's knowledge base is closed ({want})", r.status_code == want, f"{r.status_code}")

print("\n== a signed-out visitor gets no more than an outsider ==")
r = c.get(f"/forums/{forums['secret']}/threads")
check("secret forum: 404", r.status_code == 404, f"{r.status_code}")
r = c.get(f"/forums/{forums['private']}/threads")
check("private forum: 403", r.status_code == 403, f"{r.status_code}")
r = c.get(f"/forums/{forums['public']}/threads")
check("public forum: 200", r.status_code == 200, f"{r.status_code}")

print("\n== a secret forum cannot be told apart from one that does not exist ==")
r1 = c.get(f"/forums/{forums['secret']}/threads", headers=auth(outsider_tok))
r2 = c.get("/forums/frm_doesnotexist/threads", headers=auth(outsider_tok))
check("same status", r1.status_code == r2.status_code == 404, f"{r1.status_code} vs {r2.status_code}")
check("same body", r1.json() == r2.json(), f"{r1.text[:80]} vs {r2.text[:80]}")

print("\n== listings ==")
r = c.get("/forums?scope=global", headers=auth(outsider_tok))
r_all = c.get("/forums", headers=auth(outsider_tok))
ids = [f["id"] for f in r_all.json().get("items", [])] if r_all.status_code == 200 else []
check("the secret forum is not listed to an outsider", forums["secret"] not in ids, ids[:5])
check("the free-standing forum is", open_forum in ids, ids[:5])
r = c.get("/forums", headers=auth(owner_tok))
owner_ids = [f["id"] for f in r.json().get("items", [])] if r.status_code == 200 else []
check("the owner sees their secret forum", forums["secret"] in owner_ids, owner_ids[:5])
r = c.get("/forums")
anon_ids = [f["id"] for f in r.json().get("items", [])] if r.status_code == 200 else []
check("a signed-out visitor does not see it", forums["secret"] not in anon_ids, anon_ids[:5])

print("\n== discovery offers only doors anyone may open ==")
r = c.get("/discover?limit=10", headers=auth(outsider_tok))
disc = [f["id"] for f in r.json().get("forums", [])] if r.status_code == 200 else []
check("discover answers", r.status_code == 200, r.text[:120])
check("no secret forum is suggested", forums["secret"] not in disc, disc)
check("no private forum is suggested", forums["private"] not in disc, disc)

print("\n== the owner keeps full access ==")
for kind in ("secret", "private", "public"):
    r = c.get(f"/threads/{threads[kind]}", headers=auth(owner_tok))
    check(f"owner reads the {kind} thread", r.status_code == 200, f"{r.status_code}")
r = c.post(f"/threads/{threads['secret']}/replies", headers=auth(owner_tok), json={"body": "Welcome"})
check("owner replies in the secret thread", r.status_code == 201, f"{r.status_code}")

print("\n== an admitted member is let in; a banned one is shut out again ==")
r = c.post(f"/communities/{private_c}/join", headers=auth(member_tok))
check("the member asks to join the private community", r.status_code == 200, f"{r.status_code}")
r = c.get(f"/forums/{forums['private']}/threads", headers=auth(member_tok))
check("pending is not enough", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/communities/{private_c}/members/{member['id']}", headers=auth(owner_tok),
           json={"action": "approve"})
check("the owner approves", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
r = c.get(f"/forums/{forums['private']}/threads", headers=auth(member_tok))
check("an approved member reads the forum", r.status_code == 200, f"{r.status_code}")
r = c.post(f"/threads/{threads['private']}/replies", headers=auth(member_tok), json={"body": "Thanks"})
check("and replies", r.status_code == 201, f"{r.status_code}")

r = c.post(f"/communities/{public_c}/join", headers=auth(member_tok))
r = c.post(f"/communities/{public_c}/members/{member['id']}", headers=auth(owner_tok),
           json={"action": "ban"})
check("the owner bans the member from the public community", r.status_code == 200, f"{r.status_code}")
r = c.get(f"/forums/{forums['public']}/threads", headers=auth(member_tok))
check("a banned member no longer reads that public forum", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/threads/{threads['public']}/replies", headers=auth(member_tok), json={"body": "Still here"})
check("nor replies there", r.status_code == 404, f"{r.status_code}")

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
