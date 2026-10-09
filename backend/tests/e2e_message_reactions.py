"""Emoji reactions on messages, against the live API.

What must hold: one reaction per member per message (tapping another replaces it,
tapping the same one takes it back), only members of the conversation can react
or see reactions, only the allowed emoji are accepted, a member who closed their
messages cannot be reacted to either, the other participant is told live without
being told who, and a reaction never outlives an expired message.
"""
import asyncio
import json
import random
import string
import sys
import time
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


def convo(h, other):
    r = c.post("/conversations", headers=h,
               json={"kind": "direct", "participant_ids": [other["id"]], "encrypted": False})
    assert r.status_code in (200, 201), f"could not open a conversation: {r.status_code} {r.text[:120]}"
    return r.json()["id"]


def say(h, cid, body):
    r = c.post(f"/conversations/{cid}/messages", headers=h, json={"body": body})
    assert r.status_code == 201, r.text[:120]
    return r.json()["id"]


def react(h, cid, mid, emoji):
    """One tap: sets the reaction, swaps it, or (the same emoji again) takes it back."""
    return c.post(f"/conversations/{cid}/messages/{mid}/reactions", headers=h, json={"emoji": emoji})


def message(h, cid, mid):
    r = c.get(f"/conversations/{cid}/messages", headers=h)
    assert r.status_code == 200, r.text[:120]
    return next(m for m in r.json()["items"] if m["id"] == mid)


def counts(h, cid, mid):
    return message(h, cid, mid)["reactions"]


def mine(h, cid, mid):
    return message(h, cid, mid)["my_reaction"]


alice_h, alice_t, alice = register()
bob_h, bob_t, bob = register()
carol_h, carol_t, carol = register()
cid = convo(alice_h, bob)
other = convo(alice_h, carol)
mid = say(alice_h, cid, "react to me")
LIKE, LOVE, FIRE = "\U0001F44D", "❤️", "\U0001F525"

print("The sticker catalogue the composer reads")
r = c.get("/stickers", headers=alice_h)
packs = r.json().get("packs", []) if r.status_code == 200 else []
stickers = [s for p in packs for s in p.get("stickers", [])]
check("the catalogue is served to a member, in packs", r.status_code == 200 and len(packs) >= 1 and len(stickers) >= 6, r.text[:120])
check("every sticker has an id, a glyph and a label", all(s.get("id") and s.get("glyph") and s.get("label") for s in stickers))
check("the catalogue needs a signed-in member", c.get("/stickers").status_code in (401, 403))

