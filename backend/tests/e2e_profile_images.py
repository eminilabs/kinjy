"""Profile images (avatar, cover) against the live API.

Runs in whichever storage mode media-service is in. Without UploadCenter keys
that is local mode, which exercises the same three-step flow the browser uses:
presign, PUT, complete.

Run: python backend/tests/e2e_profile_images.py
"""
import random
import string
import struct
import sys
import time
import zlib
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
# media-service's own port, for the internal route. Checked by /health below:
# another service on a wrong port answers 404 to everything, and a test that
# expects a 404 would pass without ever reaching media-service.
MEDIA_DIRECT = "http://localhost:8213"
c = httpx.Client(base_url=BASE, timeout=30)
ok = True

def make_png(width, height):
    """A real gradient PNG. UploadCenter rejects a 1x1 image (observed live:
    status "failed"), so the usual one-pixel fixture cannot be used here."""
    rows = b"".join(
        b"\x00" + b"".join(bytes((x * 255 // width, y * 255 // height, 128)) for x in range(width))
        for y in range(height)
    )

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b"")


PNG = make_png(128, 128)
HTML = b"<html><script>alert(document.cookie)</script></html>"


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
        "email": f"{t}@example.com", "handle": f"img{t}", "display_name": f"Img {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": date(today.year - 30, 1, 15).isoformat(),
        "country": "FR",
    })
    r.raise_for_status()
    d = r.json()
    return {"Authorization": f"Bearer {d['tokens']['access_token']}"}, d["user"]


def presign(headers, purpose="avatar", mime="image/png", size=len(PNG)):
    return c.post("/media/profile-images/presign", headers=headers, json={
        "purpose": purpose, "filename": "me.png", "mime_type": mime, "size_bytes": size,
    })


def put_bytes(headers, grant, body, mime="image/png"):
    """Exactly what the browser does: PUT to media-service through the gateway."""
    return c.put(grant["upload"]["path"], headers={**headers, "Content-Type": mime}, content=body)


print("== media-service identity")
health = httpx.get(f"{MEDIA_DIRECT}/health", timeout=10).json()
check("port 8213 is media-service", health.get("service") == "media-service", health)
if health.get("service") != "media-service":
    sys.exit(1)

me, me_user = register()
other, _ = register()

print("== refused before anything is stored")
check("signed out -> 401", presign({}).status_code == 401)
check("SVG refused", presign(me, mime="image/svg+xml").status_code == 422)
check("GIF refused", presign(me, mime="image/gif").status_code == 422)
check("avatar over 5 MB refused", presign(me, size=5 * 1024 * 1024 + 1).status_code == 422)
check("unknown purpose refused", presign(me, purpose="banner").status_code == 422)

print("== the normal path")
r = presign(me)
check("presign -> 201", r.status_code == 201, r.text)
grant = r.json()
asset_id = grant["asset_id"]
print(f"     storage mode: {grant['storage']}")

check("not served while pending", httpx.get(f"{MEDIA_DIRECT}/media/{asset_id}").status_code == 404)
r = c.post(f"/media/profile-images/{asset_id}/complete", headers=me)
check("complete before upload -> 409", r.status_code == 409, r.text)

r = put_bytes(me, grant, PNG)
check("upload -> 2xx", r.status_code in (200, 201, 204), r.text)

def complete_until_settled(headers, asset, attempts=30):
    """UploadCenter scans asynchronously: 202 means ask again shortly."""
    for _ in range(attempts):
        response = c.post(f"/media/profile-images/{asset}/complete", headers=headers)
        if response.status_code != 202:
            return response
        time.sleep(response.json().get("retry_after_seconds", 2))
    return response


r = complete_until_settled(me, asset_id)
check("complete -> 200 ready", r.status_code == 200 and r.json()["status"] == "ready", r.text)
url = r.json().get("url")
if not url:
    print("\nSOME CHECKS FAILED (no url, cannot continue)")
    sys.exit(1)
check("a url is returned", bool(url), r.text)
r = c.post(f"/media/profile-images/{asset_id}/complete", headers=me)
check("complete again is idempotent", r.status_code == 200 and r.json()["url"] == url, r.text)

served = httpx.get(url, follow_redirects=True, timeout=30)
check("the image is served", served.status_code == 200 and served.content == PNG, served.status_code)

print("== someone else's upload")
r = c.post(f"/media/profile-images/{asset_id}/complete", headers=other)
check("another member cannot complete it -> 404", r.status_code == 404, r.text)

r2 = presign(me)
g2 = r2.json()
r = put_bytes(other, g2, PNG)
check("another member cannot upload into it -> 404", r.status_code == 404, r.text)

print("== bytes that lie about their type")
# Refused on arrival, before anything reaches storage, in both modes.
r = put_bytes(me, g2, HTML)
check("HTML declared as PNG refused -> 422", r.status_code == 422, r.text)
r = c.post(f"/media/profile-images/{g2['asset_id']}/complete", headers=me)
check("and it can never become ready -> 422", r.status_code == 422, r.text)
check("and it is not served", httpx.get(f"{MEDIA_DIRECT}/media/{g2['asset_id']}").status_code == 404)

g3 = presign(me, size=len(PNG)).json()
r = put_bytes(me, g3, PNG + b"\x00" * (6 * 1024 * 1024))  # over the 5 MB avatar ceiling
check("oversized body refused -> 413", r.status_code == 413, r.status_code)
r = put_bytes(me, g3, PNG)
check("the same upload can still be sent correctly afterwards", r.status_code == 204, r.text)

if grant["storage"] == "uploadcenter":
    print("== a file UploadCenter rejects (uploadcenter mode)")
    tiny = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
        "890000000a49444154789c6360000002000100ffff03000006000557bfabd400"
        "00000049454e44ae426082"
    )
    g4 = presign(me, size=len(tiny)).json()
    put_bytes(me, g4, tiny)
    r = complete_until_settled(me, g4["asset_id"])
    check("a rejected file ends in 422, not endless polling", r.status_code == 422, r.text)

print("== unfinished uploads are capped")
spammer, _ = register()
codes = [presign(spammer).status_code for _ in range(11)]
check("10 unfinished uploads allowed, the 11th -> 429", codes[:10] == [201] * 10 and codes[10] == 429, codes)

print("== internal route")
check("not reachable through the gateway", c.get(f"/internal/media/{asset_id}").status_code == 404)
r = httpx.get(f"{MEDIA_DIRECT}/internal/media/{asset_id}", timeout=10)
body = r.json() if r.status_code == 200 else {}
check("reachable on the private network", r.status_code == 200, r.text)
check("reports owner, purpose and readiness",
      body.get("owner_id") == me_user["id"] and body.get("purpose") == "avatar" and body.get("status") == "ready",
      body)

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
