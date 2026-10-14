"""The translation rules, end to end, against a stand-in for IleAI - no key, no money.

What it checks, on the live stack with ai-service pointed at tests/fake_ileai.py (see
compose.fake-ileai.yml for how): that only a confirmed adult's writing reaches the provider,
that the daily allowance holds and is per member, that the cache is shared, that a public
route cannot be used to get round any of it, that the Studio pays once for an article, a
newsletter and a translation of the same text, and that a provider's failures reach the
creator in plain words - never with a key or somebody's writing in them.

Exits 2 (skipped) on a stack that is not set up that way.
"""
import os
import random
import string
import sys
import time
from datetime import date
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fake_ileai import DEFAULT_KEY, FakeIleAI  # noqa: E402

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
AI_DIRECT = os.environ.get("KINJY_AI_DIRECT", "http://localhost:8212")
c = httpx.Client(base_url=BASE, timeout=90)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    if not cond:
        ok = False


def tag():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def retrying(call, attempts=3):
    """The first request to a service that has been idle can stall past the gateway's 30 s on this stack."""
    r = None
    for _ in range(attempts):
        try:
            r = call()
        except httpx.TimeoutException:
            continue
        if r.status_code != 504:
            return r
    return r


def register(age, name):
    for _ in range(4):
        t = tag()
        try:
            r = c.post("/auth/register", json={
                "email": f"{t}@example.com", "handle": f"{name}{t}", "display_name": f"Rules {name} {t}",
                "password": "Sup3rStrong!Pass", "date_of_birth": date(date.today().year - age, 6, 15).isoformat(), "country": "US",
            })
        except httpx.TimeoutException:
            continue
        if r.status_code != 504:
            break
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}, r.json()["user"]["id"]


def finished(h, job_id, timeout=240):
    end = time.time() + timeout
    while True:
        body = c.get(f"/creators/publish/{job_id}", headers=h).json()
        if not any(o["status"] in ("queued", "running") for o in body["outputs"]):
            return body
        if time.time() > end:
            raise TimeoutError(job_id)
        time.sleep(1)


def translate(text, h=None, target="fr"):
    return retrying(lambda: c.post("/ai/translate", headers=h or {}, json={"text": text, "source_lang": "en", "target_lang": target}))


# --- is the stack set up for this? -------------------------------------------------------------
providers = c.get("/ai/providers").json().get("providers", [])
if not any(p.get("live") for p in providers):
    print("SKIPPED: ai-service has no live provider (see backend/tests/compose.fake-ileai.yml)")
    raise SystemExit(2)

fake = FakeIleAI(DEFAULT_KEY, "0.0.0.0", 8799)
fake.start()
adult, adult_id = register(35, "adu")
other_adult, _ = register(40, "adb")
teen, teen_id = register(14, "teen")

canary = f"canary sentence {tag()}"
got = translate(canary, adult)
if fake.calls != 1:
    print(f"STOPPED: the canary did not reach the stand-in (it reached it {fake.calls} times). Is ai-service started with "
          "compose.fake-ileai.yml? Refusing to go on, so that nothing real is ever sent by this test.")
    raise SystemExit(1)

print("\n== the gateway says what is live ==")
live = [p for p in providers if p.get("live")]
check("the provider is live and does translation only", [p["tasks"] for p in live] == [["translate"]], live)

print("\n== a real translation reaches the provider as the provider expects it ==")
fake.reset()
text = f"The market opens at dawn {tag()}"
r = translate(text, adult)
body = r.json()
check("an adult gets the provider's translation, not the stand-in's", r.status_code == 200 and body["mock"] is False and body["translated"] == f"{text} (FR)", body)
sent = fake.requests[0]
check("one call, to the translation endpoint, with the key in X-API-Key and nowhere else",
      fake.calls == 1 and sent["path"] == "/v1/translate" and sent["headers"].get("x-api-key") == DEFAULT_KEY
      and "authorization" not in sent["headers"] and DEFAULT_KEY.encode() not in sent["raw"], sent["path"])
check("with the text as a list of lines and the language in the provider's code",
      sent["body"]["text"] == [text] and sent["body"]["target_lang"] == "FR" and sent["body"]["source_lang"] == "EN", sent["body"])
again = translate(text, other_adult).json()
check("the same text asked again, by someone else, is served from the cache: no second call",
      again["cached"] is True and again["mock"] is False and fake.calls == 1, (again, fake.calls))

print("\n== only a confirmed adult's writing is ever sent ==")
fake.reset()
for who, headers in (("a visitor who is not signed in", {}), ("a 14-year-old", teen)):
    got = translate(f"Something written by {who} {tag()}", headers).json()
    check(f"{who}: the stand-in answers, flagged as withheld", got["mock"] is True and got.get("withheld") == "account" and got["translated"].startswith("[fr]"), got)
check("and nothing was sent to the provider for either", fake.calls == 0, fake.calls)
cached = translate(text, teen).json()
check("a teenager is not handed an adult's cached translation either", cached["mock"] is True and cached.get("withheld") == "account", cached)
run = c.post("/ai/run", json={"task": "translate", "prompt": "Hello", "target_lang": "fr"})
check("the generic route cannot be used to get round all this: a task a real provider serves is refused there",
      run.status_code == 400 and "/ai/translate" in run.text and fake.calls == 0, f"{run.status_code} {run.text[:120]}")
direct = httpx.post(f"{AI_DIRECT}/internal/translate", timeout=30, json={"text": f"Direct for a teen {tag()}", "source_lang": "en", "target_lang": "fr", "user_id": teen_id}).json()
check("nor the internal route: it applies the rule to the member it is told about", direct["mock"] is True and direct.get("withheld") == "account" and fake.calls == 0, direct)

