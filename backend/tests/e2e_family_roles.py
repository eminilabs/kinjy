"""Owner, contributor and viewer in a family tree, against the live API.

A role is held through a membership and nothing else: being a relative gives none. Viewers
read; contributors add and change what the rules let them; owners also manage members and
a tree always keeps one. Run inside the compose network, with the limiter fresh:
  dev.sh restart family-service
  sed 's#http://localhost:8200/api#http://gateway:8000/api#' backend/tests/e2e_family_roles.py | docker exec -i kaluta-family python -
"""
import random
import string
import sys
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
c = httpx.Client(base_url=BASE, timeout=60)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {str(detail)[:170]}"))
    if not cond:
        ok = False


def register(who_can_see_family=None):
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"T {t}",
        "password": "Sup3rStrong!Pass", "country": "US",
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
    })
    r.raise_for_status()
    h = {"Authorization": "Bearer " + r.json()["tokens"]["access_token"]}
    if who_can_see_family:
        assert c.patch("/preferences", headers=h, json={"who_can_see_family": who_can_see_family}).status_code == 200
    return h, r.json()["user"]


def relative(h, anchor, relation, given, **extra):
    return c.post(f"/family/persons/{anchor}/relatives", headers=h, json={"relation": relation, "person": {"given_name": given, "birth_date": extra.pop("born", "1990-01-01")}, **extra})


def invite(h, pid, role=None):
    return c.post(f"/family/persons/{pid}/invitations", headers=h, json={"role": role} if role else {})


def join(inviter_h, anchor, name, role=None):
    """Invite someone onto a new place next to ``anchor`` and have them accept; returns (headers, user, node id)."""
    node = relative(inviter_h, anchor, "sibling", name).json()["person"]
    token = invite(inviter_h, node["id"], role).json()["token"]
    h, u = register()
    r = c.post("/family/invitations/accept", headers=h, json={"token": token})
    assert r.status_code == 200, r.text
    return h, u, node["id"], r.json()


def detail(h, pid):
    return c.get(f"/family/persons/{pid}", headers=h)


oh, ou = register()
me = c.post("/family/persons", headers=oh, json={"given_name": "Owner", "user_id": ou["id"], "birth_date": "1985-01-01"}).json()
dad = relative(oh, me["id"], "parent", "Dad", role="father", born="1955-01-01").json()["person"]
owner_made = relative(oh, me["id"], "sibling", "OwnerMade").json()["person"]

print("Starting a tree makes you its owner")
check("the one who adds themselves is an owner", detail(oh, me["id"]).json()["permissions"]["role"] == "owner")
check("and sees the member tools", detail(oh, me["id"]).json()["permissions"]["can_manage_members"] is True)

print("\nInvitations carry a role; viewer is the default")
node_v = relative(oh, me["id"], "sibling", "Vera").json()["person"]
r = invite(oh, node_v["id"])
check("the default role is viewer", r.status_code == 201 and r.json()["role"] == "viewer", r.text[:120])
vh, vu = register()
check("accepting returns that role", (lambda x: x.status_code == 200 and x.json()["role"] == "viewer")(c.post("/family/invitations/accept", headers=vh, json={"token": r.json()["token"]})))
ch, cu, c_node, _ = join(oh, me["id"], "Cleo", "contributor")
check("an owner can invite a contributor", detail(ch, c_node).json()["permissions"]["role"] == "contributor")
check("a viewer role is stored on the viewer's place", detail(vh, node_v["id"]).json()["permissions"]["role"] == "viewer")
r = invite(oh, relative(oh, me["id"], "sibling", "Nobody").json()["person"]["id"], "owner")
check("an invitation cannot make an owner (422)", r.status_code == 422, r.text[:100])

