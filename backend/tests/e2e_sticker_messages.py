"""Standalone sticker messages, against the live API.

What must hold: a sticker message carries only an id from the catalogue (never
text, ciphertext, an attachment or a URL), it works in end-to-end encrypted
conversations without a plaintext copy of anything, the usual standing checks
still apply, and the other participant gets it live.
"""
import asyncio
import base64
import json
import random
import string
import sys
from datetime import date

import httpx
import websockets

BASE = "http://localhost:8200/api"
WS = "ws://localhost:8200/api/ws"
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
    return h, token, d["user"]


def convo(h, other, encrypted=False):
    r = c.post("/conversations", headers=h,
               json={"kind": "direct", "participant_ids": [other["id"]], "encrypted": encrypted})
    assert r.status_code in (200, 201), f"could not open a conversation: {r.status_code} {r.text[:120]}"
    return r.json()["id"]


def send(h, cid, **body):
    return c.post(f"/conversations/{cid}/messages", headers=h, json=body)


def thread(h, cid):
    r = c.get(f"/conversations/{cid}/messages", headers=h)
    assert r.status_code == 200, r.text[:120]
    return r.text, {m["id"]: m for m in r.json()["items"]}


alice_h, alice_t, alice = register()
bob_h, bob_t, bob = register()
carol_h, carol_t, carol = register()
cid = convo(alice_h, bob)
LIKE = "react.yes"

print("Sending a sticker")
r = send(alice_h, cid, kind="sticker", sticker_id=LIKE)
check("a catalogue sticker is sent as a message", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
mid = r.json().get("id")
raw, items = thread(bob_h, cid)
m = items.get(mid, {})
check("the thread returns kind sticker and the id", m.get("kind") == "sticker" and m.get("sticker_id") == LIKE, str(m))
check("it has no text, no attachment and no ciphertext",
      not m.get("body") and not m.get("media_url") and not m.get("ciphertext_b64"), str(m))
r2 = send(alice_h, cid, kind="sticker", sticker_id=LIKE, client_id="c-" + tag())
check("it can be sent again (stickers are not deduplicated by content)", r2.status_code == 201)
cl = "same-" + tag()
a, b = send(alice_h, cid, kind="sticker", sticker_id=LIKE, client_id=cl), send(alice_h, cid, kind="sticker", sticker_id=LIKE, client_id=cl)
check("a retried send with the same client_id is stored once", a.json().get("id") == b.json().get("id") and b.json().get("duplicate") is True, f"{a.text} {b.text}")
reply = send(bob_h, cid, kind="sticker", sticker_id="react.love", reply_to_id=mid)
check("a sticker can answer a message", reply.status_code == 201, reply.text[:120])
raw, items = thread(alice_h, cid)
check("the reply keeps its link", items[reply.json()["id"]].get("reply_to_id") == mid)
rx = c.post(f"/conversations/{cid}/messages/{mid}/reactions", headers=bob_h, json={"emoji": "\U0001F525"})
check("a sticker message can be reacted to", rx.status_code == 200, rx.text[:120])

print("\nWhat the server refuses")
before = len(thread(alice_h, cid)[1])
cases = {
    "an id outside the catalogue": dict(kind="sticker", sticker_id="react.nonexistent"),
    "a URL instead of an id": dict(kind="sticker", sticker_id="https://evil.example/x.png"),
    "a path instead of an id": dict(kind="sticker", sticker_id="../../etc/passwd"),
    "no id at all": dict(kind="sticker"),
    "an empty id": dict(kind="sticker", sticker_id=""),
    "text along with the sticker": dict(kind="sticker", sticker_id=LIKE, body="hello"),
    "ciphertext along with the sticker": dict(kind="sticker", sticker_id=LIKE, ciphertext_b64=base64.b64encode(b"x").decode()),
    "an attachment along with the sticker": dict(kind="sticker", sticker_id=LIKE, media_id="ast_whatever"),
    "a sticker id on a text message": dict(kind="text", body="hi", sticker_id=LIKE),
    "a sticker id on a media message": dict(kind="media", sticker_id=LIKE),
}
for label, body in cases.items():
    r = send(alice_h, cid, **body)
    check(f"{label} is refused (400)", r.status_code == 400, f"{r.status_code} {r.text[:100]}")
check("none of them was stored", len(thread(alice_h, cid)[1]) == before)
r = send(carol_h, cid, kind="sticker", sticker_id=LIKE)
check("a non-member cannot send a sticker (404)", r.status_code == 404, f"{r.status_code} {r.text[:100]}")
r = send(alice_h, cid, kind="sticker", sticker_id=LIKE, reply_to_id="msg_doesnotexist")
check("a sticker cannot answer an unknown message (400)", r.status_code == 400, f"{r.status_code} {r.text[:100]}")
other = convo(alice_h, carol)
foreign = send(alice_h, other, body="in another room").json()["id"]
r = send(bob_h, cid, kind="sticker", sticker_id=LIKE, reply_to_id=foreign)
check("a sticker cannot answer a message of another conversation (400)", r.status_code == 400, f"{r.status_code} {r.text[:100]}")

print("\nStanding checks still apply")
dave_h, dave_t, dave = register()
c.patch("/preferences", headers=dave_h, json={"who_can_message": "nobody"})
r = c.post("/conversations", headers=alice_h, json={"kind": "direct", "participant_ids": [dave["id"]], "encrypted": False})
if r.status_code in (200, 201):
    r = send(alice_h, r.json()["id"], kind="sticker", sticker_id=LIKE)
check("a member who closed their messages is not sent stickers either", r.status_code in (403, 404), f"{r.status_code} {r.text[:100]}")

print("\nEnd-to-end encrypted conversation")
eve_h, eve_t, eve = register()
secure = convo(alice_h, eve, encrypted=True)
r = send(alice_h, secure, kind="sticker", sticker_id=LIKE)
check("a sticker is accepted without ciphertext", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
check("plaintext is still refused there", send(alice_h, secure, body="PLAINTEXT-LEAK").status_code == 400)
check("text with a sticker is refused there too", send(alice_h, secure, kind="sticker", sticker_id=LIKE, body="PLAINTEXT-LEAK").status_code == 400)
raw, items = thread(eve_h, secure)
m = items.get(r.json().get("id"), {})
check("the encrypted thread holds the id and nothing else", m.get("sticker_id") == LIKE and m.get("body") is None and not m.get("ciphertext_b64"), str(m))
check("no plaintext anywhere in the encrypted thread", "PLAINTEXT-LEAK" not in raw)
convos = c.get("/conversations", headers=eve_h).json()["items"]
last = next(x for x in convos if x["id"] == secure)["last_message"]
check("the conversation list previews it as a sticker", last and last["preview"] == "Sent a sticker", str(last))

print("\nLive delivery")


async def live():
    async with websockets.connect(WS) as ws:
        await ws.send(json.dumps({"action": "auth", "token": bob_t}))
        await asyncio.wait_for(ws.recv(), 5)
        await asyncio.to_thread(send, alice_h, cid, kind="sticker", sticker_id="joy.party")
        try:
            while True:
                f = json.loads(await asyncio.wait_for(ws.recv(), 4))
                if f.get("type") == "message":
                    return f
        except asyncio.TimeoutError:
            return None


frame = asyncio.run(live())
check("the other participant receives it live", bool(frame), "no frame")
check("the frame carries kind and sticker id, no body",
      bool(frame) and frame["kind"] == "sticker" and frame["sticker_id"] == "joy.party" and not frame.get("body"), str(frame))

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
