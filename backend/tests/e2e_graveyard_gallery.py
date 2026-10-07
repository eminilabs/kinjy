"""The memorial gallery — photos and videos — against the live API.

A gallery is filled by a family from a phone and read by strangers at a grave, so
both halves are checked: what only the family may put in (and only files that went
through the memorial's own checks), and what a visitor with no account is given —
signed links, never the bare file.

Run with the platform's .env loaded, like the other Graveyard suites.
"""
import base64
import os
import random
import string
import time
from datetime import date
from urllib.parse import parse_qs, urlparse

import httpx

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
MEDIA = os.environ.get("KINJY_MEDIA", "http://localhost:8213")
c = httpx.Client(base_url=BASE, timeout=120)
ok = True

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
# Valid headers, nothing playable behind them: the checks look at what the bytes
# say they are, not at whether a decoder could show them.
MP4 = bytes.fromhex("00000018667479706d703432000000006d70343269736f6d") + b"clip"
WEBM = bytes.fromhex("1a45dfa3") + b"\0" * 32


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    if not cond:
        ok = False


def tag():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def distinct_png():
    """A PNG no other test has uploaded: the same bytes are one asset."""
    return PNG + os.urandom(12)


def born(age):
    t = date.today()
    return date(t.year - age, t.month, min(t.day, 28)).isoformat()


def register(age, name="u"):
    t = tag()
    for _ in range(4):
        r = c.post("/auth/register", json={
            "email": f"{t}@example.com", "handle": f"{name}{t}", "display_name": f"Gallery {name} {t}",
            "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
        })
        if r.status_code != 504:
            break
        time.sleep(2)
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"]


def auth(t):
    return {"Authorization": f"Bearer {t}"} if t else {}


def upload(tok, data, ctype, name="f", purpose="memorial", provenance="original"):
    return c.post(
        "/media/upload", headers=auth(tok),
        files={"file": (name, data, ctype)}, data={"purpose": purpose, "provenance": provenance},
    )


def asset(tok, data=None, ctype="image/png", provenance="original", purpose="memorial"):
    r = upload(tok, data if data is not None else distinct_png(), ctype, purpose=purpose, provenance=provenance)
    r.raise_for_status()
    return r.json()["id"]


def make(tok, **extra):
    r = c.post("/memorials", headers=auth(tok), json={"full_name": f"Gallery {tag()}", **extra})
    r.raise_for_status()
    return r.json()


def gallery(mid, tok=None):
    return c.get(f"/memorials/{mid}/media", headers=auth(tok))


def add(mid, tok, media_id, **extra):
    return c.post(f"/memorials/{mid}/media", headers=auth(tok), json={"media_id": media_id, **extra})


def expiry(url):
    return int(parse_qs(urlparse(url).query)["e"][0])


def asset_exists(media_id):
    return httpx.get(f"{MEDIA}/internal/media/{media_id}", timeout=30).status_code == 200


owner_tok, owner = register(40, "own")
other_tok, other = register(41, "oth")
visitor_tok, visitor = register(30, "vis")
sections = []


def section(title):
    def wrap(fn):
        sections.append((title, fn))
        return fn
    return wrap


S = {}  # state shared between sections


@section("an administrator fills the gallery")
def _():
    m = make(owner_tok)
    S["mid"] = mid = m["id"]
    png = asset(owner_tok)
    mp4 = asset(owner_tok, MP4 + os.urandom(8), "video/mp4", provenance="ai_generated")
    S["png"], S["mp4"] = png, mp4
    r = add(mid, owner_tok, png, caption="  Her classroom, 1978  ")
    check("a photo goes in", r.status_code == 201, r.text[:200])
    first = r.json()
    check("with its caption trimmed", first.get("caption") == "Her classroom, 1978", first.get("caption"))
    check("first in line", first.get("position") == 1 and first.get("kind") == "image", first)
    r = add(mid, owner_tok, mp4, sensitive=True)
    second = r.json()
    check("and a video", r.status_code == 201 and second.get("kind") == "video", r.text[:200])
    check("it keeps the label it was uploaded with", second.get("provenance") == "ai_generated", second.get("provenance"))
    check("and the family's call that it is sensitive", second.get("sensitive") is True)
    S["items"] = [first["id"], second["id"]]

    r = gallery(mid, owner_tok)
    body = r.json()
    check("the family reads it in order", [i["id"] for i in body["items"]] == S["items"], body)
    check("with what is left of its room", body.get("limit") == 60 and body.get("bytes_used", 0) > 0, body)