print("\nViewer: reads, never writes")
check("reads the tree", c.get(f"/family/tree/{me['id']}", headers=vh).status_code == 200)
check("reads a person", detail(vh, dad["id"]).status_code == 200)
p = detail(vh, dad["id"]).json()["permissions"]
check("every write capability is off in what the server returns", not any(p[k] for k in ("can_edit", "can_delete", "can_link", "can_confirm", "can_invite", "can_manage_members")) and p["role"] == "viewer", p)
check("cannot add a relative (403)", relative(vh, dad["id"], "child", "X").status_code == 403)
check("cannot link two people (403)", c.post("/family/relationships", headers=vh, json={"from_person_id": dad["id"], "to_person_id": owner_made["id"], "kind": "sibling_of"}).status_code == 403)
check("cannot confirm (403)", c.post(f"/family/persons/{dad['id']}/confirm", headers=vh, json={"decision": "confirm"}).status_code == 403)
check("cannot dispute (403)", c.post(f"/family/persons/{dad['id']}/confirm", headers=vh, json={"decision": "dispute", "note": "no"}).status_code == 403)
check("cannot edit another's node (403)", c.patch(f"/family/persons/{dad['id']}", headers=vh, json={"given_name": "Z"}).status_code == 403)
check("cannot delete one (403)", c.delete(f"/family/persons/{owner_made['id']}", headers=vh).status_code == 403)
check("cannot add to the archive (403)", c.post("/family/heritage", headers=vh, json={"person_id": dad["id"], "kind": "photo", "title": "x", "source_url": "https://x.example/a.jpg"}).status_code == 403)
check("cannot invite anyone (403)", invite(vh, owner_made["id"]).status_code == 403)
check("cannot see the member list (403)", c.get(f"/family/persons/{me['id']}/members", headers=vh).status_code == 403)
tree_edges = c.get(f"/family/tree/{me['id']}", headers=vh).json()["edges"]
check("no link is offered for removal", all(e["removable"] is False for e in tree_edges))
check("and cannot remove one (403)", c.delete(f"/family/relationships/{tree_edges[0]['id']}", headers=vh).status_code == 403)
check("the tree says what the viewer's role is", c.get(f"/family/tree/{me['id']}", headers=vh).json()["my_role"] == "viewer")

print("\nContributor: adds, and changes what is theirs")
r = relative(ch, dad["id"], "child", "ByCleo", born="1992-01-01")
check("adds a relative (201)", r.status_code == 201, r.text[:100])
mine = r.json()["person"]
check("edits what they added (200)", c.patch(f"/family/persons/{mine['id']}", headers=ch, json={"given_name": "ByCleo2"}).status_code == 200)
check("cannot edit what an owner added (403)", c.patch(f"/family/persons/{owner_made['id']}", headers=ch, json={"given_name": "Z"}).status_code == 403)
check("cannot delete what an owner added (403)", c.delete(f"/family/persons/{owner_made['id']}", headers=ch).status_code == 403)
grandkid = relative(ch, mine["id"], "child", "ByCleoKid", born="2015-01-01").json()["person"]
other_kid = relative(ch, dad["id"], "child", "ByCleoToo", born="1993-01-01").json()["person"]
check("links two people of the tree (201)", c.post("/family/relationships", headers=ch, json={"from_person_id": other_kid["id"], "to_person_id": grandkid["id"], "kind": "guardian_of"}).status_code == 201)
owner_link = [e for e in c.get(f"/family/tree/{me['id']}", headers=ch).json()["edges"] if e["to"] == me["id"] and e["kind"] == "parent_of"][0]
check("cannot remove a link an owner made (403)", c.delete(f"/family/relationships/{owner_link['id']}", headers=ch).status_code == 403)
check("confirms a person (200)", c.post(f"/family/persons/{dad['id']}/confirm", headers=ch, json={"decision": "confirm"}).status_code == 200)
check("adds to the archive (201)", c.post("/family/heritage", headers=ch, json={"person_id": dad["id"], "kind": "photo", "title": "x", "source_url": "https://x.example/a.jpg"}).status_code == 201)
check("cannot invite a contributor (403)", invite(ch, mine["id"], "contributor").status_code == 403)
r = invite(ch, mine["id"], "viewer")
check("can invite a viewer onto a node they added (201)", r.status_code == 201, r.text[:100])
check("cannot invite onto a node an owner added (403)", invite(ch, owner_made["id"], "viewer").status_code == 403)
check("sees no member list (403)", c.get(f"/family/persons/{me['id']}/members", headers=ch).status_code == 403)
check("cannot change anyone's role (404)", c.patch(f"/family/members/{'mem_x'}", headers=ch, json={"role": "owner"}).status_code == 404)
check("deletes what they added (204)", c.delete(f"/family/persons/{mine['id']}", headers=ch).status_code == 204)

