"""Father, mother and blended families in the family tree, against the live API.

What must hold: a parent's role (father, mother, or not said) belongs to the
relationship and is never worked out from gender; adding a sibling writes real
parent links to the parents they share, so full and half siblings are derived and
never stored; a child can have a second parent from another union; and a person
can have several partners and still be one node.
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


def register():
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"T {t}",
        "password": "Sup3rStrong!Pass", "country": "US",
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
    })
    r.raise_for_status()
    return {"Authorization": "Bearer " + r.json()["tokens"]["access_token"]}, r.json()["user"]


h, me_user = register()
stranger_h, _ = register()


def person(given, **extra):
    r = c.post("/family/persons", headers=h, json={"given_name": given, **extra})
    assert r.status_code == 201, f"{given}: {r.status_code} {r.text[:120]}"
    return r.json()


def relative(anchor, relation, given, **extra):
    body = {"relation": relation, "person": {"given_name": given, **extra.pop("person", {})}, **extra}
    return c.post(f"/family/persons/{anchor}/relatives", headers=h, json=body)


def tree(pid, depth=3, headers=None):
    r = c.get(f"/family/tree/{pid}?depth={depth}", headers=headers or h)
    assert r.status_code == 200, r.text[:120]
    return r.json()


def nodes(pid, **kw):
    return {n["person"]["given_name"]: n for n in tree(pid, **kw)["nodes"]}


def kinds(pid):
    return sorted(e["kind"] for e in tree(pid)["edges"])


esi = person("Esi", user_id=me_user["id"], birth_date="1992-04-03", gender="female")

print("Father and mother are roles of the relationship")
r = relative(esi["id"], "parent", "Kofi", role="father", person={"birth_date": "1960-01-01", "gender": "male"})
check("a father is added with his role", r.status_code == 201 and r.json()["relationship"]["role"] == "father", r.text[:140])
kofi = r.json()["person"]
r = relative(esi["id"], "parent", "Ama", role="mother", person={"birth_date": "1962-03-04", "gender": "female"})
check("a mother is added with her role", r.status_code == 201 and r.json()["relationship"]["role"] == "mother", r.text[:140])
ama = r.json()["person"]
n = nodes(esi["id"])
check("the tree names them Father and Mother", n["Kofi"]["relation"] == "father" and n["Ama"]["relation"] == "mother", {k: v["relation"] for k, v in n.items()})
check("the edges carry the role", sorted(e["role"] for e in tree(esi["id"])["edges"]) == ["father", "mother"])
r = relative(esi["id"], "parent", "Guardianish")
check("a parent with no role is just Parent", r.status_code == 201 and r.json()["relationship"]["role"] is None and nodes(esi["id"])["Guardianish"]["relation"] == "parent")
c.delete(f"/family/persons/{r.json()['person']['id']}", headers=h)

print("\nGender and role are independent")
r = relative(esi["id"], "parent", "Adjoa", role="father", person={"gender": "female"})
check("a father whose gender is female is accepted: nothing is inferred", r.status_code == 201, r.text[:120])
check("and is still called Father", nodes(esi["id"])["Adjoa"]["relation"] == "father")
adjoa = r.json()["person"]
r = relative(esi["id"], "parent", "Man without a role", person={"gender": "male"})
check("a man added as a parent with no role is Parent, not Father", r.status_code == 201 and nodes(esi["id"])["Man without a role"]["relation"] == "parent")
for pid in (adjoa["id"], r.json()["person"]["id"]):
    c.delete(f"/family/persons/{pid}", headers=h)
check("gender is stored on the person, role on the link", c.get(f"/family/persons/{kofi['id']}", headers=h).json()["gender"] == "male")

print("\nA role only means something on a parent link")
check("an unknown role is refused (422)", relative(esi["id"], "parent", "X", role="uncle").status_code == 422)
check("a role on a partner is refused (400)", relative(esi["id"], "spouse", "X", role="mother").status_code == 400)
check("a role on a child is refused as 'role' (400)", relative(esi["id"], "child", "X", role="father").status_code == 400)
other = person("Other")
r = c.post("/family/relationships", headers=h, json={"from_person_id": other["id"], "to_person_id": esi["id"], "kind": "sibling_of", "role": "mother"})
check("a role on a sibling link is refused (400)", r.status_code == 400, r.text[:100])
r = c.post("/family/relationships", headers=h, json={"from_person_id": other["id"], "to_person_id": esi["id"], "kind": "guardian_of", "role": "father"})
check("a role on a guardian link is refused (400)", r.status_code == 400, r.text[:100])
c.delete(f"/family/persons/{other['id']}", headers=h)

print("\nSiblings are made from the parents they share")
r = relative(esi["id"], "sibling", "Kwame", shared_parent_ids=[kofi["id"], ama["id"]], person={"birth_date": "1995-01-01"})
check("a sibling with both parents in common is added", r.status_code == 201 and len(r.json()["relationships"]) == 2, r.text[:160])
check("as real parent links (father and mother), not a sibling link", sorted(e["role"] for e in r.json()["relationships"]) == ["father", "mother"] and all(e["kind"] == "parent_of" for e in r.json()["relationships"]))
n = nodes(esi["id"])
check("full sibling is derived", n["Kwame"]["relation"] == "sibling" and n["Kwame"]["sibling_kind"] == "full", n["Kwame"])
check("and stands on the same generation, not below", n["Kwame"]["level"] == 0)
check("no sibling link was stored", "sibling_of" not in kinds(esi["id"]))

r = relative(esi["id"], "sibling", "Kojo", shared_parent_ids=[ama["id"]], person={"birth_date": "1999-01-01"})
check("a sibling sharing only the mother is added", r.status_code == 201 and len(r.json()["relationships"]) == 1 and r.json()["relationships"][0]["role"] == "mother", r.text[:160])
kojo = r.json()["person"]
n = nodes(esi["id"])
check("half-sibling is derived", n["Kojo"]["relation"] == "half-sibling" and n["Kojo"]["sibling_kind"] == "half", n["Kojo"])
check("and has no father attached to him", "father" not in [e["role"] for e in tree(kojo["id"])["edges"] if e["to"] == kojo["id"]])

r = relative(esi["id"], "sibling", "Akua", shared_parent_ids=[kofi["id"]], person={"birth_date": "2001-01-01"})
check("a sibling sharing only the father is added", r.status_code == 201 and r.json()["relationships"][0]["role"] == "father")
akua = r.json()["person"]
check("also derived as a half-sibling", nodes(esi["id"])["Akua"]["sibling_kind"] == "half")

r = relative(esi["id"], "sibling", "Nana", person={"birth_date": "2003-01-01"})
check("with no shared parent they are declared siblings (parents unknown)", r.status_code == 201 and r.json()["relationship"]["kind"] == "sibling_of", r.text[:140])
check("and that is the only sibling link in the tree", kinds(esi["id"]).count("sibling_of") == 1)

before = len(c.get("/family/persons?limit=100", headers=h).json()["items"])
r = relative(esi["id"], "sibling", "Intruder", shared_parent_ids=[kojo["id"]])
check("a shared parent who is not a parent of this person is refused (400)", r.status_code == 400, r.text[:100])
check("and nobody was added", len(c.get("/family/persons?limit=100", headers=h).json()["items"]) == before)
check("a sibling's shared parent cannot be someone from another tree (400/404)", relative(esi["id"], "sibling", "X", shared_parent_ids=["prs_nope"]).status_code in (400, 404))
check("shared parents are only for siblings (400)", relative(esi["id"], "child", "X", shared_parent_ids=[kofi["id"]]).status_code == 400)

print("\nHalf and full are derived, so they change when the parents do")
edge_id = [e["id"] for e in tree(esi["id"])["edges"] if e["to"] == nodes(esi["id"])["Kwame"]["person"]["id"] and e["from"] == kofi["id"]][0]
check("Kwame is a full sibling now", nodes(esi["id"])["Kwame"]["sibling_kind"] == "full")
check("take away his father link", c.delete(f"/family/relationships/{edge_id}", headers=h).status_code == 204)
check("and he is a half-sibling, with nothing stored about it", nodes(esi["id"])["Kwame"]["sibling_kind"] == "half")

print("\nSeveral unions, and children from different ones")
r = relative(ama["id"], "child", "Efua", other_parent_id=None, anchor_role="mother", person={"birth_date": "2006-01-01"})
check("a child can be added to one parent alone", r.status_code == 201 and len(r.json()["relationships"]) == 1, r.text[:140])
yao = person("Yao", birth_date="1958-01-01", gender="male")
r = c.post("/family/relationships", headers=h, json={"from_person_id": ama["id"], "to_person_id": yao["id"], "kind": "spouse_of"})
check("a mother can have a second partner", r.status_code == 201, r.text[:100])
r = c.post("/family/relationships", headers=h, json={"from_person_id": ama["id"], "to_person_id": kofi["id"], "kind": "spouse_of"})
check("and the first one is still hers", r.status_code == 201)
r = relative(ama["id"], "child", "Selasi", other_parent_id=yao["id"], anchor_role="mother", other_parent_role="father", person={"birth_date": "2008-01-01"})
check("a child of the second union has both parents", r.status_code == 201 and len(r.json()["relationships"]) == 2, r.text[:160])
check("with their roles", sorted(e["role"] for e in r.json()["relationships"]) == ["father", "mother"])
selasi = r.json()["person"]
n = nodes(esi["id"])
check("Esi sees Selasi as a half-sibling (same mother, different father)", n["Selasi"]["sibling_kind"] == "half" and n["Selasi"]["relation"] == "half-sibling", n.get("Selasi"))
check("Ama has two partners and is still one person", c.get(f"/family/persons/{ama['id']}", headers=h).json()["counts"]["spouses"] == 2)
check("the other parent must be someone in the tree (404)", relative(ama["id"], "child", "X", other_parent_id=person("Lone")["id"]).status_code == 404)
check("the other parent cannot be the person themself (400)", relative(ama["id"], "child", "X", other_parent_id=ama["id"]).status_code == 400)
check("other_parent_role needs other_parent_id (400)", relative(ama["id"], "child", "X", other_parent_role="father").status_code == 400)
check("an other parent born after the child is refused (400)", relative(ama["id"], "child", "Y", other_parent_id=yao["id"], person={"birth_date": "1940-01-01"}).status_code == 400)
check("a stranger cannot add a child (404)", c.post(f"/family/persons/{ama['id']}/relatives", headers=stranger_h, json={"relation": "child", "person": {"given_name": "Z"}}).status_code == 404)

print("\nBiological and adoptive parents coexist")
r = relative(esi["id"], "adoptive_parent", "Adoptive dad", role="father")
check("an adoptive father is accepted next to the biological one", r.status_code == 201, r.text[:140])
labels = sorted(v["relation"] for k, v in nodes(esi["id"]).items() if v["level"] == 1)
check("both are kept apart in the labels", "father" in labels and "adoptive father" in labels, labels)

print("\nChanging a role later")
link = [e for e in tree(esi["id"])["edges"] if e["from"] == ama["id"] and e["to"] == esi["id"]][0]
r = c.patch(f"/family/relationships/{link['id']}", headers=h, json={"role": None})
check("a role can be taken back", r.status_code == 200 and r.json()["role"] is None, r.text)
check("the label falls back to Parent", nodes(esi["id"])["Ama"]["relation"] == "parent")
r = c.patch(f"/family/relationships/{link['id']}", headers=h, json={"role": "mother"})
check("and set again", r.status_code == 200 and nodes(esi["id"])["Ama"]["relation"] == "mother")
check("someone else cannot change it (403)", c.patch(f"/family/relationships/{link['id']}", headers=stranger_h, json={"role": "father"}).status_code in (403, 404))
sp = [e for e in tree(ama["id"])["edges"] if e["kind"] == "spouse_of"][0]
check("a role on a partner link is refused (400)", c.patch(f"/family/relationships/{sp['id']}", headers=h, json={"role": "father"}).status_code == 400)
check("an unknown role is refused (422)", c.patch(f"/family/relationships/{link['id']}", headers=h, json={"role": "uncle"}).status_code == 422)

print("\nSeveral generations still derive")
r = relative(kofi["id"], "parent", "Grandpa", role="father", person={"birth_date": "1930-01-01"})
check("a grandparent is added", r.status_code == 201)
check("and derived as such from Esi", nodes(esi["id"], depth=3)["Grandpa"]["relation"] == "grandparent")
check("two generations above sit on level 2", nodes(esi["id"], depth=3)["Grandpa"]["level"] == 2)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
