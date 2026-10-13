"""A person's archive: written memories and the timeline, against the live API.

  dev.sh restart family-service
  sed 's#http://localhost:8200/api#http://gateway:8000/api#' backend/tests/e2e_family_archive.py | docker exec -i -w /app kaluta-family python -
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
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {str(detail)[:180]}"))
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


def rel(h, anchor, name, relation="sibling", born="1990-01-01", **extra):
    r = c.post(f"/family/persons/{anchor}/relatives", headers=h, json={"relation": relation, "person": {"given_name": name, "birth_date": born, **extra.pop("person", {})}, **extra})
    assert r.status_code == 201, r.text[:150]
    return r.json()["person"]


def join(owner_h, anchor, name, role="viewer", branch=None):
    node = rel(owner_h, anchor, name)
    body = {"role": role, **({"branch_root_id": branch} if branch else {})}
    token = c.post(f"/family/persons/{node['id']}/invitations", headers=owner_h, json=body).json()["token"]
    h, u = register()
    assert c.post("/family/invitations/accept", headers=h, json={"token": token}).status_code == 200
    return h


def story(h, pid, title="A memory", text="She told stories on the veranda.", **extra):
    return c.post("/family/heritage", headers=h, json={"person_id": pid, "kind": "story", "title": title, "transcript": text, **extra})


oh, ou = register()
me = c.post("/family/persons", headers=oh, json={"given_name": "Owner", "user_id": ou["id"], "birth_date": "1980-01-01"}).json()
gran = rel(oh, me["id"], "Gran", "parent", born="1930-03-04", person={"birth_place": "Kumasi"})
ch = join(oh, gran["id"], "Cara", "contributor")
vh = join(oh, gran["id"], "Vik", "viewer")
sh, _ = register()

print("Who may write")
r = story(ch, gran["id"], "Market days", "Every Friday...", happened_on="1965-05-05")
check("a contributor writes a memory (201)", r.status_code == 201, r.text[:100])
mem = r.json()["id"]
check("an owner writes one too (201)", story(oh, gran["id"], "Owner's note", "Her kitchen.").status_code == 201)
check("a viewer cannot (403)", story(vh, gran["id"]).status_code == 403)
check("a stranger gets 404", story(sh, gran["id"]).status_code == 404)

print("\nWhat is accepted")
check("a memory needs its text (422)", c.post("/family/heritage", headers=ch, json={"person_id": gran["id"], "kind": "story", "title": "x"}).status_code == 422)
check("a memory has no file (422)", c.post("/family/heritage", headers=ch, json={"person_id": gran["id"], "kind": "story", "title": "x", "transcript": "t", "source_url": "https://x.example/a"}).status_code == 422)
check("a file item needs an address (422)", c.post("/family/heritage", headers=ch, json={"person_id": gran["id"], "kind": "photo", "title": "x"}).status_code == 422)
for bad in ("javascript:alert(1)", "http://x.example/a.jpg", "data:text/html,hi", "//x.example/a", "ftp://x/a"):
    check(f"an address like {bad[:22]!r} is refused (422)", c.post("/family/heritage", headers=ch, json={"person_id": gran["id"], "kind": "photo", "title": "x", "source_url": bad}).status_code == 422)
check("an https address or a /media/ path is accepted (201)", c.post("/family/heritage", headers=ch, json={"person_id": gran["id"], "kind": "photo", "title": "Portrait", "source_url": "/media/ast_x"}).status_code == 201 and c.post("/family/heritage", headers=ch, json={"person_id": gran["id"], "kind": "document", "title": "Deed", "source_url": "https://x.example/deed.pdf"}).status_code == 201)
check("an over-long memory is refused (422)", story(ch, gran["id"], "Long", "x" * 10001).status_code == 422)

print("\nWhat readers see")
items = c.get(f"/family/heritage?person_id={gran['id']}", headers=vh).json()["items"]
stories = [i for i in items if i["kind"] == "story"]
check("a viewer reads the memories as text", {i["title"] for i in stories} == {"Market days", "Owner's note"} and stories[0]["story"], items)
check("nothing generated is offered: no AI fields", all(set(i) == {"id", "kind", "title", "story", "file_url", "happened_on", "mine", "can_delete"} for i in items), items[0])
check("only a file of ours is linked; an outside address is not", {i["title"]: i["file_url"] for i in items if i["kind"] in ("photo", "document")} == {"Portrait": "/media/ast_x", "Deed": None})
check("a viewer cannot remove anything", not any(i["can_delete"] for i in items))
check("a stranger cannot read (404)", c.get(f"/family/heritage?person_id={gran['id']}", headers=sh).status_code == 404)
tl = c.get(f"/family/timeline/{gran['id']}", headers=vh).json()["entries"]
check("the timeline has birth with its place and the memory in date order", [e["label"] for e in tl][:2] == ["Born in Kumasi", "Market days"] and [e["date"] for e in tl] == sorted(e["date"] for e in tl), tl)
check("a person with no birth place is just 'Born', not 'Born in unknown place'", [e["label"] for e in c.get(f"/family/timeline/{me['id']}", headers=oh).json()["entries"]] == ["Born"])

print("\nRemoving")
check("a contributor cannot remove someone else's memory (403)", c.delete(f"/family/heritage/{[i['id'] for i in stories if i['title'] == 'Owner' + chr(39) + 's note'][0]}", headers=ch).status_code == 403)
check("a viewer cannot remove one (403)", c.delete(f"/family/heritage/{mem}", headers=vh).status_code == 403)
check("a stranger is told it does not exist (404)", c.delete(f"/family/heritage/{mem}", headers=sh).status_code == 404)
check("its author removes it (204)", c.delete(f"/family/heritage/{mem}", headers=ch).status_code == 204)
other = story(ch, gran["id"], "Second", "again").json()["id"]
check("an owner removes anyone's (204)", c.delete(f"/family/heritage/{other}", headers=oh).status_code == 204)
check("an unknown item is 404", c.delete("/family/heritage/her_nope", headers=oh).status_code == 404)
own = c.get(f"/family/heritage?person_id={gran['id']}", headers=ch).json()["items"]
check("a contributor is offered removal only for their own", all(i["can_delete"] == i["mine"] for i in own), own)

print("\nBranches and readers")
branch_root = rel(oh, me["id"], "Branch", "child", born="2000-01-01")
bk = rel(oh, branch_root["id"], "BranchKid", "child", born="2020-01-01")
story(oh, bk["id"], "Inside", "in the branch")
outside = rel(oh, me["id"], "Outside", "child", born="2001-01-01")
story(oh, outside["id"], "Hidden", "outside the branch")
scoped_node = rel(oh, branch_root["id"], "Scoped", "child", born="2001-06-01")
tok = c.post(f"/family/persons/{scoped_node['id']}/invitations", headers=oh, json={"role": "viewer", "branch_root_id": branch_root["id"]}).json()["token"]
sch, _su = register()
assert c.post("/family/invitations/accept", headers=sch, json={"token": tok}).status_code == 200
check("a viewer limited to a branch reads the memories inside it", [i["title"] for i in c.get(f"/family/heritage?person_id={bk['id']}", headers=sch).json()["items"]] == ["Inside"])
check("but not those outside it (404)", c.get(f"/family/heritage?person_id={outside['id']}", headers=sch).status_code == 404 and c.get(f"/family/timeline/{outside['id']}", headers=sch).status_code == 404)
pub_h, pub_u = register(who_can_see_family="everyone")
pub = c.post("/family/persons", headers=pub_h, json={"given_name": "Pub", "user_id": pub_u["id"]}).json()
story(pub_h, pub["id"], "Public memory", "open")
check("a tree its owner opened to everyone shows its memories to a stranger (read only)", c.get(f"/family/heritage?person_id={pub['id']}", headers=sh).status_code == 200 and story(sh, pub["id"]).status_code == 404)

print("\nA person's archive is bounded")
lone = c.post("/family/persons", headers=oh, json={"given_name": "Bounded"}).json()
codes = [story(oh, lone["id"], f"n{i}", "t").status_code for i in range(101)]
check("at most 100 items per person (409 on the 101st)", codes[:100] == [201] * 100 and codes[100] == 409, codes[-3:])

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
