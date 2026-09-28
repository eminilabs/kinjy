"""Comments and notifications, against the live API.

Comments are where adult material most easily reaches a minor, because the post
carrying them can be perfectly ordinary. Notifications are where it reaches
them past every other gate, because a notification quotes: "X replied: <their
first line>" puts the reply on a lock screen.
"""
import random
import string
import sys
import time
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
SOCIAL = "http://localhost:8203"
# Both ports are asserted below before any 404 from them is believed. Getting
# one wrong is not a harmless typo: another service answers 404 to every
# unknown path, so a test expecting a refusal passes without ever reaching the
# service that was supposed to refuse.
MESSAGING = "http://localhost:8207"
c = httpx.Client(base_url=BASE, timeout=30)
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


def register(age):
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"Demo {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"]


def auth(t):
    return {"Authorization": f"Bearer {t}"}


for name, url, expected in (("social", SOCIAL, "social-service"),
                            ("messaging", MESSAGING, "messaging-service")):
    probe = httpx.get(f"{url}/health", timeout=10).json()
    assert probe.get("service") == expected, f"{name} on the wrong port: {probe}"
print("talking to social-service and messaging-service on the right ports")

adult_tok, adult = register(30)
teen_tok, teen = register(14)

print("\n== an ordinary post can carry an unsuitable comment ==")
r = c.post("/posts", headers=auth(adult_tok),
           json={"body": "What is everyone cooking this weekend?", "visibility": "public"})
post_id = r.json().get("id") if r.status_code in (200, 201) else None
check("the post publishes and is general", post_id is not None, r.text[:140])
r = c.get(f"/posts/{post_id}", headers=auth(teen_tok))
check("a 14-year-old can read the post itself", r.status_code == 200, f"{r.status_code}")

r = c.post(f"/posts/{post_id}/comments", headers=auth(adult_tok), json={"body": "Rice and beans"})
plain_comment = r.json().get("id") if r.status_code in (200, 201) else None
check("an ordinary comment publishes", plain_comment is not None, r.text[:140])

r = c.post(f"/posts/{post_id}/comments", headers=auth(adult_tok),
           json={"body": "Full nudes and explicit sex on my onlyfans, link in bio"})
adult_comment = r.json().get("id") if r.status_code in (200, 201) else None
check("an explicit comment publishes for adults", adult_comment is not None, r.text[:140])
time.sleep(0.5)

print("\n== the comment list is age-filtered ==")
r = c.get(f"/posts/{post_id}/comments", headers=auth(teen_tok))
check("the listing answers for a teenager", r.status_code == 200, r.text[:140])
teen_ids = [x["id"] for x in r.json().get("items", [])] if r.status_code == 200 else []
check("the ordinary comment is shown", plain_comment in teen_ids, teen_ids[:4])
check("the explicit comment is not", adult_comment not in teen_ids, teen_ids[:4])

r = c.get(f"/posts/{post_id}/comments", headers=auth(adult_tok))
adult_ids = [x["id"] for x in r.json().get("items", [])] if r.status_code == 200 else []
check("an adult sees both", plain_comment in adult_ids and adult_comment in adult_ids,
      adult_ids[:4])

r = c.get(f"/posts/{post_id}/comments")
anon_ids = [x["id"] for x in r.json().get("items", [])] if r.status_code == 200 else []
check("a signed-out visitor does not see the explicit one", adult_comment not in anon_ids,
      anon_ids[:4])

print("\n== you cannot comment on what you may not read ==")
r = c.post("/posts", headers=auth(adult_tok),
           json={"body": "Full nudes, explicit sex, onlyfans", "visibility": "public"})
adult_post = r.json().get("id") if r.status_code in (200, 201) else None
time.sleep(0.4)
r = c.post(f"/posts/{adult_post}/comments", headers=auth(teen_tok), json={"body": "hello"})
check("a 14-year-old cannot comment on an adult post", r.status_code == 404,
      f"{r.status_code} {r.text[:110]}")
r = c.get(f"/posts/{adult_post}/comments", headers=auth(teen_tok))
check("nor list its comments", r.status_code == 404, f"{r.status_code}")

print("\n== a minor cannot publish prohibited content in a comment ==")
r = c.post(f"/posts/{post_id}/comments", headers=auth(teen_tok),
           json={"body": "here are my nudes, dm me"})
check("publication is refused", r.status_code == 403, f"{r.status_code} {r.text[:120]}")
check("the refusal names no rule",
      "nude" not in r.text.lower() and "sexual" not in r.text.lower(), r.text[:120])

print("\n== notifications do not quote past the gate ==")
r = httpx.post(f"{MESSAGING}/internal/notify", timeout=15, params={
    "user_id": teen["id"], "kind": "comment",
    "title": "Someone replied", "body": "Full nudes and explicit sex, check my onlyfans",
})
check("the notification is accepted", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
check("but its text was replaced", r.json().get("redacted") is True, r.text[:140])

r = c.get("/notifications", headers=auth(teen_tok))
items = r.json().get("items", []) if r.status_code == 200 else []
latest = items[0] if items else {}
check("the stored title is neutral", latest.get("title") == "New activity", latest)
check("the body is gone", bool(latest) and not latest.get("body"), latest)
check("the member still learns something happened", latest.get("kind") == "comment", latest)

print("\n== an adult's notification is untouched ==")
r = httpx.post(f"{MESSAGING}/internal/notify", timeout=15, params={
    "user_id": adult["id"], "kind": "comment",
    "title": "Someone replied", "body": "Full nudes and explicit sex, check my onlyfans",
})
check("nothing is replaced for an adult", r.json().get("redacted") is False, r.text[:140])

print("\n== safety notifications are never redacted ==")
r = httpx.post(f"{MESSAGING}/internal/notify", timeout=15, params={
    "user_id": teen["id"], "kind": "dispute_resolved",
    "title": "Your dispute was resolved",
    "body": "The seller admitted the explicit sex content was not as described.",
})
check("a dispute notification reaches a minor verbatim",
      r.json().get("redacted") is False, r.text[:140])
r = c.get("/notifications", headers=auth(teen_tok))
latest = r.json().get("items", [{}])[0]
check("with its wording intact", "dispute" in (latest.get("title") or "").lower(), latest)

print("\n== an ordinary notification is not touched either ==")
r = httpx.post(f"{MESSAGING}/internal/notify", timeout=15, params={
    "user_id": teen["id"], "kind": "comment",
    "title": "Someone replied", "body": "See you at the market on Saturday",
})
check("harmless text survives", r.json().get("redacted") is False, r.text[:140])

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
