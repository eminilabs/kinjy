"""Post media stored at UploadCenter, read back only through media-service.

UploadCenter's signed links last 15 minutes, cannot be shortened and work for
anyone who holds them. Handing one to a member would let an adult pass an
age-restricted file to a teenager, which the viewer-bound ticket exists to
prevent. So post media is stored there as *private*, and media-service fetches
and relays it after checking the ticket. This checks all of that against the
real service.

Needs media-service started with POST_MEDIA_PROVIDER=uploadcenter and working
UploadCenter credentials. Otherwise it exits 2 (skipped on purpose, which
run_all.py understands). It uses the real UploadCenter API: a few small files
and one 8 MB file, all deleted at the end.

    python backend/tests/e2e_post_media_uploadcenter.py
"""
from __future__ import annotations

import hashlib
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
# Generous: storing a file at UploadCenter has taken from 12 to 134 seconds for the same size.
c = httpx.Client(base_url=BASE, timeout=600)
direct = httpx.Client(base_url=MEDIA_DIRECT, timeout=120, follow_redirects=False)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    ok = ok and bool(cond)


def png(width=64, height=64, rgb=(200, 30, 30)) -> bytes:
    # UploadCenter refuses a 1x1 image, so this is a real, if plain, one.
    raw = b"".join(b"\x00" + bytes(rgb) * width for _ in range(height))

    def chunk(kind, data):
        body = struct.pack(">I", len(data)) + kind + data
        return body + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def register():
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"uc{t}", "display_name": f"Upload {t}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
        "country": "US"})
    r.raise_for_status()
    headers = {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}
    me = c.get("/auth/me", headers=headers).json()
    return headers, me.get("id") or me.get("user_id")


def upload(headers, name, data, content_type):
    return c.post("/media/upload", headers=headers, data={"purpose": "post"},
                  files={"file": (name, io.BytesIO(data), content_type)})


def ticket(asset_id, viewer_id):
    r = direct.post("/internal/media/sign", json={"asset_ids": [asset_id], "viewer_id": viewer_id})
    r.raise_for_status()
    return r.json()["tickets"][asset_id]


author, author_id = register()
other, other_id = register()
image = png()

print("== stored privately at UploadCenter")
r = upload(author, "photo.png", image, "image/png")
check("an image is accepted", r.status_code == 201, (r.status_code, r.text[:200]))
asset = r.json() if r.status_code == 201 else {}
asset_id = asset.get("id", "")
info = direct.get(f"/internal/media/{asset_id}").json() if asset_id else {}
if info.get("storage") != "uploadcenter":
    print("  SKIP media-service is not storing post media at UploadCenter "
          f"(storage={info.get('storage')!r}); start it with POST_MEDIA_PROVIDER=uploadcenter")
    sys.exit(2)
check("the asset is recorded as stored at UploadCenter", info.get("storage") == "uploadcenter", info)
check("…and restricted from the first byte, before any post uses it", info.get("access") == "restricted", info)
check("the response does not hand out the storage address",
      "cloudflarestorage" not in str(asset) and "uploadscenter" not in str(asset.get("url", "")), asset)

print("== nothing is served without a valid ticket")
check("no ticket: refused", direct.get(f"/media/{asset_id}").status_code == 404)
check("a forged ticket is refused",
      direct.get(f"/media/{asset_id}?v={author_id}&e=9999999999&s=forged").status_code == 404)
check("an expired ticket is refused",
      direct.get(f"/media/{asset_id}?v={author_id}&e=1&s=anything").status_code == 404)
mine = ticket(asset_id, author_id)
check("the author's ticket does not work in another member's session",
      direct.get(f"/media/{asset_id}?{mine}", headers=other).status_code == 404)

print("== a valid ticket is relayed through media-service")
r = direct.get(f"/media/{asset_id}?{mine}", headers=author)
check("served with 200 (not a redirect)", r.status_code == 200, (r.status_code, r.headers.get("location")))
check("the bytes are exactly the ones uploaded", r.content == image, (len(r.content), len(image)))
check("the type is ours", r.headers.get("content-type", "").startswith("image/png"), r.headers.get("content-type"))
check("shown inline, not forced to download", r.headers.get("content-disposition", "").startswith("inline"),
      r.headers.get("content-disposition"))
