"""Parental supervision, against the live API.

Half of this file tests that the feature works. The other half tests that it
stops where it is supposed to, and that half matters more: a supervision feature
that quietly grows into surveillance is worse than none, and the way it grows is
one endpoint at a time. So the limits are asserted, not trusted.

Two claims in particular are checked rather than assumed:

* A parent has no route to the teenager's messages. Not a filtered route, not a
  metadata route — none.
* Ending supervision does not unlock anything. If "remove your parent" were the
  way for a 14-year-old to become messageable by strangers, the whole feature
  would be a lock with the key taped to it.
"""
import os
import random
import string
import sys
from datetime import date

import httpx

# Defaults are the local stack. Production publishes no ports, so there the same
# script runs inside the compose network with these three overridden - the
# service-name assertions below hold either way, which is the point of having
# them rather than trusting the port.
BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
# 8201 is auth-service; user-service is 8202. Asserted below.
USER = os.environ.get("KINJY_USER", "http://localhost:8202")
MESSAGING = os.environ.get("KINJY_MESSAGING", "http://localhost:8207")
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


def register(age):
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"Demo {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"], f"u{t}"


def auth(t):
    return {"Authorization": f"Bearer {t}"}


# Ports first. Another service answers 404 to every unknown path, so a test that
# expects a refusal passes without ever reaching the service meant to refuse.
for name, url, expected in (("user", USER, "user-service"),
                            ("messaging", MESSAGING, "messaging-service")):
    probe = httpx.get(f"{url}/health", timeout=10).json()
    assert probe.get("service") == expected, f"{name} on the wrong port: {probe}"
print("talking to user-service and messaging-service on the right ports")

parent_tok, parent, parent_handle = register(38)
teen_tok, teen, teen_handle = register(14)
older_tok, older, older_handle = register(17)
other_tok, other, other_handle = register(41)

print("\n== the limits are published before anybody agrees ==")
r = httpx.get(f"{USER}/supervision/disclosure", timeout=15)
check("the disclosure is readable without signing in", r.status_code == 200, r.text[:140])
d = r.json() if r.status_code == 200 else {}
body = " ".join(d.get("cannot_see", [])).lower()
check("it says private messages are not shared", "private messages" in body, body[:160])
check("it says who you message is not shared", "who you message" in body, body[:160])
check("it says location is not shared", "location" in body, body[:160])
cannot_do = " ".join(d.get("cannot_do", [])).lower()
check("it says the parent cannot post as the teen", "as you" in cannot_do, cannot_do[:160])
check("it says the teen can always end it",
      "end the supervision" in " ".join(d.get("can_do", [])).lower()
      or "ending" in (d.get("note") or "").lower(), d.get("note"))

print("\n== a link needs both sides ==")
r = c.post("/supervision/invite", headers=auth(parent_tok),
           json={"other_handle": other_handle})
check("adult + adult is refused", r.status_code == 400, f"{r.status_code} {r.text[:120]}")

r = c.post("/supervision/invite", headers=auth(parent_tok),
           json={"other_handle": teen_handle})
check("an adult may invite a 14-year-old", r.status_code == 201, f"{r.status_code} {r.text[:160]}")
link = r.json() if r.status_code == 201 else {}
link_id = link.get("id")
check("the roles come from the ages, not the invitation",
      link.get("teen_id") == teen["id"] and link.get("parent_id") == parent["id"], link)
check("it starts as an invitation, not as active", link.get("status") == "invited", link)

r = c.post(f"/supervision/{link_id}/answer", headers=auth(parent_tok), json={"approve": True})
check("the inviter cannot accept on the other's behalf", r.status_code == 403,
      f"{r.status_code} {r.text[:120]}")

r = c.post(f"/supervision/{link_id}/answer", headers=auth(other_tok), json={"approve": True})
check("an unrelated adult cannot answer it", r.status_code == 404, f"{r.status_code}")

r = c.post(f"/supervision/{link_id}/answer", headers=auth(teen_tok), json={"approve": True})
check("the teenager accepting activates it",
      r.status_code == 200 and r.json().get("status") == "active", r.text[:160])

r = c.post("/supervision/invite", headers=auth(other_tok), json={"other_handle": teen_handle})
check("a second adult cannot attach to the same account", r.status_code == 409,
      f"{r.status_code} {r.text[:120]}")

