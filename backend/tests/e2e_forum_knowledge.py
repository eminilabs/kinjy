"""The forum knowledge base, against the live API.

Nothing writes curated knowledge entries yet, so the knowledge tab is built on
what the community has already settled: a reply the asker accepted as the answer
and that at least two other members upvoted. Under test:
  - that, and only that, becomes an entry, with the thread it came from as its source;
  - search narrows it;
  - the age gate applies: a teenager is never shown an answer they may not read;
  - a secret community's knowledge answers 404 to an outsider;
  - a thread detail says which forum it belongs to (the page needs it to open a link).

Run against the live stack:  python backend/tests/e2e_forum_knowledge.py
"""
import random
import string
import sys
import time
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
    return r.json()["tokens"]["access_token"]


def auth(t):
    return {"Authorization": f"Bearer {t}"}


def make(path, tok, body):
    r = c.post(path, headers=auth(tok), json=body)
    r.raise_for_status()
    return r.json()["id"]


def knowledge(forum, tok=None, **params):
    return c.get(f"/forums/{forum}/knowledge", params=params, headers=auth(tok) if tok else {})


def settle(thread, reply, asker, voters):
    """Accept `reply` as the answer and have each of `voters` upvote it."""
    c.post(f"/replies/{reply}/accept", headers=auth(asker)).raise_for_status()
    for voter in voters:
        c.post(f"/replies/{reply}/upvote", headers=auth(voter)).raise_for_status()


asker, helper, fan1, fan2, teen = register(), register(), register(), register(), register(15)
forum = make("/forums", asker, {"name": f"Garden {tag()}"})

print("\n== what becomes an entry ==")
settled = make(f"/forums/{forum}/threads", asker, {"title": "How do I keep tomatoes alive in the rain?", "body": "Mine rot."})
settled_reply = make(f"/threads/{settled}/replies", helper, {"body": "Put a clear cover over them and water at the root."})
settle(settled, settled_reply, asker, [fan1, fan2])

thin = make(f"/forums/{forum}/threads", asker, {"title": "Best compost for beans?", "body": "Any ideas?"})
thin_reply = make(f"/threads/{thin}/replies", helper, {"body": "Well rotted manure."})
settle(thin, thin_reply, asker, [fan1])

popular = make(f"/forums/{forum}/threads", asker, {"title": "When to plant onions?", "body": "Timing?"})
popular_reply = make(f"/threads/{popular}/replies", helper, {"body": "Early spring."})
for voter in (fan1, fan2):
    c.post(f"/replies/{popular_reply}/upvote", headers=auth(voter))

