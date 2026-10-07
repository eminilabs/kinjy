"""Forum votes, accepted answers and thread sorting, against the live API.

What is under test:
  - a reply can be upvoted once per member, toggled off again, never by its author;
  - only the author of a thread can mark a reply as the answer, one at a time;
  - the thread list can be sorted (recent, trending, solved, unanswered) and an
    unknown sort is refused rather than silently ignored;
  - a locked thread is frozen: no votes, no change of answer;
  - all of it answers like the rest of the forum: out-of-reach threads are a 404,
    and "solved" never tells a minor about an answer they are not allowed to read.

The locked-thread checks need `docker` on this machine: there is no API to lock a
thread yet, so the test flips the flag in the database, the way a moderator tool will.

Run against the live stack:  python backend/tests/e2e_forum_votes.py
"""
import random
import string
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
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


def make_forum(tok, **body):
    body.setdefault("name", f"forum {tag()}")
    r = c.post("/forums", headers=auth(tok), json=body)
    r.raise_for_status()
    return r.json()["id"]


def make_thread(tok, forum_id, title=None):
    r = c.post(f"/forums/{forum_id}/threads", headers=auth(tok),
               json={"title": title or f"Question {tag()}", "body": "How do I keep tomatoes alive in the rain?"})
    r.raise_for_status()
    return r.json()["id"]


def make_reply(tok, thread_id, body=None):
    r = c.post(f"/threads/{thread_id}/replies", headers=auth(tok), json={"body": body or f"Try a cover {tag()}"})
    r.raise_for_status()
    return r.json()["id"]


def replies_of(thread_id, tok=None):
    r = c.get(f"/threads/{thread_id}", headers=auth(tok) if tok else {})
    r.raise_for_status()
    return {x["id"]: x for x in r.json()["replies"]}


def thread_ids(forum_id, sort=None):
    r = c.get(f"/forums/{forum_id}/threads", params={"sort": sort} if sort else {})
    r.raise_for_status()
    return [t["id"] for t in r.json()["items"]], {t["id"]: t for t in r.json()["items"]}


author_tok, author = register()
helper_tok, helper = register()
other_tok, other = register()

forum = make_forum(author_tok)
question = make_thread(author_tok, forum)
helper_reply = make_reply(helper_tok, question)
other_reply = make_reply(other_tok, question)

