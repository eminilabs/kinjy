"""The Creator Studio's media pipeline, against the live API.

A carousel, a narration and a video are files, made in the background by
creator-service and kept by media-service. What this checks is the part that is
easy to get wrong while every status says "ready":

* that the bytes really are a PNG, an MP3 and an MP4 of the size and length the
  engine claims - read from the files, not from the engine's own answer;
* that nothing is served without the ticket minted for its owner;
* that a limit refuses instead of cutting the text short;
* that a language the voice or the fonts cannot do is said, not faked;
* that deleting a job takes its files, and never a file a post is showing.

Exit 2 when the running creator-service has no rendering tools (an image built
without MEDIA_TOOLS=1): that is the wrong environment, not a failure.
"""
import os
import random
import string
import struct
import time
from datetime import date

import httpx

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
c = httpx.Client(base_url=BASE, timeout=60)
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


def register(age, name="u"):
    last = None
    for _ in range(4):
        # A new tag every attempt: a 504 or a timeout can mean the account was made, and asking
        # again with the same email would then be a 409 for the wrong reason. (The first request
        # to a service that has been idle for a while can take 30 s or more on this stack.)
        t = tag()
        try:
            last = c.post("/auth/register", json={
                "email": f"{t}@example.com", "handle": f"{name}{t}", "display_name": f"Studio {name} {t}",
                "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
            })
        except httpx.TimeoutException:
            last = None
            continue
        if last.status_code != 504:
            break
        time.sleep(2)
    last.raise_for_status()
    d = last.json()
    return d["tokens"]["access_token"], d["user"]


def auth(t):
    return {"Authorization": f"Bearer {t}"} if t else {}


def publish(tok, text, targets, langs=None, source_lang="en"):
    return c.post("/creators/publish", headers=auth(tok), json={
        "source_text": text, "source_lang": source_lang, "targets": targets, "target_langs": langs or [source_lang],
    })


def job(tok, job_id):
    return c.get(f"/creators/publish/{job_id}", headers=auth(tok))


def finished(tok, job_id, timeout=300):
    """The job, once no render is waiting."""
    deadline = time.time() + timeout
    while True:
        body = job(tok, job_id).json()
        if not any(o["status"] in ("queued", "running") for o in body["outputs"]):
            return body
        if time.time() > deadline:
            raise TimeoutError(f"job {job_id} still rendering after {timeout}s: {[o['status'] for o in body['outputs']]}")
        time.sleep(1.5)


def one(tok, text, target, lang="en"):
    """Render one target in one language and return its output."""
    r = publish(tok, text, [target], [lang], source_lang=lang)
    assert r.status_code == 202, f"{r.status_code} {r.text[:200]}"
    return finished(tok, r.json()["job_id"])["outputs"][0], r.json()["job_id"]


def png_size(data):
    return struct.unpack(">II", data[16:24])


def mp4_seconds(data):
    """Duration from the movie header - what a player would read, not what the engine says."""
    at = data.find(b"mvhd")
    if at < 0:
        return None
    version = data[at + 4]
    if version == 0:
        timescale, duration = struct.unpack(">II", data[at + 16:at + 24])
    else:
        timescale, duration = struct.unpack(">IQ", data[at + 24:at + 36])
    return duration / timescale


def fetch(m, **kw):
    return c.get(m["url"], **kw)


NEWS = (
    "Market day in Kisumu\n"
    "The mangoes were sweet today and the fish came in before sunrise.\n"
    "A woman at the third stall taught me how to pick a ripe one by the smell near the stem.\n"
    "I will go back on Saturday with a bigger bag.\n"
    "Come with me if you can."
)

owner_tok, owner = register(35, "med")
other_tok, other = register(36, "oth")
sections = []


def section(title):
    def wrap(fn):
        sections.append((title, fn))
        return fn
    return wrap


S = {}

