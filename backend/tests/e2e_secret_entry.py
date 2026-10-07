"""Two more ways into a secret community: an invitation the invitee accepts, and an invite link.

The direct add stays. Knowing a secret community's id is still not an invitation,
and a link grants nothing until somebody redeems it.

Run against the live stack:  python backend/tests/e2e_secret_entry.py
"""
import random
import string
import sys
import time
from datetime import date, datetime, timedelta, timezone

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


def community(tok, kind):
    r = c.post("/communities", headers=auth(tok), json={
        "name": f"{kind} {tag()}", "description": "Tomatoes, compost and rain", "kind": kind,
    })
    r.raise_for_status()
    return r.json()["id"]


def make_link(tok, cid, **body):
    return c.post(f"/communities/{cid}/links", headers=auth(tok), json=body)


def redeem(tok, token):
    return c.post("/communities/links/redeem", headers=auth(tok), json={"token": token})


def reads(tok, cid):
    return c.get(f"/communities/{cid}", headers=auth(tok)).status_code


owner_tok, owner = register()
alice_tok, alice = register()
bob_tok, bob = register()
carol_tok, carol = register()
dave_tok, dave = register()
outsider_tok, outsider = register()

secret_c = community(owner_tok, "secret")
public_c = community(owner_tok, "public")

