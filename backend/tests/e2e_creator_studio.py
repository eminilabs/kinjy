"""The Creator Studio's engine, against the live API.

A creator hands the engine one piece of writing and gets back the formats it can
really make — and the screen built on it has to be able to trust three things:
that what it is told is available is available, that nothing a creator typed
comes back as markup, and that a translation made by the stand-in AI says so.
"""
import os
import random
import string
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


def publish(tok, **body):
    payload = {"source_text": "My market vlog\nThe mangoes were sweet today.", "source_lang": "en",
               "targets": ["article"], "target_langs": ["en"], **body}
    return c.post("/creators/publish", headers=auth(tok), json=payload)


def job(tok, job_id):
    return c.get(f"/creators/publish/{job_id}", headers=auth(tok))


def finished(tok, job_id, timeout=120):
    """The job once nothing is waiting: a text that needs translating is made on a worker."""
    end = time.time() + timeout
    while True:
        body = job(tok, job_id).json()
        if not any(o["status"] in ("queued", "running") for o in body["outputs"]):
            return body
        if time.time() > end:
            raise TimeoutError(job_id)
        time.sleep(1)


owner_tok, owner = register(35, "cre")
other_tok, other = register(36, "oth")
minor_tok, minor = register(14, "min")
sections = []


def section(title):
    def wrap(fn):
        sections.append((title, fn))
        return fn
    return wrap


S = {}


@section("the screen is told what the engine can make, and why not the rest")
def _():
    r = c.get("/creators/formats", headers=auth(owner_tok))
    check("the formats are listed", r.status_code == 200, r.status_code)
    f = {x["id"]: x for x in r.json()["formats"]}
    check("an article, a newsletter and a translation can be made",
          all(f[k]["available"] for k in ("article", "newsletter", "translation")), f)
    check("video, audio and carousel are offered, or say why they are not",
          all(f[k]["available"] or f[k]["reason"] for k in ("short_video", "long_video", "audio", "carousel")), f)
    check("a format that is offered says what to expect of it",
          all(f[k]["note"] for k in ("short_video", "long_video", "audio", "carousel") if f[k]["available"]), f)
    check("every language the platform supports is offered",
          [x["code"] for x in r.json()["languages"]] == ["en", "sw", "fr", "ar", "zh"], r.json()["languages"])
    check("with a name a person recognises", all(x["name"] and x["native"] for x in r.json()["languages"]))
    check("the size limit is told, not discovered", r.json()["max_source_chars"] == 20000)
    check("and so is whether the AI is the stand-in one", isinstance(r.json()["ai"]["simulated"], bool), r.json()["ai"])
    S["ai_simulated"] = r.json()["ai"]["simulated"]


@section("one piece of writing becomes the formats that can be made")
def _():
    r = publish(owner_tok, targets=["article", "newsletter", "translation"], target_langs=["fr"])
    check("the job is accepted", r.status_code == 202, f"{r.status_code} {r.text[:160]}")
    j = r.json()
    check("the request does not wait for the translation: one output per format and language, all on the way",
          j["outputs"] == 3 and j["ready"] == 0 and j["pending"] == 3 and j["status"] == "running", j)
    S["job"] = j["job_id"]
    body = finished(owner_tok, j["job_id"])
    check("and they all land", [o["status"] for o in body["outputs"]] == ["ready"] * 3 and body["status"] == "done", [o["status"] for o in body["outputs"]])
    by = {o["target"]: o for o in body["outputs"]}
    check("each output has an id to refer to it by", all(isinstance(o["id"], int) for o in body["outputs"]))
    check("the job remembers what it was made from", body["source_text"].startswith("My market vlog") and body["source_lang"] == "en")
    check("a newsletter is the creator's words in an email's shape", by["newsletter"]["text"].startswith("Subject: "), by["newsletter"]["text"][:60])
    check("everything made carries a provenance label", all(o["provenance"] for o in body["outputs"]))
    if S.get("ai_simulated"):
        check("a translation by the stand-in AI is marked simulated", by["translation"]["simulated"] is True, by["translation"])
        check("and so is anything built on one", by["article"]["simulated"] is True and by["newsletter"]["simulated"] is True)
    same = publish(owner_tok, targets=["article", "translation"], target_langs=["en"]).json()
    outs = {o["target"]: o for o in job(owner_tok, same["job_id"]).json()["outputs"]}
    check("a translation into the language it is already in is not made", "translation" not in outs and same["outputs"] == 1, same)
    check("an article in the same language is the creator's own edit of it", outs["article"]["provenance"] == "edited", outs["article"]["provenance"])
    only = publish(owner_tok, targets=["translation"], target_langs=["en"])
    check("asking only for that is refused, and says why", only.status_code == 400 and "other than" in only.text, f"{only.status_code} {only.text[:120]}")
    mixed = publish(owner_tok, targets=["translation"], target_langs=["en", "sw"]).json()
    check("with another language beside it, only that one is made", mixed["outputs"] == 1, mixed)


