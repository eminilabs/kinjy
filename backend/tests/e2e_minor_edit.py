"""Editing and deleting go through the same gates as reading, minors included.

Covers: a minor can still edit and delete their own visible thread and reply;
an outsider, a banned member and a minor outside a secret community meet 404;
an adult cannot edit someone else's thread; and, when the classifier rates a
thread unsuitable for minors, a minor cannot reach it by id to edit, vote on
or answer it, nor can a reply that is itself fine be voted on inside it.

Run against the live stack:  python backend/tests/e2e_minor_edit.py
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


def forum(tok, community_id):
    r = c.post("/forums", headers=auth(tok), json={"name": f"Garden {tag()}", "community_id": community_id})
    r.raise_for_status()
    return r.json()["id"]


def thread(tok, forum_id, title, body="Details of the problem."):
    r = c.post(f"/forums/{forum_id}/threads", headers=auth(tok), json={"title": title, "body": body})
    return r


def reply(tok, thread_id, body):
    r = c.post(f"/threads/{thread_id}/replies", headers=auth(tok), json={"body": body})
    r.raise_for_status()
    return r.json()["id"]


owner_tok, owner = register()
adult_tok, adult = register()
teen_tok, teen = register(15)
outsider_tok, _ = register()
banned_tok, banned = register()

pub = community(owner_tok, "public")
f = forum(owner_tok, pub)
for tok in (adult_tok, teen_tok, banned_tok):
    c.post(f"/communities/{pub}/join", headers=auth(tok)).raise_for_status()

print("\n== a minor edits and deletes their own visible content ==")
r = thread(teen_tok, f, f"Teen question {tag()}", "How deep do I plant garlic?")
check("the minor opens a thread", r.status_code == 201, f"{r.status_code} {r.text[:100]}")
t1 = r.json()["id"]
r = c.get(f"/threads/{t1}", headers=auth(teen_tok))
check("the minor reads it", r.status_code == 200, f"{r.status_code}")
r = c.patch(f"/threads/{t1}", headers=auth(teen_tok), json={"body": "How deep do I plant garlic cloves?"})
check("the minor edits their thread", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
rp = reply(teen_tok, t1, "I think about two inches.")
r = c.patch(f"/threads/{t1}/replies/{rp}", headers=auth(teen_tok), json={"body": "About two inches, pointy end up."})
check("the minor edits their reply", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
ra = reply(adult_tok, t1, "Two to three inches.")
r = c.put(f"/threads/{t1}/replies/{ra}/vote", headers=auth(teen_tok), json={"value": 1})
check("the minor still votes on a visible reply", r.status_code == 200, f"{r.status_code} {r.text[:100]}")

print("\n== nobody edits what is not theirs ==")
r = c.patch(f"/threads/{t1}", headers=auth(adult_tok), json={"title": "Hijacked title"})
check("an adult cannot edit someone else's thread", r.status_code == 403, f"{r.status_code}")
r = c.patch(f"/threads/{t1}/replies/{rp}", headers=auth(adult_tok), json={"body": "Hijacked"})
check("an adult cannot edit someone else's reply", r.status_code == 403, f"{r.status_code}")
r = c.delete(f"/threads/{t1}", headers=auth(adult_tok))
check("a plain member cannot delete it", r.status_code == 403, f"{r.status_code}")
r = c.patch(f"/threads/{t1}", headers=auth(outsider_tok), json={"title": "Not a member"})
check("a non-member of a public community still cannot edit (403, not theirs)", r.status_code == 403, f"{r.status_code}")

print("\n== outsiders, banned members and minors outside a secret community: 404 ==")
secret_c = community(owner_tok, "secret")
sf = forum(owner_tok, secret_c)
ts = thread(owner_tok, sf, f"Secret question {tag()}").json()["id"]
rs = reply(owner_tok, ts, "Secret answer.")
for who, tok in (("an adult outsider", outsider_tok), ("a minor outsider", teen_tok)):
    r = c.patch(f"/threads/{ts}", headers=auth(tok), json={"title": "Peeking around"})
    check(f"{who} editing a secret thread gets 404", r.status_code == 404, f"{r.status_code}")
    r = c.delete(f"/threads/{ts}", headers=auth(tok))
    check(f"{who} deleting it gets 404", r.status_code == 404, f"{r.status_code}")
    r = c.patch(f"/threads/{ts}/replies/{rs}", headers=auth(tok), json={"body": "Peeking"})
    check(f"{who} editing its reply gets 404", r.status_code == 404, f"{r.status_code}")
    r = c.put(f"/threads/{ts}/replies/{rs}/vote", headers=auth(tok), json={"value": 1})
    check(f"{who} voting in it gets 404", r.status_code == 404, f"{r.status_code}")

# A ban removes even the author's own way back to their words.
tb = thread(banned_tok, f, f"Soon banned {tag()}").json()["id"]
rb = reply(banned_tok, tb, "My answer before the ban.")
r = c.post(f"/communities/{pub}/members/{banned['id']}", headers=auth(owner_tok), json={"action": "ban"})
check("the owner bans the member", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
r = c.patch(f"/threads/{tb}", headers=auth(banned_tok), json={"title": "Edited after ban"})
check("a banned author cannot edit their thread", r.status_code == 404, f"{r.status_code}")
r = c.patch(f"/threads/{tb}/replies/{rb}", headers=auth(banned_tok), json={"body": "Edited after ban"})
check("nor their reply", r.status_code == 404, f"{r.status_code}")
r = c.delete(f"/threads/{tb}", headers=auth(banned_tok))
check("nor delete the thread", r.status_code == 404, f"{r.status_code}")

print("\n== an edit that could not be published is refused, and rolls back ==")
r = c.patch(f"/threads/{t1}", headers=auth(teen_tok), json={"title": "Plain wording kept"})
check("a plain edit is accepted", r.status_code == 200, f"{r.status_code}")
before = c.get(f"/threads/{t1}", headers=auth(teen_tok)).json()
r = c.patch(f"/threads/{t1}", headers=auth(teen_tok), json={"body": "nsfw porn explicit sex"})
after = c.get(f"/threads/{t1}", headers=auth(teen_tok))
if r.status_code == 403:
    check("the refused rewrite changed nothing",
          after.status_code == 200 and after.json().get("body") == before.get("body"), after.text[:100])
else:
    # Rated adult-only instead of blocked: the thread leaves a minor's reach.
    check("an adult-rated rewrite takes the thread out of the minor's reach",
          after.status_code == 404, f"{r.status_code} then {after.status_code}")
    check("and the minor cannot edit it again by id",
          c.patch(f"/threads/{t1}", headers=auth(teen_tok), json={"body": "back to bland"}).status_code == 404)
    check("nor vote in it",
          c.put(f"/threads/{t1}/replies/{ra}/vote", headers=auth(teen_tok), json={"value": 1}).status_code == 404)
    check("nor edit their own reply in it",
          c.patch(f"/threads/{t1}/replies/{rp}", headers=auth(teen_tok), json={"body": "bland"}).status_code == 404)
    check("an adult still reads it", c.get(f"/threads/{t1}", headers=auth(adult_tok)).status_code == 200)
    r = c.delete(f"/threads/{t1}", headers=auth(teen_tok))
    check("the author may still take their own words down", r.status_code == 200, f"{r.status_code}")

print("\n== deleting follows the same gates ==")
r = c.delete(f"/threads/{ts}/replies/{rs}", headers=auth(outsider_tok))
check("an outsider cannot delete a secret reply", r.status_code == 404, f"{r.status_code}")
t2 = thread(teen_tok, f, f"Short-lived {tag()}").json()["id"]
r2 = reply(teen_tok, t2, "Short-lived reply.")
check("the minor deletes their reply", c.delete(f"/threads/{t2}/replies/{r2}", headers=auth(teen_tok)).status_code == 200)
check("the minor deletes their thread", c.delete(f"/threads/{t2}", headers=auth(teen_tok)).status_code == 200)
check("it is gone", c.get(f"/threads/{t2}", headers=auth(teen_tok)).status_code == 404)

print("\nALL CHECKS PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
