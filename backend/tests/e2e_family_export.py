"""GEDCOM export of a family tree, against the live API (run inside the family container).

  dev.sh restart family-service       (the export limiter is in memory)
  sed 's#http://localhost:8200/api#http://gateway:8000/api#' backend/tests/e2e_family_export.py | docker exec -i -w /app kaluta-family python -

A tree can only be made to hold verified, deceased people by the corroboration rules (three close
confirmations); to keep this test short it marks a few records verified straight in the database.
"""
import random
import re
import string
import sys
from datetime import date

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
    person = {"given_name": given, **extra.pop("person", {})}
    return c.post(f"/family/persons/{anchor}/relatives", headers=h, json={"relation": relation, "person": person, **extra})


def export(h, pid):
    return c.post(f"/family/persons/{pid}/export", headers=h)


def join(owner_h, anchor, name, role=None):
    node = relative(owner_h, anchor, "sibling", name, person={"birth_date": "1990-01-01"}).json()["person"]
    token = c.post(f"/family/persons/{node['id']}/invitations", headers=owner_h, json={"role": role} if role else {}).json()["token"]
    h, _u = register()
    assert c.post("/family/invitations/accept", headers=h, json={"token": token}).status_code == 200
    return h


oh, ou = register()
me = c.post("/family/persons", headers=oh, json={"given_name": "Owner", "user_id": ou["id"], "birth_date": "1985-01-01"}).json()
gran = relative(oh, me["id"], "parent", "Grandma", role="mother", person={"birth_date": "1930-02-02", "deceased": True, "death_date": "2001-03-04", "biography": "Born in Kumasi"}).json()["person"]
dad = relative(oh, me["id"], "parent", "Daddy", role="father", person={"birth_date": "1958-01-01"}).json()["person"]
with SessionLocal() as db:  # corroboration is its own feature: mark records verified here
    db.execute(update(models.Person).where(models.Person.id == gran["id"]).values(status="verified"))
    db.commit()

print("Who may export")
oc = join(oh, dad["id"], "Contrib", "contributor")
vw = join(oh, dad["id"], "Viewer")
sh, _ = register()
pub_h, pub_u = register(who_can_see_family="everyone")
pub_me = c.post("/family/persons", headers=pub_h, json={"given_name": "Pub", "user_id": pub_u["id"]}).json()
check("a contributor cannot export (403)", export(oc, me["id"]).status_code == 403)
check("a viewer cannot export (403)", export(vw, me["id"]).status_code == 403)
check("nor preview it (403)", c.get(f"/family/persons/{me['id']}/export/preview", headers=vw).status_code == 403)
check("a stranger gets 404", export(sh, me["id"]).status_code == 404)
check("a reader admitted only by the owner's privacy setting cannot export (404)", export(sh, pub_me["id"]).status_code == 404)
check("not even a tree they can read (preview, 404)", c.get(f"/family/persons/{pub_me['id']}/export/preview", headers=sh).status_code == 404)
check("an unknown person is 404", export(oh, "prs_nope").status_code == 404)
check("an unauthenticated call is 401", c.post(f"/family/persons/{me['id']}/export").status_code == 401)

print("\nThe preview")
r = c.get(f"/family/persons/{me['id']}/export/preview", headers=oh)
p = r.json()
check("an owner gets the numbers (200)", r.status_code == 200 and p["format"] == "GEDCOM 5.5.1", r.text[:150])
check("people, written in full, hidden: one deceased and verified, the rest hidden", p["included"] == 1 and p["masked"] == p["people"] - 1 and p["masked_unverified"] >= 1 and p["masked_living"] >= 1, p)
check("it warns that hidden people still show their existence and links", p["warning"] and "how they are related" in p["warning"], p)
check("it carries no name or date", not re.search(r"Grandma|Daddy|Owner|Kumasi|1930", r.text))
with SessionLocal() as db:
    before = db.scalar(select(models.ExportEvent.id).where(models.ExportEvent.user_id == ou["id"]))
check("a preview records nothing", before is None)

print("\nThe file")
r = export(oh, me["id"])
check("an owner downloads a file (200)", r.status_code == 200, r.text[:100])
check("with a GEDCOM type and a download name that carries no one's name", r.headers["content-type"].startswith("application/x-gedcom") and re.fullmatch(r'attachment; filename="kinjy-family-\d{8}\.ged"', r.headers["content-disposition"]), r.headers)
check("never cached", r.headers.get("cache-control") == "no-store")
text = r.content.decode("utf-8")
check("it is GEDCOM 5.5.1, UTF-8", text.startswith("0 HEAD\r\n") and "2 VERS 5.5.1" in text and "1 CHAR UTF-8" in text and text.endswith("0 TRLR\r\n"))
check("the verified deceased person is written in full", "1 NAME Grandma" in text and "2 DATE 2 FEB 1930" in text and "2 DATE 4 MAR 2001" in text and "Born in Kumasi" in text)
check("everyone else is Private, with no name, date or sex", "Daddy" not in text and "Owner" not in text and text.count("1 NAME Private") == p["masked"] and "1985" not in text and "1958" not in text)
check("the structure is kept: the mother's role gives her a WIFE slot", "1 WIFE " in text and "1 CHIL " in text)
check("the header says how many were hidden and that the links still show", f"{p['masked']} hidden" in text and "how they are related" in text)
check("no Kinjy identifier, account or file link", not re.search(r"prs_|usr_|http|/media|OBJE", text))
check("the body matches the preview's counts", text.count(" INDI\r\n") == p["people"])

print("\nThe record of it")
with SessionLocal() as db:
    events = db.scalars(select(models.ExportEvent).where(models.ExportEvent.user_id == ou["id"])).all()
check("one export, one event: who, how many included and hidden", len(events) == 1 and (events[0].people, events[0].included, events[0].masked) == (p["people"], p["included"], p["masked"]) and events[0].format == "gedcom551", [(e.people, e.included, e.masked) for e in events])
cols = {col.name for col in models.ExportEvent.__table__.columns}
check("and the table has no place for the content", cols == {"id", "user_id", "person_id", "format", "people", "included", "masked", "at"}, cols)
with SessionLocal() as db:
    n = len(db.scalars(select(models.ExportEvent).where(models.ExportEvent.person_id == me["id"])).all())
check("the refused attempts above left no event", n == 1, n)

print("\nA one-person tree")
pr = c.post("/family/persons", headers=oh, json={"given_name": "Lone"}).json()
r = export(oh, pr["id"])
check("its owner exports it: a valid file with that one person hidden (200)", r.status_code == 200 and r.text.count(" INDI\r\n") == 1 and "1 NAME Private" in r.text, r.text[:120])

print("\nLimits")
codes = [export(oh, me["id"]).status_code for _ in range(5)]
check("exports are limited per member: five an hour, then 429", codes[-1] == 429 and 429 not in codes[:2], codes)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
