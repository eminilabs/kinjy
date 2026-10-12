"""Sharing one branch of a tree with a viewer, against the live API (run inside the family container).

  dev.sh restart family-service
  sed 's#http://localhost:8200/api#http://gateway:8000/api#' backend/tests/e2e_family_branches.py | docker exec -i -w /app kaluta-family python -

A branch is a person, everyone descended from them, and the partners of those (only the
partners themselves). A viewer limited to it sees nothing else, by any route.
"""
import random
import string
import sys
from datetime import date

import httpx

sys.path.insert(0, "/app")
import models  # noqa: E402
from common.database import SessionLocal  # noqa: E402
from sqlalchemy import select  # noqa: E402

BASE = "http://localhost:8200/api"
c = httpx.Client(base_url=BASE, timeout=60)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {str(detail)[:200]}"))
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


def rel(h, anchor, relation, name, born, **extra):
    r = c.post(f"/family/persons/{anchor}/relatives", headers=h, json={"relation": relation, "person": {"given_name": name, "birth_date": born}, **extra})
    assert r.status_code == 201, f"{name}: {r.status_code} {r.text[:150]}"
    return r.json()["person"]


def names(h, pid, depth=6):
    r = c.get(f"/family/tree/{pid}?depth={depth}", headers=h)
    return r, {n["person"]["given_name"] for n in r.json()["nodes"]} if r.status_code == 200 else set()


oh, ou = register()
me = c.post("/family/persons", headers=oh, json={"given_name": "Owner", "user_id": ou["id"], "birth_date": "1990-01-01"}).json()
mother = rel(oh, me["id"], "parent", "Mother", "1960-01-01", role="mother")
father = rel(oh, me["id"], "parent", "Father", "1958-01-01", role="father")
patgf = rel(oh, father["id"], "parent", "PatGF", "1930-01-01", role="father")
matgf = rel(oh, mother["id"], "parent", "MatGF", "1932-01-01", role="father")
matgm = rel(oh, mother["id"], "parent", "MatGM", "1934-01-01", role="mother")
assert c.post("/family/relationships", headers=oh, json={"from_person_id": matgf["id"], "to_person_id": matgm["id"], "kind": "spouse_of"}).status_code == 201
aunt = rel(oh, mother["id"], "sibling", "Aunt", "1963-01-01", shared_parent_ids=[matgf["id"], matgm["id"]])
kid = rel(oh, me["id"], "child", "Kid", "2015-01-01")
c.post("/family/heritage", headers=oh, json={"person_id": patgf["id"], "kind": "document", "title": "Pat letter", "source_url": "https://x.example/a"})

print("Inviting a viewer to one branch")
r = c.post(f"/family/persons/{aunt['id']}/invitations", headers=oh, json={"role": "viewer", "branch_root_id": matgf["id"]})
check("an owner invites a viewer limited to the maternal grandfather's branch (201)", r.status_code == 201 and r.json()["branch_root_id"] == matgf["id"], r.text[:120])
token = r.json()["token"]
vh, vu = register()
lk = c.post("/family/invitations/lookup", headers=vh, json={"token": token}).json()
check("the invitee is told whose branch it is before accepting", lk.get("branch_name") == "MatGF" and lk["role"] == "viewer", lk)
check("accepting works (200)", c.post("/family/invitations/accept", headers=vh, json={"token": token}).status_code == 200)

print("\nWhat the viewer sees")
r, seen = names(vh, aunt["id"])
check("the tree is the branch: grandparents, mother, aunt, owner and the child", r.status_code == 200 and seen == {"MatGF", "MatGM", "Mother", "Aunt", "Owner", "Kid"}, seen)
check("the paternal side is not in it", not ({"Father", "PatGF"} & seen))
check("the size says how many they can see, not how many exist", r.json()["family_size"] == 6, r.json()["family_size"])
check("a person outside the branch is 404", c.get(f"/family/persons/{patgf['id']}", headers=vh).status_code == 404 and c.get(f"/family/persons/{father['id']}", headers=vh).status_code == 404)
check("a tree started from them is 404", c.get(f"/family/tree/{patgf['id']}", headers=vh).status_code == 404)
d = c.get(f"/family/persons/{me['id']}", headers=vh).json()
check("a visible person's counts do not reveal the hidden parent", d["counts"]["parents"] == 1, d["counts"])
check("search does not find them", c.get("/family/search?q=Father", headers=vh).json()["items"] == [] and c.get("/family/search?q=PatGF", headers=vh).json()["items"] == [])
listed = {p["given_name"] for p in c.get("/family/persons?limit=100", headers=vh).json()["items"]}
check("the people list is the branch", listed == {"MatGF", "MatGM", "Mother", "Aunt", "Owner", "Kid"}, listed)
check("a path to someone outside is 404", c.get(f"/family/how-related?from_person={aunt['id']}&to_person={patgf['id']}", headers=vh).status_code == 404)
check("a path inside works (200)", c.get(f"/family/how-related?from_person={aunt['id']}&to_person={kid['id']}", headers=vh).status_code == 200)
check("their archive and timeline are 404", c.get(f"/family/heritage?person_id={patgf['id']}", headers=vh).status_code == 404 and c.get(f"/family/timeline/{patgf['id']}", headers=vh).status_code == 404)
check("duplicates for someone outside are 404", c.get(f"/family/duplicates/{father['id']}", headers=vh).status_code == 404)
check("they are still only a viewer: no writing (403)", c.post(f"/family/persons/{kid['id']}/relatives", headers=vh, json={"relation": "child", "person": {"given_name": "X"}}).status_code == 403)
check("and cannot export (403)", c.post(f"/family/persons/{aunt['id']}/export", headers=vh).status_code == 403)
check("nor see the members (403)", c.get(f"/family/persons/{aunt['id']}/members", headers=vh).status_code == 403)