formats = c.get("/creators/formats", headers=auth(owner_tok)).json()
fmt = {x["id"]: x for x in formats["formats"]}
missing = [k for k in ("carousel", "audio", "short_video", "long_video") if not fmt[k]["available"]]
S["ai_simulated"] = formats["ai"]["simulated"]
if missing:
    # The wrong environment, not a broken pipeline - but what the server says in
    # its place still has to be true: a reason, not a spinner. The first line
    # printed is what run_all shows as the reason for the skip.
    print(f"SKIPPED: this creator-service cannot render {missing}: {fmt[missing[0]]['reason']}")
    r = publish(owner_tok, NEWS, missing)
    out = {o["target"]: o for o in job(owner_tok, r.json()["job_id"]).json()["outputs"]}
    check("what it cannot make is said, with a reason, not left spinning",
          all(out[k]["status"] == "unsupported" and out[k]["error"] for k in missing), out)
    raise SystemExit(1 if not ok else 2)


@section("a carousel is a PNG per slide, and each can be fetched")
def _():
    r = publish(owner_tok, NEWS, ["carousel"])
    check("the job is accepted and the render is pending, not pretended", r.status_code == 202
          and r.json()["pending"] == 1 and r.json()["ready"] == 0, r.json())
    body = finished(owner_tok, r.json()["job_id"])
    out = body["outputs"][0]
    S["carousel_job"], S["carousel"] = r.json()["job_id"], out
    check("it is ready", out["status"] == "ready", out)
    check("one slide per line the creator wrote", len(out["media"]) == 5, len(out["media"]))
    check("the job is done once nothing is waiting", body["status"] == "done", body["status"])
    listed = next(i for i in c.get("/creators/publish", headers=auth(owner_tok)).json()["items"] if i["job_id"] == r.json()["job_id"])
    check("the history says it is made, with nothing still on the way", listed["ready"] == 1 and listed["pending"] == 0, listed)
    check("an edit of the creator's words is labelled edited", out["provenance"] == "edited", out["provenance"])
    check("the words are kept for the post that goes with it", out["text"].startswith("Market day in Kisumu"), out["text"][:40])
    sizes = set()
    for i, m in enumerate(out["media"]):
        got = fetch(m)
        check(f"slide {i + 1} is served", got.status_code == 200 and got.headers["content-type"].startswith("image/png"),
              f"{got.status_code} {got.headers.get('content-type')}")
        check(f"slide {i + 1} is really a PNG", got.content[:8] == b"\x89PNG\r\n\x1a\n")
        if got.content[:8] == b"\x89PNG\r\n\x1a\n":
            sizes.add(png_size(got.content))
    check("every slide is the same 1080x1350", sizes == {(1080, 1350)}, sizes)
    check("each slide carries its words as alt text", out["media"][0]["alt"] == "Market day in Kisumu", out["media"][0]["alt"])


@section("a file is served only against the ticket minted for its owner")
def _():
    m = S["carousel"]["media"][0]
    bare = m["url"].split("?")[0]
    check("no ticket, no file", c.get(bare).status_code == 404)
    forged = m["url"][:-3] + ("aaa" if not m["url"].endswith("aaa") else "bbb")
    check("a forged ticket is refused", c.get(forged).status_code == 404)
    other = c.get(m["url"], headers=auth(other_tok))
    check("somebody else's login does not open it", other.status_code == 404, f"status {other.status_code}")
    mine = c.get(m["url"], headers=auth(owner_tok))
    check("the owner's does", mine.status_code == 200, f"status {mine.status_code}")
    check("another creator cannot read the job that made it", job(other_tok, S["carousel_job"]).status_code == 404)


@section("audio is read aloud, and is an MP3 of the length it claims")
def _():
    out, jid = one(owner_tok, NEWS, "audio")
    S["audio_job"] = jid
    check("it is ready", out["status"] == "ready", out)
    check("a synthetic voice is labelled as a machine's output", out["provenance"] == "ai_generated", out["provenance"])
    m = out["media"][0]
    got = fetch(m)
    check("the file is served as audio", got.status_code == 200 and got.headers["content-type"].startswith("audio/mpeg"),
          f"{got.status_code} {got.headers.get('content-type')}")
    data = got.content
    check("and is really an MP3", data[:3] == b"ID3" or (data[0] == 0xFF and data[1] & 0xE0 == 0xE0), data[:4])
    # 64 kbit/s mono: eight kilobytes a second. The size says how long it really runs.
    measured = len(data) / 8000
    check("it is as long as the engine says it is", out["media"][0]["seconds"] is not None
          and abs(measured - m["seconds"]) < max(2.0, m["seconds"] * 0.15), (measured, m["seconds"]))
    check("and long enough to have read the text", m["seconds"] > 10, m["seconds"])