print("\nOwner: everything, and the members")
check("edits any node (200)", c.patch(f"/family/persons/{c_node}", headers=oh, json={"given_name": "Cleo B"}).status_code == 200)
mem = c.get(f"/family/persons/{me['id']}/members", headers=oh).json()["items"]
names = {m["name"]: m for m in mem}
check("lists the members with roles, not account ids", {"Owner", "Vera", "Cleo B"} <= set(names) and all("user_id" not in m for m in mem), mem)
check("promotes a viewer to contributor (200)", c.patch(f"/family/members/{names['Vera']['id']}", headers=oh, json={"role": "contributor"}).status_code == 200)
check("and it takes effect at once", relative(vh, dad["id"], "child", "ByVera").status_code == 201)
check("demotes a contributor to viewer (200)", c.patch(f"/family/members/{names['Vera']['id']}", headers=oh, json={"role": "viewer"}).status_code == 200)
check("which takes effect at once too (403)", relative(vh, dad["id"], "child", "ByVera2").status_code == 403)
check("an unknown role is refused (422)", c.patch(f"/family/members/{names['Vera']['id']}", headers=oh, json={"role": "boss"}).status_code == 422)
check("a stranger cannot change roles (404)", c.patch(f"/family/members/{names['Vera']['id']}", headers=register()[0], json={"role": "owner"}).status_code == 404)

print("\nThe last owner")
mine_row = names["Owner"]
check("cannot be demoted (409)", c.patch(f"/family/members/{mine_row['id']}", headers=oh, json={"role": "contributor"}).status_code == 409)
check("cannot be removed (409)", c.delete(f"/family/members/{mine_row['id']}", headers=oh).status_code == 409)
check("make another an owner (200)", c.patch(f"/family/members/{names['Cleo B']['id']}", headers=oh, json={"role": "owner"}).status_code == 200)
check("now the first can step down (200)", c.patch(f"/family/members/{mine_row['id']}", headers=oh, json={"role": "viewer"}).status_code == 200)
check("and the new owner cannot be left alone without one (409)", c.patch(f"/family/members/{names['Cleo B']['id']}", headers=ch, json={"role": "viewer"}).status_code == 409)
check("the former owner no longer manages members (403)", c.get(f"/family/persons/{me['id']}/members", headers=oh).status_code == 403)

print("\nRemoving a member")
vera = names["Vera"]
check("an owner removes a member (204)", c.delete(f"/family/members/{vera['id']}", headers=ch).status_code == 204)
check("they lose the tree at once (404)", c.get(f"/family/tree/{me['id']}", headers=vh).status_code == 404)
check("their place stays in the tree: a person is not an account", c.get(f"/family/persons/{node_v['id']}", headers=ch).status_code == 200)
check("they can still see their own place", detail(vh, node_v["id"]).status_code == 200)
check("but not the tree through it (404)", c.get(f"/family/tree/{node_v['id']}", headers=vh).status_code == 404)
check("the only owner cannot leave (409)", c.delete(f"/family/members/{names['Cleo B']['id']}", headers=ch).status_code == 409)
wh, wu, w_node, _ = join(ch, dad["id"], "Wren")
w_row = [m for m in c.get(f"/family/persons/{me['id']}/members", headers=ch).json()["items"] if m["name"] == "Wren"][0]
check("a member can leave by themselves (204)", c.delete(f"/family/members/{w_row['id']}", headers=wh).status_code == 204)
check("and no longer reads the tree (404)", c.get(f"/family/tree/{me['id']}", headers=wh).status_code == 404)

