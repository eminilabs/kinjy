"""Signed media, against the live API.

The scenario this exists for: an adult copies a media URL out of a page and
sends it to a teenager. Before this work, the URL was permanent, unauthenticated
and served the bytes to anyone who asked.
"""
import io
import random
import string
import sys
import time
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
# media-service's own published port. Getting this wrong is not a harmless
# typo: another service on the wrong port answers 404 to every unknown path,
# so a test asserting "refused" passes without ever reaching media-service.
MEDIA_DIRECT = "http://localhost:8213"
c = httpx.Client(base_url=BASE, timeout=30, follow_redirects=True)
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
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"T {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"]


def auth(t):
    return {"Authorization": f"Bearer {t}"}




def _png(width: int = 64, height: int = 64) -> bytes:
    """A real, plain PNG. Not 1x1: UploadCenter refuses an image that small, and
    this test must hold whichever storage media-service is using."""
    import struct
    import zlib

    raw = b"".join(bytes([0]) + bytes([200, 30, 30]) * width for _ in range(height))

    def chunk(kind: bytes, data: bytes) -> bytes:
        body = struct.pack(">I", len(data)) + kind + data
        return body + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    return (bytes([0x89]) + b"PNG" + bytes([13, 10, 26, 10])
            + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


PNG = _png()

probe = httpx.get(f"{MEDIA_DIRECT}/health", timeout=10).json()
assert probe.get("service") == "media-service", f"wrong port: {probe}"
print(f"talking to {probe['service']} on {MEDIA_DIRECT}")

adult_tok, adult = register(30)
teen_tok, teen = register(14)
other_tok, other = register(40)

print("\n== upload and attach ==")
r = c.post("/media/upload", headers=auth(adult_tok),
           files={"file": ("pixel.png", io.BytesIO(PNG), "image/png")},
           data={"kind": "image", "provenance": "original"})
check("an adult can upload", r.status_code in (200, 201), f"{r.status_code} {r.text[:150]}")
asset = r.json() if r.status_code in (200, 201) else {}
asset_id, asset_url = asset.get("id"), asset.get("url")
print(f"   asset: {asset_id}  url: {asset_url}")

storage = httpx.get(f"{MEDIA_DIRECT}/internal/media/{asset_id}", timeout=10).json().get("storage")
if storage == "uploadcenter":
    # Post media at UploadCenter has no public address to fall back on, so it is
    # restricted from the first byte rather than once a post uses it.
    check("an unattached asset at UploadCenter is already refused without a ticket",
          httpx.get(f"{MEDIA_DIRECT}/media/{asset_id}", timeout=10).status_code == 404)
else:
    check("an unattached asset is still public",
          httpx.get(f"{MEDIA_DIRECT}/media/{asset_id}", timeout=10).status_code == 200,
          "before attaching, it is an avatar-class asset")
print(f"   storage: {storage}")

r = c.post("/posts", headers=auth(adult_tok), json={
    "body": "A post with an image.", "visibility": "public", "format": "image",
    "media": [{"media_id": asset_id, "url": asset_url, "kind": "image"}],
})
check("the post is created", r.status_code in (200, 201), r.text[:150])
post_id = r.json().get("id") if r.status_code in (200, 201) else None
time.sleep(1)

print("\n== the raw URL stops working once attached ==")
r = httpx.get(f"{MEDIA_DIRECT}/media/{asset_id}", timeout=10)
check("the bare media URL is refused", r.status_code == 404, f"{r.status_code}")

r = httpx.get(f"{MEDIA_DIRECT}/media/{asset_id}?v={adult['id']}&e=9999999999&s=forged", timeout=10)
check("a forged signature is refused", r.status_code == 404, f"{r.status_code}")

print("\n== the author gets a working signed URL ==")
r = c.get(f"/posts/{post_id}", headers=auth(adult_tok))
check("the author can read the post", r.status_code == 200, r.text[:120])
signed = (r.json().get("media") or [{}])[0].get("url") if r.status_code == 200 else None
print(f"   signed: {str(signed)[:96]}")
check("the URL carries a ticket", bool(signed) and "s=" in str(signed) and "e=" in str(signed), signed)

if signed:
    direct = signed.replace("/media/", f"{MEDIA_DIRECT}/media/", 1) if signed.startswith("/media/") \
        else signed
    r = httpx.get(direct, timeout=10)
    check("the signed URL serves the bytes", r.status_code == 200, f"{r.status_code}")
    check("a restricted byte range is not shared-cacheable",
          "no-store" in r.headers.get("cache-control", ""), r.headers.get("cache-control"))

    print("\n== the copied URL, pasted into someone else's session ==")
    r = httpx.get(direct, headers=auth(other_tok), timeout=10)
    check("another signed-in member is refused the copied URL", r.status_code == 404,
          f"{r.status_code}")
    r = httpx.get(direct, headers=auth(teen_tok), timeout=10)
    check("a teenager given the copied URL is refused", r.status_code == 404, f"{r.status_code}")

print("\n== an age-restricted post yields no URL at all ==")
if post_id:
    r = httpx.post(f"http://localhost:8203/internal/classify/{post_id}",
                   json={"age_rating": "ADULT_18_PLUS", "classifier_source": "test"}, timeout=15)
    check("the post is rated 18+", r.status_code == 200, r.text[:120])

    r = c.get(f"/posts/{post_id}", headers=auth(teen_tok))
    check("a 14-year-old cannot read the post", r.status_code == 404, f"{r.status_code}")
    r = c.get(f"/posts/{post_id}/media", headers=auth(teen_tok))
    check("a 14-year-old gets no media list", r.status_code == 404, f"{r.status_code}")
    # The point: no ticket is ever minted for them, so there is nothing to copy.

print("\n== tickets expire ==")
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import mediasign  # noqa: E402

ok_now, _ = mediasign.verify(
    "mda_x", *[mediasign.mint("mda_x", "usr_1")[k] for k in ("v", "e", "s")]
)
check("a fresh ticket verifies", ok_now)
t = mediasign.mint("mda_x", "usr_1", ttl=30)
expired_ok, reason = mediasign.verify(
    "mda_x", t["v"], t["e"], t["s"], now=int(t["e"]) + 1
)
check("an expired ticket does not", not expired_ok and reason == "expired", reason)
cross_ok, reason = mediasign.verify("mda_OTHER", t["v"], t["e"], t["s"])
check("a ticket for one asset does not open another",
      not cross_ok and reason == "bad_signature", reason)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