print("\n== AI credits, by plan (a credit is 100 characters here; Free has 4, Basic 40) ==")
fake.reset()
chunk = lambda: "word " * 30 + tag()  # about 158 characters
def credits(h):
    return retrying(lambda: c.get("/ai/credits", headers=h)).json()
before = credits(other_adult)
check("a new member is on the Free plan with its credits all to spend",
      before["plan"] == "free" and before["credits"] == 4 and before["left"] == 4 and before["used"] == 0 and before["spendable"] is True, before)
statuses = [translate(chunk(), other_adult).status_code for _ in range(3)]
check("two texts go through, the third is refused", statuses == [200, 200, 429], statuses)
refused = translate(chunk(), other_adult)
check("and says what it needs, what is left, which plan, and when it renews",
      refused.status_code == 429 and "AI credits" in refused.text and "Free plan" in refused.text and "renew" in refused.text
      and "Basic and Premium include more" in refused.text, refused.text[:220])
check("the provider was asked twice, not three times", fake.calls == 2, fake.calls)
after = credits(other_adult)
check("the readout adds up: used and left make the total", after["used"] + after["left"] == after["credits"] and after["left"] == 0, after)
fresh = translate(chunk(), adult)
check("another member's credits are their own", fresh.status_code == 200 and fresh.json()["mock"] is False, fresh.text[:120])

paying, _ = register(33, "bas")
subscribed = retrying(lambda: c.post("/subscriptions", headers=paying, json={"target_id": "platform", "tier": "basic", "period": "monthly"}))
check("a member can record a Basic plan", subscribed.status_code == 201, f"{subscribed.status_code} {subscribed.text[:120]}")
now = credits(paying)
check("and the plan counts here (this stack is set to believe subscriptions): 40 credits", now["plan"] == "basic" and now["credits"] == 40 and now["plan_counted"] is True, now)
fake.reset()
bigger = [translate(chunk(), paying).status_code for _ in range(5)]
check("so five texts that would have exhausted a Free member all go through", bigger == [200] * 5 and fake.calls == 5, (bigger, fake.calls))
cancelled = retrying(lambda: c.get("/subscriptions/me", headers=paying)).json()["items"]
retrying(lambda: c.delete(f"/subscriptions/{cancelled[0]['id']}", headers=paying))
time.sleep(6)  # the plan is remembered for a few seconds
check("a cancelled plan still counts until the end of the period that was paid for", credits(paying)["plan"] == "basic", credits(paying))

print("\n== the Studio: three outputs, one provider call ==")
fake.reset()
source = f"Harvest notes {tag()}\nThe rains came early this year."
started = time.time()
resp = retrying(lambda: c.post("/creators/publish", headers=adult, json={
    "source_text": source, "source_lang": "en", "targets": ["article", "newsletter", "translation"], "target_langs": ["sw"]}))
check("the request returns at once, with the three outputs on the way", resp.status_code == 202 and resp.json()["pending"] == 3 and time.time() - started < 15, (resp.status_code, round(time.time() - started, 1)))
done = finished(adult, resp.json()["job_id"])
check("all three are made, and none is marked simulated", [o["status"] for o in done["outputs"]] == ["ready"] * 3 and not any(o["simulated"] for o in done["outputs"]), [(o["target"], o["status"]) for o in done["outputs"]])
check("for ONE call to the provider, not three", fake.calls == 1, fake.calls)
check("the provider got both lines, as two entries", fake.requests[0]["body"]["text"] == source.split("\n"), fake.requests[0]["body"]["text"])

print("\n== a minor in the Studio ==")
fake.reset()
resp = retrying(lambda: c.post("/creators/publish", headers=teen, json={
    "source_text": f"A teenager's note {tag()}", "source_lang": "en", "targets": ["article", "translation"], "target_langs": ["en", "fr"]}))
done = finished(teen, resp.json()["job_id"])
by = {(o["target"], o["lang"]): o for o in done["outputs"]}
check("their own language is made, the French is an honest gap",
      by[("article", "en")]["status"] == "ready" and by[("article", "fr")]["status"] == "unsupported" and by[("translation", "fr")]["status"] == "unsupported", {k: v["status"] for k, v in by.items()})
check("and nothing was sent to the provider", fake.calls == 0, fake.calls)

print("\n== when the provider fails, the creator is told in plain words ==")
secret = "my grandmother's recipe"
for marker, expect, label in (("__t402__", "no credit left", "no credit"), ("__t503__", "unavailable", "an outage")):
    fake.reset()
    resp = retrying(lambda: c.post("/creators/publish", headers=adult, json={
        "source_text": f"{secret} {marker} {tag()}", "source_lang": "en", "targets": ["translation"], "target_langs": ["fr"]}))
    out = finished(adult, resp.json()["job_id"])["outputs"][0]
    check(f"{label}: a failed output that says why", out["status"] == "failed" and expect in (out["error"] or ""), out)
    check(f"{label}: neither the key nor the writing is in what the creator is shown",
          DEFAULT_KEY not in (out["error"] or "") and secret not in (out["error"] or "") and "x-api-key" not in (out["error"] or "").lower(), out["error"])

print("\n== a French carousel is made now that the translation is real ==")
resp = retrying(lambda: c.post("/creators/publish", headers=adult, json={
    "source_text": f"Market day {tag()}\nCome with me.", "source_lang": "en", "targets": ["carousel"], "target_langs": ["fr"]}))
out = finished(adult, resp.json()["job_id"])["outputs"][0]
check("it is ready, with its slides", out["status"] == "ready" and len(out["media"]) == 2, out)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
raise SystemExit(0 if ok else 1)
