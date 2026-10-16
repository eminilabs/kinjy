"""Does IleAI behave the way the adapter (and its stand-in) assume?

Run on demand, by hand, with a real key - it is deliberately not named e2e_* or
test_*, so run_all.py never makes it spend anything:

    python backend/tests/contract_ileai.py

It reads ILEAI_API_KEY from .env.ai (or the environment), sends a handful of
sentences it invented itself - never anyone's writing - and prints what came back:
the models on offer, which language codes are accepted, the exact shape of a reply and
of an error, which provider answered, and what the adapter makes of it. About twenty
requests; a test key (emk_test_) is not billed, a live one (emk_live_) is, and the
script says which it found before sending anything.

The key never appears in the output: every line is scrubbed of it before printing.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

BASE = os.environ.get("ILEAI_BASE_URL", "https://api.ileai.io").rstrip("/")


def load_env() -> dict[str, str]:
    env = dict(os.environ)
    path = ROOT / ".env.ai"
    if path.exists():
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                if v:
                    env[k.strip()] = v
    return env


ENV = load_env()
KEY = (ENV.get("ILEAI_API_KEY") or "").strip()


def say(*parts) -> None:
    text = " ".join(str(p) for p in parts)
    if KEY:
        text = text.replace(KEY, "[KEY]")
    text = re.sub(r"emk_(?:test|live)_[A-Za-z0-9_\-]+", "[KEY]", text)
    print(text, flush=True)


def show(obj, limit: int = 600) -> str:
    out = json.dumps(obj, ensure_ascii=False)
    return out if len(out) <= limit else out[:limit] + " ...(cut)"


if not KEY:
    say("SKIPPED: no ILEAI_API_KEY in .env.ai or the environment")
    raise SystemExit(2)

KIND = "emk_test" if KEY.startswith("emk_test_") else "emk_live" if KEY.startswith("emk_live_") else "unknown"
say(f"key kind: {KIND} (length {len(KEY)})")
if KIND != "emk_test" and "--allow-live" not in sys.argv:
    say("STOPPED: this is not a test key and these requests would be billed. Re-run with --allow-live to go on.")
    raise SystemExit(2)

client = httpx.Client(base_url=BASE, timeout=httpx.Timeout(connect=8.0, read=40.0, write=10.0, pool=5.0))
# The key goes in X-API-Key. The prose docs say "Authorization: Bearer", which the service
# reads as a session token and refuses - section 7 re-checks that this is still so.
HEADERS = {"x-api-key": KEY, "Content-Type": "application/json"}
INTERESTING = re.compile(r"rate|limit|remaining|credit|usage|cost|price|request|retry|provider|model|balance", re.I)
requests_made = 0


def call(method: str, path: str, body: dict | None = None, headers: dict | None = None, label: str = ""):
    """One request. Returns (status, json-or-None, response). Retries once on a timeout."""
    global requests_made
    time.sleep(0.4)  # the documented bucket refills at 1 a second; stay well inside it
    for attempt in (1, 2):
        try:
            requests_made += 1
            r = client.request(method, path, json=body, headers=headers if headers is not None else HEADERS)
            break
        except httpx.TimeoutException:
            say(f"  [{label or path}] timed out (attempt {attempt})")
            if attempt == 2:
                return None, None, None
        except httpx.HTTPError as exc:
            say(f"  [{label or path}] transport error: {type(exc).__name__}")
            return None, None, None
    try:
        data = r.json()
    except ValueError:
        data = None
    return r.status_code, data, r


def section(title: str) -> None:
    say(f"\n== {title} ==")


findings: list[str] = []

# ---------------------------------------------------------------------------------
section("0. is the provider behind translation up? (IleAI's own status)")
status, data, _ = call("GET", "/v1/status", label="status")
say(f"GET /v1/status -> {status}")
if isinstance(data, list):
    health = {p.get("provider"): p.get("status") for p in data if isinstance(p, dict)}
    say("  providers:", show(health, 500))
    if health.get("deepl") != "healthy":
        findings.append(f"!! DeepL (the only translation provider) is '{health.get('deepl')}' at IleAI: translations are expected to fail")

# ---------------------------------------------------------------------------------
section("1. the models on offer for translation")
status, data, resp = call("GET", "/v1/models?category=translation", label="models")
say(f"GET /v1/models?category=translation -> {status}")
translation_models: list[dict] = []
if isinstance(data, (dict, list)):
    items = data if isinstance(data, list) else (data.get("models") or data.get("data") or data.get("items") or [])
    say(f"top-level shape: {type(data).__name__}{'' if isinstance(data, list) else ' keys=' + str(sorted(data.keys()))}")
    for m in items if isinstance(items, list) else []:
        if isinstance(m, dict):
            translation_models.append(m)
            say("  model:", show({k: m[k] for k in m if k in ("id", "name", "provider", "category", "languages", "supported_languages", "quality", "price", "input_price", "status") or INTERESTING.search(k)}, 400))
    if not translation_models:
        say("  (no models parsed) raw:", show(data, 500))
else:
    say("  unreadable or unauthorised:", show(data))

# ---------------------------------------------------------------------------------
section("2. the minimal translation, and the exact shape of the answer")
status, data, resp = call("POST", "/v1/translate", {
    "text": ["Hello world"], "target_lang": "FR", "source_lang": "EN", "model": None, "routing_strategy": "auto",
}, label="minimal")
say(f"POST /v1/translate -> {status}")
say("body:", show(data))
if resp is not None:
    say("headers worth knowing:", show({k: v for k, v in resp.headers.items() if INTERESTING.search(k)}))
reply_provider = reply_model = None
if status == 200 and isinstance(data, dict):
    reply_provider, reply_model = data.get("provider"), data.get("model")
    findings.append(f"reply keys: {sorted(data.keys())}; provider={reply_provider!r}; model={reply_model!r}")
    if not isinstance(data.get("translations"), list):
        findings.append("!! 'translations' is not a list")
    usage_like = [k for k in data if INTERESTING.search(k) and k not in ("provider", "model")]
    findings.append(f"usage/cost-like fields in the body: {usage_like or 'none'}")

# ---------------------------------------------------------------------------------
section("3. which language codes it accepts (a phrase of my own, English -> each)")
PHRASE = "The market opens at dawn."
for target in ("EN", "EN-US", "EN-GB", "FR", "AR", "ZH", "ZH-HANS", "SW"):
    source = "FR" if target.startswith("EN") else "EN"
    text = "Le marché ouvre à l'aube." if source == "FR" else PHRASE
    status, data, _ = call("POST", "/v1/translate", {"text": [text], "target_lang": target, "source_lang": source,
                                                      "model": None, "routing_strategy": "auto"}, label=target)
    if status == 200 and isinstance(data, dict):
        out = (data.get("translations") or ["?"])[0]
        out = out.get("text") if isinstance(out, dict) else out
        say(f"  {source}->{target}: 200  {out!r}  (provider={data.get('provider')}, model={data.get('model')})")
    else:
        err = (data or {}).get("error", {}) if isinstance(data, dict) else {}
        say(f"  {source}->{target}: {status}  code={err.get('code')}  message={str(err.get('message'))[:140]!r}")
        findings.append(f"target {target}: {status} {err.get('code')}")

section("4. other source languages, and auto-detection")
for source, target, text in (("SW", "EN", "Soko linafunguliwa alfajiri."), ("AR", "FR", "يفتح السوق عند الفجر."),
                             ("ZH", "EN", "市场黎明开放。"), (None, "FR", PHRASE)):
    status, data, _ = call("POST", "/v1/translate", {"text": [text], "target_lang": target, "source_lang": source,
                                                      "model": None, "routing_strategy": "auto"}, label=f"{source}->{target}")
    if status == 200 and isinstance(data, dict):
        out = (data.get("translations") or ["?"])[0]
        say(f"  {source}->{target}: 200  {out!r}  detected={data.get('detected_source_language')}")
    else:
        err = (data or {}).get("error", {}) if isinstance(data, dict) else {}
        say(f"  {source}->{target}: {status}  code={err.get('code')}  message={str(err.get('message'))[:140]!r}")
        findings.append(f"source {source}: {status} {err.get('code')}")

# ---------------------------------------------------------------------------------
section("5. lines: count in = count out? blank and multi-line items?")
lines = ["Market day", "The mangoes were sweet.", "Come with me if you can."]
status, data, _ = call("POST", "/v1/translate", {"text": lines, "target_lang": "FR", "source_lang": "EN",
                                                  "model": None, "routing_strategy": "auto"}, label="3 lines")
if status == 200 and isinstance(data, dict):
    t = data.get("translations") or []
    say(f"  3 lines in -> {len(t)} out: {show(t, 300)}")
    findings.append(f"line count preserved (3->{len(t)}): {len(t) == 3}")
else:
    say("  ->", status, show(data, 300))
for label, items in (("an empty string", ["One", "", "Three"]), ("a newline inside an item", ["One\nTwo", "Three"])):
    status, data, _ = call("POST", "/v1/translate", {"text": items, "target_lang": "FR", "source_lang": "EN",
                                                      "model": None, "routing_strategy": "auto"}, label=label)
    if status == 200 and isinstance(data, dict):
        t = data.get("translations") or []
        say(f"  {label}: {len(items)} in -> {len(t)} out: {show(t, 200)}")
    else:
        err = (data or {}).get("error", {}) if isinstance(data, dict) else {}
        say(f"  {label}: {status} code={err.get('code')}")

# ---------------------------------------------------------------------------------
section("6. pinning a model (routing_strategy=manual)")
names = [m.get("id") or m.get("name") for m in translation_models if isinstance(m, dict)]
names = [n for n in names if isinstance(n, str)]
pin = reply_model if isinstance(reply_model, str) else (names[0] if names else None)
for candidate in dict.fromkeys([n for n in ([pin] + names) if n]):
    status, data, _ = call("POST", "/v1/translate", {"text": ["Hello"], "target_lang": "FR", "source_lang": "EN",
                                                      "model": candidate, "routing_strategy": "manual"}, label=f"manual {candidate}")
    err = (data or {}).get("error", {}) if isinstance(data, dict) else {}
    say(f"  manual + model={candidate!r}: {status}  provider={(data or {}).get('provider') if status == 200 else err.get('code')}")
status, data, _ = call("POST", "/v1/translate", {"text": ["Hello"], "target_lang": "FR", "source_lang": "EN",
                                                  "model": "no-such-model", "routing_strategy": "manual"}, label="bad model")
err = (data or {}).get("error", {}) if isinstance(data, dict) else {}
say(f"  manual + an invented model: {status}  code={err.get('code')}  keys of error={sorted(err.keys())}")

# ---------------------------------------------------------------------------------
section("7. the error shape, with a deliberately wrong key")
status, data, _ = call("POST", "/v1/translate", {"text": ["Hello"], "target_lang": "FR"},
                       headers={"x-api-key": "emk_test_this_is_not_a_real_key", "Content-Type": "application/json"}, label="wrong key")
say(f"  wrong key -> {status}  {show(data, 300)}")
status, data, _ = call("POST", "/v1/translate", {"text": ["Hello"], "target_lang": "FR"},
                       headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}, label="bearer")
say(f"  the right key as a Bearer token -> {status}  code={(data or {}).get('error', {}).get('code') if isinstance(data, dict) else None}"
    "   (the docs say this should work; 401 invalid_token means it does not)")
status, data, _ = call("POST", "/v1/translate", {"text": ["Hello"], "target_lang": "FR"},
                       headers={"Content-Type": "application/json"}, label="no key")
say(f"  no key    -> {status}  {show(data, 300)}")
status, data, _ = call("POST", "/v1/translate", {"text": "not a list", "target_lang": "FR"}, label="bad body")
say(f"  text as a plain string -> {status}  {show(data, 300)}")

# ---------------------------------------------------------------------------------
section("8. what our adapter makes of the real thing")
try:
    from ai_test_support import ileai_adapter  # noqa: E402

    adapter = ileai_adapter.IleAIAdapter(ENV)
    text = "Market day in Kisumu\n\nThe mangoes were sweet today.\nCome with me if you can."
    result = adapter.run(task="translate", prompt=text, lang="en", target_lang="fr", model="ileai-translate")
    out_lines = result["output"].split("\n")
    say("  output:", show(out_lines, 400))
    say(f"  lines in={len(text.split(chr(10)))} out={len(out_lines)}; blank line kept={out_lines[1] == ''}; model={result['model']!r}; "
        f"tokens (estimated) in/out={result['input_tokens']}/{result['output_tokens']}")
    findings.append(f"adapter end to end: lines kept={len(out_lines) == len(text.split(chr(10)))}")
except Exception as exc:  # the point of this script is to report, not to crash
    say(f"  the adapter FAILED against the real API: {type(exc).__name__}: {exc}")
    findings.append(f"adapter failed: {type(exc).__name__}: {exc}")

say(f"\n== summary ({requests_made} requests) ==")
for f in findings:
    say(" -", f)
