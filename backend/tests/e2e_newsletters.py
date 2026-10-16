"""Newsletters, end to end, against a mail sink: nothing is mailed to anybody real.

What it checks, on the live stack with creator-service pointed at tests/fake_smtp.py (compose.fake-smtp.yml):
that only a confirmed address is ever written to, that the sign-up cannot be used to find out who is on a list,
that leaving works from the mail itself and takes effect at once, that only an adult sends, that the limits hold,
and - by really restarting the service in the middle of a send - that nobody receives an issue twice.

Exits 2 (skipped) on a stack that cannot send mail.
"""
import os
import random
import re
import shutil
import string
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fake_smtp import FakeSMTP  # noqa: E402

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")
c = httpx.Client(base_url=BASE, timeout=90)
plain = httpx.Client(timeout=60, follow_redirects=False)
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
                "email": f"{t}@example.com", "handle": f"{name}{t}", "display_name": f"News {name} {t}",
                "password": "Sup3rStrong!Pass", "date_of_birth": date(date.today().year - age, 6, 15).isoformat(), "country": "US",
            })
        except httpx.TimeoutException:
            continue
        if r.status_code != 504:
            break
    r.raise_for_status()
    user = r.json()["user"]
    return {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}, user


def subscribe(handle, email):
    return retrying(lambda: c.post(f"/creators/{handle}/newsletter/subscribe", json={"email": email}))


def link_in(message, kind):
    found = re.search(rf"https?://\S+/creators/newsletter/{kind}\?token=\S+", message["body"])
    return found.group(0) if found else None


def counts(h):
    return retrying(lambda: c.get("/creators/newsletter/subscribers", headers=h)).json()


def issue_done(h, issue_id, timeout=120):
    end = time.time() + timeout
    while time.time() < end:
        body = retrying(lambda: c.get(f"/creators/newsletter/issues/{issue_id}", headers=h)).json()
        if body["status"] in ("sent", "partial", "failed"):
            return body
        time.sleep(0.5)
    raise TimeoutError(issue_id)


def newsletter_output(h, text):
    r = retrying(lambda: c.post("/creators/publish", headers=h, json={
        "source_text": text, "source_lang": "en", "targets": ["newsletter"], "target_langs": ["en"]}))
    job = retrying(lambda: c.get(f"/creators/publish/{r.json()['job_id']}", headers=h)).json()
    return job["outputs"][0]["id"]


def sign_up_and_confirm(handle, emails):
    for email in emails:
        subscribe(handle, email)
        assert sink.wait_for(1, email), f"no confirmation mail reached {email}"
        r = plain.get(link_in(sink.to(email)[0], "confirm"))
        assert r.status_code == 200, r.status_code


sink = FakeSMTP(port=2525)
sink.start()
creator_h, creator = register(35, "nlc")
minor_h, minor = register(14, "nlm")
handle = creator["handle"]

state = retrying(lambda: c.get("/creators/newsletter/subscribers", headers=creator_h)).json()
if not state.get("can_send"):
    print("SKIPPED: creator-service cannot send mail on this stack (see backend/tests/compose.fake-smtp.yml)")
    raise SystemExit(2)
canary = f"canary{tag()}@example.com"
subscribe(handle, canary)
if not sink.wait_for(1, canary, 15):
    print("STOPPED: the canary confirmation did not reach the test sink, so mail may be going somewhere real. "
          "Is creator-service started with compose.fake-smtp.yml? Refusing to go on.")
    raise SystemExit(1)

A = [f"reader{i}{tag()}@example.com" for i in range(1, 6)]
PENDING = f"late{tag()}@example.com"
BOUNCE = f"bounce{tag()}@example.com"

print("\n== signing up ==")
bad = subscribe(handle, "not an address")
check("something that is not an e-mail address is refused", bad.status_code == 422, bad.status_code)
check("a creator that does not exist has no newsletter", subscribe("nobody" + tag(), "x@example.com").status_code == 404)
check("nor does a minor's account", subscribe(minor["handle"], "x@example.com").status_code == 404)
first = subscribe(handle, A[0])
check("an address can ask, and is told to look in its inbox", first.status_code == 202 and first.json()["status"] == "check_your_inbox", first.text[:120])
check("one confirmation mail arrives", sink.wait_for(1, A[0]), len(sink.to(A[0])))
mail = sink.to(A[0])[0]
check("naming the creator, from the platform, in plain text only",
      "News nlc" in mail["subject"] and mail["html"] is False and "kinjy.test" in mail["headers"].get("from", ""), mail["subject"])