print("\nReact, change, take back")
r = react(bob_h, cid, mid, LIKE)
check("a member reacts", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
check("the thread carries the count", counts(alice_h, cid, mid) == {LIKE: 1}, str(counts(alice_h, cid, mid)))
check("the reaction is the reactor's own, and only theirs",
      mine(bob_h, cid, mid) == LIKE and mine(alice_h, cid, mid) is None)
r = react(bob_h, cid, mid, LOVE)
check("another emoji replaces the previous one", r.status_code == 200 and counts(alice_h, cid, mid) == {LOVE: 1}, str(counts(alice_h, cid, mid)))
react(alice_h, cid, mid, LIKE)
check("each member has their own reaction", counts(bob_h, cid, mid) == {LIKE: 1, LOVE: 1}, str(counts(bob_h, cid, mid)))
r = react(bob_h, cid, mid, LOVE)
check("tapping the same emoji again takes it back", r.status_code == 200 and counts(alice_h, cid, mid) == {LIKE: 1}, str(counts(alice_h, cid, mid)))
check("and it is no longer the member's own", mine(bob_h, cid, mid) is None)
react(bob_h, cid, mid, LOVE)
check("a third tap puts it back", counts(alice_h, cid, mid) == {LIKE: 1, LOVE: 1})

print("\nRefusals")
before = counts(alice_h, cid, mid)
for label, value in (("a sticker id", "react.yes"),
                     ("a URL", "https://evil.example/x.png"),
                     ("an emoji outside the set", "\U0001F355"),
                     ("two emoji at once", LIKE + LOVE),
                     ("an empty value", "")):
    r = react(bob_h, cid, mid, value)
    check(f"{label} is refused (422)", r.status_code == 422, f"{r.status_code} {r.text[:100]}")
check("nothing was stored by those refusals", counts(alice_h, cid, mid) == before)
r = react(carol_h, cid, mid, LIKE)
check("a non-member cannot react (404)", r.status_code == 404, f"{r.status_code} {r.text[:100]}")
r = c.get(f"/conversations/{cid}/messages", headers=carol_h)
check("a non-member cannot read the reactions (404)", r.status_code == 404, f"{r.status_code}")
foreign = say(alice_h, other, "a message in another room")
r = react(bob_h, cid, foreign, LIKE)
check("a message of another conversation cannot be reacted to (404)", r.status_code == 404, f"{r.status_code} {r.text[:100]}")
r = react(bob_h, cid, "msg_doesnotexist", LIKE)
check("an unknown message is refused (404)", r.status_code == 404, f"{r.status_code} {r.text[:100]}")
check("a stranger's reaction attempt left no trace", counts(alice_h, other, foreign) == {})

print("\nStanding checks still apply")
erin_h, erin_t, erin = register()
room = convo(alice_h, erin)
said = say(erin_h, room, "hello")
check("a reaction works while the other side is open", react(alice_h, room, said, LIKE).status_code == 200)
c.patch("/preferences", headers=erin_h, json={"who_can_message": "nobody"})
r = react(alice_h, room, said, FIRE)
check("a member who closed their messages cannot be reacted to (403)", r.status_code == 403, f"{r.status_code} {r.text[:100]}")
check("and nothing changed", counts(erin_h, room, said) == {LIKE: 1}, str(counts(erin_h, room, said)))

print("\nLive delivery")


async def live():
    async with websockets.connect(WS) as ws:
        await ws.send(json.dumps({"action": "auth", "token": alice_t}))
        assert json.loads(await asyncio.wait_for(ws.recv(), 5))["type"] == "ready"
        await asyncio.to_thread(react, bob_h, cid, mid, FIRE)
        frames = []
        try:
            while True:
                frames.append(json.loads(await asyncio.wait_for(ws.recv(), 3)))
                if frames[-1].get("type") == "message_reaction":
                    break
        except asyncio.TimeoutError:
            pass
        first = next((f for f in frames if f.get("type") == "message_reaction"), None)
        await asyncio.to_thread(react, bob_h, cid, mid, FIRE)
        second = None
        try:
            while True:
                f = json.loads(await asyncio.wait_for(ws.recv(), 3))
                if f.get("type") == "message_reaction":
                    second = f
                    break
        except asyncio.TimeoutError:
            pass
        return first, second


first, second = asyncio.run(live())
check("the other participant receives the reaction live", bool(first), "no frame")
check("the frame says which message and the new counts",
      bool(first) and first["message_id"] == mid and first["conversation_id"] == cid
      and first["counts"].get(FIRE) == 1, str(first))
check("the frame does not say who reacted", bool(first) and "user_id" not in first, str(first))
check("taking it back is announced with the counts without it",
      bool(second) and FIRE not in second["counts"], str(second))


async def outsider_hears_nothing():
    async with websockets.connect(WS) as ws:
        await ws.send(json.dumps({"action": "auth", "token": carol_t}))
        await asyncio.wait_for(ws.recv(), 5)
        await asyncio.to_thread(react, bob_h, cid, mid, FIRE)
        try:
            while True:
                f = json.loads(await asyncio.wait_for(ws.recv(), 2))
                if f.get("type") == "message_reaction" and f.get("message_id") == mid:
                    return f
        except asyncio.TimeoutError:
            return None


check("a non-member hears nothing of it", asyncio.run(outsider_hears_nothing()) is None)

print("\nA reaction does not outlive an expired message")
r = c.post(f"/conversations/{cid}/disappearing", headers=alice_h, json={"seconds": 2})
fleeting = say(alice_h, cid, "this one will expire")
c.post(f"/conversations/{cid}/disappearing", headers=alice_h, json={"seconds": 0})
check("a reaction can be put on a message about to expire", react(bob_h, cid, fleeting, LIKE).status_code == 200)
time.sleep(3.5)
c.get(f"/conversations/{cid}/messages", headers=alice_h)  # reading is what purges
r = react(bob_h, cid, fleeting, LIKE)
check("reacting to the expired message is refused (404)", r.status_code == 404, f"{r.status_code} {r.text[:100]}")
left = None
try:
    import subprocess
    out = subprocess.run(
        ["docker", "exec", "kaluta-postgres", "sh", "-c",
         f"psql -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -tAc \"select count(*) from messaging.message_reactions where message_id='{fleeting}'\""],
        capture_output=True, text=True, timeout=60)
    left = out.stdout.strip()
except Exception as exc:  # the host may not have docker on its path; the API checks above still ran
    print("  (skipped direct database check:", exc, ")")
if left is not None and left != "":
    check("its reaction row is gone from the database", left == "0", left)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
