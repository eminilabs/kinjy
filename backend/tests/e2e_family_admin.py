"""Platform staff's technical power over a family tree is recorded, run inside the family container.

  dev.sh restart family-service
  sed 's#http://localhost:8200/api#http://gateway:8000/api#' backend/tests/e2e_family_admin.py | docker exec -i -w /app kaluta-family python -

Staff keep the power family-service has always given them (edit or remove a node, change a link);
what this checks is that every use of it *outside the tree's own rules* leaves a line in the access
audit, that ordinary use by an owner who also happens to be staff leaves none, and that staff gain
no read access to a private tree through it.
"""
import random
import string
import sys
from datetime import date

import httpx

sys.path.insert(0, "/app")
import models  # noqa: E402
from common.database import SessionLocal  # noqa: E402
from sqlalchemy import select, text  # noqa: E402

c = httpx.Client(base_url="http://localhost:8200/api", timeout=60)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {str(detail)[:160]}"))
    if not cond:
        ok = False


def register():
    t = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    today = date.today()
    body = {"email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"T {t}", "password": "Sup3rStrong!Pass", "country": "US",
            "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat()}
    r = c.post("/auth/register", json=body)
    r.raise_for_status()
    return {"Authorization": "Bearer " + r.json()["tokens"]["access_token"]}, r.json()["user"], body


def make_admin(user, body):
    with SessionLocal() as db:
        db.execute(text("UPDATE auth.users SET role='admin' WHERE id=:i"), {"i": user["id"]})
        db.commit()
    r = c.post("/auth/login", json={"email": body["email"], "password": body["password"]})
    assert r.status_code == 200, r.text[:100]
    return {"Authorization": "Bearer " + r.json()["tokens"]["access_token"]}


def audit(kind, subject_person):
    with SessionLocal() as db:
        return db.scalars(select(models.AccessEvent).where(models.AccessEvent.kind == kind, models.AccessEvent.person_id == subject_person)).all()


oh, ou, _ = register()
me = c.post("/family/persons", headers=oh, json={"given_name": "Owner", "user_id": ou["id"], "birth_date": "1980-01-01"}).json()
a = c.post(f"/family/persons/{me['id']}/relatives", headers=oh, json={"relation": "child", "person": {"given_name": "A", "birth_date": "2005-01-01"}}).json()["person"]
b = c.post(f"/family/persons/{me['id']}/relatives", headers=oh, json={"relation": "child", "person": {"given_name": "B", "birth_date": "2006-01-01"}}).json()["person"]
_ah, au, abody = register()
admin_h = make_admin(au, abody)

print("Staff outside the tree")
check("staff cannot read a private tree: no read power (404)", c.get(f"/family/tree/{me['id']}", headers=admin_h).status_code == 404)
check("nor a person (404)", c.get(f"/family/persons/{a['id']}", headers=admin_h).status_code == 404)
check("so staff cannot edit or remove a node of a tree they cannot read (404)", c.patch(f"/family/persons/{a['id']}", headers=admin_h, json={"given_name": "X"}).status_code == 404 and c.delete(f"/family/persons/{a['id']}", headers=admin_h).status_code == 404)
edge = [e for e in c.get(f"/family/tree/{me['id']}?depth=2", headers=oh).json()["edges"] if e["kind"] == "parent_of"][0]

print("\nWhat staff can still do, and that it is recorded")
r = c.patch(f"/family/relationships/{edge['id']}", headers=admin_h, json={"role": "father"})
check("staff may still change a link by its id (200)", r.status_code == 200, r.text[:100])
ev = audit("admin_change_link", edge["from"])
check("and it is recorded: who, on which tree, what", len(ev) == 1 and ev[0].actor_id == au["id"] and "change" in (ev[0].detail or ""), [(e.actor_id, e.detail) for e in ev])
check("the owner's own change of the same link leaves no staff record", c.patch(f"/family/relationships/{edge['id']}", headers=oh, json={"role": "mother"}).status_code == 200 and len(audit("admin_change_link", edge["from"])) == 1)
check("a member who is not staff still cannot change someone else's link (404)", c.patch(f"/family/relationships/{edge['id']}", headers=register()[0], json={"role": "father"}).status_code == 404)

print("\nA tree its owner opened to everyone")
ph, pu, _b = register()
c.patch("/preferences", headers=ph, json={"who_can_see_family": "everyone"})
pme = c.post("/family/persons", headers=ph, json={"given_name": "Pub", "user_id": pu["id"]}).json()
pk = c.post(f"/family/persons/{pme['id']}/relatives", headers=ph, json={"relation": "child", "person": {"given_name": "PubKid", "birth_date": "2005-01-01"}}).json()["person"]
r = c.patch(f"/family/persons/{pk['id']}", headers=admin_h, json={"given_name": "Staffed"})
check("staff can edit a node there, as before (200)", r.status_code == 200, r.text[:100])
check("and it is recorded as a staff override", len(audit("admin_edit_person", pk["id"])) == 1)
check("removing it is recorded too (204)", c.delete(f"/family/persons/{pk['id']}", headers=admin_h).status_code == 204 and len(audit("admin_delete_person", pk["id"])) == 1)

print("\nStaff acting as a member leave no override record")
oh2, ou2, body2 = register()
admin_owner = make_admin(ou2, body2)
me2 = c.post("/family/persons", headers=admin_owner, json={"given_name": "StaffOwner", "user_id": ou2["id"], "birth_date": "1980-01-01"}).json()
n = c.post(f"/family/persons/{me2['id']}/relatives", headers=admin_owner, json={"relation": "child", "person": {"given_name": "Kid", "birth_date": "2005-01-01"}}).json()["person"]
check("staff who own the tree edit it by the ordinary rule (200)", c.patch(f"/family/persons/{n['id']}", headers=admin_owner, json={"given_name": "Kid2"}).status_code == 200)
check("and that is not recorded as an override", len(audit("admin_edit_person", n["id"])) == 0)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