check("with a link that confirms", link_in(mail, "confirm") is not None, mail["body"][:200])
again = subscribe(handle, A[0])
check("asking again at once says the same and sends nothing more", again.status_code == 202 and again.json() == first.json() and len(sink.to(A[0])) == 1, len(sink.to(A[0])))
check("so the form tells a stranger nothing about who is on the list", subscribe(handle, PENDING).json() == first.json())
state = counts(creator_h)
check("until they confirm, nobody is on the list: two are waiting, none confirmed", state["confirmed"] == 0 and state["waiting_for_confirmation"] >= 2, state)
nobody_yet = retrying(lambda: c.post("/creators/newsletter/send", headers=creator_h, json={"subject": "Hello", "body": "x"}))
check("and a newsletter cannot go to nobody", nobody_yet.status_code == 400 and "confirmed" in nobody_yet.text, nobody_yet.text[:120])

print("\n== confirming ==")
confirm_url = link_in(mail, "confirm")
page = plain.get(confirm_url)
check("the link in the mail confirms", page.status_code == 200 and "You are subscribed" in page.text, page.status_code)
check("and the page is plain: no script, nothing loaded from anywhere", "<script" not in page.text and "default-src 'none'" in page.headers.get("content-security-policy", ""))
check("opening it again changes nothing and is not an error", plain.get(confirm_url).status_code == 200)
check("a link with one character changed does nothing", plain.get(confirm_url[:-1] + ("a" if confirm_url[-1] != "a" else "b")).status_code == 404)
sign_up_and_confirm(handle, A[1:] + [BOUNCE])
state = counts(creator_h)
check("six confirmed, one still waiting - the one who never opened the mail", state["confirmed"] == 6 and state["waiting_for_confirmation"] >= 1, state)
check("the creator is shown counts and a masked preview, never the addresses",
      all("@" in p and "***" in p for p in state["preview"]) and not any(a in str(state) for a in A + [BOUNCE]), state["preview"])

print("\n== sending ==")
minor_send = retrying(lambda: c.post("/creators/newsletter/send", headers=minor_h, json={"subject": "Hi", "body": "x"}))
check("a minor's account cannot send one", minor_send.status_code == 403, minor_send.status_code)
sink.refuse.add(BOUNCE)  # confirmed fine, then the mail server starts refusing it
text = f"Market day {tag()}\nThe mangoes were sweet today.\nCome with me if you can."
out_id = newsletter_output(creator_h, text)
sent = retrying(lambda: c.post("/creators/newsletter/send", headers=creator_h, json={"output_id": out_id}))
check("a ready newsletter from the Studio can be sent", sent.status_code == 202 and sent.json()["recipients"] == 6, f"{sent.status_code} {sent.text[:160]}")
issue = issue_done(creator_h, sent.json()["id"])
check("it goes out, one address refused: partial, five sent and one failed", issue["status"] == "partial" and issue["sent"] == 5 and issue["failed"] == 1, issue)
copies = {a: len([m for m in sink.to(a) if not m["subject"].startswith("Confirm")]) for a in A + [BOUNCE]}
check("every confirmed address the mail server accepted got exactly one copy", all(copies[a] == 1 for a in A), copies)
check("the one it refused got none, and is recorded as failed rather than lost", copies[BOUNCE] == 0, copies)
check("and the one still waiting for confirmation got nothing", len(sink.to(PENDING)) == 1 and sink.to(PENDING)[0]["subject"].startswith("Confirm"), len(sink.to(PENDING)))
issue_mail = [m for m in sink.to(A[1]) if not m["subject"].startswith("Confirm")][0]
check("the subject is the headline, the body is the creator's words", issue_mail["subject"] == text.split("\n")[0] and "The mangoes were sweet today." in issue_mail["body"], issue_mail["subject"])
check("it is plain text, says who it is from and why, and gives the way out and the postal address",
      issue_mail["html"] is False and f"@{handle}" in issue_mail["body"] and "Leave in one click" in issue_mail["body"]
      and "Kinjy Test Office" in issue_mail["body"] and "unsubscribe?token=" in issue_mail["body"], issue_mail["body"][-420:])
check("the Studio's own closing line is gone (the real footer replaces it)", "Sent to your subscribers on Kinjy" not in issue_mail["body"])
check("and it carries the headers a mail client needs to offer 'unsubscribe' itself",
      issue_mail["headers"].get("list-unsubscribe", "").startswith("<http") and issue_mail["headers"].get("list-unsubscribe-post") == "List-Unsubscribe=One-Click"
      and issue_mail["headers"].get("precedence") == "bulk", issue_mail["headers"])
check("another account cannot read this issue's report",
      retrying(lambda: c.get(f"/creators/newsletter/issues/{sent.json()['id']}", headers=minor_h)).status_code == 404)

print("\n== leaving ==")
leave_url = link_in(issue_mail, "unsubscribe")
page = plain.get(leave_url)
check("the link opens a page with a button - it does not leave by itself, so a mail scanner that opens it changes nothing",
      page.status_code == 200 and "<button" in page.text and counts(creator_h)["confirmed"] == 6, page.status_code)
