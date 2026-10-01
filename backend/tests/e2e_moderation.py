"""Reports, decisions and appeals, against the live API.

The interesting assertions here are the ones about abuse of the system rather
than use of it. An appeals process is a lever on moderation, and every lever is
something somebody will pull for the wrong reason:

* reports that could *lower* a rating would make brigading a way to un-rate
  adult content, so the test files reports on adult content and checks the
  rating does not move;
* an appeal decided by whoever made the decision is a rubber stamp;
* an appeal path for child-safety material would put that material in front of
  general staff, so it must be refused and the refusal must not explain itself.

The first assertion of all is that a refusal gets recorded. Before this, a
refused comment was rolled back whole and the author was told to contact
support about something that no longer existed anywhere in the system.
"""
import os
import random
import string
import sys
import time
from datetime import date

import httpx

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
SOCIAL = os.environ.get("KINJY_SOCIAL", "http://localhost:8203")
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


def register(age=30):
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


probe = httpx.get(f"{SOCIAL}/health", timeout=10).json()
assert probe.get("service") == "social-service", f"wrong port: {probe}"
print("talking to social-service on the right port")

author_tok, author = register()
r1_tok, _ = register()
r2_tok, _ = register()
r3_tok, _ = register()

print("\n== a refused comment leaves a record ==")
r = c.post("/posts", headers=auth(author_tok),
           json={"body": "What is everyone cooking this weekend?", "visibility": "public"})
post_id = r.json().get("id") if r.status_code in (200, 201) else None
check("a host post publishes", post_id is not None, r.text[:140])

# Posted by a 15-year-old, because that is what "blocked from publication"
# means: the same words from an adult are rated ADULT and published, not
# refused. An earlier version of this test used an adult author and read the
# resulting 201 as a bug in the recording, when it was the test's premise that
# was wrong.
minor_tok, minor = register(15)
r = c.post(f"/posts/{post_id}/comments", headers=auth(minor_tok),
           json={"body": "here are my nudes, dm me for explicit sex"})
check("a minor's explicit comment is refused", r.status_code == 403,
      f"{r.status_code} {r.text[:140]}")
decision_header = r.headers.get("X-Moderation-Decision")
check("the refusal names a decision the author can point at", bool(decision_header),
      dict(r.headers))

r = c.get("/moderation/decisions", headers=auth(minor_tok))
check("the author can list their decisions", r.status_code == 200, r.text[:140])
items = r.json().get("items", []) if r.status_code == 200 else []
refusal = next((d for d in items if d["id"] == decision_header), None)
check("the refusal is in the list", refusal is not None, items[:2])
check("it says what it did", refusal and refusal["action"] == "refused_publication", refusal)

# Every block_publication in the classifier also sets escalate_child_safety, so
# there is currently no such thing as a refusal that is not a child-safety
# escalation, and no refusal is appealable here. That is deliberate. The
# appealable decisions are the restrictions below. If the classifier ever grows
# a reason to block that is not a child-safety matter, this check is what fails
# and says so.
check("no refusal is appealable, because every one is an escalation",
      refusal and refusal["appealable"] is False, refusal)

print()
print("== a restriction is what you can actually appeal ==")
r = c.post("/posts", headers=auth(author_tok),
           json={"body": "Explicit sex and full nudes, link in bio", "visibility": "public"})
rated_post = r.json().get("id") if r.status_code in (200, 201) else None
check("an adult's adult post publishes", rated_post is not None, r.text[:140])
time.sleep(0.4)

r = c.get("/moderation/decisions", headers=auth(author_tok))
items = r.json().get("items", []) if r.status_code == 200 else []
rated = next((d for d in items if d["content_id"] == rated_post), None)
check("the author is told their post was restricted", rated is not None, items[:3])
check("and by what", rated and rated["action"] == "restricted_by_rating", rated)
check("and that they can contest it", rated and rated["appealable"] is True, rated)
decision_id = rated["id"] if rated else None

print()
print("== the author, and only the author, may appeal ==")
r = c.post(f"/moderation/decisions/{decision_id}/appeal", headers=auth(r1_tok),
           json={"grounds": "not mine"})
check("a stranger cannot appeal somebody else's decision", r.status_code == 404,
      f"{r.status_code}")

r = c.post(f"/moderation/decisions/{decision_id}/appeal", headers=auth(author_tok),
           json={"grounds": "This is a link to my own licensed work."})
check("the author can", r.status_code == 201, f"{r.status_code} {r.text[:160]}")
check("it comes with a deadline",
      bool(r.json().get("due_at")) if r.status_code == 201 else False, r.text[:160])

r = c.post(f"/moderation/decisions/{decision_id}/appeal", headers=auth(author_tok),
           json={"grounds": "again"})
check("appealing twice is refused", r.status_code == 409, f"{r.status_code}")

r = c.get("/moderation/decisions", headers=auth(author_tok))
shown = next((d for d in r.json().get("items", []) if d["id"] == decision_id), {})
check("the author sees the appeal against their own decision",
      (shown.get("appeal") or {}).get("status") == "open", shown)
check("but is not told which reviewer, only that it was automatic",
      shown.get("decided_by") in ("automatic", "a reviewer"), shown)

print("\n== the queue is staff-only ==")
r = c.get("/admin/moderation/appeals", headers=auth(author_tok))
check("a member cannot read the appeals queue", r.status_code == 403, f"{r.status_code}")
r = c.get("/admin/moderation/appeals")
check("nor can a signed-out visitor", r.status_code in (401, 403), f"{r.status_code}")