@section("a short video is vertical, a long one landscape, and each runs as long as it says")
def _():
    for target, size, limit in (("short_video", (720, 1280), 90), ("long_video", (1280, 720), 600)):
        out, jid = one(owner_tok, NEWS, target)
        S[target] = (out, jid)
        check(f"{target}: it is ready", out["status"] == "ready", out)
        check(f"{target}: labelled as a machine's voice", out["provenance"] == "ai_generated")
        m = out["media"][0]
        check(f"{target}: it says its size", (m["width"], m["height"]) == size, (m["width"], m["height"]))
        got = fetch(m)
        check(f"{target}: served as video", got.status_code == 200 and got.headers["content-type"].startswith("video/mp4"),
              f"{got.status_code} {got.headers.get('content-type')}")
        check(f"{target}: really an MP4", got.content[4:8] == b"ftyp", got.content[:12])
        seconds = mp4_seconds(got.content)
        check(f"{target}: the file's own header agrees with the engine on its length",
              seconds is not None and abs(seconds - m["seconds"]) < 1.5, (seconds, m["seconds"]))
        check(f"{target}: within what the format holds", 5 < m["seconds"] <= limit, m["seconds"])
        check(f"{target}: not a trivially small file", len(got.content) > 20_000, len(got.content))


@section("a limit refuses, it does not cut the text short")
def _():
    # ~13 characters read per second: 1,800 of them is over the 90 s a short holds.
    long_text = "A long day at the market.\n" + "\n".join(
        "The traders called out their prices and the children ran between the stalls." for _ in range(24)
    )
    out, _jid = one(owner_tok, long_text, "short_video")
    check("a text too long for a short video fails, and says what to do", out["status"] == "failed"
          and "holds up to" in out["error"] and "long video" in out["error"], out)
    out, _jid = one(owner_tok, long_text, "long_video")
    check("the long video takes the same text", out["status"] == "ready", out)
    many = "Title\n" + "\n".join(f"Point number {n}" for n in range(1, 26))
    out, _jid = one(owner_tok, many, "carousel")
    check("a carousel of more than 20 slides is refused with the count", out["status"] == "failed"
          and "26 slides" in out["error"] and "20" in out["error"], out)
    one_line, _jid = one(owner_tok, "Just a headline", "carousel")
    check("a single line is a one-slide carousel", one_line["status"] == "ready" and len(one_line["media"]) == 1, one_line)
    r = publish(owner_tok, NEWS, ["carousel", "audio", "short_video", "long_video"], ["en", "sw", "fr", "ar", "zh"])
    check("a request for more renders than a creator may have at once is refused up front",
          r.status_code == 429 and "at a time" in r.text, f"{r.status_code} {r.text[:160]}")


@section("each language gets its own letters and its own voice")
def _():
    texts = {
        "fr": "Bonjour à tous\nCeci est un petit essai de la voix française.",
        "sw": "Habari za asubuhi\nHuu ni mtihani mdogo wa sauti ya Kiswahili.",
        "ar": "مرحبا بكم جميعا\nهذا اختبار صغير للصوت العربي والنص العربي.",
        "zh": "大家好\n这是一个中文语音和文字的小测试。",
    }
    for lang, text in texts.items():
        slides, _j = one(owner_tok, text, "carousel", lang)
        check(f"{lang}: the slides are drawn", slides["status"] == "ready" and len(slides["media"]) == 2, slides)
        voice, _j = one(owner_tok, text, "audio", lang)
        check(f"{lang}: the voice reads it", voice["status"] == "ready" and voice["media"][0]["seconds"] > 2, voice)
    if S["ai_simulated"]:
        r = publish(owner_tok, NEWS, ["carousel", "audio"], ["en", "fr"])
        outs = finished(owner_tok, r.json()["job_id"])["outputs"]
        fr = [o for o in outs if o["lang"] == "fr"]
        check("a translation by the stand-in AI is not read aloud or drawn", all(o["status"] == "unsupported" for o in fr)
              and all("real translation" in o["error"] for o in fr), fr)
        check("while the original language is made as normal", all(o["status"] == "ready" for o in outs if o["lang"] == "en"))