print("\nA relative has no role")
sh, su = register()
check("an unrelated account sees nothing (404)", c.get(f"/family/tree/{me['id']}", headers=sh).status_code == 404)
rel_h, rel_u = register()
own_rel = c.post("/family/persons", headers=rel_h, json={"given_name": "Elsewhere", "user_id": rel_u["id"]}).json()
check("a person recorded as a member's relative is no member either", c.get(f"/family/tree/{me['id']}", headers=rel_h).status_code == 404)
check("a stranger cannot be invited by a viewer-role holder (403)", invite(vh, owner_made["id"]).status_code in (403, 404))

print("\nReaders through the owner's privacy setting stay readers")
pub_h, pub_u = register(who_can_see_family="everyone")
pub_me = c.post("/family/persons", headers=pub_h, json={"given_name": "Pub", "user_id": pub_u["id"]}).json()
pub_kid = relative(pub_h, pub_me["id"], "child", "PubKid").json()["person"]
check("a stranger reads a tree its owner opened to everyone", c.get(f"/family/tree/{pub_me['id']}", headers=sh).status_code == 200)
p = detail(sh, pub_kid["id"]).json()["permissions"]
check("with no role and no write capability", p["role"] is None and not any(p[k] for k in ("can_edit", "can_delete", "can_link", "can_confirm", "can_invite", "can_manage_members")), p)
check("cannot add (404)", relative(sh, pub_me["id"], "child", "X").status_code == 404)
check("cannot invite (404/403)", invite(sh, pub_kid["id"]).status_code in (403, 404))
check("is not listed as a member", c.get(f"/family/persons/{pub_me['id']}/members", headers=sh).status_code in (403, 404))

print("\nTwo trees with other members are not joined by a link")
a_h, a_u = register(); b_h, b_u = register()
a_me = c.post("/family/persons", headers=a_h, json={"given_name": "A", "user_id": a_u["id"]}).json()
b_me = c.post("/family/persons", headers=b_h, json={"given_name": "B", "user_id": b_u["id"]}).json()
join(b_h, b_me["id"], "BsFriend")
r = c.post("/family/relationships", headers=a_h, json={"from_person_id": a_me["id"], "to_person_id": b_me["id"], "kind": "spouse_of"})
check("no link across another member's tree (404)", r.status_code == 404, r.text[:100])

print("\nA viewer corrects their own details, nothing else")
v2h, v2u, v2_node, _ = join(ch, dad["id"], "Viv")
check("a viewer edits their own place (200)", c.patch(f"/family/persons/{v2_node}", headers=v2h, json={"biography": "mine"}).status_code == 200)
check("but cannot remove it (403)", c.delete(f"/family/persons/{v2_node}", headers=v2h).status_code == 403)
check("and still cannot create or link anyone (403)", relative(v2h, v2_node, "child", "K").status_code == 403)

