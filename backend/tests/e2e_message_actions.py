"""Editing, deleting, reacting, and stickers.

The checks that matter here are about who may do what to whose message, and
about what "deleted" means. A delete that leaves the text in the database is
not a delete, and an edit nobody can see is a way to change what somebody
appears to have said after they have read it.

Run against the local stack:  python backend/tests/e2e_message_actions.py
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
    c.patch("/preferences", headers=auth(token), json={"who_can_message": "everyone"})
    return r.json()["user"]["id"], token


def thread(conv, token):
    return c.get(f"/conversations/{conv}/messages", headers=auth(token)).json()["items"]


alice_id, alice = register("aa")
bob_id, bob = register("bb")
room = c.post("/conversations", headers=auth(alice),
              json={"participant_ids": [bob_id], "encrypted": False}).json()["id"]

print("== editing")
mid = c.post(f"/conversations/{room}/messages", headers=auth(alice),
             json={"body": "see you at 9"}).json()["id"]

r = c.patch(f"/conversations/{room}/messages/{mid}", headers=auth(alice), json={"body": "see you at 10"})
check("the sender can edit their own message", r.status_code == 200, (r.status_code, r.text[:160]))
check("and it is marked as edited", bool(r.json().get("edited_at")), r.text[:160])

after = next((m for m in thread(room, bob) if m["id"] == mid), None)
check("the other side sees the new text", bool(after) and after["body"] == "see you at 10", after)
check("and can tell it was edited", bool(after) and bool(after.get("edited_at")), after)

r = c.patch(f"/conversations/{room}/messages/{mid}", headers=auth(bob), json={"body": "I changed your words"})
check("somebody else cannot edit it", r.status_code == 403, (r.status_code, r.text[:160]))
still = next((m for m in thread(room, alice) if m["id"] == mid), None)
check("and the text is untouched", bool(still) and still["body"] == "see you at 10", still)

print("\n== reacting")
r = c.post(f"/conversations/{room}/messages/{mid}/reactions", headers=auth(bob), json={"emoji": "👍"})
check("anyone in the room can react", r.status_code == 200, (r.status_code, r.text[:160]))
check("the count is returned", r.json().get("counts", {}).get("👍") == 1, r.text[:160])

r = c.post(f"/conversations/{room}/messages/{mid}/reactions", headers=auth(bob), json={"emoji": "❤️"})
check("a second emoji replaces the first, never stacks",
      r.json().get("counts") == {"❤️": 1}, r.text[:160])

r = c.post(f"/conversations/{room}/messages/{mid}/reactions", headers=auth(bob), json={"emoji": "❤️"})
check("tapping the same one takes it back",
      r.json().get("counts") == {} and r.json().get("mine") is None, r.text[:160])

c.post(f"/conversations/{room}/messages/{mid}/reactions", headers=auth(bob), json={"emoji": "👍"})
seen = next((m for m in thread(room, bob) if m["id"] == mid), None)
check("the thread carries the reactions", bool(seen) and seen["reactions"] == {"👍": 1}, seen)
check("and says which one is mine", bool(seen) and seen["my_reaction"] == "👍", seen)
mine_for_alice = next((m for m in thread(room, alice) if m["id"] == mid), None)
check("but not as the other person's", bool(mine_for_alice) and mine_for_alice["my_reaction"] is None,
      mine_for_alice)

r = c.post(f"/conversations/{room}/messages/{mid}/reactions", headers=auth(bob), json={"emoji": "💀"})
check("an emoji outside the set is refused", r.status_code == 422, (r.status_code, r.text[:120]))

print("\n== stickers")
r = c.get("/stickers", headers=auth(alice))
check("the catalogue is served", r.status_code == 200 and len(r.json()["packs"]) >= 2,
      (r.status_code, r.text[:120]))
first = r.json()["packs"][0]["stickers"][0]["id"]

r = c.post(f"/conversations/{room}/messages", headers=auth(alice), json={"sticker_id": first})
check("a sticker can be sent with no text", r.status_code == 201, (r.status_code, r.text[:160]))
sent = next((m for m in thread(room, bob) if m["id"] == r.json()["id"]), None)
check("it arrives as a sticker", bool(sent) and sent["kind"] == "sticker", sent)
check("with the picture resolved by the server",
      bool(sent) and (sent.get("sticker") or {}).get("id") == first, sent)

r = c.post(f"/conversations/{room}/messages", headers=auth(alice), json={"sticker_id": "not.a.sticker"})
check("an unknown sticker is refused rather than sent empty", r.status_code == 400,
      (r.status_code, r.text[:160]))

print("\n== deleting")
doomed = c.post(f"/conversations/{room}/messages", headers=auth(alice),
                json={"body": "REGRETTABLE TEXT"}).json()["id"]
c.post(f"/conversations/{room}/messages/{doomed}/reactions", headers=auth(bob), json={"emoji": "😂"})

r = c.delete(f"/conversations/{room}/messages/{doomed}", headers=auth(bob))
check("somebody else cannot delete it", r.status_code == 403, (r.status_code, r.text[:160]))

r = c.delete(f"/conversations/{room}/messages/{doomed}", headers=auth(alice))
check("the sender can", r.status_code == 200, (r.status_code, r.text[:160]))

items = thread(room, bob)
gone = next((m for m in items if m["id"] == doomed), None)
check("the message keeps its place in the thread", gone is not None, [m["id"] for m in items])
check("marked as deleted", bool(gone) and gone["deleted"] is True, gone)
check("and the words are gone", bool(gone) and gone["body"] is None, gone)
check("as are the reactions to it", bool(gone) and gone["reactions"] == {}, gone)
check("nothing in the thread still contains the text",
      not any("REGRETTABLE" in str(m.get("body") or "") for m in items), items)

r = c.patch(f"/conversations/{room}/messages/{doomed}", headers=auth(alice), json={"body": "undelete me"})
check("a deleted message cannot be edited back into existence", r.status_code == 404,
      (r.status_code, r.text[:160]))
r = c.post(f"/conversations/{room}/messages/{doomed}/reactions", headers=auth(bob), json={"emoji": "👍"})
check("nor reacted to", r.status_code == 404, (r.status_code, r.text[:160]))

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