r = knowledge(forum, asker)
check("the knowledge endpoint answers (200)", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
items = r.json().get("items", [])
check("an accepted answer with two upvotes is an entry", [i["id"] for i in items] == [settled_reply], [i["id"] for i in items])
entry = items[0] if items else {}
check("its question is the thread's title", entry.get("question") == "How do I keep tomatoes alive in the rain?", entry)
check("its answer is the reply's text", entry.get("answer") == "Put a clear cover over them and water at the root.", entry)
check("it cites the thread it came from", entry.get("sources") == [settled], entry.get("sources"))
check("it says it came from the community, with the vote count",
      entry.get("origin") == "community" and entry.get("votes") == 2, entry)
check("an accepted answer with one upvote is not enough (not listed)", thin_reply not in [i["id"] for i in items])
check("a much upvoted reply nobody accepted is not listed either", popular_reply not in [i["id"] for i in items])
check("a signed-out reader can read it too", knowledge(forum).status_code == 200)

print("\n== search ==")
check("a word from the question finds it", [i["id"] for i in knowledge(forum, asker, q="TOMATOES").json()["items"]] == [settled_reply])
check("a word from the answer finds it", [i["id"] for i in knowledge(forum, asker, q="root").json()["items"]] == [settled_reply])
check("nothing matches nonsense", knowledge(forum, asker, q="zzzqqq").json()["items"] == [])
check("a % is searched for literally, not as a wildcard", knowledge(forum, asker, q="%").json()["items"] == [])

print("\n== a thread knows its forum ==")
check("the thread detail carries forum_id", c.get(f"/threads/{settled}").json().get("forum_id") == forum)

print("\n== the age gate ==")
adult_thread = make(f"/forums/{forum}/threads", asker, {"title": "Market day", "body": "Who is going on Saturday?"})
adult_reply = make(f"/threads/{adult_thread}/replies", helper, {"body": "Also selling nudes and explicit sex content"})
time.sleep(0.5)
settle(adult_thread, adult_reply, asker, [fan1, fan2])
adult_ids = [i["id"] for i in knowledge(forum, asker).json()["items"]]
teen_ids = [i["id"] for i in knowledge(forum, teen).json()["items"]]
check("an adult sees the explicit answer", adult_reply in adult_ids, adult_ids)
check("a teenager does not", adult_reply not in teen_ids, teen_ids)
check("...but still sees the ordinary one", settled_reply in teen_ids, teen_ids)
check("a signed-out reader is treated as a minor too", adult_reply not in [i["id"] for i in knowledge(forum).json()["items"]])

print("\n== a thread rated above its own answer ==")
# The thread is classified on its title and body, a reply on its body alone: a short,
# harmless answer can sit under a thread a signed-out reader may not see.
touchy = make(f"/forums/{forum}/threads", asker, {"title": "Vodka night planning", "body": "Who is getting drunk on Friday?"})
touchy_reply = make(f"/threads/{touchy}/replies", helper, {"body": "Bring snacks and a jacket, three of us are driving."})
time.sleep(0.5)
settle(touchy, touchy_reply, asker, [fan1, fan2, register()])
plain = make(f"/forums/{forum}/threads", asker, {"title": "Picnic planning", "body": "Who is coming on Sunday?"})
plain_reply = make(f"/threads/{plain}/replies", helper, {"body": "Bring snacks and a blanket, it will be cold."})
settle(plain, plain_reply, asker, [fan1, fan2])

signed_out = [i["id"] for i in knowledge(forum).json()["items"]]
check("a signed-out reader is not handed the title of a thread they cannot read",
      touchy_reply not in signed_out, signed_out)
check("...nor can they find it by searching for a word in its title",
      knowledge(forum, q="vodka").json()["items"] == [], knowledge(forum, q="vodka").json()["items"])
check("an adult sees that entry", touchy_reply in [i["id"] for i in knowledge(forum, asker).json()["items"]])

print("\n== limit cannot reveal what is hidden ==")
check("the hidden entry ranks first for adults (3 votes against 2)",
      [i["id"] for i in knowledge(forum, asker, q="snacks").json()["items"]][0] == touchy_reply)
only_one = knowledge(forum, q="snacks", limit=1).json()["items"]
check("limit=1 still returns the readable entry, not an empty page", [i["id"] for i in only_one] == [plain_reply],
      [i["id"] for i in only_one])
check("a query over 100 characters is refused (422)", knowledge(forum, q="a" * 101).status_code == 422)
check("limit=0 does not crash", knowledge(forum, asker, limit=0).status_code == 200)
check("a negative limit or offset on the thread list does not crash",
      c.get(f"/forums/{forum}/threads", params={"limit": -5, "offset": -1}).status_code == 200)

print("\n== a secret community ==")
secret = make("/communities", asker, {"name": f"secret {tag()}", "description": "Tomatoes, compost and rain", "kind": "secret"})
hidden_forum = make("/forums", asker, {"name": f"hidden {tag()}", "community_id": secret})
outsider = register()
check("an outsider gets a 404 for its knowledge", knowledge(hidden_forum, outsider).status_code == 404)
check("a signed-out reader too", knowledge(hidden_forum).status_code == 404)
check("the owner reads it (200)", knowledge(hidden_forum, asker).status_code == 200)

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
