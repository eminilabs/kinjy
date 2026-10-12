"""Trusted contacts and succession, against the live API (run inside the family container).

  dev.sh restart family-service
  sed 's#http://localhost:8200/api#http://gateway:8000/api#' backend/tests/e2e_family_trusted.py | docker exec -i -w /app kaluta-family python -

The waiting period is 30 days; to avoid waiting, the test moves a request's end date into the past
in the database, which is exactly what the passing of time does.
"""
import random
import string
import sys
from datetime import date, datetime, timedelta, timezone

import httpx

sys.path.insert(0, "/app")
import models  # noqa: E402
from common.database import SessionLocal  # noqa: E402
from sqlalchemy import select, update  # noqa: E402

BASE = "http://localhost:8200/api"
c = httpx.Client(base_url=BASE, timeout=60)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {str(detail)[:180]}"))
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


def rel(h, anchor, name, relation="sibling", **extra):
    r = c.post(f"/family/persons/{anchor}/relatives", headers=h, json={"relation": relation, "person": {"given_name": name, "birth_date": "1990-01-01"}, **extra})
    assert r.status_code == 201, r.text[:150]
    return r.json()["person"]


def join(owner_h, anchor, name, role="viewer", branch=None):
    node = rel(owner_h, anchor, name)
    body = {"role": role, **({"branch_root_id": branch} if branch else {})}
    token = c.post(f"/family/persons/{node['id']}/invitations", headers=owner_h, json=body).json()["token"]
    h, u = register()
    assert c.post("/family/invitations/accept", headers=h, json={"token": token}).status_code == 200
    return h, u, node["id"]


def membership_of(owner_h, root, name):
    return [m for m in c.get(f"/family/persons/{root}/members", headers=owner_h).json()["items"] if m["name"] == name][0]


oh, ou = register()
me = c.post("/family/persons", headers=oh, json={"given_name": "Owner", "user_id": ou["id"], "birth_date": "1960-01-01"}).json()
ch, cu, c_node = join(oh, me["id"], "Cara", "contributor")
vh, vu, v_node = join(oh, me["id"], "Vik", "viewer")
sh, su = register()
cara = membership_of(oh, me["id"], "Cara")

print("Naming a contact")
check("a stranger cannot name anyone (404)", c.post(f"/family/persons/{me['id']}/trusted-contacts", headers=sh, json={"membership_id": cara["id"]}).status_code == 404)
check("a contributor cannot name (403)", c.post(f"/family/persons/{me['id']}/trusted-contacts", headers=ch, json={"membership_id": cara["id"]}).status_code == 403)
own_row = membership_of(oh, me["id"], "Owner")
check("an owner cannot name themselves (400)", c.post(f"/family/persons/{me['id']}/trusted-contacts", headers=oh, json={"membership_id": own_row["id"]}).status_code == 400)
check("an unknown member is 404", c.post(f"/family/persons/{me['id']}/trusted-contacts", headers=oh, json={"membership_id": "mem_nope"}).status_code == 404)
r = c.post(f"/family/persons/{me['id']}/trusted-contacts", headers=oh, json={"membership_id": cara["id"]})
check("an owner names a member (201), invited and nothing more", r.status_code == 201 and r.json()["status"] == "invited", r.text[:120])
tc = r.json()["id"]
check("naming them twice is refused (409)", c.post(f"/family/persons/{me['id']}/trusted-contacts", headers=oh, json={"membership_id": cara["id"]}).status_code == 409)
check("naming gave them no access: a contributor still cannot manage members (403)", c.get(f"/family/persons/{me['id']}/members", headers=ch).status_code == 403)
check("and cannot yet ask to take over (409)", c.post(f"/family/trusted-contacts/{tc}/succession", headers=ch).status_code == 409)
check("someone else cannot accept for them (404)", c.post(f"/family/trusted-contacts/{tc}/accept", headers=sh).status_code == 404)
mine = c.get("/family/trusted-contacts/mine", headers=ch).json()
check("they see the designation, with who named them", len(mine["items"]) == 1 and mine["items"][0]["status"] == "invited" and mine["items"][0]["owner_name"] == "Owner" and mine["delay_days"] == 30, mine)
check("an unrelated member sees none", c.get("/family/trusted-contacts/mine", headers=sh).json()["items"] == [])
check("the contact accepts (200)", c.post(f"/family/trusted-contacts/{tc}/accept", headers=ch).status_code == 200)
check("the owner lists them as active", [i["status"] for i in c.get(f"/family/persons/{me['id']}/trusted-contacts", headers=oh).json()["items"]] == ["active"])
check("a viewer, a contributor or a stranger cannot list (403/404)", all(c.get(f"/family/persons/{me['id']}/trusted-contacts", headers=h).status_code in (403, 404) for h in (vh, ch, sh)))

print("\nThe waiting period")
r = c.post(f"/family/trusted-contacts/{tc}/succession", headers=ch)
first_request = r.json().get("id")
check("the contact asks to take over (201): 30 days, announced", r.status_code == 201 and r.json()["delay_days"] == 30, r.text[:120])
eff = datetime.fromisoformat(r.json()["effective_at"].replace("Z", "+00:00"))
check("the end date is 30 days away", timedelta(days=29, hours=23) < eff - datetime.now(timezone.utc) < timedelta(days=30, hours=1), eff)
check("a second request while one waits is refused (409)", c.post(f"/family/trusted-contacts/{tc}/succession", headers=ch).status_code == 409)
check("the owner sees the waiting request", c.get(f"/family/persons/{me['id']}/trusted-contacts", headers=oh).json()["items"][0]["request"] is not None)
check("nothing changed meanwhile: still a contributor (403)", c.get(f"/family/persons/{me['id']}/members", headers=ch).status_code == 403)
check("a stranger cannot cancel it (404)", c.delete(f"/family/trusted-contacts/{tc}/succession", headers=sh).status_code == 404)
check("a viewer cannot cancel it (404)", c.delete(f"/family/trusted-contacts/{tc}/succession", headers=vh).status_code == 404)
check("an owner cancels it (204)", c.delete(f"/family/trusted-contacts/{tc}/succession", headers=oh).status_code == 204)
check("cancelling twice is refused (409)", c.delete(f"/family/trusted-contacts/{tc}/succession", headers=oh).status_code == 409)
with SessionLocal() as db:
    db.execute(update(models.SuccessionRequest).where(models.SuccessionRequest.id == first_request).values(effective_at=datetime.now(timezone.utc) - timedelta(days=1)))
    db.commit()