@section("a visitor with no account is given tickets, never the bare file")
def _():
    mid = S["mid"]
    body = gallery(mid).json()
    check("a visitor can open the gallery", len(body["items"]) == 2, body)
    check("and is not told how much room the family has left", "bytes_used" not in body, body)
    img = next(i for i in body["items"] if i["kind"] == "image")
    vid = next(i for i in body["items"] if i["kind"] == "video")
    check("pictures carry a ticket for no one in particular", "s=" in img["url"] and "v=anon" in img["url"], img["url"])
    now = time.time()
    check("a picture's ticket is short", expiry(img["url"]) - now < 400, expiry(img["url"]) - now)
    check("a video's lasts long enough to be watched", expiry(vid["url"]) - now > 3000, expiry(vid["url"]) - now)
    got = httpx.get(img["url"], timeout=30)
    check("the ticket opens the picture", got.status_code == 200 and got.content[: len(PNG)] == PNG, got.status_code)
    bare = img["url"].split("?")[0]
    check("the bare link does not", httpx.get(bare, timeout=30).status_code == 404)
    forged = img["url"].replace("s=", "s=00")
    check("a forged ticket does not", httpx.get(forged, timeout=30).status_code == 404)
    part = httpx.get(vid["url"], headers={"Range": "bytes=0-7"}, timeout=30)
    check("a video can be read from the middle — it will seek", part.status_code == 206 and len(part.content) == 8,
          (part.status_code, len(part.content)))
    check("and says where in the file that was", part.headers.get("content-range", "").startswith("bytes 0-7/"),
          part.headers.get("content-range"))
    check("a ticket for one file does not open another", httpx.get(
        f"{MEDIA}/media/{S['png']}?" + urlparse(vid["url"]).query, timeout=30).status_code == 404)


@section("only the family adds, and only files that went through the memorial's checks")
def _():
    mid = S["mid"]
    r = add(mid, visitor_tok, asset(visitor_tok))
    check("a visitor cannot", r.status_code == 403, r.status_code)
    r = add(mid, owner_tok, asset(visitor_tok))
    check("somebody else's file cannot be put in", r.status_code == 400, r.status_code)
    r = add(mid, owner_tok, asset(owner_tok, purpose="post"))
    check("a file uploaded as a post cannot — it skipped the memorial's checks", r.status_code == 400
          and "memorial" in r.text.lower(), f"{r.status_code} {r.text[:160]}")
    r = add(mid, owner_tok, asset(owner_tok, b"ID3" + b"\0" * 40, "audio/mpeg", purpose="post"))
    check("nor a voice recording", r.status_code == 400, r.status_code)
    r = add(mid, owner_tok, "mda_nobody")
    check("an unknown file is refused", r.status_code == 400, r.status_code)
    r = add(mid, owner_tok, "../../health")
    check("and an id cannot be a path", r.status_code == 422, r.status_code)
    r = add(mid, owner_tok, S["png"])
    check("the same photo twice is refused", r.status_code == 409, f"{r.status_code} {r.text[:120]}")


@section("the upload itself is strict")
def _():
    r = upload(owner_tok, PNG, "video/mp4")
    check("a picture labelled as a video is refused", r.status_code == 415, f"{r.status_code} {r.text[:120]}")
    r = upload(owner_tok, MP4, "image/png")
    check("and a video labelled as a picture", r.status_code == 415, r.status_code)
    r = upload(owner_tok, MP4, "video/quicktime")
    check("an iPhone .mov is refused with a way forward", r.status_code == 415 and "MP4" in r.text, r.text[:200])
    r = upload(owner_tok, b"GIF89a" + b"\0" * 20, "image/gif")
    check("a GIF is not a photo", r.status_code == 415, r.status_code)
    r = upload(owner_tok, MP4 + b"\0" * (51 * 1024 * 1024), "video/mp4")
    check("a video over 50 MB is refused", r.status_code == 413 and "50 MB" in r.text, f"{r.status_code} {r.text[:120]}")
    r = upload(owner_tok, WEBM, "video/webm")
    check("a WebM is welcome", r.status_code == 201 and r.json().get("kind") == "video", r.text[:160])