@section("what a creator types never comes back as markup")
def _():
    hostile = "A title <b>in bold</b>\n<script>alert(1)</script> and <img src=x onerror=alert(2)> more"
    r = publish(owner_tok, source_text=hostile, targets=["article", "newsletter"], target_langs=["en"])
    outs = {o["target"]: o for o in job(owner_tok, r.json()["job_id"]).json()["outputs"]}
    html_out = outs["article"]["content"]
    check("an article is HTML, and nothing inside it is live",
          "<script" not in html_out and "<img" not in html_out and "<b>" not in html_out, html_out)
    check("the characters are escaped, not dropped", "&lt;script&gt;" in html_out, html_out)
    check("the plain text is exactly what was typed",
          outs["article"]["text"] == "A title <b>in bold</b>\n\n<script>alert(1)</script> and <img src=x onerror=alert(2)> more",
          outs["article"]["text"])
    check("a newsletter is text, kept as typed", "<script>alert(1)</script>" in outs["newsletter"]["content"])


@section("the engine is bounded")
def _():
    check("a text over the limit is refused", publish(owner_tok, source_text="x" * 20001).status_code == 422)
    check("the limit itself is fine", publish(owner_tok, source_text="x" * 20000).status_code == 202)
    check("an unknown format is refused", publish(owner_tok, targets=["hologram"]).status_code == 400)
    check("an unsupported language is refused", publish(owner_tok, target_langs=["xx"]).status_code == 400)
    check("no format at all is refused", publish(owner_tok, targets=[]).status_code == 422)
    check("more languages than exist are refused", publish(owner_tok, target_langs=["en", "sw", "fr", "ar", "zh", "en"]).status_code == 422)
    check("no text is refused", publish(owner_tok, source_text="").status_code == 400)
    twice = publish(owner_tok, targets=["article", "article"], target_langs=["en", "en"]).json()
    check("a format or language asked for twice is made once", twice["outputs"] == 1, twice)


@section("a creator sees their own jobs, and only theirs")
def _():
    mine = c.get("/creators/publish", headers=auth(owner_tok)).json()
    check("the jobs are listed, newest first", mine["total"] >= 6 and mine["items"][0]["created_at"] >= mine["items"][1]["created_at"], mine["total"])
    first = next(i for i in mine["items"] if i["job_id"] == S["job"])
    check("each says what it was and what became of it", first["source_snippet"].startswith("My market vlog")
          and first["targets"] == ["article", "newsletter", "translation"] and first["ready"] == 3, first)
    check("another creator sees none of them", c.get("/creators/publish", headers=auth(other_tok)).json()["total"] == 0)
    page = c.get("/creators/publish?limit=2&offset=1", headers=auth(owner_tok)).json()
    check("a page can be asked for", len(page["items"]) == 2 and page["total"] == mine["total"])
    check("a page size beyond the limit is refused", c.get("/creators/publish?limit=500", headers=auth(owner_tok)).status_code == 422)
    check("signed out, there is nothing to list", c.get("/creators/publish").status_code == 401)


@section("a job belongs to whoever made it")
def _():
    check("somebody else cannot read it", job(other_tok, S["job"]).status_code == 404)
    check("nor delete it", c.delete(f"/creators/publish/{S['job']}", headers=auth(other_tok)).status_code == 404)
    check("it is still there", job(owner_tok, S["job"]).status_code == 200)
    before = c.get("/creators/publish", headers=auth(owner_tok)).json()["total"]
    r = c.delete(f"/creators/publish/{S['job']}", headers=auth(owner_tok))
    check("its maker can throw it away", r.status_code == 204, r.status_code)
    check("and it is gone", job(owner_tok, S["job"]).status_code == 404)
    check("from the list too", c.get("/creators/publish", headers=auth(owner_tok)).json()["total"] == before - 1)
    check("deleting it twice is a 404, not an error", c.delete(f"/creators/publish/{S['job']}", headers=auth(owner_tok)).status_code == 404)