print("\nThe owner sees everything, and manages the branch")
r, seen_o = names(oh, me["id"])
check("the owner's tree is whole", {"Father", "PatGF", "Aunt"} <= seen_o, seen_o)
mem = c.get(f"/family/persons/{me['id']}/members", headers=oh).json()["items"]
row = [m for m in mem if m["name"] == "Aunt"][0]
check("the member list says which branch", row["branch"] == {"person_id": matgf["id"], "name": "MatGF"}, row)
check("a branch that does not contain their own place is refused (409)", c.put(f"/family/members/{row['id']}/branch", headers=oh, json={"person_id": kid["id"]}).status_code == 409)
check("a person not in the tree is refused (400)", c.put(f"/family/members/{row['id']}/branch", headers=oh, json={"person_id": "prs_nope"}).status_code == 400)
check("a stranger cannot change it (404)", c.put(f"/family/members/{row['id']}/branch", headers=register()[0], json={"person_id": None}).status_code == 404)
check("a viewer cannot change it (404/403)", c.put(f"/family/members/{row['id']}/branch", headers=vh, json={"person_id": None}).status_code in (403, 404))
check("an owner limits a viewer to a smaller branch: Aunt's own (200)", c.put(f"/family/members/{row['id']}/branch", headers=oh, json={"person_id": aunt["id"]}).status_code == 200)
r, seen = names(vh, aunt["id"])
check("and it narrows at once", seen == {"Aunt"}, seen)
check("an owner gives the whole tree back (200)", c.put(f"/family/members/{row['id']}/branch", headers=oh, json={"person_id": None}).status_code == 200)
r, seen = names(vh, aunt["id"])
check("and the viewer sees the whole tree again", {"Father", "PatGF"} <= seen, seen)
check("back to the branch (200)", c.put(f"/family/members/{row['id']}/branch", headers=oh, json={"person_id": matgf["id"]}).status_code == 200)
check("a contributor cannot be limited: promoting clears the branch", c.patch(f"/family/members/{row['id']}", headers=oh, json={"role": "contributor"}).status_code == 200 and [m for m in c.get(f"/family/persons/{me['id']}/members", headers=oh).json()["items"] if m["name"] == "Aunt"][0]["branch"] is None)
check("and setting one on a contributor is refused (409)", c.put(f"/family/members/{row['id']}/branch", headers=oh, json={"person_id": matgf["id"]}).status_code == 409)
check("demoting to viewer leaves the whole tree until the owner limits it again", c.patch(f"/family/members/{row['id']}", headers=oh, json={"role": "viewer"}).status_code == 200 and "Father" in names(vh, aunt["id"])[1])

print("\nInvitation limits")
other = rel(oh, me["id"], "sibling", "Sib", "1992-01-01")
check("a branch cannot go with a contributor invitation (403)", c.post(f"/family/persons/{other['id']}/invitations", headers=oh, json={"role": "contributor", "branch_root_id": matgf["id"]}).status_code == 403)
check("the invited place must be inside the branch (409)", c.post(f"/family/persons/{other['id']}/invitations", headers=oh, json={"role": "viewer", "branch_root_id": matgf["id"]}).status_code == 409)
check("a branch root outside the tree is refused (400)", c.post(f"/family/persons/{other['id']}/invitations", headers=oh, json={"role": "viewer", "branch_root_id": "prs_nope"}).status_code == 400)

print("\nFailing closed")
assert c.put(f"/family/members/{row['id']}/branch", headers=oh, json={"person_id": matgf["id"]}).status_code == 200
check("the root of a branch can be removed by an owner (204)", c.delete(f"/family/persons/{matgf['id']}", headers=oh).status_code == 204)
r, seen = names(vh, aunt["id"])
check("and the viewer then sees less, never more: only their own place", r.status_code == 200 and seen == {"Aunt"}, seen)
check("the whole tree is not exposed by the missing root", c.get(f"/family/persons/{mother['id']}", headers=vh).status_code == 404)

print("\nThe record of it")
with SessionLocal() as db:
    kinds = [e.kind for e in db.scalars(select(models.AccessEvent).where(models.AccessEvent.actor_id == ou["id"])).all()]
check("joining, role and branch changes were recorded", {"member_joined", "branch_set", "branch_cleared", "role_changed"} <= set(kinds), kinds)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