print("\n== invitation with acceptance ==")
r = c.post(f"/communities/{secret_c}/invitations", headers=auth(owner_tok), json={"user_id": alice["id"]})
check("a member invites someone (no connection needed)", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
inv_alice = r.json().get("id")
check("the invitee is not a member yet", reads(alice_tok, secret_c) == 404, reads(alice_tok, secret_c))
r = c.post(f"/communities/{secret_c}/invitations", headers=auth(owner_tok), json={"user_id": alice["id"]})
check("a second pending invitation is refused", r.status_code == 409, f"{r.status_code} {r.text[:100]}")
r = c.get("/communities/me/invitations", headers=auth(alice_tok))
ids = [i["id"] for i in r.json().get("items", [])] if r.status_code == 200 else []
check("the invitee lists it", inv_alice in ids, f"{r.status_code} {r.text[:120]}")
r = c.get("/communities/me/invitations", headers=auth(bob_tok))
check("someone else does not", inv_alice not in [i["id"] for i in r.json().get("items", [])], r.text[:100])
r = c.post(f"/communities/invitations/{inv_alice}/accept", headers=auth(bob_tok))
check("another user cannot accept it", r.status_code == 404, f"{r.status_code}")
r = c.post(f"/communities/invitations/{inv_alice}/accept", headers=auth(alice_tok))
check("the invitee accepts", r.status_code == 200 and r.json().get("status") == "active", f"{r.status_code} {r.text[:100]}")
check("and now reads the community", reads(alice_tok, secret_c) == 200)
r = c.get(f"/communities/{secret_c}", headers=auth(owner_tok))
check("members_count went from 1 to 2", r.json().get("members_count") == 2, r.text[:150])
r = c.post(f"/communities/invitations/{inv_alice}/accept", headers=auth(alice_tok))
check("an accepted invitation cannot be used twice", r.status_code == 404, f"{r.status_code}")
r = c.post(f"/communities/{secret_c}/invitations", headers=auth(owner_tok), json={"user_id": alice["id"]})
check("inviting someone already in is refused", r.status_code == 409, f"{r.status_code}")

r = c.post(f"/communities/{secret_c}/invitations", headers=auth(alice_tok), json={"user_id": bob["id"]})
check("a plain member may invite too", r.status_code == 201, f"{r.status_code} {r.text[:100]}")
inv_bob = r.json().get("id")
r = c.post(f"/communities/invitations/{inv_bob}/decline", headers=auth(bob_tok))
check("the invitee declines", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
check("declining does not let them in", reads(bob_tok, secret_c) == 404)
r = c.post(f"/communities/invitations/{inv_bob}/accept", headers=auth(bob_tok))
check("a declined invitation cannot be accepted", r.status_code == 404, f"{r.status_code}")
r = c.get(f"/communities/{secret_c}", headers=auth(owner_tok))
check("members_count is still 2", r.json().get("members_count") == 2, r.text[:150])
r = c.post(f"/communities/{secret_c}/invitations", headers=auth(alice_tok), json={"user_id": bob["id"]})
check("after a decline, a fresh invitation is allowed", r.status_code == 201, f"{r.status_code}")

print("\n== who may and may not invite ==")
r = c.post(f"/communities/{secret_c}/invitations", headers=auth(outsider_tok), json={"user_id": carol["id"]})
check("a non-member gets 404, as if it does not exist", r.status_code == 404, f"{r.status_code}")
r2 = c.post("/communities/cmy_doesnotexist/invitations", headers=auth(outsider_tok), json={"user_id": carol["id"]})
check("same status and body as a community that does not exist",
      r.status_code == r2.status_code and r.json() == r2.json(), f"{r.text[:80]} vs {r2.text[:80]}")
r = c.post(f"/communities/{secret_c}/invitations", headers=auth(owner_tok), json={"user_id": "usr_doesnotexist"})
check("inviting a user who does not exist is refused", r.status_code == 404, f"{r.status_code} {r.text[:100]}")
r = c.post(f"/communities/{secret_c}/invitations", headers=auth(owner_tok), json={"user_id": owner["id"]})
check("inviting yourself is refused", r.status_code == 400, f"{r.status_code}")
r = c.post(f"/communities/{public_c}/invitations", headers=auth(owner_tok), json={"user_id": carol["id"]})
check("invitations are for secret communities only (400)", r.status_code == 400, f"{r.status_code}")

print("\n== a banned person cannot be invited ==")
r = make_link(owner_tok, secret_c)
tok_dave = r.json().get("token")
r = redeem(dave_tok, tok_dave)
check("dave enters through a link", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
r = c.post(f"/communities/{secret_c}/members/{dave['id']}", headers=auth(owner_tok), json={"action": "ban"})
check("the owner bans dave", r.status_code == 200, f"{r.status_code}")
r = c.post(f"/communities/{secret_c}/invitations", headers=auth(owner_tok), json={"user_id": dave["id"]})
check("a banned user cannot be invited", r.status_code == 409, f"{r.status_code} {r.text[:100]}")
r_active = c.post(f"/communities/{secret_c}/invitations", headers=auth(owner_tok), json={"user_id": alice["id"]})
check("and the refusal reads the same as for a member already in",
      r.status_code == r_active.status_code and r.json() == r_active.json(), f"{r.text[:80]} vs {r_active.text[:80]}")

print("\n== invite link ==")
r = make_link(alice_tok, secret_c)
check("a plain member cannot create a link", r.status_code == 403, f"{r.status_code}")
r = make_link(outsider_tok, secret_c)
check("a non-member gets 404", r.status_code == 404, f"{r.status_code}")
r = make_link(owner_tok, public_c)
check("links are for secret communities only (400)", r.status_code == 400, f"{r.status_code}")
r = make_link(owner_tok, secret_c, expires_at=(datetime.now(timezone.utc) - timedelta(hours=1)).isoformat())
check("a link that is already expired is refused", r.status_code == 400, f"{r.status_code}")

r = make_link(owner_tok, secret_c, max_uses=2)
check("the owner creates a link", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
link = r.json()
token, link_id = link.get("token"), link.get("id")
check("the raw token is returned once", bool(token) and len(token) >= 32, link)
check("and it is not the community id", token != secret_c and secret_c not in token)
r = c.get(f"/communities/{secret_c}/links", headers=auth(owner_tok))
items = r.json().get("items", []) if r.status_code == 200 else []
check("the owner lists links", any(i["id"] == link_id for i in items), f"{r.status_code} {r.text[:120]}")
check("and the list carries no token", token not in r.text and all("token" not in i for i in items), r.text[:200])
r = c.get(f"/communities/{secret_c}/links", headers=auth(alice_tok))
check("a plain member cannot list links", r.status_code == 403, f"{r.status_code}")

r = c.post(f"/communities/{secret_c}/join", headers=auth(outsider_tok))
check("the community id alone still answers 404 on join", r.status_code == 404, f"{r.status_code}")
check("a link grants nothing before it is redeemed", reads(carol_tok, secret_c) == 404)

r = redeem(carol_tok, token)
check("carol redeems the link", r.status_code == 200 and r.json().get("status") == "active", f"{r.status_code} {r.text[:100]}")
check("and reads the community", reads(carol_tok, secret_c) == 200)
r = redeem(carol_tok, token)
check("redeeming again just reports she is in", r.status_code == 200 and r.json().get("already") is True, f"{r.status_code} {r.text[:100]}")
r = c.get(f"/communities/{secret_c}/links", headers=auth(owner_tok))
uses = [i["uses"] for i in r.json()["items"] if i["id"] == link_id]
check("and spends no use (uses == 1)", uses == [1], uses)

erin_tok, erin = register()
frank_tok, frank = register()
r = redeem(erin_tok, token)
check("the second use works", r.status_code == 200, f"{r.status_code}")
r = redeem(frank_tok, token)
check("a third use is refused once max_uses is reached (404)", r.status_code == 404, f"{r.status_code}")
check("and frank is not in", reads(frank_tok, secret_c) == 404)
r = c.get(f"/communities/{secret_c}", headers=auth(owner_tok))
check("members_count counts alice, carol and erin and the owner, and the earlier dave",
      r.json().get("members_count") == 4, r.text[:150])

print("\n== a banned person cannot redeem ==")
r = make_link(owner_tok, secret_c)
fresh = r.json().get("token")
r = redeem(dave_tok, fresh)
check("a banned user is refused", r.status_code == 403, f"{r.status_code} {r.text[:100]}")
check("and stays out", reads(dave_tok, secret_c) == 404)

print("\n== invalid, revoked and expired tokens look the same ==")
r_bad = redeem(frank_tok, "not-a-real-token-" + tag())
check("an unknown token answers 404", r_bad.status_code == 404, f"{r_bad.status_code}")
r = make_link(owner_tok, secret_c)
rev_token, rev_id = r.json()["token"], r.json()["id"]
r = c.delete(f"/communities/{secret_c}/links/{rev_id}", headers=auth(alice_tok))
check("a plain member cannot revoke", r.status_code == 403, f"{r.status_code}")
r = c.delete(f"/communities/{secret_c}/links/{rev_id}", headers=auth(owner_tok))
check("the owner revokes a link", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
r_rev = redeem(frank_tok, rev_token)
check("a revoked token answers 404", r_rev.status_code == 404, f"{r_rev.status_code}")
check("with the very same body as an unknown one", r_rev.json() == r_bad.json(), f"{r_rev.text} vs {r_bad.text}")
check("and frank is still out", reads(frank_tok, secret_c) == 404)

r = make_link(owner_tok, secret_c, expires_at=(datetime.now(timezone.utc) + timedelta(seconds=3)).isoformat())
short = r.json().get("token")
check("a link with a short expiry is created", r.status_code == 201, f"{r.status_code} {r.text[:100]}")
time.sleep(4)
r_exp = redeem(frank_tok, short)
check("an expired token answers 404", r_exp.status_code == 404, f"{r_exp.status_code}")
check("with the same body again", r_exp.json() == r_bad.json(), f"{r_exp.text}")

print("\n== a link into a non-secret community does not exist ==")
r = make_link(owner_tok, public_c)
check("none can be minted for a public community", r.status_code == 400, f"{r.status_code}")
r = c.get(f"/communities/{public_c}/links", headers=auth(owner_tok))
check("nor listed", r.status_code == 400, f"{r.status_code}")

print("\n== the old direct add still works ==")
c.post(f"/connections/{frank['id']}", headers=auth(owner_tok), json={}).raise_for_status()
c.post(f"/connections/{owner['id']}/respond?accept=true", headers=auth(frank_tok)).raise_for_status()
r = c.post(f"/communities/{secret_c}/invite", headers=auth(owner_tok), json={"user_id": frank["id"]})
check("a member adds a connection directly", r.status_code == 201, f"{r.status_code} {r.text[:100]}")
check("and frank reads it", reads(frank_tok, secret_c) == 200)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
