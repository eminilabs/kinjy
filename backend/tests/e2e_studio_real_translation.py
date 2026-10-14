"""The Studio with a REAL translation provider behind it, on the live stack.

Everything else in the suite runs against the stand-in AI. This is the one that checks
the label really goes away when the provider is real - and that what comes back is a
translation and not "[fr] ..." - end to end: Studio -> creator-service -> ai-service ->
IleAI -> a language model. It sends two invented sentences, a few times.

It only means something on a stack where ai-service has a live provider, so it exits 2
(skipped) on a plain checkout. To run it: put ILEAI_API_KEY in .env.ai, then start
ai-service with AI_LIVE_ENABLED=true and, while DeepL is down at IleAI,
ILEAI_TRANSLATE_ENGINE=chat and ILEAI_CHAT_MODEL=gpt-5-mini, e.g. with a compose
override file next to docker-compose.yml (see NOT-DONE.md, "AI provider - lot 1").
"""
import os
import random
import string
import time
from datetime import date

import httpx

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
c = httpx.Client(base_url=BASE, timeout=90)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    if not cond:
        ok = False


def tag():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


provs = c.get("/ai/providers").json().get("providers", [])
live = [p for p in provs if p.get("live")]
if not live:
    print("SKIPPED: ai-service has no live provider on this stack (see the docstring to start one)")
    raise SystemExit(2)

d = date.today()
for _ in range(4):
    # A new tag every attempt: a 504 can mean the account was made, and the same email
    # would then be a 409 for the wrong reason.
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"real{t}", "display_name": f"Real {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": date(d.year - 35, d.month, min(d.day, 28)).isoformat(), "country": "US",
    })
    if r.status_code != 504:
        break
    time.sleep(2)
r.raise_for_status()
H = {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}

SOURCE = f"The market opens at dawn {t}\nCome with me if you can."


def publish(targets, langs):
    return c.post("/creators/publish", headers=H, json={
        "source_text": SOURCE, "source_lang": "en", "targets": targets, "target_langs": langs,
    })


def finished(job_id, timeout=240):
    end = time.time() + timeout
    while True:
        body = c.get(f"/creators/publish/{job_id}", headers=H).json()
        if not any(o["status"] in ("queued", "running") for o in body["outputs"]):
            return body
        if time.time() > end:
            raise TimeoutError(job_id)
        time.sleep(1.5)


print("\n== the gateway says a provider is live ==")
names = [p["name"] for p in live]
check("a live provider is listed, and it is not the stand-in", "mock" not in names and names, names)
check("and it declares translation only", all(p["tasks"] == ["translate"] for p in live), live)

print("\n== a translation is made by something real ==")
started = time.time()
resp = publish(["article", "translation", "carousel", "audio"], ["en", "fr"])
check("the job is accepted", resp.status_code == 202, f"{resp.status_code} {resp.text[:200]}")
first_seconds = round(time.time() - started, 1)
body = finished(resp.json()["job_id"])
outs = {(o["target"], o["lang"]): o for o in body["outputs"]}
tr = outs.get(("translation", "fr"), {})
print(f"  (info) the request returned in {first_seconds}s")
check("the French translation is ready", tr.get("status") == "ready", tr)
check("and it is NOT marked simulated", tr.get("simulated") is False, tr)
text = tr.get("text") or ""
check("it is not the stand-in's '[fr] ...' marker", not text.startswith("[fr]"), text)
check("it is not the English text handed back", "opens at dawn" not in text and text.strip() != "", text)
check("one line in, one line out", len(text.split("\n")) == len(SOURCE.split("\n")), repr(text))
check("it carries the label of a machine's work", tr.get("provenance") == "ai_generated", tr.get("provenance"))
print("      |", text.replace("\n", "  //  "))

print("\n== everything built on it is real too ==")
art = outs.get(("article", "fr"), {})
check("the French article is not simulated", art.get("status") == "ready" and art.get("simulated") is False, art)
car = outs.get(("carousel", "fr"), {})
check("a carousel in French is made (it was refused while the translation was the stand-in's)", car.get("status") == "ready" and len(car.get("media", [])) >= 2, car)
aud = outs.get(("audio", "fr"), {})
check("so is the audio in French", aud.get("status") == "ready" and aud.get("media"), aud)
check("the English ones are made as always", outs.get(("carousel", "en"), {}).get("status") == "ready")

print("\n== it can be posted, which a simulated one could not ==")
for attempt in (1, 2):
    post = c.post("/posts", headers=H, json={"body": text, "format": "text", "lang": "fr", "provenance": tr.get("provenance", "ai_generated"), "visibility": "public"})
    if post.status_code != 504:
        break
    # The public gateway's first request to a service that has been idle can stall past its 30 s
    # (seen on this stack, unrelated to translation); said out loud, not hidden.
    print("  (info) 504 from the gateway on the first try, retrying once")
check("the translation is posted", post.status_code == 201, f"{post.status_code} {post.text[:160]}")
if post.status_code == 201:
    c.delete(f"/posts/{post.json()['id']}", headers=H)

print("\n== the second time is kept, not paid for again ==")
started = time.time()
again = publish(["translation"], ["fr"])
second_seconds = round(time.time() - started, 1)
out2 = finished(again.json()["job_id"])["outputs"][0]
check("the same text comes back identical", out2.get("text") == text, out2.get("text"))
check("and quickly (from the cache)", second_seconds < 4, f"{second_seconds}s")
direct = c.post("/ai/translate", headers=H, json={"text": SOURCE, "source_lang": "en", "target_lang": "fr"}).json()
check("ai-service says so, to a signed-in adult", direct.get("cached") is True and direct.get("mock") is False, direct)
visitor = c.post("/ai/translate", json={"text": SOURCE, "source_lang": "en", "target_lang": "fr"}).json()
check("and a visitor is not handed it (the writing of anyone who is not a confirmed adult never meets the provider)",
      visitor.get("mock") is True and visitor.get("withheld") == "account" and visitor.get("cached") is False, visitor)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
raise SystemExit(0 if ok else 1)
