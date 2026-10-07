"""Roles and approvals: who may act on whom, and that members_count never drifts.

Owner is untouchable and the only one to change roles. A moderator answers
requests and bans or unbans plain members. Everybody else, including the steward
of another community, has no say. A secret community answers 404 to those who
cannot see it.

Run against the live stack:  python backend/tests/e2e_governance.py
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


def connect(a_tok, b_tok, a_id, b_id):
    """Adding someone to a community is only allowed between connections."""
    c.post(f"/connections/{b_id}", headers=auth(a_tok), json={}).raise_for_status()
    c.post(f"/connections/{a_id}/respond?accept=true", headers=auth(b_tok)).raise_for_status()


def community(tok, kind):
    r = c.post("/communities", headers=auth(tok), json={
        "name": f"{kind} {tag()}", "description": "Tomatoes, compost and rain", "kind": kind,
    })
    r.raise_for_status()
    return r.json()["id"]


def act(tok, cid, uid, action):
    return c.post(f"/communities/{cid}/members/{uid}", headers=auth(tok), json={"action": action})


def join(tok, cid):
    return c.post(f"/communities/{cid}/join", headers=auth(tok))


def roll(tok, cid):
    r = c.get(f"/communities/{cid}/members", headers=auth(tok))
    r.raise_for_status()
    return {m["user_id"]: m for m in r.json()["items"]}


def me(tok, cid):
    r = c.get(f"/communities/{cid}", headers=auth(tok))
    return (r.json().get("my_role"), r.json().get("my_status")) if r.status_code == 200 else (None, None)


def count_matches(owner_tok, cid, label):
    """members_count must equal the number of active rows on the roll."""
    active = sum(1 for m in roll(owner_tok, cid).values() if m["status"] == "active")
    shown = c.get(f"/communities/{cid}", headers=auth(owner_tok)).json()["members_count"]
    check(f"members_count == active memberships ({label})", shown == active, f"count {shown}, active {active}")


def admit(owner_tok, cid, tok, user):
    """A plain active member of a private community."""
    join(tok, cid).raise_for_status()
    act(owner_tok, cid, user["id"], "approve").raise_for_status()


owner_tok, owner = register()
mod_tok, mod = register()
mod2_tok, mod2 = register()
alice_tok, alice = register()
bob_tok, bob = register()
carol_tok, carol = register()
dave_tok, dave = register()
pending_tok, pending = register()
outsider_tok, outsider = register()
ghost_tok, ghost = register()
other_owner_tok, other_owner = register()

priv = community(owner_tok, "private")
other_c = community(other_owner_tok, "private")

print("\n== private: setting the stage ==")
admit(owner_tok, priv, mod_tok, mod)
admit(owner_tok, priv, mod2_tok, mod2)
admit(owner_tok, priv, alice_tok, alice)
admit(owner_tok, priv, bob_tok, bob)
check("owner promotes a member to moderator", act(owner_tok, priv, mod["id"], "promote").status_code == 200)
check("owner promotes a second moderator", act(owner_tok, priv, mod2["id"], "promote").status_code == 200)
check("the promoted member holds the role", me(mod_tok, priv) == ("moderator", "active"), me(mod_tok, priv))
join(carol_tok, priv)
join(pending_tok, priv)
count_matches(owner_tok, priv, "after the setup")

print("\n== the owner is untouchable ==")
for action in ("approve", "reject", "ban", "unban", "promote", "demote"):
    r = act(mod_tok, priv, owner["id"], action)
    check(f"moderator cannot {action} the owner", r.status_code == 403, f"{r.status_code} {r.text[:80]}")
for action in ("ban", "demote", "reject"):
    r = act(owner_tok, priv, owner["id"], action)
    check(f"owner cannot {action} themself", r.status_code == 403, f"{r.status_code} {r.text[:80]}")
check("the owner is still the owner", me(owner_tok, priv) == ("owner", "active"), me(owner_tok, priv))

print("\n== a moderator and the people around them ==")
r = act(mod_tok, priv, carol["id"], "approve")
check("moderator approves a pending request", r.status_code == 200, f"{r.status_code} {r.text[:80]}")
check("the approved person is active", me(carol_tok, priv) == ("member", "active"), me(carol_tok, priv))
r = act(mod_tok, priv, carol["id"], "approve")
check("approving twice is refused (400)", r.status_code == 400, f"{r.status_code} {r.text[:80]}")
count_matches(owner_tok, priv, "after approving twice")
check("moderator cannot approve an active member (400)",
      act(mod_tok, priv, alice["id"], "approve").status_code == 400)

r = act(mod_tok, priv, pending["id"], "reject")
check("moderator rejects a pending request", r.status_code == 200, f"{r.status_code} {r.text[:80]}")
check("a rejected request leaves no row", pending["id"] not in roll(owner_tok, priv))
check("a rejected person may ask again", join(pending_tok, priv).json().get("status") == "pending")
check("moderator cannot reject an active member (400)",
      act(mod_tok, priv, alice["id"], "reject").status_code == 400)
check("alice is still in after the refused reject", me(alice_tok, priv) == ("member", "active"))
count_matches(owner_tok, priv, "after refused reject")

for action in ("ban", "unban", "reject", "approve", "promote", "demote"):
    r = act(mod_tok, priv, mod2["id"], action)
    check(f"moderator cannot {action} another moderator", r.status_code == 403, f"{r.status_code} {r.text[:80]}")
check("moderator cannot promote a plain member", act(mod_tok, priv, alice["id"], "promote").status_code == 403)
check("moderator cannot demote anybody", act(mod_tok, priv, mod2["id"], "demote").status_code == 403)
check("moderator cannot act on themself", act(mod_tok, priv, mod["id"], "ban").status_code == 403)
check("the moderators kept their role", me(mod2_tok, priv) == ("moderator", "active") and me(mod_tok, priv)[0] == "moderator")

print("\n== ban and unban ==")
r = act(mod_tok, priv, alice["id"], "ban")
check("moderator bans a plain member", r.status_code == 200, f"{r.status_code} {r.text[:80]}")
check("the banned member is banned", roll(owner_tok, priv)[alice["id"]]["status"] == "banned")
count_matches(owner_tok, priv, "after a ban")
check("banned member cannot join again (403)", join(alice_tok, priv).status_code == 403)
check("banned member cannot leave (403)",
      c.post(f"/communities/{priv}/leave", headers=auth(alice_tok)).status_code == 403)
check("banned member has no governance rights", act(alice_tok, priv, bob["id"], "ban").status_code == 403)
check("banned member cannot read the roll",
      c.get(f"/communities/{priv}/members", headers=auth(alice_tok)).status_code == 403)
check("banning twice changes nothing", act(mod_tok, priv, alice["id"], "ban").status_code == 200)
count_matches(owner_tok, priv, "after banning twice")
check("a banned person cannot be approved (400)", act(mod_tok, priv, alice["id"], "approve").status_code == 400)
check("a banned person cannot be rejected away (400)", act(mod_tok, priv, alice["id"], "reject").status_code == 400)
check("a banned person cannot be promoted (400)", act(owner_tok, priv, alice["id"], "promote").status_code == 400)
check("the ban survived", roll(owner_tok, priv)[alice["id"]]["status"] == "banned")

r = act(mod_tok, priv, alice["id"], "unban")
check("moderator unbans", r.status_code == 200, f"{r.status_code} {r.text[:80]}")
check("the unbanned member is an active plain member", me(alice_tok, priv) == ("member", "active"), me(alice_tok, priv))
count_matches(owner_tok, priv, "after an unban")
check("unbanning an active member is refused (400)", act(mod_tok, priv, alice["id"], "unban").status_code == 400)
check("unbanning a pending request is refused (400)",
      act(mod_tok, priv, pending["id"], "unban").status_code == 400)
check("the pending request was not approved by the unban",
      roll(owner_tok, priv)[pending["id"]]["status"] == "pending")
count_matches(owner_tok, priv, "after refused unbans")

r = act(mod_tok, priv, pending["id"], "ban")
check("a pending request can be banned", r.status_code == 200, f"{r.status_code} {r.text[:80]}")
check("the banned requester stays banned, not pending", roll(owner_tok, priv)[pending["id"]]["status"] == "banned")
check("the banned requester cannot ask again (403)", join(pending_tok, priv).status_code == 403)
count_matches(owner_tok, priv, "after banning a request")
check("owner unbans the requester", act(owner_tok, priv, pending["id"], "unban").status_code == 200)
count_matches(owner_tok, priv, "after unbanning the requester")

print("\n== the owner and roles ==")
check("owner bans a moderator", act(owner_tok, priv, mod2["id"], "ban").status_code == 200)
check("a banned moderator loses the role", roll(owner_tok, priv)[mod2["id"]]["role"] == "member")
count_matches(owner_tok, priv, "after banning a moderator")
check("owner unbans them as a plain member", act(owner_tok, priv, mod2["id"], "unban").status_code == 200)
check("they come back as a plain member", me(mod2_tok, priv) == ("member", "active"), me(mod2_tok, priv))
check("they have no governance rights again", act(mod2_tok, priv, bob["id"], "ban").status_code == 403)
count_matches(owner_tok, priv, "after unbanning a moderator")
check("demote a plain member is refused (400)", act(owner_tok, priv, bob["id"], "demote").status_code == 400)
check("promote a moderator again is refused (400)", act(owner_tok, priv, mod["id"], "promote").status_code == 400)
check("owner demotes a moderator", act(owner_tok, priv, mod["id"], "demote").status_code == 200)
check("the demoted moderator is a member", me(mod_tok, priv) == ("member", "active"))
check("the demoted moderator cannot ban", act(mod_tok, priv, bob["id"], "ban").status_code == 403)
check("promoting someone who never asked is 404", act(owner_tok, priv, dave["id"], "promote").status_code == 404)
join(dave_tok, priv)
check("a pending request cannot be promoted (400)", act(owner_tok, priv, dave["id"], "promote").status_code == 400)
check("a pending request cannot be demoted (400)", act(owner_tok, priv, dave["id"], "demote").status_code == 400)
check("owner rejects dave", act(owner_tok, priv, dave["id"], "reject").status_code == 200)

print("\n== who has no rights at all ==")
join(dave_tok, priv)
for who, tok in (("plain member", bob_tok), ("pending requester", dave_tok), ("outsider", outsider_tok),
                 ("steward of another community", other_owner_tok)):
    for action in ("approve", "reject", "ban", "unban", "promote", "demote"):
        r = act(tok, priv, carol["id"], action)
        check(f"{who} cannot {action}", r.status_code == 403, f"{r.status_code} {r.text[:80]}")
    r = c.get(f"/communities/{priv}/members", headers=auth(tok))
    check(f"{who} cannot read the roll", r.status_code == 403, f"{r.status_code}")
check("an anonymous caller is refused",
      c.post(f"/communities/{priv}/members/{carol['id']}", json={"action": "ban"}).status_code in (401, 403))
check("the steward of another community still rules their own",
      act(other_owner_tok, other_c, outsider["id"], "approve").status_code == 404)
check("carol survived all of it", me(carol_tok, priv) == ("member", "active"))
count_matches(owner_tok, priv, "after the refused attempts")

print("\n== errors ==")
check("an unknown person is 404", act(owner_tok, priv, ghost["id"], "ban").status_code == 404)
check("a person of another community is 404", act(owner_tok, priv, other_owner["id"], "ban").status_code == 404)
check("an invalid action is 422", act(owner_tok, priv, carol["id"], "kick").status_code == 422)
check("a missing action is 422",
      c.post(f"/communities/{priv}/members/{carol['id']}", headers=auth(owner_tok), json={}).status_code == 422)
check("an unknown community is 404", act(owner_tok, "no-such-community", carol["id"], "ban").status_code == 404)
check("an unknown community roll is 404",
      c.get("/communities/no-such-community/members", headers=auth(owner_tok)).status_code == 404)

print("\n== a banned member loses the rest of the doors ==")
secret_c = community(owner_tok, "secret")
connect(owner_tok, bob_tok, owner["id"], bob["id"])
connect(owner_tok, carol_tok, owner["id"], carol["id"])
check("owner adds bob to the secret community",
      c.post(f"/communities/{secret_c}/invite", headers=auth(owner_tok), json={"user_id": bob["id"]}).status_code == 201)
check("owner adds carol to the secret community",
      c.post(f"/communities/{secret_c}/invite", headers=auth(owner_tok), json={"user_id": carol["id"]}).status_code == 201)
r = c.post(f"/communities/{secret_c}/invitations", headers=auth(owner_tok), json={"user_id": alice["id"]})
check("alice holds a pending invitation", r.status_code == 201, f"{r.status_code} {r.text[:80]}")
invitation = r.json().get("id")
link = c.post(f"/communities/{secret_c}/links", headers=auth(owner_tok), json={}).json()

check("owner bans bob from the secret community", act(owner_tok, secret_c, bob["id"], "ban").status_code == 200)
count_matches(owner_tok, secret_c, "secret, after a ban")
check("a banned member no longer sees the secret community (404)",
      c.get(f"/communities/{secret_c}", headers=auth(bob_tok)).status_code == 404)
check("banned member cannot join the secret community", join(bob_tok, secret_c).status_code == 403)
r = c.post("/communities/links/redeem", headers=auth(bob_tok), json={"token": link["token"]})
check("banned member cannot redeem a link (403)", r.status_code == 403, f"{r.status_code}")
r = c.post(f"/communities/{secret_c}/invitations", headers=auth(owner_tok), json={"user_id": bob["id"]})
check("banned member cannot be invited (409)", r.status_code == 409, f"{r.status_code} {r.text[:80]}")
r = c.post(f"/communities/{secret_c}/invite", headers=auth(owner_tok), json={"user_id": bob["id"]})
check("banned member is not re-added directly", r.status_code == 201 and r.json().get("invited") is False,
      f"{r.status_code} {r.text[:80]}")
check("the ban is still on", roll(owner_tok, secret_c)[bob["id"]]["status"] == "banned")
count_matches(owner_tok, secret_c, "secret, after the refused re-entries")

r = c.post(f"/communities/invitations/{invitation}/accept", headers=auth(alice_tok))
check("alice accepts her invitation", r.status_code == 200, f"{r.status_code} {r.text[:80]}")
check("owner bans her", act(owner_tok, secret_c, alice["id"], "ban").status_code == 200)
check("owner unbans her", act(owner_tok, secret_c, alice["id"], "unban").status_code == 200)
count_matches(owner_tok, secret_c, "secret, after ban and unban")

# A banned user holding an old invitation.
r = c.post(f"/communities/{secret_c}/invitations", headers=auth(owner_tok), json={"user_id": dave["id"]})
dave_invitation = r.json().get("id")
join_dave = c.post("/communities/links/redeem", headers=auth(dave_tok), json={"token": link["token"]})
check("dave enters by link", join_dave.status_code == 200, f"{join_dave.status_code}")
check("owner bans dave", act(owner_tok, secret_c, dave["id"], "ban").status_code == 200)
r = c.post(f"/communities/invitations/{dave_invitation}/accept", headers=auth(dave_tok))
check("banned member cannot accept an invitation (403)", r.status_code == 403, f"{r.status_code} {r.text[:80]}")
count_matches(owner_tok, secret_c, "secret, after refused accept")

print("\n== secret: 404 discipline ==")
check("owner promotes carol in the secret community", act(owner_tok, secret_c, carol["id"], "promote").status_code == 200)
check("a moderator of a secret community may ban a plain member",
      act(carol_tok, secret_c, alice["id"], "ban").status_code == 200)
check("...and unban them", act(carol_tok, secret_c, alice["id"], "unban").status_code == 200)
check("...but not the owner", act(carol_tok, secret_c, owner["id"], "ban").status_code == 403)
for who, tok in (("outsider", outsider_tok), ("banned member", bob_tok), ("stranger steward", other_owner_tok)):
    r = act(tok, secret_c, alice["id"], "ban")
    check(f"{who} acting on a secret community gets 404", r.status_code == 404, f"{r.status_code} {r.text[:80]}")
    r = c.get(f"/communities/{secret_c}/members", headers=auth(tok))
    check(f"{who} listing a secret community gets 404", r.status_code == 404, f"{r.status_code}")
    r = c.post(f"/communities/{secret_c}/invite", headers=auth(tok), json={"user_id": ghost["id"]})
    check(f"{who} inviting into a secret community gets 404", r.status_code == 404, f"{r.status_code} {r.text[:80]}")
r = act(outsider_tok, secret_c, alice["id"], "ban")
r2 = act(outsider_tok, "no-such-community", alice["id"], "ban")
check("a secret community and a missing one answer alike", r.status_code == r2.status_code and r.json() == r2.json(),
      f"{r.status_code} {r.text[:60]} / {r2.status_code} {r2.text[:60]}")
check("alice is untouched by the refused attempts", roll(owner_tok, secret_c)[alice["id"]]["status"] == "active")
count_matches(owner_tok, secret_c, "secret, after the refused attempts")

print("\n== public: roles and bans ==")
pub = community(owner_tok, "public")
for tok in (mod_tok, alice_tok, bob_tok, carol_tok):
    check("anyone joins a public community at once", join(tok, pub).json().get("status") == "active")
count_matches(owner_tok, pub, "public, after the joins")
check("owner promotes a public member", act(owner_tok, pub, mod["id"], "promote").status_code == 200)
check("approve has nothing to approve in public (400)", act(owner_tok, pub, alice["id"], "approve").status_code == 400)
check("moderator bans a plain public member", act(mod_tok, pub, alice["id"], "ban").status_code == 200)
count_matches(owner_tok, pub, "public, after a ban")
check("a banned member cannot rejoin a public community (403)", join(alice_tok, pub).status_code == 403)
check("a banned member still reads the public community page",
      c.get(f"/communities/{pub}", headers=auth(alice_tok)).status_code == 200)
check("moderator cannot ban the owner", act(mod_tok, pub, owner["id"], "ban").status_code == 403)
check("moderator cannot promote in public", act(mod_tok, pub, bob["id"], "promote").status_code == 403)
check("plain public member cannot ban", act(bob_tok, pub, carol["id"], "ban").status_code == 403)
check("moderator unbans", act(mod_tok, pub, alice["id"], "unban").status_code == 200)
count_matches(owner_tok, pub, "public, after an unban")

print("\n== members_count after a scripted sequence ==")
seq = community(owner_tok, "private")
count_matches(owner_tok, seq, "fresh community")
for tok in (alice_tok, bob_tok, carol_tok, dave_tok):
    join(tok, seq)
count_matches(owner_tok, seq, "four requests waiting")
check("owner approves alice", act(owner_tok, seq, alice["id"], "approve").status_code == 200)
check("owner approves bob", act(owner_tok, seq, bob["id"], "approve").status_code == 200)
act(owner_tok, seq, bob["id"], "approve")
count_matches(owner_tok, seq, "approve, approve, approve again")
check("owner promotes alice", act(owner_tok, seq, alice["id"], "promote").status_code == 200)
count_matches(owner_tok, seq, "promote")
check("alice (moderator) approves carol", act(alice_tok, seq, carol["id"], "approve").status_code == 200)
check("alice (moderator) bans bob", act(alice_tok, seq, bob["id"], "ban").status_code == 200)
count_matches(owner_tok, seq, "ban")
check("bob rejoining is refused", join(bob_tok, seq).status_code == 403)
check("owner unbans bob", act(owner_tok, seq, bob["id"], "unban").status_code == 200)
count_matches(owner_tok, seq, "unban")
check("carol leaves", c.post(f"/communities/{seq}/leave", headers=auth(carol_tok)).status_code == 200)
count_matches(owner_tok, seq, "leave")
check("dave withdraws his request", c.post(f"/communities/{seq}/leave", headers=auth(dave_tok)).status_code == 200)
count_matches(owner_tok, seq, "a pending request leaves")
check("owner demotes alice", act(owner_tok, seq, alice["id"], "demote").status_code == 200)
count_matches(owner_tok, seq, "demote")
check("owner bans alice", act(owner_tok, seq, alice["id"], "ban").status_code == 200)
check("owner bans alice twice", act(owner_tok, seq, alice["id"], "ban").status_code == 200)
count_matches(owner_tok, seq, "ban twice")
check("owner unbans alice", act(owner_tok, seq, alice["id"], "unban").status_code == 200)
check("owner unbans alice twice (400)", act(owner_tok, seq, alice["id"], "unban").status_code == 400)
count_matches(owner_tok, seq, "unban twice")
final = c.get(f"/communities/{seq}", headers=auth(owner_tok)).json()["members_count"]
check("owner, alice and bob remain: 3", final == 3, final)

print("\nALL CHECKS PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
