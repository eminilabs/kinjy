"""Emoji in messages, against the live API.

Emoji are Unicode text: they travel in `body` like any other character, with no
message kind of their own. What must hold: every kind of emoji sequence comes
back exactly as sent, mixed with text or alone, markup is stored and returned as
inert text, the end-to-end rule on plaintext is unchanged, and an emoji and a
sticker are never confused for one another.
"""
import json
import random
import string
import sys
import unicodedata
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
    h = {"Authorization": f"Bearer {d['tokens']['access_token']}"}
    p = c.patch("/preferences", headers=h, json={"who_can_message": "everyone"})
    assert p.status_code == 200, f"could not open messages: {p.status_code} {p.text[:120]}"
    return h, d["user"]


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


alice_h, alice = register()
bob_h, bob = register()
cid = convo(alice_h, bob)

SAMPLES = {
    "an emoji on its own": "😀",
    "text with emoji in the middle": "Bonjour 👋 comment vas-tu ❤️",
    "several of the same emoji": "😂 😂 😂",
    "emoji with no spaces at all": "😂😂😂🔥🔥",
    "a variation-selector emoji": "❤️ ☺️ ✌️",
    "a skin-tone sequence": "👍🏽 👋🏿",
    "a ZWJ family sequence": "👨‍👩‍👧‍👦 🏳️‍🌈",
    "flags (regional indicators)": "🇫🇷 🇨🇲 🇯🇵",
    "keycap sequences": "1️⃣ 2️⃣ #️⃣ *️⃣",
    "emoji next to Arabic and Chinese text": "مرحبا 😊 你好 🎉",
    "a newer emoji": "🫠 🫨",
}
print("Emoji travel as plain text")
sent = {}
for label, text in SAMPLES.items():
    r = send(alice_h, cid, body=text)
    check(f"{label} is accepted", r.status_code == 201, f"{r.status_code} {r.text[:100]}")
    sent[label] = (text, r.json().get("id"))
raw, items = thread(bob_h, cid)
for label, (text, mid) in sent.items():
    got = items.get(mid, {})
    check(f"{label} comes back exactly as sent", got.get("body") == text, repr(got.get("body")))
check("they are ordinary text messages, no new kind", all(items[mid]["kind"] == "text" for _, mid in sent.values()))
check("no sticker id is attached to a text message", all(not items[mid].get("sticker_id") for _, mid in sent.values()))
check("the code points are untouched (no normalisation)",
      all(unicodedata.normalize("NFD", items[mid]["body"]) == unicodedata.normalize("NFD", t) and items[mid]["body"] == t for t, mid in sent.values()))

print("\nLength")
many = "😀" * 3000
r = send(alice_h, cid, body=many)
check("3,000 emoji in one message are accepted", r.status_code == 201, f"{r.status_code} {r.text[:100]}")
r = send(alice_h, cid, body="😀" * 10001)
check("a body over the 10,000-character limit is still refused", r.status_code == 422, f"{r.status_code}")

print("\nMarkup stays inert text")
html = '<script>alert(1)</script> <img src=x onerror=alert(1)> 😀 **bold** [x](javascript:alert(1))'
r = send(alice_h, cid, body=html)
raw, items = thread(bob_h, cid)
check("markup next to an emoji is returned verbatim, not interpreted", items[r.json()["id"]]["body"] == html)

print("\nEmoji and stickers are different things")
r = send(alice_h, cid, kind="sticker", sticker_id="😀")
check("an emoji is not a valid sticker id (400)", r.status_code == 400, f"{r.status_code} {r.text[:100]}")
r = send(alice_h, cid, kind="sticker", sticker_id="react.yes", body="😀")
check("a sticker cannot carry emoji text (400)", r.status_code == 400, f"{r.status_code} {r.text[:100]}")
r = send(alice_h, cid, body="react.yes")
raw, items = thread(bob_h, cid)
m = items[r.json()["id"]]
check("the text of a sticker id stays a text message, not a sticker", m["kind"] == "text" and not m.get("sticker_id"), str(m))
mid = next(iter(items))
r = c.post(f"/conversations/{cid}/messages/{mid}/reactions", headers=bob_h, json={"emoji": "react.yes"})
check("a sticker id is not a valid reaction (422)", r.status_code == 422, f"{r.status_code} {r.text[:100]}")
r = c.post(f"/conversations/{cid}/messages/{mid}/reactions", headers=bob_h, json={"emoji": "👍"})
check("an emoji from the reaction set is (200)", r.status_code == 200, f"{r.status_code} {r.text[:100]}")

print("\nPreview")
convos = c.get("/conversations", headers=bob_h).json()["items"]
last = next(x for x in convos if x["id"] == cid)["last_message"]
check("the conversation list previews text that holds emoji", last and isinstance(last["preview"], str) and len(last["preview"]) > 0, str(last))

print("\nEnd-to-end encrypted conversation")
eve_h, eve = register()
secure = convo(alice_h, eve, encrypted=True)
r = send(alice_h, secure, body="PLAINTEXT-LEAK 😀")
check("emoji in plaintext are still refused there (400)", r.status_code == 400, f"{r.status_code} {r.text[:100]}")
raw, items = thread(eve_h, secure)
check("nothing of it was stored", "PLAINTEXT-LEAK" not in raw and not items)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