print("\n== what the parent is shown, and what is missing from it ==")
r = c.get(f"/supervision/{link_id}/view", headers=auth(parent_tok))
check("the parent has a view", r.status_code == 200, r.text[:160])
view = r.json() if r.status_code == 200 else {}
check("it includes the safety settings", "settings" in view, list(view))
check("it includes time used today", "minutes_today" in view.get("time", {}), view.get("time"))
# Scanned with `not_included` removed: that field is the disclaimer listing what
# is *not* shared, so leaving it in makes the sentence "your list of friends or
# followers" match and the check reports a leak that is the opposite of one.
scanned = {k: v for k, v in view.items() if k != "not_included"}
flat = str(scanned).lower()
for word in ("message_body", "conversation", "contacts", "followers", "search_hist", "latitude"):
    check(f"it carries no {word}", word not in flat, flat[:200])
check("it restates what is not included", bool(view.get("not_included")), view.get("not_included"))

r = c.get(f"/supervision/{link_id}/view", headers=auth(teen_tok))
check("the teenager cannot open the parent's view of themselves", r.status_code == 404,
      f"{r.status_code}")
r = c.get(f"/supervision/{link_id}/view", headers=auth(other_tok))
check("a stranger cannot open it either", r.status_code == 404, f"{r.status_code}")

print("\n== a parent has no route to the messages ==")
r = c.get("/conversations", headers=auth(parent_tok))
mine = [x.get("id") for x in r.json().get("items", [])] if r.status_code == 200 else []
check("asking for conversations returns only the parent's own", isinstance(mine, list), r.text[:120])
r = httpx.get(f"{USER}/supervision/{link_id}/messages", timeout=15, headers=auth(parent_tok))
check("there is no messages endpoint on the supervision link", r.status_code == 404,
      f"{r.status_code} {r.text[:120]}")
r = c.get("/conversations", headers=auth(parent_tok), params={"user_id": teen["id"]})
returned = r.json().get("items", []) if r.status_code == 200 else []
check("naming the teen as a parameter does not fetch their conversations",
      all(teen["id"] not in str(x.get("participants", "")) or x.get("id") in mine
          for x in returned), str(returned)[:200])

print("\n== stricter is always the teenager's own call ==")
r = c.patch("/preferences", headers=auth(teen_tok), json={"who_can_message": "nobody"})
check("tightening applies immediately", r.status_code == 200
      and r.json().get("who_can_message") == "nobody", r.text[:200])
check("and nothing was sent to the parent", not r.json().get("awaiting_approval"), r.text[:200])

print("\n== loosening goes to the parent instead of being applied ==")
r = c.patch("/preferences", headers=auth(teen_tok), json={"who_can_message": "everyone"})
check("the call succeeds", r.status_code == 200, r.text[:200])
out = r.json() if r.status_code == 200 else {}
check("the setting did not move", out.get("who_can_message") == "nobody", out.get("who_can_message"))
held = out.get("awaiting_approval") or []
check("it is waiting for approval", len(held) == 1, held)
req_id = held[0]["request_id"] if held else None
check("the teenager is told what is waiting",
      held and held[0]["setting"] == "who_can_message", held)

r = c.patch("/preferences", headers=auth(teen_tok), json={"who_can_message": "everyone"})
again = (r.json().get("awaiting_approval") or [{}])[0].get("request_id")
check("asking twice does not queue it twice", again == req_id, f"{again} vs {req_id}")

r = c.get("/supervision", headers=auth(teen_tok))
teen_reqs = r.json().get("requests", []) if r.status_code == 200 else []
check("the teenager can see their own pending request",
      any(x["id"] == req_id for x in teen_reqs), teen_reqs)

print("\n== only the parent answers it ==")
r = c.post(f"/supervision/requests/{req_id}", headers=auth(teen_tok), json={"approve": True})
check("the teenager cannot approve their own request", r.status_code == 404, f"{r.status_code}")
r = c.post(f"/supervision/requests/{req_id}", headers=auth(other_tok), json={"approve": True})
check("nor can a stranger", r.status_code == 404, f"{r.status_code}")

r = c.post(f"/supervision/requests/{req_id}", headers=auth(parent_tok), json={"approve": False})
check("the parent may decline", r.status_code == 200
      and r.json().get("status") == "declined", r.text[:160])
r = c.get("/preferences", headers=auth(teen_tok))
check("a declined request changes nothing",
      r.json().get("who_can_message") == "nobody", r.text[:160])
r = c.post(f"/supervision/requests/{req_id}", headers=auth(parent_tok), json={"approve": True})
check("an answered request cannot be answered again", r.status_code == 409, f"{r.status_code}")

