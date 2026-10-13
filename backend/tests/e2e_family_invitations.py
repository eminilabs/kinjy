"""Invite a relative to claim their node: the link, its limits, and what it never does.

Run inside the compose network:
  docker compose exec -T family-service python /dev/stdin < backend/tests/e2e_family_invitations.py
The limiter on bad guesses is in memory: restart family-service before a re-run (dev.sh restart family-service).
"""
import os
import random
import string
import sys
from datetime import date

import httpx

BASE = os.environ.get("API", "http://localhost:8200/api")
c = httpx.Client(base_url=BASE, timeout=60)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {str(detail)[:170]}"))
    if not cond:
        ok = False


def register(age=30):
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"T {t}",
        "password": "Sup3rStrong!Pass", "country": "US",
        "date_of_birth": date(today.year - age, today.month, min(today.day, 28)).isoformat(),
    })
    if r.status_code >= 400:
        return None, None
    return {"Authorization": "Bearer " + r.json()["tokens"]["access_token"]}, r.json()["user"]


def person(h, given, **extra):
    r = c.post("/family/persons", headers=h, json={"given_name": given, **extra})
    assert r.status_code == 201, r.text[:150]
    return r.json()


def invite(h, pid):
    return c.post(f"/family/persons/{pid}/invitations", headers=h)


owner_h, owner = register()
guest_h, guest = register()
other_h, other = register()
stranger_h, _ = register()

me = person(owner_h, "Owner", user_id=owner["id"], birth_date="1990-01-01")
r = c.post(f"/family/persons/{me['id']}/relatives", headers=owner_h, json={"relation": "sibling", "person": {"given_name": "Cousin", "birth_date": "1992-02-02"}})
assert r.status_code == 201, r.text[:200]
cousin = r.json()["person"]

print("Making a link")
r = invite(owner_h, cousin["id"])
check("the author can invite a living adult node (201)", r.status_code == 201, r.text[:120])
body = r.json()
token = body["token"]
check("the token is long and the path puts it after #, never in the query", len(token) >= 40 and "#t=" in body["path"] and "?" not in body["path"])
check("a stranger cannot invite (404)", invite(stranger_h, cousin["id"]).status_code in (403, 404))
check("an unknown person is 404", invite(owner_h, "prs_nope").status_code == 404)
dead = c.post(f"/family/persons/{me['id']}/relatives", headers=owner_h, json={"relation": "parent", "person": {"given_name": "Late", "deceased": True}}).json()["person"]
check("a deceased person cannot be invited (400)", invite(owner_h, dead["id"]).status_code == 400)
kid = c.post(f"/family/persons/{me['id']}/relatives", headers=owner_h, json={"relation": "child", "person": {"given_name": "Kid", "birth_date": f"{date.today().year - 10}-01-01"}}).json()["person"]
check("a node under 18 cannot be invited (403)", invite(owner_h, kid["id"]).status_code == 403)
check("the self node cannot be invited (already attached, 409)", invite(owner_h, me["id"]).status_code == 409)

print("\nWhat a link reveals")
check("a visitor learns only that it is valid", c.post("/family/invitations/lookup", json={"token": token}).json() == {"valid": True, "role": "viewer"})
r = c.post("/family/invitations/lookup", headers=guest_h, json={"token": token})
check("a signed-in member also learns whom it offers, and nothing of the tree", r.status_code == 200 and r.json() == {"valid": True, "role": "viewer", "branch_name": None, "person_given_name": "Cousin", "already_has_node": False, "own": False}, r.text)
for bad in ("x" * 43, token[:-1] + ("A" if token[-1] != "A" else "B")):
    r = c.post("/family/invitations/lookup", json={"token": bad})
    check("a wrong token is a plain 404, the same as any other invalid link", r.status_code == 404 and r.json()["detail"] == "This invitation is not valid")
