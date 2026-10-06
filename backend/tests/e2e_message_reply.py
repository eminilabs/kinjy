"""Replying to a message, and what a reply may quote.

A reply is a pointer to another message. The interesting part is not that it
stores the id — it is what happens when the id is one it should not be able to
point at, because the quoted line is rendered from the original, so quoting is
reading.

Run against the local stack:  python backend/tests/e2e_message_reply.py
"""
from __future__ import annotations

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
    ok = ok and bool(cond)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def register(prefix):
    t = "".join(random.choices(string.ascii_lowercase, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"{prefix}{t}", "display_name": f"Demo {prefix.upper()}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
        "country": "US"})
    r.raise_for_status()
    token = r.json()["tokens"]["access_token"]
    # The default policy is "accepted connections only", which is right for the
    # product and in the way of a two-line test.
    c.patch("/preferences", headers=auth(token), json={"who_can_message": "everyone"})
    return r.json()["user"]["id"], token


alice_id, alice = register("ra")
bob_id, bob = register("rb")
carol_id, carol = register("rc")

print("== two conversations")
room = c.post("/conversations", headers=auth(alice),
              json={"participant_ids": [bob_id], "encrypted": False}).json()["id"]
elsewhere = c.post("/conversations", headers=auth(alice),
                   json={"participant_ids": [carol_id], "encrypted": False}).json()["id"]

asked = c.post(f"/conversations/{room}/messages", headers=auth(alice),
               json={"body": "Are we still on for Saturday?"})
check("a first message is sent", asked.status_code == 201, (asked.status_code, asked.text[:160]))
asked_id = asked.json()["id"]

other = c.post(f"/conversations/{elsewhere}/messages", headers=auth(alice),
               json={"body": "Something only Alice and Carol can read"}).json()["id"]

print("\n== answering it")
r = c.post(f"/conversations/{room}/messages", headers=auth(bob),
           json={"body": "Yes, 10am", "reply_to_id": asked_id})
check("a reply is accepted", r.status_code == 201, (r.status_code, r.text[:160]))
check("and records what it answers", r.json().get("reply_to_id") == asked_id, r.text[:160])

items = c.get(f"/conversations/{room}/messages", headers=auth(alice)).json()["items"]
reply = next((m for m in items if m["body"] == "Yes, 10am"), None)
check("the thread carries the quoted line", bool(reply and reply.get("reply_to")), reply)
check("which is the message it answers",
      bool(reply) and reply["reply_to"]["preview"] == "Are we still on for Saturday?",
      (reply or {}).get("reply_to"))
check("and names who wrote it",
      bool(reply) and reply["reply_to"]["sender_id"] == alice_id, (reply or {}).get("reply_to"))

print("\n== what a reply may not quote")
r = c.post(f"/conversations/{room}/messages", headers=auth(bob),
           json={"body": "quoting another room", "reply_to_id": other})
# The message is still sent; what is refused is the quote. Rejecting the whole
# send would turn a stale reply box into an error the member cannot act on.
check("a message from another conversation is not quoted",
      r.status_code == 201 and r.json().get("reply_to_id") is None, (r.status_code, r.text[:160]))

r = c.post(f"/conversations/{room}/messages", headers=auth(bob),
           json={"body": "quoting nothing", "reply_to_id": "msg_does_not_exist"})
check("nor is a message that does not exist",
      r.status_code == 201 and r.json().get("reply_to_id") is None, (r.status_code, r.text[:160]))

items = c.get(f"/conversations/{room}/messages", headers=auth(alice)).json()["items"]
leaked = [m for m in items if m.get("reply_to") and "Carol" in (m["reply_to"]["preview"] or "")]
check("nothing from the other conversation reached this one", not leaked, leaked)

print("\n== a reply is still a message")
plain = [m for m in items if m["body"] == "quoting nothing"]
check("a refused quote still delivers the message", len(plain) == 1, items)
check("with no quote attached", bool(plain) and plain[0].get("reply_to") is None, plain)

print("\n== and the thread still reads normally")
check("every message came back", len(items) >= 4, len(items))
check("a message with no reply has no quote",
      all(m.get("reply_to") is None for m in items if m["body"] == "Are we still on for Saturday?"),
      items)

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