@section("whatever is typed, a slide is drawn and nothing breaks")
def _():
    hostile = "<script>alert(1)</script> & <b>bold</b>\n" + "x" * 400 + "\n😀😀😀\nhttps://example.com/" + "a" * 300
    out, _j = one(owner_tok, hostile, "carousel")
    check("markup, a 400-character word, emoji and a very long address all become slides",
          out["status"] == "ready" and len(out["media"]) >= 4, out)
    check("the words are kept exactly as typed", "<script>alert(1)</script>" in out["text"], out["text"][:60])
    out, _j = one(owner_tok, "😀😀😀\nhttps://example.com", "audio")
    check("a text with nothing to say aloud is refused, not recorded as silence",
          out["status"] == "failed" and "nothing to read aloud" in out["error"], out)


@section("a render becomes a post the way any upload does")
def _():
    out = S["carousel"]
    media = [{"media_id": m["id"], "url": m["url"], "kind": m["kind"], "alt_text": m["alt"],
              "width": m["width"], "height": m["height"]} for m in out["media"]]
    r = c.post("/posts", headers=auth(owner_tok), json={
        "body": "Market day", "format": "carousel", "lang": "en", "visibility": "public",
        "provenance": out["provenance"], "media": media,
    })
    check("a carousel is posted with its slides", r.status_code == 201, f"{r.status_code} {r.text[:200]}")
    S["post"] = r.json().get("id")
    if r.status_code == 201:
        shown = c.get(f"/posts/{S['post']}", headers=auth(owner_tok)).json()
        check("as a carousel, in order, with the label it was made under", shown["format"] == "carousel"
              and len(shown["media"]) == 5 and shown["provenance"] == "edited", shown.get("format"))
    stolen = c.post("/posts", headers=auth(other_tok), json={"body": "mine now", "format": "carousel", "media": media})
    check("somebody else cannot post a creator's render as their own", stolen.status_code == 400, f"{stolen.status_code} {stolen.text[:120]}")
    video, _jid = S["short_video"]
    v = video["media"][0]
    r = c.post("/posts", headers=auth(owner_tok), json={
        "body": "", "format": "short", "lang": "en", "visibility": "public", "provenance": video["provenance"],
        "media": [{"media_id": v["id"], "url": v["url"], "kind": v["kind"], "width": v["width"],
                   "height": v["height"], "duration_seconds": v["seconds"]}],
    })
    check("a short video is posted as a Short, with no caption needed", r.status_code == 201, f"{r.status_code} {r.text[:200]}")
    S["short_post"] = r.json().get("id")


@section("deleting a job takes its files, and never one a post is showing")
def _():
    # The audio was never posted; the carousel and the short video were.
    audio = finished(owner_tok, S["audio_job"])["outputs"][0]["media"][0]
    check("before: the narration is there", fetch(audio).status_code == 200)
    check("the job is deleted", c.delete(f"/creators/publish/{S['audio_job']}", headers=auth(owner_tok)).status_code == 204)
    check("after: its file is gone, even to a ticket that has not expired", fetch(audio).status_code == 404)

    slide = S["carousel"]["media"][0]
    check("the carousel's job is deleted", c.delete(f"/creators/publish/{S['carousel_job']}", headers=auth(owner_tok)).status_code == 204)
    check("its slides stay: a post is showing them", fetch(slide).status_code == 200)
    if S.get("post"):
        shown = c.get(f"/posts/{S['post']}", headers=auth(owner_tok))
        check("and the post still has all five", shown.status_code == 200 and len(shown.json()["media"]) == 5, shown.status_code)
        c.delete(f"/posts/{S['post']}", headers=auth(owner_tok))
    if S.get("short_post"):
        c.delete(f"/posts/{S['short_post']}", headers=auth(owner_tok))


for title, fn in sections:
    print(f"\n== {title} ==")
    try:
        fn()
    except Exception as exc:  # one broken section must not hide the others
        check("this section ran to the end", False, repr(exc))

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
raise SystemExit(0 if ok else 1)