done = plain.post(leave_url)
check("pressing it leaves", done.status_code == 200 and "You are unsubscribed" in done.text and counts(creator_h)["confirmed"] == 5, done.status_code)
check("again is not an error", plain.post(leave_url).status_code == 200)
check("a link with a character changed does nothing", plain.post(leave_url[:-1] + ("a" if leave_url[-1] != "a" else "b")).status_code == 404 and counts(creator_h)["confirmed"] == 5)
other_mail = [m for m in sink.to(A[2]) if not m["subject"].startswith("Confirm")][0]
one_click = re.search(r"<(https?://[^>]+)>", other_mail["headers"]["list-unsubscribe"]).group(1)
r = plain.post(one_click, data={"List-Unsubscribe": "One-Click"})
check("a mail client's own 'unsubscribe' button (the one-click header) leaves too", r.status_code == 200 and counts(creator_h)["confirmed"] == 4, r.status_code)
confirm_as_leave = plain.post(confirm_url.replace("/confirm?", "/unsubscribe?"))
check("a confirmation link cannot be used to unsubscribe somebody", confirm_as_leave.status_code == 404 and counts(creator_h)["confirmed"] == 4, confirm_as_leave.status_code)

sink.refuse.discard(BOUNCE)
before = {a: len(sink.to(a)) for a in A + [BOUNCE]}
second = retrying(lambda: c.post("/creators/newsletter/send", headers=creator_h, json={"subject": f"Second {tag()}", "body": "Another one."}))
check("a second issue is accepted", second.status_code == 202 and second.json()["recipients"] == 4, f"{second.status_code} {second.text[:140]}")
issue2 = issue_done(creator_h, second.json()["id"])
after = {a: len(sink.to(a)) for a in A + [BOUNCE]}
check("it reaches only the four who are still there", issue2["status"] == "sent" and issue2["sent"] == 4, issue2)
check("and nothing at all goes to the two who left", after[A[1]] == before[A[1]] and after[A[2]] == before[A[2]], (before, after))

print("\n== limits ==")
codes = []
for n in range(3):
    r = retrying(lambda: c.post("/creators/newsletter/send", headers=creator_h, json={"subject": f"Issue {n} {tag()}", "body": "x"}))
    codes.append(r.status_code)
    if r.status_code == 202:
        issue_done(creator_h, r.json()["id"])
check("two more issues are allowed today (four in all), the next is refused", codes == [202, 202, 429], codes)

print("\n== a restart in the middle of a send ==")
if shutil.which("docker") and subprocess.run(["docker", "inspect", "kaluta-creator"], capture_output=True).returncode == 0:
    h2, creator2 = register(41, "nlr")
    people = [f"resume{i}{tag()}@example.com" for i in range(12)]
    sign_up_and_confirm(creator2["handle"], people)
    sink.delay = 0.5
    started = retrying(lambda: c.post("/creators/newsletter/send", headers=h2, json={"subject": f"Resumed {tag()}", "body": "Body."}))
    check("the issue starts", started.status_code == 202 and started.json()["recipients"] == 12, started.text[:140])
    issue_id = started.json()["id"]

    def reached():
        return sum(1 for a in people if any(not m["subject"].startswith("Confirm") for m in sink.to(a)))

    end = time.time() + 30
    while reached() < 3 and time.time() < end:
        time.sleep(0.2)
    check("a few have been mailed", 3 <= reached() < 12, reached())
    # A crash, not a tidy stop: `docker restart` gives the service ten seconds to finish what it is doing, which
    # would let this send complete and prove nothing. SIGKILL gives it none.
    subprocess.run(["docker", "kill", "kaluta-creator"], check=True, capture_output=True)
    subprocess.run(["docker", "start", "kaluta-creator"], check=True, capture_output=True)
    for _ in range(40):
        health = subprocess.run(["docker", "inspect", "kaluta-creator", "--format", "{{.State.Health.Status}}"], capture_output=True, text=True).stdout.strip()
        if health == "healthy":
            break
        time.sleep(2)
    sink.delay = 0
    final = issue_done(h2, issue_id, timeout=180)
    per_person = {a: len([m for m in sink.to(a) if not m["subject"].startswith("Confirm")]) for a in people}
    check("it resumed on its own and finished", final["status"] in ("sent", "partial"), final)
    check("nobody received it twice", max(per_person.values()) <= 1, per_person)
    check("at most the one message that was in flight is missing", sum(per_person.values()) >= 11, sum(per_person.values()))
    delivered = sum(per_person.values())
    check("and the numbers say so: every address is accounted for, and what the sink holds is what was recorded plus, at most, what was in flight",
          final["sent"] + final["failed"] + final["skipped"] == 12 and final["sent"] <= delivered <= final["sent"] + final["skipped"], (final, delivered))
else:
    print("  (skipped: needs the docker CLI and a container called kaluta-creator)")

sink.stop()
print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
raise SystemExit(0 if ok else 1)
