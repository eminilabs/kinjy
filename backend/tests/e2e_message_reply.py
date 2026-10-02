"""Replying to a specific message, against the live API.

What must hold: a reply can only quote a message of its own conversation, the
server keeps the id and nothing of the quoted text, a quoted message that has
expired is reported as gone without its content, and an end-to-end encrypted
conversation never gains a plaintext copy through the reply path.
"""
import base64
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


def register():
    t = tag()
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"T {t}",
        "password": "Sup3rStrong!Pass", "country": "US",
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
    })
    r.raise_for_status()
    d = r.json()
    token = d["tokens"]["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    p = c.patch("/preferences", headers=h, json={"who_can_message": "everyone"})
    assert p.status_code == 200, f"could not open messages: {p.status_code} {p.text[:120]}"
    return h, d["user"]


def convo(h, other, encrypted=False):
    r = c.post("/conversations", headers=h,
               json={"kind": "direct", "participant_ids": [other["id"]], "encrypted": encrypted})
    assert r.status_code in (200, 201), f"could not open a conversation: {r.status_code} {r.text[:120]}"
    return r.json()["id"]


def say(h, cid, body, **extra):
    return c.post(f"/conversations/{cid}/messages", headers=h, json={"body": body, **extra})


def thread(h, cid):
    r = c.get(f"/conversations/{cid}/messages", headers=h)
    assert r.status_code == 200, r.text[:120]
    return r.text, {m["id"]: m for m in r.json()["items"]}


alice_h, alice = register()
bob_h, bob = register()
carol_h, carol = register()
one = convo(alice_h, bob)
two = convo(alice_h, carol)

print("A valid reply")
original = say(alice_h, one, "ORIGINAL-SECRET-TEXT-1")
check("the original is stored", original.status_code == 201, original.text[:120])
oid = original.json()["id"]
reply = say(bob_h, one, "an answer", reply_to_id=oid)
check("a reply to a message of the same conversation is accepted", reply.status_code == 201, reply.text[:120])
raw, items = thread(alice_h, one)
got = items.get(reply.json()["id"], {})
check("the thread returns reply_to_id", got.get("reply_to_id") == oid, str(got))
check("the original is not reported deleted", got.get("reply_to_deleted") is False, str(got))
check("a message that is not a reply has no reply_to_id", items[oid].get("reply_to_id") is None)
check("the reply carries no text of the quoted message",
      "ORIGINAL-SECRET-TEXT-1" not in str(got.get("body")) and "reply_to_body" not in got
      and not any(k for k in got if k.startswith("reply_to") and k not in ("reply_to_id", "reply_to_deleted")),
      str(got))

print("\nRefusals")
elsewhere = say(alice_h, two, "a message in another conversation")
eid = elsewhere.json()["id"]
r = say(bob_h, one, "sneaky", reply_to_id=eid)
check("quoting a message from another conversation is refused (400)", r.status_code == 400, f"{r.status_code} {r.text[:120]}")
check("the refusal does not echo the other message", "another conversation" not in r.text.replace("in this conversation", ""), r.text[:200])
r = say(bob_h, one, "ghost", reply_to_id="msg_doesnotexist")
check("quoting an id that does not exist is refused (400)", r.status_code == 400, f"{r.status_code} {r.text[:120]}")
r = say(carol_h, one, "not mine", reply_to_id=oid)
check("a non-member cannot post into the conversation (404)", r.status_code == 404, f"{r.status_code} {r.text[:120]}")
raw, items = thread(alice_h, one)
check("no refused reply was stored", all(m.get("body") not in ("sneaky", "ghost", "not mine") for m in items.values()))

print("\nA quoted message that has expired")
r = c.post(f"/conversations/{one}/disappearing", headers=alice_h, json={"seconds": 2})
check("disappearing messages can be turned on", r.status_code == 200, r.text[:120])
fleeting = say(alice_h, one, "FLEETING-SECRET-TEXT-2")
fid = fleeting.json()["id"]
c.post(f"/conversations/{one}/disappearing", headers=alice_h, json={"seconds": 0})
answer = say(bob_h, one, "kept answer", reply_to_id=fid)
check("replying to a message that is still alive works", answer.status_code == 201, answer.text[:120])
time.sleep(3.5)
raw, items = thread(alice_h, one)
got = items.get(answer.json()["id"], {})
check("the answer outlives the quoted message", bool(got), "answer missing")
check("the API reports the original as deleted", got.get("reply_to_deleted") is True, str(got))
check("the id is still returned", got.get("reply_to_id") == fid, str(got))
check("the expired text is nowhere in the response", "FLEETING-SECRET-TEXT-2" not in raw)
check("the expired message is gone from the thread", fid not in items)
r = say(bob_h, one, "too late", reply_to_id=fid)
check("replying to an expired message is refused (400)", r.status_code == 400, f"{r.status_code} {r.text[:120]}")

print("\nEnd-to-end encrypted conversation")
dave_h, dave = register()
secure = convo(alice_h, dave, encrypted=True)
blob = base64.b64encode(b"opaque-ciphertext-1").decode()
first = c.post(f"/conversations/{secure}/messages", headers=alice_h, json={"ciphertext_b64": blob})
check("an encrypted message is accepted", first.status_code == 201, first.text[:120])
sid = first.json()["id"]
blob2 = base64.b64encode(b"opaque-ciphertext-2").decode()
r = c.post(f"/conversations/{secure}/messages", headers=dave_h,
           json={"ciphertext_b64": blob2, "reply_to_id": sid})
check("an encrypted reply is accepted", r.status_code == 201, r.text[:120])
r2 = c.post(f"/conversations/{secure}/messages", headers=dave_h,
            json={"body": "PLAINTEXT-LEAK", "reply_to_id": sid})
check("plaintext is still refused when it carries a reply", r2.status_code == 400, f"{r2.status_code} {r2.text[:120]}")
raw, items = thread(alice_h, secure)
got = items.get(r.json()["id"], {})
check("the encrypted reply stores only the id", got.get("reply_to_id") == sid and got.get("body") is None, str(got))
check("no plaintext anywhere in the encrypted thread", "PLAINTEXT-LEAK" not in raw)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
