"""The display copy of a picture, against the live API.

What this is here to catch, in the order it bit production:

1. A feed was sent the camera file. 375 kB median, 6 MB worst, into a column
   560 px wide. So: a picture asked for with ``p=1`` must come back
   substantially smaller than the original, and still be the same picture.
2. A ticket lasted five minutes and the URL changed every time the feed was
   fetched, so nothing was ever reused. So: two tickets minted a second apart
   must be identical, and the response must be cacheable by the viewer's own
   browser and by nobody else's.
3. ``p=1`` must not be a way around the ticket. An asset asked for without one,
   or with somebody else's, is refused whether or not the small copy exists.
"""
import random
import string
import sys
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
c = httpx.Client(base_url=BASE, timeout=60, follow_redirects=False)
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


def register(age=30):
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


def photograph() -> bytes:
    """A JPEG that behaves like a photograph: big, and noisy enough that it
    does not compress to nothing. A flat colour would shrink by 99% and prove
    nothing about a real upload."""
    import io as _io

    from PIL import Image

    rng = random.Random(7)
    image = Image.new("RGB", (3000, 2000))
    pixels = image.load()
    # Bands of drifting colour with per-pixel noise: compressible like a photo,
    # not like a test pattern.
    for y in range(0, 2000, 4):
        base = (rng.randrange(60, 200), rng.randrange(60, 200), rng.randrange(60, 200))
        for x in range(0, 3000, 4):
            shade = tuple(min(255, max(0, v + rng.randrange(-30, 30))) for v in base)
            for dy in range(4):
                for dx in range(4):
                    pixels[x + dx, y + dy] = shade
    buffer = _io.BytesIO()
    image.save(buffer, "JPEG", quality=92)
    return buffer.getvalue()


print("Media previews")
token, user = register()
body = photograph()
print(f"  (uploaded photograph: {len(body) // 1024} kB, 3000x2000)")

r = c.post(
    "/media/upload",
    headers=auth(token),
    files={"file": ("photo.jpg", body, "image/jpeg")},
    data={"purpose": "post"},
)
check("upload accepted", r.status_code == 201, f"{r.status_code} {r.text[:200]}")
asset = r.json()
asset_id = asset["id"]

# The ticket comes from whichever service hands the member the post, signed
# with the running stack's secret. Minting one here would sign with whatever is
# in this shell's environment, which is how a version of this test spent its
# first run asserting 404s it had caused itself.
r = c.post("/posts", headers=auth(token), json={
    "body": "preview check",
    "media": [{"media_id": asset_id, "url": asset["url"], "kind": "image"}],
})
check("post created", r.status_code in (200, 201), f"{r.status_code} {r.text[:200]}")
post_id = r.json()["id"]

r = c.get(f"/posts/{post_id}/media", headers=auth(token))
signed = (r.json().get("media") or [{}])[0].get("url")
check("the URL carries a ticket", bool(signed) and "s=" in str(signed), str(signed)[:120])

MEDIA = "http://localhost:8213"
direct = signed.replace("/media/", f"{MEDIA}/media/", 1) if signed.startswith("/media/") else signed
raw = httpx.Client(timeout=60, follow_redirects=False)

full = raw.get(direct, headers=auth(token))
small = raw.get(f"{direct}&p=1", headers=auth(token))

check("original served", full.status_code == 200, f"{full.status_code} {full.text[:150]}")
check("preview served", small.status_code == 200, f"{small.status_code} {small.text[:150]}")
check("preview is webp", small.headers.get("content-type", "").startswith("image/webp"),
      small.headers.get("content-type", ""))

big, little = len(full.content), len(small.content)
print(f"  (original {big // 1024} kB, preview {little // 1024} kB)")
check("preview is much smaller", little * 3 < big, f"{little} vs {big}")

from PIL import Image  # noqa: E402
import io as _io  # noqa: E402

shape = Image.open(_io.BytesIO(small.content)).size
check("preview is 1440 on its long edge", max(shape) == 1440, str(shape))
check("preview keeps the aspect ratio", abs(shape[0] / shape[1] - 1.5) < 0.01, str(shape))

cache = small.headers.get("cache-control", "")
check("the viewer's own browser may keep it", "private" in cache and "max-age=" in cache, cache)
check("no shared cache may keep it", "no-store" not in cache and "public" not in cache, cache)

# The same member asking again gets the same URL, or the cache header above is
# decoration: a URL that changes on every fetch is a guaranteed cache miss.
again = (c.get(f"/posts/{post_id}/media", headers=auth(token)).json().get("media") or [{}])[0].get("url")
check("the signed URL is stable between fetches", again == signed, f"{str(again)[-40:]} vs {str(signed)[-40:]}")

# A small copy is still the asset, and the asset still needs a ticket.
naked = raw.get(f"{MEDIA}/media/{asset_id}?p=1", headers=auth(token))
check("preview refused without a ticket", naked.status_code == 404, str(naked.status_code))

other_token, other = register()
tampered = direct.replace(f"v={user['id']}", f"v={other['id']}")
stolen = raw.get(f"{tampered}&p=1", headers=auth(other_token))
check("preview refused on a ticket signed for somebody else", stolen.status_code == 404,
      str(stolen.status_code))

# A picture already small enough is not copied: a second file that saves
# nothing is a slow path pretending to be a fast one.
from PIL import Image as _Image  # noqa: E402

buffer = _io.BytesIO()
_Image.new("RGB", (400, 300), (90, 120, 150)).save(buffer, "JPEG", quality=85)
r = c.post(
    "/media/upload",
    headers=auth(token),
    files={"file": ("small.jpg", buffer.getvalue(), "image/jpeg")},
    data={"purpose": "post"},
)
check("small upload accepted", r.status_code == 201, f"{r.status_code} {r.text[:150]}")
tiny_id = r.json()["id"]
r = c.post("/posts", headers=auth(token), json={
    "body": "small one",
    "media": [{"media_id": tiny_id, "url": r.json()["url"], "kind": "image"}],
})
tiny_signed = (c.get(f"/posts/{r.json()['id']}/media", headers=auth(token)).json().get("media") or [{}])[0].get("url")
tiny_direct = tiny_signed.replace("/media/", f"{MEDIA}/media/", 1) if tiny_signed.startswith("/media/") else tiny_signed
served = raw.get(f"{tiny_direct}&p=1", headers=auth(token))
check("a small picture is served as it is", served.status_code == 200 and
      served.headers.get("content-type", "").startswith("image/jpeg"),
      f"{served.status_code} {served.headers.get('content-type', '')}")

print("OK" if ok else "FAILED")
sys.exit(0 if ok else 1)
