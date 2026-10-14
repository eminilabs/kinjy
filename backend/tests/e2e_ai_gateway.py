"""The AI gateway on the live stack: what a client is told, and what is cached.

With no provider configured everything is the stand-in, and the stand-in's output
must say so every time and must never be kept as if it were an answer. This is the
state of a fresh checkout; it is also the state the Studio's "Simulated" label
depends on.
"""
import os
import random
import string

import httpx

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
c = httpx.Client(base_url=BASE, timeout=30)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    if not cond:
        ok = False


def tag():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=10))


r = c.get("/ai/providers")
body = r.json() if r.status_code == 200 else {"providers": []}
providers = {p["name"]: p for p in body["providers"]}
live = [n for n, p in providers.items() if p.get("live")]
if live:
    # The wrong environment, not a failure: the checks below are about the stand-in.
    print(f"SKIPPED: this stack has a live provider ({', '.join(live)}); the stand-in's cache rules do not apply")
    raise SystemExit(2)

print("\n== what the gateway says it is ==")
check("the providers are listed", r.status_code == 200, r.status_code)
check("the stand-in is there and says it is not live", providers.get("mock", {}).get("live") is False, providers)
check("no provider description carries anything key-shaped",
      not any(("key" in k.lower() and k != "tasks") for p in body["providers"] for k in p), body["providers"])

print("\n== the stand-in's answers are labelled, and never kept ==")
text = f"A sentence nobody has translated before {tag()}"
payload = {"text": text, "source_lang": "en", "target_lang": "fr"}
first = c.post("/ai/translate", json=payload).json()
second = c.post("/ai/translate", json=payload).json()
check("a translation by the stand-in says it is one", first.get("mock") is True and first.get("provider") == "mock", first)
check("and so does the second, not served from a cache", second.get("mock") is True and second.get("cached") is False, second)
check("the stand-in marks the text instead of translating it", first["translated"] == f"[fr] {text}", first["translated"])

print("\n== other tasks are unchanged ==")
mod = c.post("/ai/run", json={"task": "moderate", "prompt": "hello there"}).json()
check("moderation is the stand-in's, labelled", mod.get("mock") is True and mod.get("output") == "allow", mod)
summary = c.post("/ai/run", json={"task": "summarize", "prompt": "First sentence. Second sentence."}).json()
check("so is a summary", summary.get("mock") is True and summary["output"] == "First sentence.", summary)
check("an unknown task is refused", c.post("/ai/run", json={"task": "levitate", "prompt": "x"}).status_code == 503)
check("an unsupported language is refused", c.post("/ai/translate", json={"text": "x", "target_lang": "xx"}).status_code == 400)
same = c.post("/ai/translate", json={"text": "hello", "source_lang": "en", "target_lang": "en"}).json()
check("translating into the language it is in is a no-op", same.get("noop") is True and same["translated"] == "hello", same)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
raise SystemExit(0 if ok else 1)
