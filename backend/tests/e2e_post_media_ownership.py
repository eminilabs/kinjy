"""A post can only carry media its author owns.

The attack this closes: create_post took any media_id the client named, with any
url and kind. An adult who had seen a restricted video (its id is in the URL they
were given) could attach it to a post of their own that rates General. A viewer
is handed a ticket for every asset of a post they may see, and the decision is made
from the post's rating, so a 14-year-old allowed to see the General post was handed
a ticket for the video. Valid in local and UploadCenter storage alike:

    python backend/tests/e2e_post_media_ownership.py
"""
from __future__ import annotations

import io
import random
import string
import struct
import sys
import zlib
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
MEDIA_DIRECT = "http://localhost:8213"
c = httpx.Client(base_url=BASE, timeout=120)
direct = httpx.Client(base_url=MEDIA_DIRECT, timeout=60, follow_redirects=False)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    ok = ok and bool(cond)


def png(seed: int) -> bytes:
    colour = bytes([(seed * 37) % 256, (seed * 91) % 256, (seed * 53) % 256])
    raw = b"".join(b"\x00" + colour * 64 for _ in range(64))

    def chunk(kind, data):
        body = struct.pack(">I", len(data)) + kind + data
        return body + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 64, 64, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def register(age):
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"ow{t}", "display_name": f"Owner {t}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(today.year - age, today.month, min(today.day, 28)).isoformat(),
        "country": "US"})
    r.raise_for_status()
    headers = {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}
    me = c.get("/auth/me", headers=headers).json()
    return headers, me.get("id") or me.get("user_id")


def upload(headers, seed, purpose="post"):
    r = c.post("/media/upload", headers=headers, data={"purpose": purpose},
               files={"file": (f"p{seed}.png", io.BytesIO(png(seed)), "image/png")})
    assert r.status_code == 201, (r.status_code, r.text[:160])
    return r.json()


def attach(headers, items, text="A post."):
    return c.post("/posts", headers=headers, json={"body": text, "visibility": "public", "format": "image", "media": items})


victim, victim_id = register(30)
attacker, attacker_id = register(30)
teen, teen_id = register(14)

stolen = upload(victim, 11)
mine = upload(attacker, 12)
attached_before = direct.get(f"/internal/media/{stolen['id']}").json().get("access")

print("== another member's media cannot be attached")
r = attach(attacker, [{"media_id": stolen["id"], "url": stolen["url"], "kind": "image"}], "My own harmless post.")
check("naming a victim's media_id is refused", r.status_code == 400, (r.status_code, r.text[:140]))
refusal = r.text
r2 = attach(attacker, [{"media_id": "mda_does_not_exist", "url": "/media/x", "kind": "image"}])
check("an id that does not exist is refused", r2.status_code == 400, (r2.status_code, r2.text[:140]))
check("…with the same answer, so ids cannot be probed for existence", r2.text == refusal, (refusal, r2.text))
check("the victim's asset was not touched by the attempt",
      direct.get(f"/internal/media/{stolen['id']}").json().get("access") == attached_before)
r = c.get("/feed", headers=teen)
check("and no post of the attacker's carries it", stolen["id"] not in r.text, "found in the teen's feed")

print("== what only the author's own post media may be")
chat = upload(attacker, 13, purpose="chat")
r = attach(attacker, [{"media_id": chat["id"], "url": chat["url"], "kind": "image"}])
check("a private chat attachment cannot be put on a post", r.status_code == 400, (r.status_code, r.text[:140]))
r = attach(attacker, [{"url": "https://evil.example/x.png", "kind": "image"}])
check("an item with no media_id is refused", r.status_code == 400, (r.status_code, r.text[:140]))

print("== the author's own media still works, and the server decides its url and kind")
r = attach(attacker, [{"media_id": mine["id"], "url": "https://evil.example/steal.png", "kind": "video"}])
check("the post is created", r.status_code in (200, 201), (r.status_code, r.text[:140]))
post = r.json() if r.status_code in (200, 201) else {}
item = (post.get("media") or [{}])[0]
check("the client's url was ignored", "evil.example" not in str(item.get("url")), item)
check("…the media's own address is used", f"/media/{mine['id']}" in str(item.get("url")), item)
check("the client's kind was ignored", item.get("kind") == "image", item)

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