print("\n== upvotes ==")
r = c.post(f"/replies/{helper_reply}/upvote", headers=auth(other_tok))
check("a member upvotes someone else's reply (200)", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
check("the count goes to 1 and says the viewer voted", r.json().get("upvotes") == 1 and r.json().get("voted") is True, r.text)

r = c.post(f"/replies/{helper_reply}/upvote", headers=auth(other_tok))
check("voting again takes the vote back (toggle)", r.status_code == 200 and r.json().get("upvotes") == 0 and r.json().get("voted") is False, r.text)

c.post(f"/replies/{helper_reply}/upvote", headers=auth(other_tok))
c.post(f"/replies/{helper_reply}/upvote", headers=auth(author_tok))
r = c.post(f"/replies/{other_reply}/upvote", headers=auth(helper_tok))
check("two members' votes add up, one each", replies_of(question)[helper_reply]["upvotes"] == 2, replies_of(question)[helper_reply])

r = c.post(f"/replies/{helper_reply}/upvote", headers=auth(helper_tok))
check("a member cannot upvote their own reply (403)", r.status_code == 403, f"{r.status_code}")
check("…and the count did not move", replies_of(question)[helper_reply]["upvotes"] == 2)

r = c.post(f"/replies/{helper_reply}/upvote")
check("signed out cannot vote (401)", r.status_code == 401, f"{r.status_code}")
r = c.post("/replies/rpl_doesnotexist/upvote", headers=auth(other_tok))
check("unknown reply is a 404", r.status_code == 404, f"{r.status_code}")

mine = replies_of(question, other_tok)
check("the thread tells each viewer which replies they voted on",
      mine[helper_reply].get("voted_by_me") is True and mine[other_reply].get("voted_by_me") is False, mine[helper_reply])
check("a signed-out reader just sees counts, no personal flag",
      replies_of(question)[helper_reply].get("voted_by_me") in (False, None))

print("\n== many members voting at the same moment ==")
crowd_thread = make_thread(author_tok, forum)
crowd_reply = make_reply(helper_tok, crowd_thread)
crowd = [register()[0] for _ in range(8)]
with ThreadPoolExecutor(max_workers=8) as pool:
    answers = list(pool.map(
        lambda tok: httpx.post(f"{BASE}/replies/{crowd_reply}/upvote", headers=auth(tok), timeout=30), crowd))
check("every simultaneous vote is accepted (200)", all(a.status_code == 200 for a in answers),
      [a.status_code for a in answers])
check("the total is exactly the number of voters, none lost", replies_of(crowd_thread)[crowd_reply]["upvotes"] == 8,
      replies_of(crowd_thread)[crowd_reply]["upvotes"])
with ThreadPoolExecutor(max_workers=2) as pool:
    taps = list(pool.map(
        lambda _: httpx.post(f"{BASE}/replies/{crowd_reply}/upvote", headers=auth(crowd[0]), timeout=30), range(2)))
check("a double tap by one member never errors", all(a.status_code == 200 for a in taps), [a.status_code for a in taps])
check("...and the member's vote is counted once or not at all, never twice",
      replies_of(crowd_thread)[crowd_reply]["upvotes"] in (7, 8), replies_of(crowd_thread)[crowd_reply]["upvotes"])

print("\n== accepted answer ==")
r = c.post(f"/replies/{helper_reply}/accept", headers=auth(other_tok))
check("someone who did not ask the question cannot accept (403)", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/replies/{helper_reply}/accept", headers=auth(helper_tok))
check("the author of the reply cannot accept it either (403)", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/replies/{helper_reply}/accept")
check("signed out cannot accept (401)", r.status_code == 401, f"{r.status_code}")
check("nothing was accepted by those attempts", not any(x["accepted_answer"] for x in replies_of(question).values()))

r = c.post(f"/replies/{helper_reply}/accept", headers=auth(author_tok))
check("the asker accepts a reply (200)", r.status_code == 200 and r.json().get("accepted") is True, f"{r.status_code} {r.text[:120]}")
check("that reply is marked, the other is not",
      replies_of(question)[helper_reply]["accepted_answer"] and not replies_of(question)[other_reply]["accepted_answer"])

r = c.post(f"/replies/{helper_reply}/accept", headers=auth(author_tok))
check("accepting the same reply again changes nothing (idempotent)", r.status_code == 200 and replies_of(question)[helper_reply]["accepted_answer"], r.text)

r = c.post(f"/replies/{other_reply}/accept", headers=auth(author_tok))
state = replies_of(question)
check("the accepted reply is listed first",
      list(replies_of(question).keys())[0] == other_reply, list(replies_of(question).keys()))
check("accepting another reply moves the mark: exactly one accepted",
      r.status_code == 200 and state[other_reply]["accepted_answer"] and not state[helper_reply]["accepted_answer"]
      and sum(x["accepted_answer"] for x in state.values()) == 1, state)

def accepted_mail(tok):
    mail = c.get("/notifications", headers=auth(tok)).json()
    items = mail.get("items", mail) if isinstance(mail, dict) else mail
    return [n for n in items if n.get("kind") == "forum_answer_accepted"]


check("the author of the accepted reply is told", len(accepted_mail(other_tok)) == 1, accepted_mail(other_tok))
check("...without the thread's title in the notification",
      all("tomatoes" not in str(n.get("body", "")).lower() for n in accepted_mail(other_tok)))
c.post(f"/replies/{other_reply}/accept", headers=auth(author_tok))
check("accepting the same reply again does not notify twice", len(accepted_mail(other_tok)) == 1,
      len(accepted_mail(other_tok)))

print("\n== sorting the thread list ==")
sort_forum = make_forum(author_tok)
quiet = make_thread(author_tok, sort_forum, "Nobody has answered this")
busy = make_thread(author_tok, sort_forum, "Many answers, none accepted")
done = make_thread(author_tok, sort_forum, "Answered and settled")
for _ in range(3):
    make_reply(helper_tok, busy)
solved_reply = make_reply(helper_tok, done)
c.post(f"/replies/{solved_reply}/accept", headers=auth(author_tok))

ids, by_id = thread_ids(sort_forum)
check("default order is most recent activity first", ids[0] == done, ids)
ids, _ = thread_ids(sort_forum, "recent")
check("sort=recent is the default order", ids[0] == done, ids)

ids, _ = thread_ids(sort_forum, "unanswered")
check("sort=unanswered keeps only threads with no reply", ids == [quiet], ids)

ids, by_id = thread_ids(sort_forum, "solved")
check("sort=solved keeps only threads with an accepted answer", ids == [done], ids)
check("a solved thread says so in the list", by_id[done].get("solved") is True, by_id[done])
_, by_id = thread_ids(sort_forum)
check("an unsolved thread says so too", by_id[busy].get("solved") is False and by_id[quiet].get("solved") is False)

ids, _ = thread_ids(sort_forum, "trending")
check("sort=trending puts the most discussed thread first", ids[0] == busy, ids)
check("…and still lists everything", set(ids) == {quiet, busy, done}, ids)

r = c.get(f"/forums/{sort_forum}/threads", params={"sort": "newest-first-please"})
check("an unknown sort is refused (422), not ignored", r.status_code == 422, f"{r.status_code}")

print("\n== out of reach stays out of reach ==")
secret = c.post("/communities", headers=auth(author_tok),
                json={"name": f"secret {tag()}", "description": "Tomatoes, compost and rain", "kind": "secret"})
secret.raise_for_status()
hidden_forum = make_forum(author_tok, community_id=secret.json()["id"])
hidden_thread = make_thread(author_tok, hidden_forum)
hidden_reply = make_reply(author_tok, hidden_thread)
outsider_tok, _ = register()
r = c.post(f"/replies/{hidden_reply}/upvote", headers=auth(outsider_tok))
check("an outsider cannot vote in a secret community's thread (404)", r.status_code == 404, f"{r.status_code}")
r = c.post(f"/replies/{hidden_reply}/accept", headers=auth(outsider_tok))
check("an outsider cannot accept there either (404, not 403)", r.status_code == 404, f"{r.status_code}")
r = c.get(f"/forums/{hidden_forum}/threads", params={"sort": "solved"}, headers=auth(outsider_tok))
check("sorting does not open the door (404)", r.status_code == 404, f"{r.status_code}")

print("\n== the age gate: a minor and content rated above their age ==")
teen_tok, _ = register(age=15)
age_forum = make_forum(author_tok)
market = make_thread(author_tok, age_forum, "Market day")
plain_reply = make_reply(helper_tok, market, "See you there")
explicit_reply = make_reply(helper_tok, market, "Also selling nudes and explicit sex content")
time.sleep(0.5)

r = c.post(f"/replies/{plain_reply}/upvote", headers=auth(teen_tok))
check("a teenager can vote on an ordinary reply (control, 200)", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
r = c.post(f"/replies/{explicit_reply}/upvote", headers=auth(teen_tok))
check("...but not on a reply rated above their age (404, as if it did not exist)", r.status_code == 404, f"{r.status_code}")
check("the hidden reply is not in the thread they read",
      explicit_reply not in replies_of(market, teen_tok) and plain_reply in replies_of(market, teen_tok))
r = c.post(f"/replies/{explicit_reply}/upvote", headers=auth(other_tok))
check("an adult can vote on that same reply (200)", r.status_code == 200, f"{r.status_code}")

r = c.post(f"/replies/{explicit_reply}/accept", headers=auth(author_tok))
check("the adult asker accepts the explicit reply (200)", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
adult_view = {x["id"]: x for x in c.get(f"/forums/{age_forum}/threads", headers=auth(other_tok)).json()["items"]}
teen_ids, teen_view = (lambda r: ([x["id"] for x in r.json()["items"]], {x["id"]: x for x in r.json()["items"]}))(
    c.get(f"/forums/{age_forum}/threads", headers=auth(teen_tok)))
check("an adult sees the thread as solved", adult_view[market]["solved"] is True, adult_view[market])
check("a teenager does not: the answer is one they may not read", teen_view[market]["solved"] is False, teen_view[market])
adult_solved = c.get(f"/forums/{age_forum}/threads", params={"sort": "solved"}, headers=auth(other_tok)).json()["items"]
teen_solved = c.get(f"/forums/{age_forum}/threads", params={"sort": "solved"}, headers=auth(teen_tok)).json()["items"]
check("sort=solved lists it for an adult", [x["id"] for x in adult_solved] == [market], [x["id"] for x in adult_solved])
check("...and not for the teenager", teen_solved == [], [x["id"] for x in teen_solved])

teen_thread = make_thread(teen_tok, age_forum, "Homework question")
adult_bad = make_reply(helper_tok, teen_thread, "Also selling nudes and explicit sex content")
r = c.post(f"/replies/{adult_bad}/accept", headers=auth(teen_tok))
check("a teenager asker cannot accept a reply they are not allowed to read (404)", r.status_code == 404, f"{r.status_code}")
good = make_reply(other_tok, teen_thread, "Try chapter three")
r = c.post(f"/replies/{good}/accept", headers=auth(teen_tok))
check("...but can accept an ordinary one (control, 200)", r.status_code == 200, f"{r.status_code} {r.text[:100]}")

print("\n== a locked thread is frozen ==")


def lock(thread_id):
    sql = f"update community.threads set locked = true where id = '{thread_id}'"
    done = subprocess.run(
        ["docker", "exec", "kaluta-postgres", "sh", "-c", f'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "{sql}"'],
        capture_output=True, text=True)
    return done.returncode == 0 and "UPDATE 1" in done.stdout


frozen = make_thread(author_tok, forum)
frozen_a, frozen_b = make_reply(helper_tok, frozen), make_reply(other_tok, frozen)
c.post(f"/replies/{frozen_a}/accept", headers=auth(author_tok))
c.post(f"/replies/{frozen_b}/upvote", headers=auth(author_tok))
check("the thread is locked for the test", lock(frozen), "could not run psql through docker")

before = replies_of(frozen)
r = c.post(f"/replies/{frozen_b}/upvote", headers=auth(helper_tok))
check("voting on a locked thread is refused (403)", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/replies/{frozen_b}/accept", headers=auth(author_tok))
check("changing the answer of a locked thread is refused (403)", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/threads/{frozen}/replies", headers=auth(helper_tok), json={"body": "Late answer"})
check("replying is still refused too (403)", r.status_code == 403, f"{r.status_code}")
after = replies_of(frozen)
check("nothing moved: same votes, same accepted answer",
      {k: (v["upvotes"], v["accepted_answer"]) for k, v in before.items()}
      == {k: (v["upvotes"], v["accepted_answer"]) for k, v in after.items()}, after)

hidden_frozen = make_thread(author_tok, hidden_forum)
hidden_frozen_reply = make_reply(author_tok, hidden_frozen)
check("a thread in the secret community is locked too", lock(hidden_frozen), "psql through docker failed")
r = c.post(f"/replies/{hidden_frozen_reply}/upvote", headers=auth(outsider_tok))
check("an outsider still gets a 404, not the 403 that would reveal it exists", r.status_code == 404, f"{r.status_code}")

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
