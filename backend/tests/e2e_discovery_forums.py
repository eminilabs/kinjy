"""People discovery and forum content, against the live API.

Two halves of the same gap. The messaging rules stop an adult who has already
found a 14-year-old from writing to them; this checks they cannot find one.
And a teenager who cannot reach adult material in their feed but can reach it
in a forum thread has not been protected, only inconvenienced.
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


def register(age, name=None):
    t = tag()
    handle = f"{name or 'u'}{t}"
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": handle, "display_name": f"Demo {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"]


def auth(t):
    return {"Authorization": f"Bearer {t}"}


# A shared, searchable token so both accounts match the same query.
MARKER = f"z{tag()}"

adult_tok, adult = register(30)
teen_tok, teen = register(14, name=MARKER)
adult2_tok, adult2 = register(44, name=MARKER)

print("\n== an adult searching does not find minors ==")
time.sleep(0.6)
r = c.get(f"/users/search?q={MARKER}&limit=25", headers=auth(adult_tok))
check("search answers", r.status_code == 200, r.text[:140])
found = [i["user_id"] for i in r.json().get("items", [])] if r.status_code == 200 else []
check("the adult match is returned", adult2["id"] in found, found[:4])
check("the 14-year-old is not", teen["id"] not in found, found[:4])

print("\n== a minor searching still finds everybody ==")
r = c.get(f"/users/search?q={MARKER}&limit=25", headers=auth(teen_tok))
found_by_teen = [i["user_id"] for i in r.json().get("items", [])] if r.status_code == 200 else []
check("a teenager finds the adult", adult2["id"] in found_by_teen, found_by_teen[:4])

print("\n== the suggestions rail obeys the same rule ==")
r = c.get("/users/suggestions?limit=20", headers=auth(adult_tok))
check("suggestions answer", r.status_code == 200, r.text[:120])
suggested = [i["user_id"] for i in r.json().get("items", [])] if r.status_code == 200 else []
check("no minor is suggested to an adult", teen["id"] not in suggested, suggested[:4])

print("\n== forum threads are classified and filtered ==")
r = c.post("/forums", headers=auth(adult_tok),
           json={"name": f"Forum {tag()}", "slug": f"f{tag()}", "description": "test forum"})
forum = r.json().get("id") if r.status_code in (200, 201) else None
check("a forum can be created", forum is not None, r.text[:140])

if forum:
    r = c.post(f"/forums/{forum}/threads", headers=auth(adult_tok),
               json={"title": "Market day", "body": "Who is going on Saturday?"})
    plain = r.json().get("id") if r.status_code in (200, 201) else None
    check("an ordinary thread publishes", plain is not None, r.text[:140])

    r = c.post(f"/forums/{forum}/threads", headers=auth(adult_tok),
               json={"title": "Adults only", "body": "Full nudes and explicit sex, check my onlyfans"})
    explicit = r.json().get("id") if r.status_code in (200, 201) else None
    check("an explicit thread publishes for adults", explicit is not None, r.text[:140])

    time.sleep(0.5)
    r = c.get(f"/forums/{forum}/threads?limit=50", headers=auth(teen_tok))
    ids = [t["id"] for t in r.json().get("items", [])] if r.status_code == 200 else []
    check("the listing answers for a teenager", r.status_code == 200, r.text[:120])
    check("the ordinary thread is listed", plain in ids, ids[:4])
    check("the explicit thread is not", explicit not in ids, ids[:4])

    r = c.get(f"/forums/{forum}/threads?limit=50", headers=auth(adult_tok))
    adult_ids = [t["id"] for t in r.json().get("items", [])] if r.status_code == 200 else []
    check("an adult sees both", plain in adult_ids and explicit in adult_ids, adult_ids[:4])

    print("\n== a direct link to a thread is gated too ==")
    r = c.get(f"/threads/{explicit}", headers=auth(teen_tok))
    check("a teenager following the link is refused", r.status_code == 404, f"{r.status_code}")
    r = c.get(f"/threads/{explicit}", headers=auth(adult_tok))
    check("an adult is not", r.status_code == 200, f"{r.status_code}")
    r = c.get(f"/threads/{explicit}")
    check("a signed-out visitor is refused", r.status_code == 404, f"{r.status_code}")

    print("\n== one bad reply removes the reply, not the thread ==")
    c.post(f"/threads/{plain}/replies", headers=auth(adult_tok), json={"body": "See you there"})
    r = c.post(f"/threads/{plain}/replies", headers=auth(adult_tok),
               json={"body": "Also selling nudes and explicit sex content"})
    bad_reply = r.json().get("id") if r.status_code in (200, 201) else None
    time.sleep(0.4)

    r = c.get(f"/threads/{plain}", headers=auth(teen_tok))
    check("the thread itself is still readable", r.status_code == 200, f"{r.status_code}")
    if r.status_code == 200:
        reply_ids = [x["id"] for x in r.json().get("replies", [])]
        check("the ordinary reply is present", len(reply_ids) >= 1, reply_ids)
        check("the unsuitable reply is gone", bad_reply not in reply_ids, reply_ids)

    print("\n== a minor cannot publish prohibited content in a forum ==")
    r = c.post(f"/forums/{forum}/threads", headers=auth(teen_tok),
               json={"title": "A question", "body": "here are my nudes, dm me"})
    check("publication is refused", r.status_code == 403, f"{r.status_code} {r.text[:140]}")
    check("the refusal names no rule",
          "nude" not in r.text.lower() and "sexual" not in r.text.lower(), r.text[:140])

print("\n== community discovery is age-aware ==")
r = c.post("/communities", headers=auth(adult_tok),
           json={"name": f"Adult club {tag()}", "slug": f"a{tag()}",
                 "description": "Explicit sex and full nudes, onlyfans links", "kind": "public"})
adult_comm = r.json().get("id") if r.status_code in (200, 201) else None
r = c.post("/communities", headers=auth(adult_tok),
           json={"name": f"Gardening {tag()}", "slug": f"g{tag()}",
                 "description": "Tomatoes, compost and rain", "kind": "public"})
plain_comm = r.json().get("id") if r.status_code in (200, 201) else None
time.sleep(0.5)

r = c.get("/discover?limit=10", headers=auth(teen_tok))
teen_comms = [x["id"] for x in r.json().get("communities", [])] if r.status_code == 200 else []
check("discover answers for a teenager", r.status_code == 200, r.text[:120])
check("the adult community is not offered to them", adult_comm not in teen_comms, teen_comms[:5])

# Asked as a *third party*: discover excludes communities you have joined, and
# the creator is a member of both. Checking with the creator would have proved
# nothing - the community would be absent for everyone, and the teenager not
# seeing it would look like a pass.
r = c.get("/discover?limit=10", headers=auth(adult2_tok))
adult_comms = [x["id"] for x in r.json().get("communities", [])] if r.status_code == 200 else []
check("an unrelated adult is offered the adult community",
      adult_comm in adult_comms, f"{len(adult_comms)} returned: {adult_comms[:5]}")
check("and is offered the ordinary one too",
      plain_comm in adult_comms, adult_comms[:5])

r = c.get("/discover?limit=10", headers=auth(teen_tok))
teen_comms2 = [x["id"] for x in r.json().get("communities", [])] if r.status_code == 200 else []
check("while the teenager is offered the ordinary one",
      plain_comm in teen_comms2, teen_comms2[:5])
check("but still not the adult one", adult_comm not in teen_comms2, teen_comms2[:5])

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