c.get("/family/trusted-contacts/mine", headers=ch)
check("a cancelled request never activates, even after its date", c.get(f"/family/persons/{me['id']}/members", headers=ch).status_code == 403)
r = c.post(f"/family/trusted-contacts/{tc}/succession", headers=ch)
check("they may ask again (201)", r.status_code == 201)
with SessionLocal() as db:
    db.execute(update(models.SuccessionRequest).where(models.SuccessionRequest.id == r.json()["id"]).values(effective_at=datetime.now(timezone.utc) - timedelta(minutes=1)))
    db.commit()
check("the end date has passed: the contact becomes an owner (status read triggers the sweep)", c.get("/family/trusted-contacts/mine", headers=ch).json()["items"][0]["request"] is None)
check("they can now manage members (200)", c.get(f"/family/persons/{me['id']}/members", headers=ch).status_code == 200)
check("and export", c.post(f"/family/persons/{me['id']}/export", headers=ch).status_code == 200)
check("the first owner is still an owner: nobody was removed", c.get(f"/family/persons/{me['id']}/members", headers=oh).status_code == 200)
with SessionLocal() as db:
    kinds = [e.kind for e in db.scalars(select(models.AccessEvent).where(models.AccessEvent.person_id.in_({m.person_id for m in db.scalars(select(models.Membership).where(models.Membership.user_id.in_({ou["id"], cu["id"]}))).all()}))).all()]
check("every step is in the access audit", {"trusted_contact_named", "trusted_contact_accepted", "succession_requested", "succession_cancelled", "succession_activated"} <= set(kinds), kinds)
check("an owner cannot ask for succession (409)", c.post(f"/family/trusted-contacts/{tc}/succession", headers=ch).status_code == 409)

print("\nEnding a designation")
dh, du, d_node = join(oh, me["id"], "Dan", "contributor")
dan = membership_of(oh, me["id"], "Dan")
tc2 = c.post(f"/family/persons/{me['id']}/trusted-contacts", headers=ch, json={"membership_id": dan["id"]}).json()["id"]
check("a second owner may name a contact too", c.post(f"/family/trusted-contacts/{tc2}/accept", headers=dh).status_code == 200)
check("accepting twice is refused (409)", c.post(f"/family/trusted-contacts/{tc2}/accept", headers=dh).status_code == 409)
r = c.post(f"/family/trusted-contacts/{tc2}/succession", headers=dh)
check("a waiting request", r.status_code == 201)
check("removing the member from the tree cancels the designation and its request (204)", c.delete(f"/family/members/{dan['id']}", headers=oh).status_code == 204)
check("and they can no longer act on it (409)", c.post(f"/family/trusted-contacts/{tc2}/succession", headers=dh).status_code == 409)
with SessionLocal() as db:
    st = db.scalar(select(models.SuccessionRequest.status).where(models.SuccessionRequest.id == r.json()["id"]))
check("the waiting request was cancelled with it", st == "cancelled", st)
eh, eu, e_node = join(oh, me["id"], "Eli", "viewer")
eli = membership_of(oh, me["id"], "Eli")
tc3 = c.post(f"/family/persons/{me['id']}/trusted-contacts", headers=oh, json={"membership_id": eli["id"]}).json()["id"]
check("a member who does not want it declines (204)", c.post(f"/family/trusted-contacts/{tc3}/decline", headers=eh).status_code == 204)
check("a declined designation cannot be accepted (409)", c.post(f"/family/trusted-contacts/{tc3}/accept", headers=eh).status_code == 409)
fh, fu, f_node = join(oh, me["id"], "Fay", "viewer")
fay = membership_of(oh, me["id"], "Fay")
tc4 = c.post(f"/family/persons/{me['id']}/trusted-contacts", headers=oh, json={"membership_id": fay["id"]}).json()["id"]
check("an owner revokes a designation (204)", c.delete(f"/family/trusted-contacts/{tc4}", headers=oh).status_code == 204)
check("a stranger cannot (404)", c.delete(f"/family/trusted-contacts/{tc4}", headers=sh).status_code == 404)
for n in ("G1", "G2", "G3"):
    gh, gu, g_node = join(oh, me["id"], n, "viewer")
    row = membership_of(oh, me["id"], n)
    r = c.post(f"/family/persons/{me['id']}/trusted-contacts", headers=oh, json={"membership_id": row["id"]})
    last = r.status_code
check("at most three contacts at once (409 on the fourth)", last == 409, last)

print("\nA branch-limited viewer cannot be named")
bh, bu, b_node = join(oh, me["id"], "Bea", "viewer")
bea = membership_of(oh, me["id"], "Bea")
assert c.put(f"/family/members/{bea['id']}/branch", headers=oh, json={"person_id": b_node}).status_code == 200
check("naming a member limited to one branch is refused (409)", c.post(f"/family/persons/{me['id']}/trusted-contacts", headers=oh, json={"membership_id": bea["id"]}).status_code == 409)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
