"""The family tree, against the live API.

What must hold: a tree is private to the people in it, reading is not writing,
the server refuses every relation that contradicts itself, a person can be
edited and removed by the right people only (and removing one takes their
relations with them), and the endpoints that used to answer anyone now answer
only the family.
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
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {str(detail)[:160]}"))
    if not cond:
        ok = False


def tag():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def register(who_can_add_family="connections", who_can_see_family=None):
    t = tag()
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"T {t}",
        "password": "Sup3rStrong!Pass", "country": "US",
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
    })
    r.raise_for_status()
    d = r.json()
    h = {"Authorization": f"Bearer {d['tokens']['access_token']}"}
    prefs = {"who_can_add_family": who_can_add_family}
    if who_can_see_family:
        prefs["who_can_see_family"] = who_can_see_family
    p = c.patch("/preferences", headers=h, json=prefs)
    assert p.status_code == 200, f"preferences: {p.status_code} {p.text[:120]}"
    return h, d["user"]


def person(h, given, **extra):
    r = c.post("/family/persons", headers=h, json={"given_name": given, **extra})
    return r


def mk(h, given, **extra):
    r = person(h, given, **extra)
    assert r.status_code == 201, f"{given}: {r.status_code} {r.text[:160]}"
    return r.json()


def link(h, a, b, kind):
    return c.post("/family/relationships", headers=h, json={"from_person_id": a, "to_person_id": b, "kind": kind})


def tree(h, pid, depth=3):
    return c.get(f"/family/tree/{pid}?depth={depth}", headers=h)


alice_h, alice = register()
stranger_h, stranger = register()
me = mk(alice_h, "Alice", family_name="Mensah", user_id=alice["id"], birth_date="1990-05-01")

print("Nobody without an account sees anything")
anon = {
    "my node": c.get("/family/me"),
    "the list": c.get("/family/persons"),
    "a person": c.get(f"/family/persons/{me['id']}"),
    "a tree": c.get(f"/family/tree/{me['id']}"),
    "a search": c.get("/family/search?q=Alice"),
    "duplicates": c.get(f"/family/duplicates/{me['id']}"),
    "a timeline": c.get(f"/family/timeline/{me['id']}"),
    "the archive": c.get("/family/heritage"),
    "the disputes": c.get("/family/disputes"),
    "a path": c.get(f"/family/how-related?from_person={me['id']}&to_person={me['id']}"),
}
for label, r in anon.items():
    check(f"{label} needs an account (401)", r.status_code == 401, r.status_code)

print("\nCreating a tree")
fresh_h, fresh = register()
r = c.get("/family/me", headers=fresh_h)
check("a member with no node yet gets person: null", r.status_code == 200 and r.json()["person"] is None, r.text)
check("adding yourself verifies your own node", me["status"] == "verified" and me["user_id"] == alice["id"], me)
r = c.get("/family/me", headers=alice_h)
mine = r.json()["person"]
check("/family/me returns the member's node, marked as theirs", r.status_code == 200 and mine["id"] == me["id"] and mine["is_me"] is True, r.text)
check("the server says what the member may do", mine["permissions"]["can_edit"] and mine["permissions"]["can_delete"] and mine["permissions"]["can_link"], mine["permissions"])
r = person(alice_h, "Second", user_id=alice["id"])
check("a member cannot have two nodes (409)", r.status_code == 409, f"{r.status_code} {r.text[:100]}")
r = person(alice_h, "Hijack", user_id=stranger["id"])
check("a node for another member needs that member's consent (403)", r.status_code == 403, f"{r.status_code} {r.text[:100]}")
check("a member who does not exist cannot be given a node", person(alice_h, "Ghost", user_id="usr_doesnotexist").status_code in (403, 404, 400), "")
for label, body in {
    "an empty name": {"given_name": "   "},
    "a name over the limit": {"given_name": "x" * 121},
    "a family name over the limit": {"given_name": "A", "family_name": "y" * 121},
    "a biography over the limit": {"given_name": "A", "biography": "z" * 5001},
    "a script as a picture": {"given_name": "A", "photo_url": "javascript:alert(1)"},
    "a data: blob as a picture": {"given_name": "A", "photo_url": "data:text/html,<script>1</script>"},
}.items():
    r = c.post("/family/persons", headers=alice_h, json=body)
    check(f"{label} is refused (422)", r.status_code == 422, f"{r.status_code} {r.text[:80]}")
check("a birth in the future is refused (400)", person(alice_h, "F", birth_date="2999-01-01").status_code == 400)
check("a death in the future is refused (400)", person(alice_h, "F", death_date="2999-01-01").status_code == 400)
check("a death before the birth is refused (400)", person(alice_h, "F", birth_date="2000-01-01", death_date="1990-01-01").status_code == 400)

mother = mk(alice_h, "Ama", family_name="Mensah", birth_date="1962-03-04")
father = mk(alice_h, "Kofi", family_name="Mensah", birth_date="1960-01-01")
grandma = mk(alice_h, "Akosua", family_name="Boateng", deceased=True, birth_date="1935-02-02", death_date="2010-06-06")
child = mk(alice_h, "Esi", family_name="Mensah", birth_date="2018-09-09")
check("a person with a death date is deceased", grandma["deceased"] is True)

print("\nRelationships")
r = link(alice_h, mother["id"], me["id"], "parent_of")
check("parent -> child is recorded, pending", r.status_code == 201 and r.json()["status"] == "pending", r.text)
check("father -> child", link(alice_h, father["id"], me["id"], "parent_of").status_code == 201)
check("grandmother -> mother", link(alice_h, grandma["id"], mother["id"], "parent_of").status_code == 201)
check("me -> my child", link(alice_h, me["id"], child["id"], "parent_of").status_code == 201)
check("the parents are spouses", link(alice_h, father["id"], mother["id"], "spouse_of").status_code == 201)

t = tree(alice_h, me["id"], 3).json()
levels = {n["person"]["given_name"]: n["level"] for n in t["nodes"]}
check("the tree puts parents above and children below", levels.get("Alice") == 0 and levels.get("Ama") == 1 and levels.get("Akosua") == 2 and levels.get("Esi") == -1, levels)
rel = {n["person"]["given_name"]: n["relation"] for n in t["nodes"]}
check("relations are derived, not stored", rel.get("Ama") == "parent" and rel.get("Akosua") == "grandparent" and rel.get("Esi") == "child", rel)
check("the tree knows who the caller is and how big the family is", t["me"] == me["id"] and t["family_size"] == 5, (t["me"], t["family_size"]))
check("nothing is cut when the whole family fits", t["truncated"] is False)
shallow = tree(alice_h, me["id"], 1).json()
check("a shallow view says there is more beyond it", shallow["truncated"] is True and {n["person"]["given_name"] for n in shallow["nodes"]} <= {"Alice", "Ama", "Kofi", "Esi"}, [n["person"]["given_name"] for n in shallow["nodes"]])
check("a node says whether more lies beyond it", any(n["more"] for n in shallow["nodes"] if n["person"]["given_name"] == "Ama"))

check("the same marriage the other way round is a duplicate (409)", link(alice_h, mother["id"], father["id"], "spouse_of").status_code == 409)
check("the same parent twice is a duplicate (409)", link(alice_h, mother["id"], me["id"], "parent_of").status_code == 409)
check("a second kind of parent for the same pair is refused (409)", link(alice_h, mother["id"], me["id"], "adoptive_parent_of").status_code == 409)
check("a child cannot also be the parent (400)", link(alice_h, me["id"], mother["id"], "parent_of").status_code == 400)
check("a person cannot be their own parent (400)", link(alice_h, me["id"], me["id"], "parent_of").status_code == 400)
check("a loop of ancestors is refused (400)", link(alice_h, child["id"], grandma["id"], "parent_of").status_code == 400)
check("spouses cannot also be parent and child (400)", link(alice_h, father["id"], mother["id"], "parent_of").status_code == 400)
check("a parent cannot be the child's spouse (400)", link(alice_h, mother["id"], me["id"], "spouse_of").status_code == 400)
check("a parent cannot be the child's sibling (400)", link(alice_h, mother["id"], me["id"], "sibling_of").status_code == 400)
sib = mk(alice_h, "Yaw", family_name="Mensah")
check("two people with a shared parent are siblings already (409)", (link(alice_h, mother["id"], sib["id"], "parent_of").status_code == 201) and link(alice_h, me["id"], sib["id"], "sibling_of").status_code == 409)
cousin = mk(alice_h, "Nana")
r = link(alice_h, me["id"], cousin["id"], "sibling_of")
check("siblings whose parents are unknown can be declared", r.status_code == 201, r.text)
check("a declared sibling appears in the tree, on the same level", {n["person"]["given_name"]: n["level"] for n in tree(alice_h, me["id"], 3).json()["nodes"]}.get("Nana") == 0)
check("a declared sibling cannot be declared again the other way (409)", link(alice_h, cousin["id"], me["id"], "sibling_of").status_code == 409)
check("a declared sibling cannot also be a spouse (400)", link(alice_h, cousin["id"], me["id"], "spouse_of").status_code == 400)
young_parent = mk(alice_h, "Young", birth_date="2020-01-01")
check("a parent cannot be younger than their child (400)", link(alice_h, young_parent["id"], me["id"], "parent_of").status_code == 400)
check("only primitive kinds are stored (400)", link(alice_h, me["id"], mother["id"], "cousin_of").status_code == 400)
check("a relation to someone who does not exist is refused (404)", link(alice_h, "prs_doesnotexist", me["id"], "parent_of").status_code == 404)
check("a relation with a malformed id is refused cleanly", link(alice_h, "x" * 200, me["id"], "parent_of").status_code in (404, 422))

print("\nAdding a relative, in one step")
def rel(h, pid, relation, **person):
    return c.post(f"/family/persons/{pid}/relatives", headers=h, json={"relation": relation, "person": {"given_name": "Rel", **person}})

before = {p["id"] for p in c.get("/family/persons?limit=100", headers=alice_h).json()["items"]}
r = rel(alice_h, me["id"], "parent", given_name="Stepmother", birth_date="1970-01-01")
check("a parent is added with the person and the link together", r.status_code == 201 and r.json()["relationship"]["kind"] == "parent_of" and r.json()["relationship"]["to"] == me["id"], r.text[:140])
r = rel(alice_h, me["id"], "child", given_name="Kojo", birth_date="2020-02-02")
check("a child", r.status_code == 201 and r.json()["relationship"]["from"] == me["id"], r.text[:140])
r = rel(alice_h, me["id"], "spouse", given_name="Partner")
partner = r.json()["person"] if r.status_code == 201 else {}
check("a partner", r.status_code == 201 and r.json()["relationship"]["kind"] == "spouse_of", r.text[:140])
r = rel(alice_h, me["id"], "adoptive_parent", given_name="Guardian")
check("an adoptive parent", r.status_code == 201 and r.json()["relationship"]["kind"] == "adoptive_parent_of", r.text[:140])
r = rel(alice_h, partner["id"], "sibling", given_name="Partner sibling")
check("a sibling (declared, parents unknown)", r.status_code == 201 and r.json()["relationship"]["kind"] == "sibling_of", r.text[:140])
count = len(c.get("/family/persons?limit=100", headers=alice_h).json()["items"])
r = rel(alice_h, me["id"], "parent", given_name="Too young", birth_date="2020-01-01")
check("a parent younger than the child is refused (400)", r.status_code == 400, r.text[:100])
r = rel(alice_h, me["id"], "parent", given_name="Future", birth_date="2999-01-01")
check("a birth in the future is refused (400)", r.status_code == 400)
r = rel(alice_h, me["id"], "cousin", given_name="X")
check("an unknown relation is refused (422)", r.status_code == 422)
r = rel(alice_h, me["id"], "parent", given_name=" ")
check("a blank name is refused (422)", r.status_code == 422)
r = rel(alice_h, partner["id"], "child", given_name="Loop")
check("a valid child of the partner is accepted", r.status_code == 201)
check("a refusal leaves no orphan person behind", len(c.get("/family/persons?limit=100", headers=alice_h).json()["items"]) == count + 1)
check("someone outside the family cannot add a relative (404)", rel(fresh_h, me["id"], "child", given_name="Nope").status_code == 404)
check("a relative of someone who does not exist is not found (404)", rel(alice_h, "prs_nope", "child", given_name="Nope").status_code == 404)
check("a relative of a member needs that member's consent (403)", rel(stranger_h, me["id"], "child", given_name="Nope").status_code in (403, 404))
r = rel(alice_h, me["id"], "parent", given_name="Deceased parent", deceased=True, death_date="2001-01-01", birth_date="1950-01-01")
check("a deceased relative is added as such", r.status_code == 201 and r.json()["person"]["deceased"] is True)

print("\nConsulting a person")
r = c.get(f"/family/persons/{mother['id']}", headers=alice_h)
d = r.json()
check("a person is returned in full", r.status_code == 200 and d["given_name"] == "Ama" and d["birth_date"] == "1962-03-04" and "biography" in d, r.text[:120])
check("with how they are related to the caller", d["relation_to_me"] == "parent", d["relation_to_me"])
check("and how many relatives they have", d["counts"]["children"] == 2 and d["counts"]["parents"] == 1 and d["counts"]["spouses"] == 1, d["counts"])
check("a person nobody knows is not found (404)", c.get("/family/persons/prs_nope", headers=alice_h).status_code == 404)
lst = c.get("/family/persons", headers=alice_h).json()["items"]
check("the list holds the caller's own families", {p["id"] for p in lst} >= {me["id"], mother["id"], grandma["id"]})
check("search finds people in the family", any(p["id"] == mother["id"] for p in c.get("/family/search?q=ama", headers=alice_h).json()["items"]))
r = c.get(f"/family/how-related?from_person={me['id']}&to_person={grandma['id']}", headers=alice_h).json()
check("how are we related? names the relation and the path", r["related"] and r["relation"] == "grandparent" and len(r["path"]) == 2, r)

print("\nEditing")
r = c.patch(f"/family/persons/{mother['id']}", headers=alice_h, json={"biography": "A teacher.", "birth_place": "Kumasi"})
check("a person can be edited", r.status_code == 200 and r.json()["biography"] == "A teacher." and r.json()["birth_place"] == "Kumasi", r.text[:120])
r = c.patch(f"/family/persons/{mother['id']}", headers=alice_h, json={"biography": None})
check("a field can be cleared", r.status_code == 200 and r.json()["biography"] is None and r.json()["birth_place"] == "Kumasi", r.text[:120])
check("a name cannot be cleared (400)", c.patch(f"/family/persons/{mother['id']}", headers=alice_h, json={"given_name": None}).status_code == 400)
check("a name cannot be blank (422)", c.patch(f"/family/persons/{mother['id']}", headers=alice_h, json={"given_name": " "}).status_code == 422)
check("a death before the birth is refused when editing (400)", c.patch(f"/family/persons/{mother['id']}", headers=alice_h, json={"death_date": "1950-01-01"}).status_code == 400)
check("a parent cannot be made younger than their child by an edit (400)", c.patch(f"/family/persons/{mother['id']}", headers=alice_h, json={"birth_date": "1995-01-01"}).status_code == 400)
r = c.patch(f"/family/persons/{father['id']}", headers=alice_h, json={"user_id": stranger["id"], "given_name": "Kofi"})
check("whose account a node is cannot be edited into another's", r.status_code == 200 and r.json()["user_id"] is None, r.text[:120])

print("\nCorroboration")
r = c.post(f"/family/persons/{mother['id']}/confirm", headers=alice_h, json={"decision": "confirm"})
check("a close relative's confirmation verifies a living person", r.status_code == 200 and r.json()["status"] == "verified", r.text)
r = c.post(f"/family/persons/{grandma['id']}/confirm", headers=alice_h, json={"decision": "confirm"})
check("a deceased person stays pending until three close relatives agree", r.status_code == 200 and r.json()["status"] == "pending" and r.json()["threshold"] == 3, r.text)
r = c.post(f"/family/persons/{sib['id']}/confirm", headers=alice_h, json={"decision": "dispute", "note": "Not my brother"})
check("a member of the tree can dispute a person", r.status_code == 200 and r.json()["status"] == "disputed", r.text)
check("the dispute shows in the family's queue", any(d["target_id"] == sib["id"] for d in c.get("/family/disputes", headers=alice_h).json()["items"]))

print("\nA stranger sees and changes nothing")
check("the list is empty for someone with no tree", c.get("/family/persons", headers=fresh_h).json()["items"] == [])
for label, r in {
    "a person": c.get(f"/family/persons/{me['id']}", headers=fresh_h),
    "a tree": tree(fresh_h, me["id"]),
    "a timeline": c.get(f"/family/timeline/{me['id']}", headers=fresh_h),
    "duplicates": c.get(f"/family/duplicates/{me['id']}", headers=fresh_h),
    "the archive of a person": c.get(f"/family/heritage?person_id={me['id']}", headers=fresh_h),
    "a path": c.get(f"/family/how-related?from_person={me['id']}&to_person={mother['id']}", headers=fresh_h),
}.items():
    check(f"{label} is not found (404, not 403)", r.status_code == 404, f"{r.status_code} {r.text[:80]}")
check("search finds nobody", c.get("/family/search?q=ama", headers=fresh_h).json()["items"] == [])
check("the dispute queue is not theirs to read", c.get("/family/disputes", headers=fresh_h).json()["items"] == [])
check("they cannot link two of the family's people (404)", link(fresh_h, mother["id"], father["id"], "spouse_of").status_code == 404)
check("they cannot link a person to one of the family's (404)", link(fresh_h, mother["id"], mk(fresh_h, "Mine")["id"], "parent_of").status_code == 404)
check("they cannot edit a person (404)", c.patch(f"/family/persons/{mother['id']}", headers=fresh_h, json={"given_name": "X"}).status_code == 404)
check("they cannot delete a person (404)", c.delete(f"/family/persons/{mother['id']}", headers=fresh_h).status_code == 404)
check("they cannot add to the archive of a person (404)", c.post("/family/heritage", headers=fresh_h, json={"person_id": me["id"], "kind": "photo", "title": "x", "source_url": "https://x.example/a.jpg"}).status_code == 404)
mk(fresh_h, "Fresh", user_id=fresh["id"])
check("with a node of their own they still cannot confirm another family's person (404)", c.post(f"/family/persons/{mother['id']}/confirm", headers=fresh_h, json={"decision": "confirm"}).status_code == 404)
check("nor dispute them (404)", c.post(f"/family/persons/{mother['id']}/confirm", headers=fresh_h, json={"decision": "dispute"}).status_code == 404)
check("and the person is not disputed by it", c.get(f"/family/persons/{mother['id']}", headers=alice_h).json()["status"] == "verified")
mine_fresh = mk(fresh_h, "Other")
check("they cannot stitch their own person onto the family's non-member (404)", link(fresh_h, mine_fresh["id"], mother["id"], "parent_of").status_code == 404)
check("they cannot link their person to one of the family's members without consent (403)", link(fresh_h, mine_fresh["id"], me["id"], "parent_of").status_code == 403)

print("\nA member who agrees to be linked brings a stranger into the tree")
open_h, open_u = register(who_can_add_family="everyone")
open_node = mk(open_h, "Open", user_id=open_u["id"])
joiner_h, joiner = register()
joiner_node = mk(joiner_h, "Joiner", user_id=joiner["id"])
r = link(joiner_h, open_node["id"], joiner_node["id"], "parent_of")
check("a member whose setting allows it can be linked", r.status_code == 201, f"{r.status_code} {r.text[:100]}")
check("the person who linked them now belongs to that tree", c.get(f"/family/persons/{open_node['id']}", headers=joiner_h).status_code == 200)

print("\nReading is not writing")
public_h, public_u = register(who_can_see_family="everyone")
pub_me = mk(public_h, "Public", user_id=public_u["id"])
pub_parent = mk(public_h, "PublicParent")
link(public_h, pub_parent["id"], pub_me["id"], "parent_of")
check("a tree its owner opens to everyone can be read by a stranger", tree(stranger_h, pub_me["id"]).status_code == 200)
check("but not changed: no linking (404)", link(stranger_h, pub_parent["id"], mk(stranger_h, "S")["id"], "parent_of").status_code == 404)
check("not edited (403)", c.patch(f"/family/persons/{pub_parent['id']}", headers=stranger_h, json={"given_name": "X"}).status_code == 403)
check("not deleted (403)", c.delete(f"/family/persons/{pub_parent['id']}", headers=stranger_h).status_code == 403)
c.patch("/preferences", headers=public_h, json={"family_tree_shared": False})
check("an owner who closes the tree is read by nobody else (404)", tree(stranger_h, pub_me["id"]).status_code == 404)
check("but still by themselves", tree(public_h, pub_me["id"]).status_code == 200)

print("\nRemoving a person")
check("a stranger cannot (404)", c.delete(f"/family/persons/{sib['id']}", headers=fresh_h).status_code == 404)
kin_h, kin = register(who_can_add_family="everyone")
kin_node = mk(kin_h, "Kin", user_id=kin["id"])
check("a relative who agrees to be linked can be brought into the tree", link(alice_h, kin_node["id"], me["id"], "sibling_of").status_code == 201)
check("a member of the tree who is not the author cannot delete a node they did not add (403)", c.delete(f"/family/persons/{sib['id']}", headers=kin_h).status_code == 403)
check("a node tied to a member's account cannot be deleted by its author alone (403)", c.delete(f"/family/persons/{kin_node['id']}", headers=alice_h).status_code == 403)
check("a person nobody knows cannot be deleted (404)", c.delete("/family/persons/prs_nope", headers=alice_h).status_code == 404)

edges_before = {(e["from"], e["to"]) for e in tree(alice_h, me["id"], 3).json()["edges"]}
check("the tree has the sibling's edge before", any(sib["id"] in e for e in edges_before))
r = c.delete(f"/family/persons/{sib['id']}", headers=alice_h)
check("the author removes a person (204)", r.status_code == 204, r.text)
check("the person is gone (404)", c.get(f"/family/persons/{sib['id']}", headers=alice_h).status_code == 404)
t2 = tree(alice_h, me["id"], 3).json()
check("no relation to them is left behind", not any(sib["id"] in (e["from"], e["to"]) for e in t2["edges"]) and all(n["person"]["id"] != sib["id"] for n in t2["nodes"]))
check("their dispute went with them", not any(d["target_id"] == sib["id"] for d in c.get("/family/disputes", headers=alice_h).json()["items"]))
check("the rest of the tree is intact", {n["person"]["given_name"] for n in t2["nodes"]} >= {"Alice", "Ama", "Kofi", "Akosua", "Esi"})
check("a relation can be removed on its own", c.delete(f"/family/relationships/{[e['id'] for e in t2['edges'] if e['kind'] == 'sibling_of'][0]}", headers=alice_h).status_code == 204)
check("someone else cannot remove it (403)", c.delete(f"/family/relationships/{t2['edges'][0]['id']}", headers=kin_h).status_code == 403)
check("the member removes their own node (204)", c.delete(f"/family/persons/{me['id']}", headers=alice_h).status_code == 204)
check("and can add themselves again", person(alice_h, "Alice again", user_id=alice["id"]).status_code == 201)

print("\nA big family loads in pieces")
big_h, big = register()
root = mk(big_h, "Root", user_id=big["id"])
for i in range(260):
    kid = mk(big_h, f"Kid{i:03d}")
    link(big_h, root["id"], kid["id"], "parent_of")
t = tree(big_h, root["id"], 2).json()
check("at most 250 people are returned, nearest first", len(t["nodes"]) == 250 and any(n["person"]["id"] == root["id"] for n in t["nodes"]), len(t["nodes"]))
check("the response says it was cut, and by how much is left", t["truncated"] is True and t["family_size"] == 261, (t["truncated"], t["family_size"]))
check("another family is not in that tree", not any(n["person"]["given_name"] in ("Alice", "Ama") for n in t["nodes"]))

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