@section("an output can go out as a post, with the label it was made under")
def _():
    r = publish(owner_tok, source_text="Harvest notes\nThe rains came early this year.", targets=["article"], target_langs=["en"])
    out = job(owner_tok, r.json()["job_id"]).json()["outputs"][0]
    for attempt in (1, 2):
        post = c.post("/posts", headers=auth(owner_tok), json={
            "body": out["content"], "format": "article", "lang": "en", "provenance": out["provenance"], "visibility": "public",
        })
        if post.status_code != 504:
            break
        # The public gateway's first request to a service that has been idle can stall past its
        # 30 s on this stack, whatever the request is; said out loud, once, not hidden.
        print("  (info) 504 from the gateway on the first try, retrying once")
    check("an article is posted as an article", post.status_code == 201, f"{post.status_code} {post.text[:160]}")
    if post.status_code == 201:
        shown = c.get(f"/posts/{post.json()['id']}", headers=auth(owner_tok)).json()
        check("with the provenance the engine gave it", shown.get("provenance") == "edited", shown.get("provenance"))
        c.delete(f"/posts/{post.json()['id']}", headers=auth(owner_tok))


@section("translation is for confirmed adults, and the screen is told so")
def _():
    adult = c.get("/creators/formats", headers=auth(owner_tok)).json()["translation"]
    check("an adult is told translation is available", adult["available"] is True and adult["reason"] is None, adult)
    kid = c.get("/creators/formats", headers=auth(minor_tok)).json()["translation"]
    check("a minor is told it is not, and why", kid["available"] is False and "under 18" in kid["reason"], kid)
    nobody = c.get("/creators/formats").json()["translation"]
    check("so is a visitor who is not signed in", nobody["available"] is False, nobody)

    r = publish(minor_tok, targets=["article", "newsletter", "translation", "carousel"], target_langs=["en", "fr"])
    check("a minor's request is accepted", r.status_code == 202, f"{r.status_code} {r.text[:160]}")
    body = finished(minor_tok, r.json()["job_id"])
    by = {(o["target"], o["lang"]): o for o in body["outputs"]}
    check("their own language is made as for anyone", by[("article", "en")]["status"] == "ready" and by[("newsletter", "en")]["status"] == "ready", by)
    check("nothing is translated for them, and each gap says why - no invented text",
          all(by[(t, "fr")]["status"] == "unsupported" and "under 18" in by[(t, "fr")]["error"] and by[(t, "fr")]["text"] is None
              for t in ("article", "newsletter", "translation", "carousel")), {k: v["status"] for k, v in by.items()})
    check("so a minor has nothing in French to post", all(by[(t, "fr")]["media"] == [] for t in ("carousel",)))


@section("becoming a creator is for adults")
def _():
    me = c.get("/creators/me", headers=auth(owner_tok)).json()
    check("an adult starts unpaid, and may switch it on", me["monetization_enabled"] is False and me["monetization_allowed"] is True, me)
    check("the screen is told what they keep, who subscribes and their badges",
          me["share_pct"] and me["subscribers"] == 0 and me["badges"] == [], me)
    check("an adult can turn monetization on", c.post("/creators/enable", headers=auth(owner_tok)).status_code == 200)
    check("and it then shows", c.get("/creators/me", headers=auth(owner_tok)).json()["monetization_enabled"] is True)
    kid = c.get("/creators/me", headers=auth(minor_tok)).json()
    check("a minor is told it is not for them, not left to find out", kid["monetization_allowed"] is False and kid["monetization_enabled"] is False, kid)
    check("signed out there is no profile to show", c.get("/creators/me").status_code == 401)
    r = c.post("/creators/enable", headers=auth(minor_tok))
    check("a minor cannot", r.status_code == 403, f"{r.status_code} {r.text[:120]}")
    elig = c.get("/creators/eligibility", headers=auth(minor_tok)).json()
    check("and the screen can be told so before they try", elig["features"].get("monetization") is False, elig)
    r = publish(minor_tok)
    check("the writing tools are not monetization: a minor may still use them", r.status_code == 202, r.status_code)


for title, fn in sections:
    print(f"\n== {title} ==")
    try:
        fn()
    except Exception as exc:  # one broken section must not hide the others
        check("this section ran to the end", False, repr(exc))

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
raise SystemExit(0 if ok else 1)