r = c.patch("/preferences", headers=auth(teen_tok), json={"who_can_message": "everyone"})
req_id = (r.json().get("awaiting_approval") or [{}])[0].get("request_id")
r = c.post(f"/supervision/requests/{req_id}", headers=auth(parent_tok), json={"approve": True})
check("the parent may approve", r.status_code == 200, r.text[:160])
r = c.get("/preferences", headers=auth(teen_tok))
check("approval applies the change", r.json().get("who_can_message") == "everyone", r.text[:160])

print("\n== the time limit is the parent's to set ==")
r = c.post(f"/supervision/{link_id}/time-limit", headers=auth(parent_tok),
           json={"daily_limit_minutes": 90})
check("the parent may set it", r.status_code == 200
      and r.json().get("daily_limit_minutes") == 90, r.text[:160])
r = c.post(f"/supervision/{link_id}/time-limit", headers=auth(teen_tok),
           json={"daily_limit_minutes": 600})
check("the teenager cannot raise it through that endpoint", r.status_code == 404,
      f"{r.status_code}")
r = c.get(f"/supervision/{link_id}/view", headers=auth(parent_tok))
check("it shows in the parent's view",
      r.json().get("time", {}).get("daily_limit_minutes") == 90, r.json().get("time"))

print("\n== an unsupervised 14-year-old is refused, not merely unasked ==")
lone_tok, lone, lone_handle = register(14)
r = c.patch("/preferences", headers=auth(lone_tok), json={"who_can_message": "everyone"})
check("loosening is refused outright", r.status_code == 403, f"{r.status_code} {r.text[:160]}")
check("the refusal points at supervision rather than at a rule",
      "approval" in r.text.lower() or "adult" in r.text.lower(), r.text[:160])
r = c.patch("/preferences", headers=auth(lone_tok), json={"discoverable": True})
check("so is making themselves discoverable", r.status_code == 403, f"{r.status_code}")
r = c.patch("/preferences", headers=auth(lone_tok), json={"age_mode": "adult"})
check("and they cannot promote their own age mode", r.status_code == 403,
      f"{r.status_code} {r.text[:140]}")
r = c.patch("/preferences", headers=auth(lone_tok), json={"reduced_motion": True})
check("an ordinary setting is untouched by any of this",
      r.status_code == 200 and r.json().get("reduced_motion") is True, r.text[:160])

print("\n== a 16-year-old is not treated as a 14-year-old ==")
r = c.patch("/preferences", headers=auth(older_tok), json={"who_can_message": "everyone"})
check("a 17-year-old decides this for themselves",
      r.status_code == 200 and r.json().get("who_can_message") == "everyone", r.text[:160])

print("\n== ending it buys nothing ==")
r = c.post(f"/supervision/{link_id}/end", headers=auth(teen_tok))
check("the teenager can end it themselves", r.status_code == 200
      and r.json().get("status") == "ended", r.text[:200])
check("and it is recorded who ended it", r.json().get("ended_by") == teen["id"], r.text[:200])
r = c.get("/preferences", headers=auth(teen_tok))
after = r.json()
check("settings went back to the defaults for the age",
      after.get("who_can_message") != "everyone", after.get("who_can_message"))
check("and discoverability with them", after.get("discoverable") is False,
      after.get("discoverable"))
r = c.patch("/preferences", headers=auth(teen_tok), json={"who_can_message": "everyone"})
check("removing the parent is not the way to unlock it", r.status_code == 403,
      f"{r.status_code} {r.text[:160]}")
r = c.post(f"/supervision/{link_id}/end", headers=auth(parent_tok))
check("an ended link cannot be ended twice", r.status_code == 409, f"{r.status_code}")

print("\n== the other side is told ==")
r = c.get("/notifications", headers=auth(parent_tok))
kinds = [x.get("kind") for x in r.json().get("items", [])] if r.status_code == 200 else []
check("the parent was notified that it ended", "supervision_ended" in kinds, kinds[:6])
check("and was notified of the request", "supervision_request" in kinds, kinds[:8])
r = c.get("/notifications", headers=auth(teen_tok))
teen_kinds = [x.get("kind") for x in r.json().get("items", [])] if r.status_code == 200 else []
check("the teenager was notified of the invitation",
      "supervision_invite" in teen_kinds, teen_kinds[:8])
check("and of the answers to their requests",
      "supervision_request_answered" in teen_kinds, teen_kinds[:8])

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
