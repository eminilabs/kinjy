"""Removing a post removes its media, unless the file may be needed as evidence.

The post row is only marked removed; before this, its file stayed on the media
volume (or, once post media is stored at UploadCenter, at a third party) for
good. Deleting is what the author meant. But a file is also what a moderator
would look at, so it is kept when the post was reported, and while another live
post still shows the same asset.

Valid in local and UploadCenter storage alike:
    python backend/tests/e2e_post_media_removal.py
"""
from __future__ import annotations

import io
import random
import string
import struct
import sys
import time
import zlib
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
MEDIA_DIRECT = "http://localhost:8213"
c = httpx.Client(base_url=BASE, timeout=600)
direct = httpx.Client(base_url=MEDIA_DIRECT, timeout=60, follow_redirects=False)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    ok = ok and bool(cond)


def png(seed: int) -> bytes:
    # A real, plain PNG, different for every call so one test never dedupes against another.
    width = height = 64
    colour = bytes([(seed * 37) % 256, (seed * 91) % 256, (seed * 53) % 256])
    raw = b"".join(b"\x00" + colour * width for _ in range(height))

    def chunk(kind, data):
        body = struct.pack(">I", len(data)) + kind + data
        return body + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def register():
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"rm{t}", "display_name": f"Removal {t}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
        "country": "US"})
    r.raise_for_status()
    headers = {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}
    me = c.get("/auth/me", headers=headers).json()
    return headers, me.get("id") or me.get("user_id")


def upload(headers, seed):
    r = c.post("/media/upload", headers=headers, data={"purpose": "post"},
               files={"file": (f"p{seed}.png", io.BytesIO(png(seed)), "image/png")})
    assert r.status_code == 201, (r.status_code, r.text[:160])
    return r.json()


def post_with(headers, asset, text):
    r = c.post("/posts", headers=headers, json={
        "body": text, "visibility": "public", "format": "image",
        "media": [{"media_id": asset["id"], "url": asset["url"], "kind": "image"}]})
    assert r.status_code in (200, 201), (r.status_code, r.text[:160])
    return r.json()["id"]


def ticket(asset_id, viewer_id):
    r = direct.post("/internal/media/sign", json={"asset_ids": [asset_id], "viewer_id": viewer_id})
    r.raise_for_status()
    return r.json()["tickets"][asset_id]


def served(asset_id, headers, viewer_id) -> bool:
    return direct.get(f"/media/{asset_id}?{ticket(asset_id, viewer_id)}", headers=headers).status_code == 200


def gone_soon(asset_id, headers, viewer_id, seconds=40) -> bool:
    """Deletion runs after the response, so give it a moment."""
    deadline = time.time() + seconds
    while time.time() < deadline:
        if not served(asset_id, headers, viewer_id):
            return True
        time.sleep(1)
    return False


author, author_id = register()
reporter, _ = register()

print("== the author removes a post: its media goes with it")
asset = upload(author, 1)
post = post_with(author, asset, "A post I will delete.")
time.sleep(1)
check("the media is served while the post exists", served(asset["id"], author, author_id))
r = c.delete(f"/posts/{post}", headers=author)
check("the post is removed", r.status_code == 204, (r.status_code, r.text[:120]))
check("its media is deleted", gone_soon(asset["id"], author, author_id))
check("…and media-service no longer knows it", direct.get(f"/internal/assets/{asset['id']}").status_code == 404)

print("== a reported post keeps its file")
asset = upload(author, 2)
post = post_with(author, asset, "A post somebody reports.")
time.sleep(1)
r = c.post(f"/posts/{post}/report", headers=reporter, json={"reason": "other"})
check("it is reported", r.status_code in (200, 201), (r.status_code, r.text[:120]))
check("the author removes it", c.delete(f"/posts/{post}", headers=author).status_code == 204)
time.sleep(8)
check("the file is kept, as evidence", served(asset["id"], author, author_id))

print("== an asset another live post still shows is kept")
asset = upload(author, 3)
first = post_with(author, asset, "First post with this image.")
second = post_with(author, asset, "Second post with the same image.")
time.sleep(1)
check("removing the first post…", c.delete(f"/posts/{first}", headers=author).status_code == 204)
time.sleep(8)
check("…leaves the image to the second", served(asset["id"], author, author_id))
check("removing the second removes the image", c.delete(f"/posts/{second}", headers=author).status_code == 204)
check("which then goes", gone_soon(asset["id"], author, author_id))

print("== removing twice is harmless")
asset = upload(author, 4)
post = post_with(author, asset, "Deleted twice.")
check("first removal", c.delete(f"/posts/{post}", headers=author).status_code == 204)
check("the second answers the same", c.delete(f"/posts/{post}", headers=author).status_code == 204)
check("the media is gone", gone_soon(asset["id"], author, author_id))

print("== only the author's own post counts")
asset = upload(author, 5)
post = post_with(author, asset, "Not yours to delete.")
check("another member cannot remove it", c.delete(f"/posts/{post}", headers=reporter).status_code == 404)
time.sleep(5)
check("and the image is still there", served(asset["id"], author, author_id))
c.delete(f"/posts/{post}", headers=author)

print("== what the internal route will not delete")
other_asset = upload(author, 6)
r = direct.post(f"/internal/media/{other_asset['id']}/discard-post-media", json={"owner_id": "someone-else"})
check("a wrong owner is refused", r.status_code == 404, r.status_code)
check("and the file is untouched", served(other_asset["id"], author, author_id))
r = direct.post("/internal/media/mda_does_not_exist/discard-post-media", json={"owner_id": author_id})
check("an unknown asset is not an error", r.status_code == 204, r.status_code)
c.delete(f"/media/{other_asset['id']}", headers=author)

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