@section("caption, label, sensitivity and order")
def _():
    mid, ids = S["mid"], S["items"]
    r = c.patch(f"/memorials/{mid}/media/{ids[0]}", headers=auth(owner_tok),
                json={"caption": "The school at Kigoma", "sensitive": True, "provenance": "edited"})
    check("the family edits an item", r.status_code == 200 and r.json()["caption"] == "The school at Kigoma"
          and r.json()["sensitive"] is True and r.json()["provenance"] == "edited", r.text[:200])
    r = c.patch(f"/memorials/{mid}/media/{ids[0]}", headers=auth(owner_tok), json={"caption": None})
    check("a caption can be taken off", r.json().get("caption") is None, r.text[:160])
    r = c.patch(f"/memorials/{mid}/media/{ids[0]}", headers=auth(owner_tok), json={"provenance": "invented"})
    check("a label must be one of the five", r.status_code == 422, r.status_code)
    r = c.patch(f"/memorials/{mid}/media/{ids[0]}", headers=auth(visitor_tok), json={"caption": "x"})
    check("a visitor cannot edit", r.status_code == 403, r.status_code)
    r = c.patch(f"/memorials/{mid}/media/gal_nothing", headers=auth(owner_tok), json={"caption": "x"})
    check("an unknown item is a 404", r.status_code == 404, r.status_code)

    r = c.post(f"/memorials/{mid}/media/reorder", headers=auth(owner_tok), json={"ids": ids[::-1]})
    check("the family sets the order", r.status_code == 200 and [i["id"] for i in r.json()["items"]] == ids[::-1], r.text[:200])
    check("and it holds", [i["id"] for i in gallery(mid).json()["items"]] == ids[::-1])
    r = c.post(f"/memorials/{mid}/media/reorder", headers=auth(owner_tok), json={"ids": ids[:1]})
    check("a partial order is refused", r.status_code == 400, r.status_code)
    r = c.post(f"/memorials/{mid}/media/reorder", headers=auth(owner_tok), json={"ids": [ids[0], "gal_nothing"]})
    check("so is one naming a stranger", r.status_code == 400, r.status_code)
    r = c.post(f"/memorials/{mid}/media/reorder", headers=auth(visitor_tok), json={"ids": ids})
    check("a visitor cannot reorder", r.status_code == 403, r.status_code)


@section("a private memorial keeps its gallery to its family")
def _():
    m = make(owner_tok, visibility="private")
    pid = m["id"]
    r = add(pid, owner_tok, asset(owner_tok))
    check("the family fills it as usual", r.status_code == 201, r.text[:160])
    check("a member cannot see it", gallery(pid, visitor_tok).status_code == 404)
    check("nor a visitor with no account", gallery(pid).status_code == 404)
    check("the family can", gallery(pid, owner_tok).status_code == 200)
    c.delete(f"/memorials/{pid}", headers=auth(owner_tok))


