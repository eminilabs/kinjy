"""The gateway relays bodies as a stream; it must not hold a whole file in memory.

Before: `proxy()` did `await request.body()` and returned `response.content`, so a
200 MB upload (or download) sat in the gateway's memory, once per concurrent
request. A handful of large transfers was enough to exhaust the container.

The check: send a large file through the gateway while sampling the gateway
container's memory, fetch it back the same way, and compare the peak with the
size of the file. Integrity is checked too, since streaming changes how bytes
are framed (Content-Length, chunking, HEAD, empty responses).

Needs the local stack and the docker CLI:  python backend/tests/e2e_gateway_streaming.py
"""
from __future__ import annotations

import hashlib
import random
import string
import subprocess
import sys
import threading
import time
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
CONTAINER = "kaluta-gateway"
SIZE_MB = int(sys.argv[1]) if len(sys.argv) > 1 else 150
# Steady state is ~80 MB. A buffering gateway adds at least the file's size, in
# practice two or three times that. Streaming stays far below one copy.
HEADROOM_MB = SIZE_MB * 0.4
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    ok = ok and bool(cond)


def mem_mb() -> float | None:
    out = subprocess.run(["docker", "stats", "--no-stream", "--format", "{{.MemUsage}}", CONTAINER],
                         capture_output=True, text=True, timeout=30).stdout.split("/")[0].strip()
    try:
        number = float("".join(ch for ch in out if ch.isdigit() or ch == "."))
    except ValueError:
        return None
    return number * 1024 if out.endswith("GiB") else number / 1024 if out.endswith("KiB") else number


class Sampler:
    """Peak memory of the gateway while a block runs."""

    def __enter__(self):
        self.peak, self._stop = mem_mb() or 0.0, threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        return self

    def _run(self):
        while not self._stop.is_set():
            value = mem_mb()
            if value:
                self.peak = max(self.peak, value)

    def __exit__(self, *exc):
        self._stop.set()
        self._thread.join(timeout=40)


def register():
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    r = httpx.post(f"{BASE}/auth/register", timeout=30, json={
        "email": f"{t}@example.com", "handle": f"gw{t}", "display_name": f"Gateway {t}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
        "country": "US"})
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}


# media-service checks that a file starts the way its type says; the rest can be filler.
MP4_HEAD = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"


class Body:
    """A large file produced on the fly, so the test itself holds almost nothing."""

    def __init__(self, megabytes: int, seed: int):
        self.megabytes, self.seed, self.digest = megabytes, seed, hashlib.sha256()

    def __iter__(self):
        rng = random.Random(self.seed)
        block = rng.randbytes(1024 * 1024)
        for i in range(self.megabytes):
            chunk = block[i % 997:] + block[: i % 997]  # varies, costs nothing
            if i == 0:
                chunk = MP4_HEAD + chunk[len(MP4_HEAD):]
            self.digest.update(chunk)
            yield chunk


headers = register()


