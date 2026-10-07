"""Forum-to-knowledge: an accepted answer becomes a cited, reviewable entry.

Covers the write path (accept, accept again, move the mark, un-accept), keeping
entries true (edit and delete of the reply or thread), the steward review routes,
the read filters and order, and the doors: a free-standing forum has entries but
no stewards, a secret community's knowledge is invisible to an outsider.

Run against the live stack:  python backend/tests/e2e_knowledge.py
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
    body = {"name": f"Garden {tag()}"}
    if community_id:
        body["community_id"] = community_id
    r = c.post("/forums", headers=auth(tok), json=body)
    r.raise_for_status()
    return r.json()["id"]


def thread(tok, forum_id, title, body="Details of the problem."):
    r = c.post(f"/forums/{forum_id}/threads", headers=auth(tok), json={"title": title, "body": body})
    r.raise_for_status()
    return r.json()["id"]


def reply(tok, thread_id, body):
    r = c.post(f"/threads/{thread_id}/replies", headers=auth(tok), json={"body": body})
    r.raise_for_status()
    return r.json()["id"]


def accept(tok, thread_id, reply_id):
    return c.post(f"/threads/{thread_id}/replies/{reply_id}/accept", headers=auth(tok))


def entries(forum_id, tok=None, **params):
    r = c.get(f"/forums/{forum_id}/knowledge", headers=auth(tok) if tok else {}, params=params)
    r.raise_for_status()
    return r.json()["items"]


owner_tok, owner = register()
asker_tok, asker = register()
helper_tok, helper = register()
voter_tok, voter = register()
outsider_tok, _ = register()

public_c = community(owner_tok, "public")
for tok in (asker_tok, helper_tok, voter_tok):
    c.post(f"/communities/{public_c}/join", headers=auth(tok)).raise_for_status()
f = forum(owner_tok, public_c)

word = tag()
t1 = thread(asker_tok, f, f"Why do my tomatoes split {word}?", "They crack after heavy rain.")
r1 = reply(helper_tok, t1, "Water evenly; sudden rain after a dry spell splits the skin.")
r2 = reply(helper_tok, t1, "Mulch the beds so the soil keeps its moisture.")

print("\n== an accepted answer becomes an entry with its citations ==")
check("nothing before an answer is accepted", entries(f, owner_tok) == [])
check("the asker accepts a reply", accept(asker_tok, t1, r1).status_code == 200)
items = entries(f, owner_tok)
check("one entry", len(items) == 1, str(items))
e1 = items[0] if items else {}
check("question is the thread title and body", word in e1.get("question", "") and "crack" in e1.get("question", ""),
      e1.get("question"))
check("answer is the accepted reply", e1.get("answer", "").startswith("Water evenly"), e1.get("answer"))
check("it cites the thread and the reply",
      e1.get("source_thread_id") == t1 and e1.get("source_reply_id") == r1
      and word in e1.get("source_thread_title", ""), str(e1))
check("it starts unreviewed", e1.get("reviewed") is False and e1.get("reviewed_by") is None)
check("base confidence without votes is 0.5", abs(e1.get("confidence", 0) - 0.5) < 1e-6, e1.get("confidence"))
check("a steward is offered the review buttons", e1.get("can_review") is True)
check("a plain member is not", entries(f, asker_tok)[0]["can_review"] is False)
check("a signed-out reader reads it, without the buttons",
      [i["can_review"] for i in entries(f)] == [False])

print("\n== accepting again refreshes, a vote moves the confidence ==")
accept(asker_tok, t1, r1)
items = entries(f, owner_tok)
check("still one entry, same id", len(items) == 1 and items[0]["id"] == e1.get("id"), str(items))
c.put(f"/threads/{t1}/replies/{r1}/vote", headers=auth(voter_tok), json={"value": 1}).raise_for_status()
conf = entries(f, owner_tok)[0]["confidence"]
check("an upvote raises it, never to 1.0", 0.5 < conf < 1.0, conf)

print("\n== moving the mark replaces the entry; un-accepting removes it ==")
check("the asker accepts the other reply", accept(asker_tok, t1, r2).status_code == 200)
items = entries(f, owner_tok)
check("one entry, now for the second reply", len(items) == 1 and items[0]["source_reply_id"] == r2, str(items))
r = c.delete(f"/threads/{t1}/replies/{r2}/accept", headers=auth(asker_tok))
check("un-accept answers 200", r.status_code == 200, r.text[:100])
check("no entry is left", entries(f, owner_tok) == [])

print("\n== stewards review, correct and delete ==")
accept(asker_tok, t1, r1)
eid = entries(f, owner_tok)[0]["id"]
for who, tok in (("the asker", asker_tok), ("a member", helper_tok), ("an outsider of the community", outsider_tok)):
    r = c.post(f"/forums/knowledge/{eid}/review", headers=auth(tok))
    check(f"{who} cannot review", r.status_code == 403, f"{r.status_code} {r.text[:100]}")
r = c.patch(f"/forums/knowledge/{eid}", headers=auth(asker_tok), json={"answer": "mine"})
check("a plain member cannot edit", r.status_code == 403, f"{r.status_code}")
r = c.delete(f"/forums/knowledge/{eid}", headers=auth(asker_tok))
check("a plain member cannot delete", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/forums/knowledge/{eid}/review", headers=auth(owner_tok))
check("the owner approves", r.status_code == 200 and r.json()["reviewed"] is True, f"{r.status_code} {r.text[:100]}")
first = entries(f, owner_tok)[0]
check("reviewed_by is the steward", first["reviewed"] and first["reviewed_by"] == owner["id"], str(first))
check("reviewed=true filter finds it", len(entries(f, owner_tok, reviewed="true")) == 1)
check("reviewed=false filter does not", entries(f, owner_tok, reviewed="false") == [])

print("\n== reviewed entries sort first, search filters ==")
word2 = tag()
t2 = thread(asker_tok, f, f"How much compost for squash {word2}?", "A raised bed, full sun.")
q1 = reply(helper_tok, t2, "Two inches of compost each spring is plenty.")
accept(asker_tok, t2, q1)
for tok in (voter_tok, owner_tok):
    c.put(f"/threads/{t2}/replies/{q1}/vote", headers=auth(tok), json={"value": 1}).raise_for_status()
items = entries(f, owner_tok)
check("two entries", len(items) == 2, str(len(items)))
check("the second has the higher confidence", items[1]["confidence"] > items[0]["confidence"],
      str([i["confidence"] for i in items]))
check("yet the reviewed one is listed first", items[0]["id"] == eid and items[0]["reviewed"], str(items))
found = entries(f, owner_tok, q=word2)
check("search finds the matching entry only", len(found) == 1 and found[0]["source_thread_id"] == t2, str(found))
check("search matches the answer text too", len(entries(f, owner_tok, q="two inches")) == 1)
second_id = found[0]["id"]

print("\n== a steward corrects the wording ==")
r = c.patch(f"/forums/knowledge/{second_id}", headers=auth(owner_tok),
            json={"question": "How much compost for squash?", "answer": "Two inches, every spring."})
check("the owner edits", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
fixed = next(i for i in entries(f, owner_tok) if i["id"] == second_id)
check("text changed, citations kept, editor counts as reviewer",
      fixed["answer"] == "Two inches, every spring." and fixed["source_reply_id"] == q1
      and fixed["source_thread_id"] == t2 and fixed["reviewed_by"] == owner["id"], str(fixed))
r = c.patch(f"/forums/knowledge/{second_id}", headers=auth(owner_tok), json={})
check("an empty edit is refused", r.status_code == 400, f"{r.status_code}")

print("\n== entries stay true to the discussion ==")
r = c.patch(f"/threads/{t1}/replies/{r1}", headers=auth(helper_tok), json={"body": "Water evenly and mulch."})
check("the author edits the accepted reply", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
edited = next(i for i in entries(f, owner_tok) if i["id"] == eid)
check("the entry carries the new answer", edited["answer"] == "Water evenly and mulch.", edited["answer"])
check("and lost its reviewed mark", edited["reviewed"] is False and edited["reviewed_by"] is None, str(edited))
r = c.patch(f"/threads/{t1}", headers=auth(asker_tok), json={"title": f"Tomatoes splitting {word}"})
check("the asker edits the title", r.status_code == 200, f"{r.status_code}")
edited = next(i for i in entries(f, owner_tok) if i["id"] == eid)
check("the question follows", edited["question"].startswith("Tomatoes splitting"), edited["question"])

r = c.delete(f"/forums/knowledge/{second_id}", headers=auth(owner_tok))
check("the owner deletes an entry", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
check("it is gone", all(i["id"] != second_id for i in entries(f, owner_tok)))
c.put(f"/threads/{t2}/replies/{q1}/vote", headers=auth(voter_tok), json={"value": -1}).raise_for_status()
check("a later vote does not bring it back (no entry for that thread under any id)",
      all(i["source_thread_id"] != t2 for i in entries(f, owner_tok)), str(entries(f, owner_tok)))

r = c.delete(f"/threads/{t1}/replies/{r1}", headers=auth(helper_tok))
check("deleting the accepted reply answers 200", r.status_code == 200, f"{r.status_code}")
check("its entry is removed", entries(f, owner_tok) == [], str(entries(f, owner_tok)))

t3 = thread(asker_tok, f, f"Short-lived question {tag()}")
r3 = reply(helper_tok, t3, "A short-lived answer.")
accept(asker_tok, t3, r3)
check("a third entry exists", len(entries(f, owner_tok)) == 1)
r = c.delete(f"/threads/{t3}", headers=auth(asker_tok))
check("deleting the thread answers 200", r.status_code == 200, f"{r.status_code}")
check("its entry is removed", entries(f, owner_tok) == [])

print("\n== a free-standing forum has entries but no stewards ==")
free = forum(owner_tok)
tf = thread(asker_tok, free, f"Free question {tag()}")
rf = reply(helper_tok, tf, "Free answer.")
check("the asker accepts", accept(asker_tok, tf, rf).status_code == 200)
items = entries(free, owner_tok)
check("the entry exists, with no review buttons", len(items) == 1 and items[0]["can_review"] is False, str(items))
r = c.post(f"/forums/knowledge/{items[0]['id']}/review", headers=auth(owner_tok))
check("review is 403: nobody moderates it", r.status_code == 403, f"{r.status_code} {r.text[:100]}")

print("\n== a secret community's knowledge is closed to an outsider ==")
secret_c = community(owner_tok, "secret")
sf = forum(owner_tok, secret_c)
ts = thread(owner_tok, sf, f"Secret question {tag()}")
rs = reply(owner_tok, ts, "Secret answer.")
check("the owner accepts their own reply", accept(owner_tok, ts, rs).status_code == 200)
sid = entries(sf, owner_tok)[0]["id"]
r = c.get(f"/forums/{sf}/knowledge", headers=auth(outsider_tok))
check("an outsider reading it gets 404", r.status_code == 404, f"{r.status_code}")
r = c.get(f"/forums/{sf}/knowledge")
check("so does a signed-out reader", r.status_code == 404, f"{r.status_code}")
r = c.post(f"/forums/knowledge/{sid}/review", headers=auth(outsider_tok))
check("an outsider reviewing gets 403 or 404, never 200", r.status_code in (403, 404), f"{r.status_code}")
r = c.delete(f"/forums/knowledge/{sid}", headers=auth(outsider_tok))
check("an outsider deleting is refused too", r.status_code in (403, 404), f"{r.status_code}")
check("the entry is still there", len(entries(sf, owner_tok)) == 1)

print("\nALL CHECKS PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