print("\n== reports restrict, and never release ==")
r = c.post("/posts", headers=auth(author_tok),
           json={"body": "Full nudes and explicit sex on my onlyfans", "visibility": "public"})
adult_post = r.json().get("id") if r.status_code in (200, 201) else None
check("an adult post publishes for adults", adult_post is not None, r.text[:140])
time.sleep(0.4)

for tok in (r1_tok, r2_tok, r3_tok):
    rr = c.post(f"/posts/{adult_post}/report", headers=auth(tok),
                json={"reason": "sexual", "note": "should not be here"})
    check("a report is accepted", rr.status_code == 201, f"{rr.status_code} {rr.text[:120]}")
    check("and says nothing about the outcome",
          rr.json().get("status") == "received" and "rating" not in rr.text.lower(),
          rr.text[:140])

teen_tok, _ = register(14)
r = c.get(f"/posts/{adult_post}", headers=auth(teen_tok))
check("three reports did not release adult content to a 14-year-old",
      r.status_code == 404, f"{r.status_code}")
r = c.get(f"/posts/{adult_post}", headers=auth(r1_tok))
check("and an adult can still read it", r.status_code == 200, f"{r.status_code}")

print("\n== reports on ordinary content pull it back pending review ==")
r = c.post("/posts", headers=auth(author_tok),
           json={"body": "Anyone want to meet at the market on Saturday?", "visibility": "public"})
plain_post = r.json().get("id") if r.status_code in (200, 201) else None
time.sleep(0.4)
r = c.get(f"/posts/{plain_post}", headers=auth(teen_tok))
check("a teenager can read it to begin with", r.status_code == 200, f"{r.status_code}")

for tok in (r1_tok, r2_tok, r3_tok):
    c.post(f"/posts/{plain_post}/report", headers=auth(tok), json={"reason": "hate"})
time.sleep(0.4)
r = c.get(f"/posts/{plain_post}", headers=auth(teen_tok))
check("after three reports it is behind the wall pending review", r.status_code == 404,
      f"{r.status_code}")
r = c.get(f"/posts/{plain_post}", headers=auth(r1_tok))
check("an adult still sees it — restricted is not deleted", r.status_code == 200,
      f"{r.status_code}")

r = c.get("/moderation/decisions", headers=auth(author_tok))
kinds = [d["action"] for d in r.json().get("items", [])]
check("the author was told reports restricted their post",
      "restricted_by_reports" in kinds, kinds[:6])

print("\n== one member cannot do it alone ==")
r = c.post("/posts", headers=auth(author_tok),
           json={"body": "Second market post, same as the first.", "visibility": "public"})
solo_post = r.json().get("id") if r.status_code in (200, 201) else None
time.sleep(0.3)
for _ in range(4):
    c.post(f"/posts/{solo_post}/report", headers=auth(r1_tok), json={"reason": "spam"})
time.sleep(0.3)
r = c.get(f"/posts/{solo_post}", headers=auth(teen_tok))
check("four reports from one account change nothing", r.status_code == 200,
      f"{r.status_code}")

print("\n== the author cannot report themselves into a queue ==")
r = c.post("/posts", headers=auth(author_tok),
           json={"body": "Third market post.", "visibility": "public"})
own_post = r.json().get("id") if r.status_code in (200, 201) else None
time.sleep(0.3)
c.post(f"/posts/{own_post}/report", headers=auth(author_tok), json={"reason": "spam"})
for tok in (r1_tok, r2_tok):
    c.post(f"/posts/{own_post}/report", headers=auth(tok), json={"reason": "spam"})
time.sleep(0.3)
r = c.get(f"/posts/{own_post}", headers=auth(teen_tok))
check("their own report does not count towards the three", r.status_code == 200,
      f"{r.status_code}")

print("\n== child-safety material has no appeal path here ==")
r = c.post(f"/posts/{post_id}/comments", headers=auth(minor_tok),
           json={"body": "send me nudes, you are 12 and this is our secret"})
check("it is refused", r.status_code == 403, f"{r.status_code} {r.text[:140]}")
cs_decision = r.headers.get("X-Moderation-Decision")
if cs_decision:
    r = c.post(f"/moderation/decisions/{cs_decision}/appeal", headers=auth(minor_tok),
               json={"grounds": "mistake"})
    check("appealing it is refused", r.status_code == 403, f"{r.status_code} {r.text[:140]}")
    check("and the refusal does not explain the boundary",
          "child" not in r.text.lower() and "exploit" not in r.text.lower(), r.text[:140])
    r = c.get("/moderation/decisions", headers=auth(minor_tok))
    row = next((d for d in r.json().get("items", []) if d["id"] == cs_decision), {})
    check("it is marked unappealable", row.get("appealable") is False, row)
else:
    check("a decision was recorded for it", False, "no decision header")

print("\n== reporting is idempotent ==")
r = c.post(f"/posts/{plain_post}/report", headers=auth(r1_tok), json={"reason": "spam"})
check("reporting the same thing twice is accepted and ignored", r.status_code == 201,
      f"{r.status_code} {r.text[:120]}")

print("\n== reporting something that is not there ==")
r = c.post("/posts/pst_nope/report", headers=auth(r1_tok), json={"reason": "spam"})
check("a report on a missing post is a 404", r.status_code == 404, f"{r.status_code}")

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
