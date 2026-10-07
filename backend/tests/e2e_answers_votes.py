"""Accepted answer and votes on replies.

The asker or a steward of the community marks one reply as the answer; members
vote +1/-1 once per reply; whoever cannot reach the thread cannot do either.

Run against the live stack:  python backend/tests/e2e_answers_votes.py
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


def forum(tok, cid):
    r = c.post("/forums", headers=auth(tok), json={"name": f"forum {tag()}", "community_id": cid})
    r.raise_for_status()
    return r.json()["id"]


def thread(tok, fid):
    r = c.post(f"/forums/{fid}/threads", headers=auth(tok), json={"title": f"Question {tag()}", "body": "How?"})
    r.raise_for_status()
    return r.json()["id"]


def reply(tok, tid, body="An answer"):
    r = c.post(f"/threads/{tid}/replies", headers=auth(tok), json={"body": body})
    r.raise_for_status()
    return r.json()["id"]


def detail(tok, tid):
    r = c.get(f"/threads/{tid}", headers=auth(tok))
    r.raise_for_status()
    d = r.json()
    return d, {x["id"]: x for x in d["replies"]}


def vote(tok, tid, rid, value):
    return c.put(f"/threads/{tid}/replies/{rid}/vote", headers=auth(tok), json={"value": value})


def accept(tok, tid, rid):
    return c.post(f"/threads/{tid}/replies/{rid}/accept", headers=auth(tok))


def unaccept(tok, tid, rid):
    return c.delete(f"/threads/{tid}/replies/{rid}/accept", headers=auth(tok))


owner_tok, owner = register()
asker_tok, asker = register()
mod_tok, mod = register()
other_tok, other = register()
v1_tok, v1 = register()
v2_tok, v2 = register()
outsider_tok, outsider = register()
banned_tok, banned = register()

pub = community(owner_tok, "public")
f = forum(owner_tok, pub)
for tok in (asker_tok, mod_tok, other_tok, v1_tok, v2_tok, banned_tok):
    c.post(f"/communities/{pub}/join", headers=auth(tok)).raise_for_status()
r = c.post(f"/communities/{pub}/members/{mod['id']}", headers=auth(owner_tok), json={"action": "promote"})
check("the owner promotes a moderator", r.status_code == 200, f"{r.status_code} {r.text[:100]}")

t = thread(asker_tok, f)
ra = reply(other_tok, t, "first answer")
rb = reply(v1_tok, t, "second answer")
rc = reply(asker_tok, t, "asker follow-up")

print("\n== accepting an answer ==")
d, rs = detail(other_tok, t)
check("no accepted reply at first", d["accepted_reply_id"] is None and not any(x["accepted_answer"] for x in rs.values()))
r = accept(other_tok, t, ra)
check("another member cannot accept", r.status_code == 403, f"{r.status_code}")
r = accept(asker_tok, t, ra)
check("the thread's author accepts", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
d, rs = detail(other_tok, t)
check("thread exposes accepted_reply_id", d["accepted_reply_id"] == ra, str(d["accepted_reply_id"]))
check("the reply carries accepted_answer", rs[ra]["accepted_answer"] is True)
check("the accepted reply is listed first", d["replies"][0]["id"] == ra)
r = accept(mod_tok, t, rb)
check("a steward moves the mark", r.status_code == 200, f"{r.status_code}")
d, rs = detail(other_tok, t)
check("only one accepted reply per thread",
      d["accepted_reply_id"] == rb and not rs[ra]["accepted_answer"] and rs[rb]["accepted_answer"])
r = accept(asker_tok, t, rc)
check("the asker may accept their own follow-up", r.status_code == 200, f"{r.status_code}")
r = unaccept(other_tok, t, rc)
check("another member cannot un-accept", r.status_code == 403, f"{r.status_code}")
r = unaccept(asker_tok, t, rc)
check("the author un-accepts", r.status_code == 200, f"{r.status_code}")
d, rs = detail(other_tok, t)
check("nothing is accepted any more", d["accepted_reply_id"] is None)
r = accept(mod_tok, t, ra)
r = unaccept(mod_tok, t, ra)
check("a steward un-accepts", r.status_code == 200, f"{r.status_code}")

t2 = thread(asker_tok, f)
foreign = reply(other_tok, t2, "belongs to another thread")
r = accept(asker_tok, t, foreign)
check("a reply from another thread is refused", r.status_code == 404, f"{r.status_code}")
r = vote(v1_tok, t, foreign, 1)
check("voting on a reply from another thread is refused", r.status_code == 404, f"{r.status_code}")
r = accept(asker_tok, t, "rpl_doesnotexist")
check("an unknown reply is 404", r.status_code == 404, f"{r.status_code}")

print("\n== votes ==")
r = vote(v1_tok, t, ra, 1)
check("up vote", r.status_code == 200 and r.json()["score"] == 1 and r.json()["my_vote"] == 1, r.text[:100])
r = vote(v1_tok, t, ra, 1)
check("repeating a vote changes nothing", r.status_code == 200 and r.json()["score"] == 1, r.text[:100])
r = vote(v1_tok, t, ra, -1)
check("changing a vote replaces it", r.status_code == 200 and r.json()["score"] == -1, r.text[:100])
r = vote(v1_tok, t, ra, 0)
check("removing a vote", r.status_code == 200 and r.json()["score"] == 0, r.text[:100])
r = vote(v1_tok, t, ra, 0)
check("removing a missing vote is harmless", r.status_code == 200 and r.json()["score"] == 0, r.text[:100])
r = vote(v1_tok, t, ra, 5)
check("a value other than -1/0/1 is refused", r.status_code == 422, f"{r.status_code}")
r = vote(other_tok, t, ra, 1)
check("no voting on your own reply", r.status_code == 403, f"{r.status_code}")

print("\n== score aggregation and my_vote ==")
vote(v1_tok, t, ra, 1)
vote(v2_tok, t, ra, 1)
vote(mod_tok, t, ra, -1)
vote(v2_tok, t, rb, -1)
d, rs = detail(v1_tok, t)
check("score sums every voter", rs[ra]["score"] == 1 and rs[rb]["score"] == -1 and rs[rc]["score"] == 0,
      str({k: x["score"] for k, x in rs.items()}))
check("my_vote for v1", rs[ra]["my_vote"] == 1 and rs[rb]["my_vote"] == 0)
d, rs = detail(mod_tok, t)
check("my_vote for the moderator", rs[ra]["my_vote"] == -1)
d, rs = detail(v2_tok, t)
check("my_vote for v2", rs[ra]["my_vote"] == 1 and rs[rb]["my_vote"] == -1)
r = c.get(f"/threads/{t}")
check("an anonymous reader sees scores and my_vote 0",
      r.status_code == 200 and all(x["my_vote"] == 0 for x in r.json()["replies"]))

print("\n== who is kept out ==")
c.post(f"/communities/{pub}/members/{banned['id']}", headers=auth(owner_tok), json={"action": "ban"})
r = vote(banned_tok, t, ra, 1)
check("a banned member cannot vote", r.status_code in (403, 404), f"{r.status_code}")

sec = community(owner_tok, "secret")
sf = forum(owner_tok, sec)
st = thread(owner_tok, sf)
sr = reply(owner_tok, st, "secret answer")
r = vote(outsider_tok, st, sr, 1)
check("an outsider gets 404 voting in a secret community", r.status_code == 404, f"{r.status_code}")
r = accept(outsider_tok, st, sr)
check("an outsider gets 404 accepting in a secret community", r.status_code == 404, f"{r.status_code}")
r = accept(owner_tok, st, sr)
check("the owner (author) accepts in the secret community", r.status_code == 200, f"{r.status_code}")

print("\n" + ("ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED"))
sys.exit(0 if ok else 1)