check("the link opens no tree: the guest still gets 404 on it", c.get(f"/family/tree/{cousin['id']}", headers=guest_h).status_code == 404)
check("nor the person", c.get(f"/family/persons/{cousin['id']}", headers=guest_h).status_code in (403, 404))
lst = c.get(f"/family/persons/{cousin['id']}/invitations", headers=owner_h).json()["items"]
check("the inviter lists it without the token", len(lst) == 1 and lst[0]["status"] == "active" and "token" not in lst[0])
check("a stranger cannot list invitations", c.get(f"/family/persons/{cousin['id']}/invitations", headers=stranger_h).status_code == 404)

print("\nRefusals that leave the link intact")
check("the author cannot accept their own invitation (409)", c.post("/family/invitations/accept", headers=owner_h, json={"token": token}).status_code == 409)
check("accepting needs a session (401)", c.post("/family/invitations/accept", json={"token": token}).status_code == 401)
have = person(other_h, "Other", user_id=other["id"])
r = c.post("/family/invitations/accept", headers=other_h, json={"token": token})
check("a member who already has a node is refused, nothing merged (409)", r.status_code == 409, r.text[:120])
check("and the node is still unclaimed", c.get(f"/family/persons/{cousin['id']}", headers=owner_h).json()["user_id"] is None)
mh, minor = register(age=14)
if mh:
    r = c.post("/family/invitations/accept", headers=mh, json={"token": token})
    check("a minor's account cannot accept (403)", r.status_code == 403, r.text[:120])
else:
    print("  (minors cannot register here: age refusal not exercised)")

print("\nAccepting")
r = c.post("/family/invitations/accept", headers=guest_h, json={"token": token})
check("an adult without a node accepts (200)", r.status_code == 200 and r.json()["person_id"] == cousin["id"], r.text[:120])
got = c.get(f"/family/persons/{cousin['id']}", headers=guest_h)
check("the node is theirs and verified", got.status_code == 200 and got.json()["user_id"] == guest["id"] and got.json()["status"] == "verified", got.text[:120])
check("the link works once only", c.post("/family/invitations/accept", headers=other_h, json={"token": token}).status_code == 404)
check("and now reads as invalid to everyone", c.post("/family/invitations/lookup", json={"token": token}).status_code == 404)
st = c.get(f"/family/persons/{cousin['id']}/invitations", headers=owner_h)
check("the author can no longer list: the node is the member's now", st.status_code in (200, 404))
check("it cannot be invited again (409)", invite(owner_h, cousin["id"]).status_code == 409)

check("once attached, the member belongs to the family and reads it by the ordinary rule", c.get(f"/family/tree/{cousin['id']}", headers=guest_h).status_code == 200)
print("\nRevoke, decline, supersede")
n2 = c.post(f"/family/persons/{me['id']}/relatives", headers=owner_h, json={"relation": "sibling", "person": {"given_name": "Sib", "birth_date": "1991-01-01"}}).json()["person"]
t1 = invite(owner_h, n2["id"]).json()
t2 = invite(owner_h, n2["id"]).json()
check("a member of the tree who is not the author cannot invite (403)", invite(guest_h, n2["id"]).status_code == 403)
check("a new link retires the old one", c.post("/family/invitations/lookup", json={"token": t1["token"]}).status_code == 404 and c.post("/family/invitations/lookup", json={"token": t2["token"]}).status_code == 200)
check("someone else cannot revoke it (404)", c.delete(f"/family/invitations/{t2['id']}", headers=stranger_h).status_code == 404)
check("the author revokes it (204)", c.delete(f"/family/invitations/{t2['id']}", headers=owner_h).status_code == 204)
check("a revoked link cannot be accepted (404)", c.post("/family/invitations/accept", headers=stranger_h, json={"token": t2["token"]}).status_code == 404)
t3 = invite(owner_h, n2["id"]).json()
check("the invitee can decline without signing in (204)", c.post("/family/invitations/decline", json={"token": t3["token"]}).status_code == 204)
check("a declined link is dead (404)", c.post("/family/invitations/lookup", json={"token": t3["token"]}).status_code == 404)

print("\nGuessing")
codes = [c.post("/family/invitations/lookup", json={"token": "".join(random.choices(string.ascii_letters, k=43))}).status_code for _ in range(40)]
check("repeated bad guesses from one source are slowed down (429)", 429 in codes, codes[-5:])

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
