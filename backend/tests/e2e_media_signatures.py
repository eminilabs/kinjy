"""A post upload must look like what it says it is; a chat attachment may be anything.

Before: media-service trusted the Content-Type the client wrote. A file of "x"
declared video/mp4 was stored, and a post could be built around it.

Valid in local and UploadCenter storage alike; run against the local stack:
    python backend/tests/e2e_media_signatures.py
"""
from __future__ import annotations

import io
import random
import string
import sys
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
c = httpx.Client(base_url=BASE, timeout=60)
ok = True



def _png(width: int = 64, height: int = 64) -> bytes:
    """A real, plain PNG (not 1x1, which UploadCenter's own checks refuse)."""
    import struct
    import zlib

    raw = b"".join(bytes([0]) + bytes([20, 90, 160]) * width for _ in range(height))

    def chunk(kind: bytes, data: bytes) -> bytes:
        body = struct.pack(">I", len(data)) + kind + data
        return body + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    return (bytes([0x89]) + b"PNG" + bytes([13, 10, 26, 10])
            + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


PNG = _png()
MP4 = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom" + b"\x00" * 512
JPEG = bytes.fromhex("ffd8ffe000104a46494600") + b"\x00" * 64


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    ok = ok and bool(cond)


def register():
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"sg{t}", "display_name": f"Signature {t}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
        "country": "US"})
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}


def upload(headers, name, data, content_type, purpose="post"):
    return c.post("/media/upload", headers=headers, data={"purpose": purpose},
                  files={"file": (name, io.BytesIO(data), content_type)})


h = register()

print("== a post upload must fit its declared type")
for name, data, ctype in (("p.png", PNG, "image/png"), ("c.mp4", MP4, "video/mp4"), ("j.jpg", JPEG, "image/jpeg")):
    r = upload(h, name, data, ctype)
    # With post media stored at UploadCenter, a file that passes OUR check still goes
    # through THEIR scan, which refuses what it cannot decode: a 22-byte "JPEG" is
    # not a picture. That is a 422 from the storage, not a failure of the signature
    # check, so it counts as having got past it.
    got_past_ours = r.status_code == 201 or (r.status_code == 422 and "storage service" in r.text)
    check(f"a real {ctype} header gets past the signature check", got_past_ours, (r.status_code, r.text[:140]))
    if ctype == "image/png":
        check("…and a proper image is stored", r.status_code == 201, (r.status_code, r.text[:140]))

print("== the cheap lies are refused, with a reason")
liars = {
    "filler named image/png": ("a.png", b"x" * 5000, "image/png"),
    "filler named video/mp4": ("a.mp4", b"x" * 5000, "video/mp4"),
    "HTML named image/png": ("a.png", b"<!doctype html><script>alert(1)</script>", "image/png"),
    "SVG script named image/png": ("a.png", b"<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'/>", "image/png"),
    "a PNG named video/mp4": ("a.mp4", PNG, "video/mp4"),
    "a JPEG named image/png": ("a.png", JPEG, "image/png"),
}
for label, (name, data, ctype) in liars.items():
    r = upload(h, name, data, ctype)
    check(f"{label}: 415", r.status_code == 415, (r.status_code, r.text[:140]))
    check("   and it says why", "first bytes" in r.text or "does not look like" in r.text, r.text[:140])

r = upload(h, "e.png", b"", "image/png")
check("an empty file is refused", r.status_code in (400, 415), (r.status_code, r.text[:100]))
r = upload(h, "a.svg", b"<svg/>", "image/svg+xml")
check("SVG is still refused as an unsupported type", r.status_code == 415, r.status_code)

print("== a chat attachment may be anything")
for label, data in (("a zip", b"PK\x03\x04" + b"\x00" * 64), ("random bytes", bytes(range(256)) * 4), ("text", b"hello")):
    r = upload(h, "f.bin", data, "application/octet-stream", purpose="chat")
    check(f"{label} is accepted as a chat attachment", r.status_code == 201, (r.status_code, r.text[:120]))

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
