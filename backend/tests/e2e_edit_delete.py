"""Leave, edit and delete: communities, threads and replies.

Until now none of these existed: nobody could leave a community, correct or
remove a thread or a reply, or change or close a community.

Run against the live stack:  python backend/tests/e2e_edit_delete.py
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


def connect(a_tok, b_tok, a_id, b_id):
    c.post(f"/connections/{b_id}", headers=auth(a_tok), json={}).raise_for_status()
    c.post(f"/connections/{a_id}/respond?accept=true", headers=auth(b_tok)).raise_for_status()


def community(tok, kind, **extra):
    r = c.post("/communities", headers=auth(tok), json={
        "name": f"{kind} {tag()}", "description": "Tomatoes, compost and rain", "kind": kind, **extra,
    })
    r.raise_for_status()
    return r.json()["id"]


def forum(tok, cid):
    r = c.post("/forums", headers=auth(tok), json={"name": f"Forum {tag()}", "community_id": cid})
    r.raise_for_status()
    return r.json()["id"]


def thread(tok, fid, title="Compost question"):
    r = c.post(f"/forums/{fid}/threads", headers=auth(tok),
               json={"title": title, "body": "How often should I turn it?"})
    r.raise_for_status()
    return r.json()["id"]


def reply(tok, tid, body="Every two weeks"):
    r = c.post(f"/threads/{tid}/replies", headers=auth(tok), json={"body": body})
    r.raise_for_status()
    return r.json()["id"]


def pay_into(tok, cid, price):
    r = c.post("/payments/checkout", headers=auth(tok), json={
        "purpose": "community_membership", "amount": price, "reference": cid, "rail": "mock",
    })
    r.raise_for_status()
    c.post(f"/payments/{r.json()['payment_id']}/mock-settle", headers=auth(tok)).raise_for_status()


def members_count(tok, cid):
    return c.get(f"/communities/{cid}", headers=auth(tok)).json()["members_count"]


owner_tok, owner = register()
mod_tok, mod = register()
member_tok, member = register()
other_tok, other = register()
outsider_tok, outsider = register()
banned_tok, banned = register()

print("\n== leaving a community ==")
pub = community(owner_tok, "public")
for t in (mod_tok, member_tok, other_tok, banned_tok):
    c.post(f"/communities/{pub}/join", headers=auth(t)).raise_for_status()
check("five members in the roll", members_count(owner_tok, pub) == 5, str(members_count(owner_tok, pub)))

r = c.post(f"/communities/{pub}/leave", headers=auth(member_tok))
check("a member leaves", r.status_code == 200 and r.json().get("left") is True, f"{r.status_code} {r.text[:120]}")
check("members_count went down", members_count(owner_tok, pub) == 4, str(members_count(owner_tok, pub)))
r = c.get(f"/communities/{pub}", headers=auth(member_tok))
check("they no longer have a role", r.json().get("my_status") is None, r.text[:120])
r = c.post(f"/communities/{pub}/leave", headers=auth(member_tok))
check("leaving twice is refused (409)", r.status_code == 409, f"{r.status_code}")
r = c.post(f"/communities/{pub}/leave", headers=auth(outsider_tok))
check("a non-member cannot leave (409)", r.status_code == 409, f"{r.status_code}")

r = c.post(f"/communities/{pub}/leave", headers=auth(owner_tok))
check("the owner cannot leave (409)", r.status_code == 409, f"{r.status_code} {r.text[:120]}")
check("and is told to delete instead", "delete" in r.text.lower(), r.text[:160])
check("members_count is unchanged by the refusal", members_count(owner_tok, pub) == 4)

r = c.post(f"/communities/{pub}/members/{banned['id']}", headers=auth(owner_tok), json={"action": "ban"})
check("the owner bans a member", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
r = c.post(f"/communities/{pub}/leave", headers=auth(banned_tok))
check("a banned member cannot leave (403)", r.status_code == 403, f"{r.status_code} {r.text[:120]}")
r = c.post(f"/communities/{pub}/join", headers=auth(banned_tok))
check("and is still banned", r.status_code == 403, f"{r.status_code}")

priv = community(owner_tok, "private")
c.post(f"/communities/{priv}/join", headers=auth(other_tok)).raise_for_status()
before = members_count(owner_tok, priv)
r = c.post(f"/communities/{priv}/leave", headers=auth(other_tok))
check("a pending requester withdraws", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
check("members_count is not touched by a pending requester", members_count(owner_tok, priv) == before)

sec = community(owner_tok, "secret")
connect(owner_tok, member_tok, owner["id"], member["id"])
c.post(f"/communities/{sec}/invite", headers=auth(owner_tok), json={"user_id": member["id"]}).raise_for_status()
check("the invited person reads the secret community",
      c.get(f"/communities/{sec}", headers=auth(member_tok)).status_code == 200)
r = c.post(f"/communities/{sec}/leave", headers=auth(member_tok))
check("they leave the secret community", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
r = c.get(f"/communities/{sec}", headers=auth(member_tok))
check("afterwards it is 404 to them again", r.status_code == 404, f"{r.status_code}")
r = c.post(f"/communities/{sec}/leave", headers=auth(outsider_tok))
check("an outsider leaving a secret community gets 404", r.status_code == 404, f"{r.status_code}")

paid = community(owner_tok, "paid", price_usd=12.5)
pay_into(member_tok, paid, 12.5)
r = c.post(f"/communities/{paid}/leave", headers=auth(member_tok))
check("a paid member leaves", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
check("the message says there is no refund", "refund" in r.json().get("message", "").lower(), r.text[:200])
r = c.post(f"/communities/{paid}/join", headers=auth(member_tok))
check("rejoining a paid community means paying again (402)", r.status_code == 402, f"{r.status_code}")

print("\n== editing a community ==")
edit_c = community(owner_tok, "public")
c.post(f"/communities/{edit_c}/join", headers=auth(mod_tok)).raise_for_status()
c.post(f"/communities/{edit_c}/join", headers=auth(member_tok)).raise_for_status()
c.post(f"/communities/{edit_c}/members/{mod['id']}", headers=auth(owner_tok), json={"action": "promote"}).raise_for_status()
slug = c.get(f"/communities/{edit_c}", headers=auth(owner_tok)).json()["slug"]

r = c.patch(f"/communities/{edit_c}", headers=auth(owner_tok),
            json={"name": "Renamed garden", "description": "Now about beans", "country": "ke", "city": "Nairobi"})
check("the owner edits it", r.status_code == 200, f"{r.status_code} {r.text[:150]}")
d = c.get(f"/communities/{edit_c}", headers=auth(owner_tok)).json()
check("name, description, country and city changed",
      d["name"] == "Renamed garden" and d["description"] == "Now about beans"
      and d["country"] == "KE" and d["city"] == "Nairobi", str(d))
check("the slug did not change", d["slug"] == slug, d["slug"])
r = c.patch(f"/communities/{edit_c}", headers=auth(mod_tok), json={"name": "Hijacked"})
check("a moderator cannot edit (403)", r.status_code == 403, f"{r.status_code}")
r = c.patch(f"/communities/{edit_c}", headers=auth(member_tok), json={"name": "Hijacked"})
check("a member cannot edit (403)", r.status_code == 403, f"{r.status_code}")
r = c.patch(f"/communities/{edit_c}", headers=auth(outsider_tok), json={"name": "Hijacked"})
check("an outsider cannot edit a public community (403)", r.status_code == 403, f"{r.status_code}")
r = c.patch(f"/communities/{edit_c}", headers=auth(owner_tok), json={"kind": "secret"})
check("the kind cannot change (400)", r.status_code == 400, f"{r.status_code} {r.text[:120]}")
check("and is still public", c.get(f"/communities/{edit_c}").json()["kind"] == "public")
r = c.patch(f"/communities/{edit_c}", headers=auth(owner_tok), json={"price_usd": 5})
check("a free community takes no price (400)", r.status_code == 400, f"{r.status_code}")
r = c.patch(f"/communities/{paid}", headers=auth(owner_tok), json={"price_usd": 0})
check("a paid price must stay above zero (400)", r.status_code == 400, f"{r.status_code}")
r = c.patch(f"/communities/{paid}", headers=auth(owner_tok), json={"price_usd": 20})
check("a paid price can change", r.status_code == 200 and c.get(f"/communities/{paid}").json()["price_usd"] == "20.00",
      f"{r.status_code} {r.text[:120]}")
r = c.patch(f"/communities/{sec}", headers=auth(outsider_tok), json={"name": "Hijacked"})
check("a secret community answers an outsider 404", r.status_code == 404, f"{r.status_code}")
r = c.patch("/communities/cmy_doesnotexist", headers=auth(owner_tok), json={"name": "Nothing"})
check("a missing community is 404", r.status_code == 404, f"{r.status_code}")

print("\n== editing a thread ==")
com = community(owner_tok, "public")
for t in (mod_tok, member_tok, other_tok):
    c.post(f"/communities/{com}/join", headers=auth(t)).raise_for_status()
c.post(f"/communities/{com}/members/{mod['id']}", headers=auth(owner_tok), json={"action": "promote"}).raise_for_status()
f = forum(owner_tok, com)
t1 = thread(member_tok, f, "First title")

r = c.patch(f"/threads/{t1}", headers=auth(member_tok), json={"title": "Better title", "body": "Better body"})
check("the author edits their thread", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
d = c.get(f"/threads/{t1}", headers=auth(member_tok)).json()
check("title and body changed", d["title"] == "Better title" and d["body"] == "Better body", str(d)[:150])
r = c.patch(f"/threads/{t1}", headers=auth(other_tok), json={"body": "Mine now"})
check("another member cannot edit it (403)", r.status_code == 403, f"{r.status_code}")
r = c.patch(f"/threads/{t1}", headers=auth(mod_tok), json={"body": "Mine now"})
check("a steward cannot rewrite someone else's words (403)", r.status_code == 403, f"{r.status_code}")
r = c.patch(f"/threads/{t1}", headers=auth(owner_tok), json={"body": "Mine now"})
check("not even the owner (403)", r.status_code == 403, f"{r.status_code}")
r = c.patch(f"/threads/{t1}", headers=auth(member_tok), json={})
check("an empty edit is refused (400)", r.status_code == 400, f"{r.status_code}")

c.post(f"/threads/{t1}/lock", headers=auth(owner_tok)).raise_for_status()
r = c.patch(f"/threads/{t1}", headers=auth(member_tok), json={"body": "Edit while locked"})
check("the author cannot edit a locked thread (403)", r.status_code == 403, f"{r.status_code}")
mod_thread = thread(mod_tok, f, "Steward thread")
c.post(f"/threads/{mod_thread}/lock", headers=auth(owner_tok)).raise_for_status()
r = c.patch(f"/threads/{mod_thread}", headers=auth(mod_tok), json={"body": "Steward edits own, locked"})
check("a steward author can edit their own locked thread", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
c.delete(f"/threads/{t1}/lock", headers=auth(owner_tok)).raise_for_status()

print("\n== editing a reply ==")
r1 = reply(other_tok, t1, "Turn it weekly")
r = c.patch(f"/threads/{t1}/replies/{r1}", headers=auth(other_tok), json={"body": "Turn it every ten days"})
check("the author edits their reply", r.status_code == 200 and r.json().get("edited") is True,
      f"{r.status_code} {r.text[:120]}")
d = c.get(f"/threads/{t1}", headers=auth(member_tok)).json()
rep = next(x for x in d["replies"] if x["id"] == r1)
check("the reply carries edited and edited_at",
      rep["edited"] is True and rep["edited_at"] and rep["body"] == "Turn it every ten days", str(rep))
r2 = reply(member_tok, t1, "Never edited")
rep2 = next(x for x in c.get(f"/threads/{t1}", headers=auth(member_tok)).json()["replies"] if x["id"] == r2)
check("a new reply is not marked edited", rep2["edited"] is False and rep2["edited_at"] is None, str(rep2))
r = c.patch(f"/threads/{t1}/replies/{r1}", headers=auth(member_tok), json={"body": "Not yours"})
check("another member cannot edit it (403)", r.status_code == 403, f"{r.status_code}")
r = c.patch(f"/threads/{t1}/replies/{r1}", headers=auth(mod_tok), json={"body": "Not yours"})
check("a steward cannot edit it either (403)", r.status_code == 403, f"{r.status_code}")
r = c.patch(f"/threads/{t1}/replies/{r1}", headers=auth(other_tok), json={"body": ""})
check("an empty reply is refused (422)", r.status_code == 422, f"{r.status_code}")
c.post(f"/threads/{t1}/lock", headers=auth(owner_tok)).raise_for_status()
r = c.patch(f"/threads/{t1}/replies/{r1}", headers=auth(other_tok), json={"body": "Edit while locked"})
check("the author cannot edit a reply on a locked thread (403)", r.status_code == 403, f"{r.status_code}")
c.delete(f"/threads/{t1}/lock", headers=auth(owner_tok)).raise_for_status()

print("\n== deleting a reply ==")
r = c.post(f"/threads/{t1}/replies/{r1}/accept", headers=auth(member_tok))
check("the asker marks the reply as the answer", r.status_code == 200, f"{r.status_code}")
child = c.post(f"/threads/{t1}/replies", headers=auth(member_tok),
               json={"body": "Thanks, that worked", "parent_id": r1}).json()["id"]
c.put(f"/threads/{t1}/replies/{r1}/vote", headers=auth(member_tok), json={"value": 1}).raise_for_status()
count_before = c.get(f"/forums/{f}/threads", headers=auth(member_tok)).json()["items"]
replies_before = next(x for x in count_before if x["id"] == t1)["replies_count"]

r = c.delete(f"/threads/{t1}/replies/{r1}", headers=auth(outsider_tok))
check("an outsider (non-member of a public community) is not the author or a steward (403)",
      r.status_code == 403, f"{r.status_code}")
r = c.delete(f"/threads/{t1}/replies/{r1}", headers=auth(member_tok))
check("another member cannot delete it (403)", r.status_code == 403, f"{r.status_code}")
r = c.delete(f"/threads/{t1}/replies/{r1}", headers=auth(other_tok))
check("the author deletes their reply", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
d = c.get(f"/threads/{t1}", headers=auth(member_tok)).json()
check("it is gone from the thread", all(x["id"] != r1 for x in d["replies"]))
check("the accepted mark went with it", d["accepted_reply_id"] is None, str(d["accepted_reply_id"]))
kid = next((x for x in d["replies"] if x["id"] == child), None)
check("the reply that answered it stays, with a valid payload", kid is not None and kid["body"], str(kid))
items = c.get(f"/forums/{f}/threads", headers=auth(member_tok)).json()["items"]
check("replies_count went down by one", next(x for x in items if x["id"] == t1)["replies_count"] == replies_before - 1)
r = c.patch(f"/threads/{t1}/replies/{r1}", headers=auth(other_tok), json={"body": "Back from the dead"})
check("a deleted reply cannot be edited (404)", r.status_code == 404, f"{r.status_code}")
r = c.delete(f"/threads/{t1}/replies/{r1}", headers=auth(other_tok))
check("nor deleted twice (404)", r.status_code == 404, f"{r.status_code}")

r3 = reply(other_tok, t1, "A reply a steward will remove")
r = c.delete(f"/threads/{t1}/replies/{r3}", headers=auth(mod_tok))
check("a steward deletes someone else's reply", r.status_code == 200, f"{r.status_code} {r.text[:100]}")

print("\n== deleting a thread ==")
tm = thread(member_tok, f, "To be removed by its author")
items = c.get(f"/forums/{f}/threads", headers=auth(member_tok)).json()["items"]
forum_threads_before = len(items)
r = c.delete(f"/threads/{tm}", headers=auth(other_tok))
check("another member cannot delete it (403)", r.status_code == 403, f"{r.status_code}")
r = c.delete(f"/threads/{tm}", headers=auth(outsider_tok))
check("a non-member cannot delete it (403)", r.status_code == 403, f"{r.status_code}")
r = c.delete(f"/threads/{tm}", headers=auth(member_tok))
check("the author deletes their thread", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
check("it is 404 by id", c.get(f"/threads/{tm}", headers=auth(member_tok)).status_code == 404)
items = c.get(f"/forums/{f}/threads", headers=auth(member_tok)).json()["items"]
check("and gone from the list", len(items) == forum_threads_before - 1 and all(x["id"] != tm for x in items))
listed = [x for x in c.get("/forums", headers=auth(member_tok)).json()["items"] if x["id"] == f]
check("forum threads_count went down",
      bool(listed) and listed[0]["threads_count"] == forum_threads_before - 1,
      str(listed[0]["threads_count"] if listed else "forum not listed"))
r = c.delete(f"/threads/{tm}", headers=auth(member_tok))
check("deleting it again is 404", r.status_code == 404, f"{r.status_code}")
r = c.patch(f"/threads/{tm}", headers=auth(member_tok), json={"body": "Zombie"})
check("a deleted thread cannot be edited (404)", r.status_code == 404, f"{r.status_code}")
r = c.post(f"/threads/{tm}/replies", headers=auth(other_tok), json={"body": "Anyone?"})
check("nor replied to (404)", r.status_code == 404, f"{r.status_code}")

ts = thread(other_tok, f, "To be removed by a steward")
r = c.delete(f"/threads/{ts}", headers=auth(mod_tok))
check("a steward deletes someone else's thread", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
check("it is gone", c.get(f"/threads/{ts}", headers=auth(other_tok)).status_code == 404)

print("\n== outsiders and banned members get nothing ==")
sec_f = forum(owner_tok, sec)
st = thread(owner_tok, sec_f, "Secret thread")
sr = reply(owner_tok, st, "Secret reply")
for label, call in (
    ("edit thread", lambda: c.patch(f"/threads/{st}", headers=auth(outsider_tok), json={"body": "x"})),
    ("delete thread", lambda: c.delete(f"/threads/{st}", headers=auth(outsider_tok))),
    ("edit reply", lambda: c.patch(f"/threads/{st}/replies/{sr}", headers=auth(outsider_tok), json={"body": "x"})),
    ("delete reply", lambda: c.delete(f"/threads/{st}/replies/{sr}", headers=auth(outsider_tok))),
):
    r = call()
    check(f"an outsider's {label} in a secret community answers 404", r.status_code == 404, f"{r.status_code}")

c.post(f"/communities/{com}/join", headers=auth(banned_tok)).raise_for_status()
bt = thread(banned_tok, f, "Written before the ban")
br = reply(banned_tok, t1, "Reply before the ban")
c.post(f"/communities/{com}/members/{banned['id']}", headers=auth(owner_tok), json={"action": "ban"}).raise_for_status()
for label, call in (
    ("edit their own thread", lambda: c.patch(f"/threads/{bt}", headers=auth(banned_tok), json={"body": "x"})),
    ("delete their own thread", lambda: c.delete(f"/threads/{bt}", headers=auth(banned_tok))),
    ("edit their own reply", lambda: c.patch(f"/threads/{t1}/replies/{br}", headers=auth(banned_tok), json={"body": "x"})),
    ("delete their own reply", lambda: c.delete(f"/threads/{t1}/replies/{br}", headers=auth(banned_tok))),
):
    r = call()
    check(f"a banned member cannot {label}", r.status_code in (403, 404), f"{r.status_code}")

print("\n== deleting a community ==")
r = c.delete(f"/communities/{com}", headers=auth(mod_tok))
check("a moderator cannot delete it (403)", r.status_code == 403, f"{r.status_code}")
r = c.delete(f"/communities/{com}", headers=auth(member_tok))
check("a member cannot delete it (403)", r.status_code == 403, f"{r.status_code}")
r = c.delete(f"/communities/{sec}", headers=auth(outsider_tok))
check("an outsider deleting a secret community gets 404", r.status_code == 404, f"{r.status_code}")
check("and it is still there", c.get(f"/communities/{sec}", headers=auth(owner_tok)).status_code == 200)

sub = c.post("/forums", headers=auth(owner_tok),
             json={"name": f"Sub {tag()}", "parent_id": f, "community_id": com}).json()["id"]
sub_t = thread(owner_tok, sub, "In the sub-forum")
sub_r = reply(member_tok, sub_t, "Sub reply")
c.put(f"/threads/{t1}/replies/{child}/vote", headers=auth(other_tok), json={"value": 1}).raise_for_status()
r = c.delete(f"/communities/{com}", headers=auth(owner_tok))
check("the owner deletes the community", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
check("the community is 404", c.get(f"/communities/{com}", headers=auth(owner_tok)).status_code == 404)
check("its forum is 404", c.get(f"/forums/{f}/threads", headers=auth(owner_tok)).status_code == 404)
check("its sub-forum is 404", c.get(f"/forums/{sub}/threads", headers=auth(owner_tok)).status_code == 404)
check("its threads are 404", c.get(f"/threads/{t1}", headers=auth(owner_tok)).status_code == 404
      and c.get(f"/threads/{sub_t}", headers=auth(owner_tok)).status_code == 404)
check("members have no role in it any more",
      c.post(f"/communities/{com}/leave", headers=auth(member_tok)).status_code == 404)
check("it is gone from the listing", all(x["id"] != com for x in c.get("/communities?limit=100").json()["items"]))
r = c.delete(f"/communities/{com}", headers=auth(owner_tok))
check("deleting it again is 404", r.status_code == 404, f"{r.status_code}")

r = c.delete(f"/communities/{sec}", headers=auth(owner_tok))
check("the owner deletes a secret community", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
check("its secret forum and thread are gone", c.get(f"/threads/{st}", headers=auth(owner_tok)).status_code == 404)

paid2 = community(owner_tok, "paid", price_usd=9)
pay_into(member_tok, paid2, 9)
r = c.delete(f"/communities/{paid2}", headers=auth(owner_tok))
check("a paid community with paying members cannot be deleted (409)", r.status_code == 409,
      f"{r.status_code} {r.text[:120]}")
check("and is still there", c.get(f"/communities/{paid2}", headers=auth(owner_tok)).status_code == 200)
c.post(f"/communities/{paid2}/leave", headers=auth(member_tok)).raise_for_status()
r = c.delete(f"/communities/{paid2}", headers=auth(owner_tok))
check("once the last paying member left, the owner deletes it", r.status_code == 200,
      f"{r.status_code} {r.text[:100]}")

paid_solo = community(owner_tok, "paid", price_usd=3)
r = c.delete(f"/communities/{paid_solo}", headers=auth(owner_tok))
check("a paid community with nobody but its owner can be deleted", r.status_code == 200,
      f"{r.status_code} {r.text[:100]}")

print("\nALL CHECKS PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
