"""The connect button remembers, against the live API.

The report this exists for: "I sent connection requests to these people, and
when I came back the button said Connect again." It did, because the only
record that the request had been sent was a Set inside the component - gone
with the page.

Asking again is harmless; the endpoint is idempotent, and this checks that it
stays so. The damage is to the member, who cannot tell an unanswered request
from one they never sent, and who learns that the buttons on this page do not
mean anything. So the suggestion has to carry where the two of you already
stand.
"""
import random
import string
import sys
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


def register(age=30):
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"Conn {t}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(date.today().year - age, 4, 4).isoformat(), "country": "US",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"]


def auth(t):
    return {"Authorization": f"Bearer {t}"}


def standing_of(token, user_id, limit=20):
    """What the suggestions endpoint says about one person, if it lists them."""
    r = c.get(f"/users/suggestions?limit={limit}", headers=auth(token))
    r.raise_for_status()
    for item in r.json()["items"]:
        if item["user_id"] == user_id:
            return item.get("connection", "MISSING")
    return None


print("Where the connect button stands")

alice_token, alice = register()
bob_token, bob = register()

# A fresh pair: nothing between them.
before = standing_of(alice_token, bob["id"])
check("a stranger is listed as 'none'", before == "none", str(before))

r = c.post(f"/connections/{bob['id']}", headers=auth(alice_token), json={"message": None})
check("the invitation is accepted", r.status_code in (200, 201), f"{r.status_code} {r.text[:150]}")

# The whole point: a fresh request, as a reloaded page would make.
after = standing_of(alice_token, bob["id"])
check("the sender now sees 'invited'", after == "invited", str(after))

# And the other side sees that they were asked, so their button can offer to
# accept rather than to ask again.
theirs = standing_of(bob_token, alice["id"])
check("the recipient sees 'invites_you'", theirs == "invites_you", str(theirs))

# Pressing it again is what the member did when the button lied to them. The
# server takes it calmly - it is idempotent, and the pair stays pending rather
# than becoming a second row or an error. So the harm was never a failed
# request; it was a member with no way to tell whether they had already asked.
again = c.post(f"/connections/{bob['id']}", headers=auth(alice_token), json={"message": None})
check("asking twice is harmless", again.status_code in (200, 201), str(again.status_code))
check("and leaves the pair pending, not doubled",
      standing_of(alice_token, bob["id"]) == "invited",
      str(standing_of(alice_token, bob["id"])))

# Accepting moves both sides to connected.
accepted = c.post(f"/connections/{alice['id']}/respond?accept=true", headers=auth(bob_token))
check("the recipient can accept", accepted.status_code in (200, 201),
      f"{accepted.status_code} {accepted.text[:120]}")
check("both sides then read 'connected'",
      standing_of(alice_token, bob["id"]) == "connected"
      and standing_of(bob_token, alice["id"]) == "connected",
      f"{standing_of(alice_token, bob['id'])} / {standing_of(bob_token, alice['id'])}")

print("OK" if ok else "FAILED")
sys.exit(0 if ok else 1)