print("\nRemoving a person must not leave a part of the tree without an owner")
so_h, so_u = register()
so = c.post("/family/persons", headers=so_h, json={"given_name": "SOwner", "user_id": so_u["id"], "birth_date": "1985-01-01"}).json()
mid = relative(so_h, so["id"], "parent", "Mid", born="1955-01-01").json()["person"]
top = relative(so_h, mid["id"], "parent", "Top", born="1930-01-01").json()["person"]
leaf = relative(so_h, so["id"], "child", "Leaf", born="2015-01-01").json()["person"]
r = c.delete(f"/family/persons/{leaf['id']}", headers=so_h)
check("removing a leaf does not split anything and is allowed as before (204)", r.status_code == 204, r.text[:100])
r = c.delete(f"/family/persons/{mid['id']}", headers=so_h)
check("removing the middle one would leave Top in a part with no owner: refused (409)", r.status_code == 409 and "Top" in r.text and "owner" in r.text, r.text[:200])
check("and nothing was removed", c.get(f"/family/persons/{mid['id']}", headers=so_h).status_code == 200 and c.get(f"/family/persons/{top['id']}", headers=so_h).status_code == 200)
link_id = [e["id"] for e in c.get(f"/family/tree/{so['id']}?depth=3", headers=so_h).json()["edges"] if e["from"] == mid["id"] and e["to"] == so["id"]][0]
r = c.delete(f"/family/relationships/{link_id}", headers=so_h)
check("removing the only link to that part is refused too (409)", r.status_code == 409 and "owner" in r.text, r.text[:160])
tok = invite(so_h, top["id"], "contributor").json()["token"]
th, tu = register()
check("someone claims Top's place as a contributor (200)", c.post("/family/invitations/accept", headers=th, json={"token": tok}).status_code == 200)
r = c.delete(f"/family/persons/{mid['id']}", headers=so_h)
check("a contributor is not an owner: still refused (409)", r.status_code == 409, r.text[:120])
row = [m for m in c.get(f"/family/persons/{so['id']}/members", headers=so_h).json()["items"] if m["name"] == "Top"][0]
check("an owner makes them an owner (200)", c.patch(f"/family/members/{row['id']}", headers=so_h, json={"role": "owner"}).status_code == 200)
r = c.delete(f"/family/persons/{mid['id']}", headers=so_h)
check("now both parts keep an owner, so the removal is allowed (204)", r.status_code == 204, r.text[:120])
check("the part that split off is still read by its owner", c.get(f"/family/tree/{top['id']}", headers=th).status_code == 200)
check("and the first part by its own", c.get(f"/family/tree/{so['id']}", headers=so_h).status_code == 200)
check("neither owner reaches the other part now (404)", c.get(f"/family/tree/{top['id']}", headers=so_h).status_code == 404)
x_h, x_u = register()
xo = c.post("/family/persons", headers=x_h, json={"given_name": "XOwner", "user_id": x_u["id"], "birth_date": "1985-01-01"}).json()
xa = relative(x_h, xo["id"], "parent", "XA", born="1955-01-01").json()["person"]
xb = relative(x_h, xa["id"], "parent", "XB", born="1930-01-01").json()["person"]
xl = [e["id"] for e in c.get(f"/family/tree/{xo['id']}?depth=3", headers=x_h).json()["edges"] if e["from"] == xb["id"] and e["to"] == xa["id"]][0]
check("cutting the link to that part is refused (409)", c.delete(f"/family/relationships/{xl}", headers=x_h).status_code == 409)
xleaf = relative(x_h, xo["id"], "child", "XLeaf", born="2015-01-01").json()["person"]
leaf_link = [e["id"] for e in c.get(f"/family/tree/{xo['id']}?depth=3", headers=x_h).json()["edges"] if e["to"] == xleaf["id"]][0]
check("so is unlinking a person who would be left alone with no owner (409)", c.delete(f"/family/relationships/{leaf_link}", headers=x_h).status_code == 409)
check("removing that person altogether splits nothing and is allowed (204)", c.delete(f"/family/persons/{xleaf['id']}", headers=x_h).status_code == 204)
p1 = relative(x_h, xo["id"], "parent", "XP1", born="1960-01-01").json()["person"]
p2 = relative(x_h, xo["id"], "parent", "XP2", born="1961-01-01").json()["person"]
sp = c.post("/family/relationships", headers=x_h, json={"from_person_id": p1["id"], "to_person_id": p2["id"], "kind": "spouse_of"}).json()
check("a link whose removal leaves one connected tree is allowed as before (204)", c.delete(f"/family/relationships/{sp['id']}", headers=x_h).status_code == 204)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
