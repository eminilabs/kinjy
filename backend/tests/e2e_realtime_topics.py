"""Which realtime topics a member may listen to, against the live stack.

A topic carries who did what, and when, on one thread or one post. Subscribing used
to be open to anyone holding an id for `thread:<id>`, and the check behind `post:<id>`
used the coarse SQL age filter, so it let through a post the member could not open.
Under test, through a real WebSocket:
  - `thread:<id>` follows the same rules as opening the thread: the forum's door (a
    secret community's thread is not for outsiders) and the age engine;
  - `post:<id>` follows the age engine, not only the coarse filter;
  - a topic nobody gated on purpose (an unknown prefix) is refused rather than allowed;
  - what is allowed still works: public topics, an ordinary thread, live delivery.

Run against the live stack:  python backend/tests/e2e_realtime_topics.py
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
    return r.json()["tokens"]["access_token"]


def auth(t):
    return {"Authorization": f"Bearer {t}"}


def make(path, tok, body):
    r = c.post(path, headers=auth(tok), json=body)
    r.raise_for_status()
    return r.json()["id"]


async def subscribed(token, topics):
    """The topics the hub actually granted for a subscribe request."""
    async with websockets.connect(WS) as ws:
        await ws.send(json.dumps({"action": "auth", "token": token}))
        await asyncio.wait_for(ws.recv(), 5)
        await ws.send(json.dumps({"action": "subscribe", "topics": topics}))
        frame = json.loads(await asyncio.wait_for(ws.recv(), 5))
        return frame.get("topics", [])


def granted(token, topics):
    return asyncio.run(subscribed(token, topics))


async def hears(token, topic, act):
    """Whether a member subscribed to `topic` receives a frame when `act()` runs."""
    async with websockets.connect(WS) as ws:
        await ws.send(json.dumps({"action": "auth", "token": token}))
        await asyncio.wait_for(ws.recv(), 5)
        await ws.send(json.dumps({"action": "subscribe", "topics": [topic]}))
        await asyncio.wait_for(ws.recv(), 5)
        await asyncio.get_running_loop().run_in_executor(None, act)
        try:
            while True:
                frame = json.loads(await asyncio.wait_for(ws.recv(), 3))
                if frame.get("topic") == topic:
                    return True
        except asyncio.TimeoutError:
            return False


owner, outsider, adult, teen13 = register(30), register(30), register(30), register(13)

print("\n== thread:<id> follows the forum's door ==")
open_forum = make("/forums", owner, {"name": f"Open {tag()}"})
open_thread = make(f"/forums/{open_forum}/threads", owner, {"title": "Picnic planning", "body": "Who is coming on Sunday?"})
secret = make("/communities", owner, {"name": f"secret {tag()}", "description": "Tomatoes, compost and rain", "kind": "secret"})
secret_forum = make("/forums", owner, {"name": f"Hidden {tag()}", "community_id": secret})
secret_thread = make(f"/forums/{secret_forum}/threads", owner, {"title": "Members only", "body": "Meeting notes"})

check("an outsider may listen to an ordinary thread", f"thread:{open_thread}" in granted(outsider, [f"thread:{open_thread}"]))
check("the owner may listen to their secret community's thread", f"thread:{secret_thread}" in granted(owner, [f"thread:{secret_thread}"]))
check("an outsider may not listen to a secret community's thread", f"thread:{secret_thread}" not in granted(outsider, [f"thread:{secret_thread}"]),
      granted(outsider, [f"thread:{secret_thread}"]))
check("an unknown thread id is refused too", granted(outsider, ["thread:thr_doesnotexist"]) == [])

print("\n== thread:<id> follows the age engine ==")
drinks = make(f"/forums/{open_forum}/threads", owner, {"title": "Vodka night planning", "body": "Who is getting drunk on Friday?"})
time.sleep(0.5)
check("an adult may listen to the alcohol thread", f"thread:{drinks}" in granted(adult, [f"thread:{drinks}"]))
check("a 13-year-old may not", f"thread:{drinks}" not in granted(teen13, [f"thread:{drinks}"]), granted(teen13, [f"thread:{drinks}"]))
check("a 13-year-old may listen to the ordinary thread", f"thread:{open_thread}" in granted(teen13, [f"thread:{open_thread}"]))

print("\n== post:<id> follows the age engine, not only the coarse filter ==")
plain_post = make("/posts", owner, {"body": "Picnic on Sunday, who comes?"})
drink_post = make("/posts", owner, {"body": "Vodka night, who is getting drunk on Friday?"})
time.sleep(1.0)
check("an adult may listen to the alcohol post", f"post:{drink_post}" in granted(adult, [f"post:{drink_post}"]))
check("a 13-year-old may not", f"post:{drink_post}" not in granted(teen13, [f"post:{drink_post}"]), granted(teen13, [f"post:{drink_post}"]))
check("a 13-year-old may listen to the ordinary post", f"post:{plain_post}" in granted(teen13, [f"post:{plain_post}"]))

print("\n== topics nobody gated are refused ==")
got = granted(adult, ["feed", "shorts", "community:cmy_x", "secret:anything", "thread:", "post:"])
check("only the public topics are granted", sorted(got) == ["feed", "shorts"], got)
check("another member's private channel is still refused", granted(adult, ["user:usr_someoneelse"]) == [])

print("\n== what is allowed still works ==")
saw = asyncio.run(hears(outsider, f"thread:{open_thread}",
                        lambda: c.post(f"/threads/{open_thread}/replies", headers=auth(owner), json={"body": "See you there"})))
check("a listener on an ordinary thread receives a live frame for a new reply", saw)
saw = asyncio.run(hears(owner, f"thread:{secret_thread}",
                        lambda: c.post(f"/threads/{secret_thread}/replies", headers=auth(owner), json={"body": "Noted"})))
check("the owner receives frames on their secret thread", saw)

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
