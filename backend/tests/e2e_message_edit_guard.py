"""Editing a message is held to the same rules as sending one, against the live API.

What must hold:
  - somebody whose messages were closed to a member (who_can_message "nobody") or who
    was blocked cannot go back to an old message and rewrite what that member sees;
    they can still delete their own words, which only removes content;
  - editing the caption of an attachment keeps the attachment's name.

Run against the live stack:  python backend/tests/e2e_message_edit_guard.py
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
    assert c.patch("/preferences", headers=h, json={"who_can_message": "everyone"}).status_code == 200
    return h, d["user"]


def convo(h, other):
    r = c.post("/conversations", headers=h, json={"kind": "direct", "participant_ids": [other["id"]], "encrypted": False})
    assert r.status_code in (200, 201), r.text[:120]
    return r.json()["id"]


def say(h, cid, **body):
    r = c.post(f"/conversations/{cid}/messages", headers=h, json=body)
    assert r.status_code == 201, r.text[:120]
    return r.json()["id"]


def edit(h, cid, mid, body):
    return c.patch(f"/conversations/{cid}/messages/{mid}", headers=h, json={"body": body})


def item(h, cid, mid):
    return next(m for m in c.get(f"/conversations/{cid}/messages", headers=h).json()["items"] if m["id"] == mid)


alice_h, alice = register()
bob_h, bob = register()
room = convo(alice_h, bob)
old = say(alice_h, room, body="What I first said")

print("Editing while the relationship is open")
r = edit(alice_h, room, old, "What I meant to say")
check("an edit works while the other side is open", r.status_code == 200, f"{r.status_code} {r.text[:100]}")

print("\nEditing once the other side closed their messages")
c.patch("/preferences", headers=bob_h, json={"who_can_message": "nobody"})
r = edit(alice_h, room, old, "Something they must not be shown")
check("the edit is refused (403)", r.status_code == 403, f"{r.status_code} {r.text[:100]}")
check("what the other member sees is unchanged", item(bob_h, room, old)["body"] == "What I meant to say", str(item(bob_h, room, old)))
r = c.delete(f"/conversations/{room}/messages/{old}", headers=alice_h)
check("deleting your own words is still allowed", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
c.patch("/preferences", headers=bob_h, json={"who_can_message": "everyone"})

print("\nEditing a caption keeps the attachment's name")
png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
       b"\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa7\x9a\xa0\xa0\x00\x00\x00\x00IEND\xaeB`\x82") + bytes(random.randbytes(6))
up = c.post("/media/upload", headers=alice_h, files={"file": ("holiday-photo.png", png, "image/png")}, data={"purpose": "chat"})
check("an attachment can be uploaded", up.status_code in (200, 201), f"{up.status_code} {up.text[:100]}")
if up.status_code in (200, 201):
    with_file = say(alice_h, room, body="Look at this", media_id=up.json()["id"])
    before = item(bob_h, room, with_file)
    check("the attachment has its name", before.get("media_name") == "holiday-photo.png", str(before.get("media_name")))
    r = edit(alice_h, room, with_file, "Look at this one")
    check("the caption can be edited", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
    after = item(bob_h, room, with_file)
    check("and the file keeps its name", after.get("media_name") == "holiday-photo.png", str(after.get("media_name")))
    check("the caption changed", after["body"] == "Look at this one")

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