check("no shared cache may keep it", r.headers.get("cache-control") == "private, no-store", r.headers.get("cache-control"))
check("the browser may not guess a type", r.headers.get("x-content-type-options") == "nosniff")
leaks = [f"{k}: {v}" for k, v in r.headers.items()
         if any(w in f"{k}{v}".lower() for w in ("cloudflarestorage", "x-amz", "r2.", "uploadscenter"))]
check("no header names the storage or carries its signature", not leaks, leaks)
check("the length is announced", r.headers.get("content-length") == str(len(image)), r.headers.get("content-length"))

print("== Range, which a video needs")
r = direct.get(f"/media/{asset_id}?{mine}", headers={**author, "Range": "bytes=0-9"})
check("a slice answers 206 with the right range",
      r.status_code == 206 and r.headers.get("content-range") == f"bytes 0-9/{len(image)}", (r.status_code, r.headers.get("content-range")))
check("…and exactly those bytes", r.content == image[:10], r.content)
r = direct.get(f"/media/{asset_id}?{mine}", headers={**author, "Range": "bytes=-5"})
check("the last bytes can be asked for", r.status_code == 206 and r.content == image[-5:], (r.status_code, r.content))
r = direct.get(f"/media/{asset_id}?{mine}", headers={**author, "Range": f"bytes={len(image) + 100}-"})
check("a range past the end is 416", r.status_code == 416, r.status_code)

print("== through the gateway too")
r = c.get(f"/media/{asset_id}?{mine}", headers={**author, "Range": "bytes=2-6"})
check("a slice through the gateway", r.status_code == 206 and r.content == image[2:7], (r.status_code, r.content))

def big_png(width: int, height: int, rnd: random.Random) -> bytes:
    """A real PNG of a few megabytes: noise, so it does not compress away.

    This used to be an mp4 header followed by eight megabytes of random bytes.
    Local storage never looked inside a file, so it passed; UploadCenter decodes
    what it is given and refused it, and the suite failed for a reason that had
    nothing to do with relaying a large file. What is being checked here is that
    a big file comes back whole and sliceable, so it only has to be big and
    real.
    """
    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    rows = bytearray()
    for _ in range(height):
        rows.append(0)
        rows += rnd.randbytes(width * 3)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(rows), 1))
        + chunk(b"IEND", b"")
    )


print("== a larger file is relayed intact")
blob = big_png(1600, 1600, random.Random(5))
started = time.time()
r = upload(author, "big.png", blob, "image/png")
check(f"a {len(blob) // 1024 // 1024} MB file is accepted", r.status_code == 201, (r.status_code, r.text[:160]))
big = r.json().get("id", "") if r.status_code == 201 else ""
print(f"     (stored in {time.time() - started:.0f}s)")
if big:
    t = ticket(big, author_id)
    r = direct.get(f"/media/{big}?{t}", headers=author)
    check("it comes back whole",
          r.status_code == 200 and hashlib.sha256(r.content).hexdigest() == hashlib.sha256(blob).hexdigest(),
          (r.status_code, len(r.content)))
    middle = len(blob) // 2
    r = direct.get(f"/media/{big}?{t}", headers={**author, "Range": f"bytes={middle}-{middle + 99}"})
    check("a slice from the middle is exact", r.status_code == 206 and r.content == blob[middle:middle + 100],
          (r.status_code, len(r.content)))

print("== deletion")
check("someone else cannot delete it", c.delete(f"/media/{asset_id}", headers=other).status_code == 404)
check("…and it is still served", direct.get(f"/media/{asset_id}?{mine}", headers=author).status_code == 200)
check("the owner can delete it", c.delete(f"/media/{asset_id}", headers=author).status_code == 204)
check("after which even a valid ticket gets nothing",
      direct.get(f"/media/{asset_id}?{mine}", headers=author).status_code == 404)
if big:
    c.delete(f"/media/{big}", headers=author)

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
