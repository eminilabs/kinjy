"""The Messages badge count, against the live API.

`GET /conversations/unread-count` is what the badge on "Messages" shows. It must
agree with the per-conversation `unread` figures in `GET /conversations` (the two
share one query), count only what others sent, drop to zero when a thread is
read, and only ever describe the caller's own conversations.

Run against the local stack:  python backend/tests/e2e_unread_count.py
"""
from __future__ import annotations

import base64
import os
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
    ok = ok and bool(cond)


def register():
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"un{t}", "display_name": f"Unread {t}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
        "country": "US"})
    r.raise_for_status()
    headers = {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}
    me = c.get("/auth/me", headers=headers).json()
    return {"h": headers, "id": me.get("id") or me.get("user_id")}


def connect(a, b):
    c.post(f"/connections/{b['id']}", headers=a["h"], json={}).raise_for_status()
    c.post(f"/connections/{a['id']}/respond?accept=true", headers=b["h"]).raise_for_status()


def thread(a, b):
    r = c.post("/conversations", headers=a["h"], json={"participant_ids": [b["id"]], "kind": "direct"})
    r.raise_for_status()
    return r.json()["id"]


def say(sender, conversation):
    r = c.post(f"/conversations/{conversation}/messages", headers=sender["h"],
               json={"ciphertext_b64": base64.b64encode(os.urandom(32)).decode()})
    assert r.status_code == 201, (r.status_code, r.text[:160])


def badge(user):
    r = c.get("/conversations/unread-count", headers=user["h"])
    assert r.status_code == 200, (r.status_code, r.text[:160])
    return r.json()


def listed(user):
    return {i["id"]: i.get("unread", 0) for i in c.get("/conversations", headers=user["h"]).json()["items"]}


me, anna, ben, outsider = register(), register(), register(), register()
connect(me, anna)
connect(me, ben)
with_anna, with_ben = thread(anna, me), thread(ben, me)

print("== counting")
check("nothing unread to begin with", badge(me) == {"messages": 0, "conversations": 0}, badge(me))
say(anna, with_anna)
say(anna, with_anna)
say(ben, with_ben)
check("three messages over two threads: 3 messages, 2 conversations",
      badge(me) == {"messages": 3, "conversations": 2}, badge(me))
check("it agrees with the conversation list (the same query)",
      sum(listed(me).values()) == badge(me)["messages"], listed(me))

print("== what does not count")
check("your own messages are never unread for you", badge(anna) == {"messages": 0, "conversations": 0}, badge(anna))
say(me, with_anna)
check("replying counts as reading: answering Anna clears her thread, not Ben's",
      badge(me) == {"messages": 1, "conversations": 1}, badge(me))
check("…and the conversation list says the same",
      sum(listed(me).values()) == badge(me)["messages"], listed(me))
say(ben, with_ben)
say(anna, with_anna)
check("new messages from both count again", badge(me) == {"messages": 3, "conversations": 2}, badge(me))

print("== reading")
c.post(f"/conversations/{with_anna}/read", headers=me["h"]).raise_for_status()
check("reading one thread removes only its messages (Ben's two remain)",
      badge(me) == {"messages": 2, "conversations": 1}, badge(me))
c.post(f"/conversations/{with_ben}/read", headers=me["h"]).raise_for_status()
check("reading the other brings it to zero", badge(me) == {"messages": 0, "conversations": 0}, badge(me))
say(ben, with_ben)
check("a new message after reading counts again", badge(me) == {"messages": 1, "conversations": 1}, badge(me))

print("== disappearing messages")
connect(anna, ben)
temp = thread(anna, ben)  # a thread of their own, with a one-second timer
c.post(f"/conversations/{temp}/disappearing", headers=anna["h"], json={"seconds": 1}).raise_for_status()
say(anna, temp)
check("a message that has not expired yet counts", badge(ben)["messages"] >= 1, badge(ben))
time.sleep(2.5)
check("once it has expired it no longer lights the badge", badge(ben)["messages"] == 0, badge(ben))
check("…and the conversation list agrees", sum(listed(ben).values()) == badge(ben)["messages"], listed(ben))

print("== privacy and access")
check("an outsider sees nothing of these threads", badge(outsider) == {"messages": 0, "conversations": 0}, badge(outsider))
check("signed out is refused", c.get("/conversations/unread-count").status_code == 401)
check("the route did not shadow the thread routes",
      c.get(f"/conversations/{with_anna}/messages", headers=me["h"]).status_code == 200)

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