@section("a visitor's approved photo can be put in the gallery")
def _():
    mid = S["mid"]
    photo = asset(visitor_tok, distinct_png(), purpose="post")
    r = c.post(f"/memorials/{mid}/tributes", headers=auth(visitor_tok), json={"kind": "photo", "media_id": photo, "body": "Her, with us"})
    tid = r.json()["id"]
    r = c.post(f"/memorials/{mid}/media/from-tribute/{tid}", headers=auth(owner_tok))
    check("a photo still waiting for approval cannot be promoted", r.status_code == 404, r.status_code)
    c.post(f"/memorials/{mid}/tributes/{tid}/moderate?decision=approved", headers=auth(owner_tok))
    r = c.post(f"/memorials/{mid}/media/from-tribute/{tid}", headers=auth(owner_tok))
    check("once approved it can", r.status_code == 201 and r.json().get("from_tribute") is True, r.text[:200])
    check("keeping the visitor's words as its caption", r.json().get("caption") == "Her, with us", r.json().get("caption"))
    item = r.json()["id"]
    r = c.post(f"/memorials/{mid}/media/from-tribute/{tid}", headers=auth(owner_tok))
    check("not twice", r.status_code == 409, r.status_code)
    r = c.post(f"/memorials/{mid}/media/from-tribute/{tid}", headers=auth(visitor_tok))
    check("and only by the family", r.status_code == 403, r.status_code)
    c.post(f"/memorials/{mid}/tributes", json={"kind": "candle"})
    candle = c.get(f"/memorials/{mid}/tributes?kind=candle").json()["items"][0]["id"]
    r = c.post(f"/memorials/{mid}/media/from-tribute/{candle}", headers=auth(owner_tok))
    check("a candle is not a photo", r.status_code == 404, r.status_code)

    r = c.delete(f"/memorials/{mid}/media/{item}", headers=auth(owner_tok))
    check("taking it out of the gallery works", r.status_code == 204, r.status_code)
    check("and the visitor's file is still theirs", asset_exists(photo))
    shown = c.get(f"/memorials/{mid}/tributes?kind=photo").json()["items"]
    check("still on the tribute", shown and httpx.get(shown[0]["media_url"], timeout=30).status_code == 200,
          [t.get("media_url") for t in shown])


@section("taking a photo out releases the family's own file — and only theirs")
def _():
    a, b = make(owner_tok)["id"], make(owner_tok)["id"]
    shared = asset(owner_tok)
    ia = add(a, owner_tok, shared).json()["id"]
    ib = add(b, owner_tok, shared).json()["id"]
    check("the same file can be in two memorials", ia and ib)
    c.delete(f"/memorials/{a}/media/{ia}", headers=auth(owner_tok))
    check("leaving one does not take it from the other", asset_exists(shared))
    check("which still shows it", httpx.get(gallery(b, owner_tok).json()["items"][0]["url"], timeout=30).status_code == 200)
    c.delete(f"/memorials/{b}/media/{ib}", headers=auth(owner_tok))
    check("leaving the last one deletes the file", not asset_exists(shared))
    c.delete(f"/memorials/{a}", headers=auth(owner_tok))
    c.delete(f"/memorials/{b}", headers=auth(owner_tok))

    kept = asset(owner_tok, purpose="post")  # a post's picture, not the gallery's
    refused = httpx.post(f"{MEDIA}/internal/media/{kept}/discard", json={"owner_id": owner["id"]}, timeout=30)
    check("a post's own picture cannot be deleted through the memorial's route", refused.status_code == 404, refused.status_code)
    check("and is still there", asset_exists(kept))

    gone = make(owner_tok)["id"]
    f1, f2 = asset(owner_tok), asset(owner_tok, MP4 + os.urandom(8), "video/mp4")
    add(gone, owner_tok, f1)
    add(gone, owner_tok, f2)
    c.delete(f"/memorials/{gone}", headers=auth(owner_tok))
    check("deleting a memorial deletes its gallery's files", not asset_exists(f1) and not asset_exists(f2))
    check("and its gallery is gone", gallery(gone, owner_tok).status_code == 404)


@section("a gallery is bounded")
def _():
    m = make(owner_tok)["id"]
    statuses = []
    for _i in range(60):
        r = add(m, owner_tok, asset(owner_tok))
        statuses.append(r.status_code)
    check("sixty fit", statuses.count(201) == 60, [s for s in statuses if s != 201][:3])
    r = add(m, owner_tok, asset(owner_tok))
    check("the sixty-first does not", r.status_code == 400 and "60" in r.text, f"{r.status_code} {r.text[:120]}")
    positions = [i["position"] for i in gallery(m, owner_tok).json()["items"]]
    check("and the order has no gaps", positions == list(range(1, 61)), positions[:5])
    c.delete(f"/memorials/{m}", headers=auth(owner_tok))


for title, fn in sections:
    print(f"\n== {title} ==")
    try:
        fn()
    except Exception as exc:  # one broken section must not hide the others
        check("this section ran to the end", False, repr(exc))

c.delete(f"/memorials/{S.get('mid', 'none')}", headers=auth(owner_tok))
print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
raise SystemExit(0 if ok else 1)