def _tiny_png() -> bytes:
    """A real 64x64 PNG, to ask media-service where post media is being stored."""
    import struct
    import zlib

    raw = b"".join(bytes([0]) + bytes([20, 90, 160]) * 64 for _ in range(64))

    def chunk(kind: bytes, data: bytes) -> bytes:
        body = struct.pack(">I", len(data)) + kind + data
        return body + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    return (bytes([0x89]) + b"PNG" + bytes([13, 10, 26, 10])
            + chunk(b"IHDR", struct.pack(">IIBBBBB", 64, 64, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


# This test moves 150 MB of filler, which UploadCenter would be sent and billed for
# (and would not serve back without a ticket). The gateway is the same whichever
# storage sits behind it, so it is measured against the local one.
probe = httpx.post(f"{BASE}/media/upload", headers=headers, timeout=60, data={"purpose": "post"},
                   files={"file": ("probe.png", _tiny_png(), "image/png")})
if probe.status_code == 201:
    where = httpx.get(f"http://localhost:8213/internal/media/{probe.json()['id']}", timeout=10).json().get("storage")
    if where == "uploadcenter":
        print("  SKIP post media is stored at UploadCenter; this test needs the local storage "
              "(start media-service without POST_MEDIA_PROVIDER=uploadcenter)")
        sys.exit(2)
baseline = mem_mb() or 0.0
print(f"gateway at rest: {baseline:.0f} MB, test file: {SIZE_MB} MB, allowed growth: {HEADROOM_MB:.0f} MB")

print("== upload")
# multipart framed by hand so the file can be streamed without building it first.
boundary = "----gwstream" + "".join(random.choices(string.ascii_lowercase, k=12))
head = (f'--{boundary}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\npost\r\n'
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="blob.mp4"\r\n'
        f"Content-Type: video/mp4\r\n\r\n").encode()
tail = f"\r\n--{boundary}--\r\n".encode()
body = Body(SIZE_MB, seed=7)


def multipart():
    yield head
    yield from body
    yield tail


total = len(head) + SIZE_MB * 1024 * 1024 + len(tail)
with Sampler() as up:
    started = time.time()
    r = httpx.post(f"{BASE}/media/upload", timeout=600, content=multipart(),
                   headers={**headers, "Content-Type": f"multipart/form-data; boundary={boundary}",
                            "Content-Length": str(total)})
    took = time.time() - started
check("the upload succeeds", r.status_code == 201, (r.status_code, r.text[:200]))
check(f"the gateway's memory stayed within {HEADROOM_MB:.0f} MB of rest",
      up.peak - baseline <= HEADROOM_MB, f"peak {up.peak:.0f} MB, rest {baseline:.0f} MB, +{up.peak - baseline:.0f} MB")
print(f"     ({took:.0f}s, peak +{up.peak - baseline:.0f} MB)")
asset = r.json() if r.status_code == 201 else {}
asset_id = asset.get("id")
sent_sha = body.digest.hexdigest()

print("== download")
url = f"/media/{asset_id}"
digest, received = hashlib.sha256(), 0
with Sampler() as down:
    with httpx.stream("GET", f"{BASE}{url}", headers=headers, timeout=600) as resp:
        status, length = resp.status_code, resp.headers.get("content-length")
        for chunk in resp.iter_bytes(1024 * 1024):
            received += len(chunk)
            digest.update(chunk)
check("the download succeeds", status == 200, status)
check("it arrives whole and unchanged", received == SIZE_MB * 1024 * 1024 and digest.hexdigest() == sent_sha,
      (received, SIZE_MB * 1024 * 1024))
check("the length is announced, so clients can show progress", length == str(SIZE_MB * 1024 * 1024), length)
check(f"the gateway's memory stayed within {HEADROOM_MB:.0f} MB of rest on the way out",
      down.peak - baseline <= HEADROOM_MB, f"peak {down.peak:.0f} MB, +{down.peak - baseline:.0f} MB")
print(f"     (peak +{down.peak - baseline:.0f} MB)")

print("== framing is unchanged for ordinary traffic")
r = httpx.head(f"{BASE}{url}", headers=headers, timeout=30)
check("HEAD never carries a body (this route answers 405, which is its own and unchanged)",
      r.status_code in (200, 405) and r.content == b"", (r.status_code, len(r.content)))
r = httpx.get(f"{BASE}/auth/me", headers=headers, timeout=30)
check("a small JSON call is intact", r.status_code == 200 and r.json().get("handle", "").startswith("gw"), r.text[:120])
r = httpx.options(f"{BASE}/auth/me", headers={"Origin": "http://localhost:3030", "Access-Control-Request-Method": "GET"}, timeout=30)
check("CORS preflight still works", r.status_code in (200, 204), r.status_code)
r = httpx.get(f"{BASE}/no-such-route", timeout=30)
check("an unknown route is still a clean 404", r.status_code == 404, r.status_code)
r = httpx.get(f"{BASE}/media/mda_does_not_exist", headers=headers, timeout=30)
check("an upstream 404 passes through with its body", r.status_code == 404 and r.text, (r.status_code, r.text[:80]))
r = httpx.post(f"{BASE}/auth/login", json={"email": "nobody@example.com", "password": "wrong"}, timeout=30)
check("an upstream error passes through", r.status_code in (400, 401, 404, 422), r.status_code)

print("== framing edge cases")
# Range: a player or a resumed download asks for a slice and must get exactly it.
r = httpx.get(f"{BASE}{url}", headers={**headers, "Range": "bytes=0-1023"}, timeout=60)
check("a Range request is answered with 206 and just that slice",
      r.status_code == 206 and len(r.content) == 1024 and r.headers.get("content-range", "").startswith("bytes 0-1023/"),
      (r.status_code, len(r.content), r.headers.get("content-range")))


def multipart_head(boundary: str, filename: str) -> bytes:
    return (f'--{boundary}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\npost\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: video/mp4\r\n\r\n").encode()


# A client that sends no Content-Length (chunked): the gateway must still relay it.
small_boundary = "----gwsmall" + "".join(random.choices(string.ascii_lowercase, k=8))
small = multipart_head(small_boundary, "s.mp4") + MP4_HEAD + b"z" * (70000 - len(MP4_HEAD)) + f"\r\n--{small_boundary}--\r\n".encode()
r = httpx.post(f"{BASE}/media/upload",
               headers={**headers, "Content-Type": f"multipart/form-data; boundary={small_boundary}"},
               content=(small[i:i + 8192] for i in range(0, len(small), 8192)), timeout=60)
check("a chunked upload (no Content-Length) is relayed intact",
      r.status_code == 201 and r.json().get("size_bytes") == 70000, (r.status_code, r.text[:160]))

# The service's own limit still speaks through the gateway, and the gateway does not hang
# when the service answers while the client is still sending.
OVER_MB = 201
over = Body(OVER_MB, seed=11)
over_boundary = "----gwover" + "".join(random.choices(string.ascii_lowercase, k=8))
over_head, over_tail = multipart_head(over_boundary, "o.mp4"), f"\r\n--{over_boundary}--\r\n".encode()


def oversize():
    yield over_head
    yield from over
    yield over_tail


started = time.time()
try:
    r = httpx.post(f"{BASE}/media/upload", timeout=300, content=oversize(),
                   headers={**headers, "Content-Type": f"multipart/form-data; boundary={over_boundary}",
                            "Content-Length": str(len(over_head) + OVER_MB * 1024 * 1024 + len(over_tail))})
    status = r.status_code
except httpx.HTTPError as exc:  # the connection may be closed once the verdict is given
    status = f"closed ({type(exc).__name__})"
check("an upload over the 200 MB limit is refused (413) or cut off, never accepted",
      status == 413 or str(status).startswith("closed"), status)
check("…and the gateway does not hang", time.time() - started < 120, f"{time.time() - started:.0f}s")
check("an oversize Content-Length is refused by the gateway itself, with a clear 413",
      status == 413, status)

print("== bodies the gateway refuses to relay")
r = httpx.post(f"{BASE}/auth/login", content=b"x" * (9 * 1024 * 1024),
               headers={"Content-Type": "application/json"}, timeout=60)
check("a 9 MB body on a JSON route is refused (413)", r.status_code == 413, (r.status_code, r.text[:100]))

# Chunked and unbounded: no Content-Length to refuse up front, so the cap has to bite mid-stream.
def endless_json():
    for _ in range(12):
        yield b"x" * (1024 * 1024)


try:
    r = httpx.post(f"{BASE}/auth/login", content=endless_json(),
                   headers={"Content-Type": "application/json"}, timeout=60)
    cap_status = r.status_code
except httpx.HTTPError as exc:
    cap_status = f"closed ({type(exc).__name__})"
check("a chunked body past the cap is cut off mid-stream (413 or a closed connection)",
      cap_status == 413 or str(cap_status).startswith("closed"), cap_status)

# A client that stops sending must not hold a connection to the service forever.
import socket
sock = socket.create_connection(("localhost", 8200), timeout=60)
sock.sendall(b"POST /api/auth/login HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\n"
             b"Content-Length: 100\r\n\r\n{")
started = time.time()
sock.settimeout(60)
reply = b""
try:
    reply = sock.recv(4096)
except socket.timeout:
    pass
sock.close()
check("a body that stops arriving is answered 408 within the idle limit, not held open",
      reply.startswith(b"HTTP/1.1 408") and time.time() - started < 45,
      (reply[:40], f"{time.time() - started:.0f}s"))

print("== no leaked connections after aborted downloads")
# A small file is enough (what matters is the number of connections, which has to pass the
# gateway's pool of 100), and 150 abandoned downloads of the big one would only keep
# media-service busy finishing them.
small_asset = httpx.post(f"{BASE}/media/upload", headers=headers, timeout=60, data={"purpose": "post"},
                         files={"file": ("a.mp4", MP4_HEAD + b"x" * (6 * 1024 * 1024 - len(MP4_HEAD)), "video/mp4")}).json()
for _ in range(150):
    with httpx.stream("GET", f"{BASE}/media/{small_asset['id']}", headers=headers, timeout=60) as resp:
        for chunk in resp.iter_bytes(64 * 1024):
            break  # hang up after the first chunk, mid-download
time.sleep(2)
r = httpx.get(f"{BASE}/auth/me", headers=headers, timeout=30)
check("150 downloads abandoned mid-way, and the gateway still serves every route", r.status_code == 200, r.status_code)

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
