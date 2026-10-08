"""A date of birth for an account that has none.

Registration always writes an age record, so a normal account can be used to
check the refusals: it may not declare a date (it has one), may not pass for
somebody without one, and a signed-out request gets nowhere.

The other half - an account with NO record declaring one - needs a member that
predates the age gate. That cannot be made through the API on purpose; it is
checked by hand on such an account (see the e2e notes in docs, or sign in as an
imported member and add a date from the hub or the Account tab).
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


tag = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
today = date.today()
born = date(today.year - 30, today.month, min(today.day, 28)).isoformat()

r = c.post("/auth/register", json={
    "email": f"age-decl-{tag}@example.com", "password": "KalutaDemo123!",
    "display_name": f"Age Decl {tag}", "handle": f"age.decl.{tag}", "date_of_birth": born,
})
assert r.status_code == 201, r.text
auth = {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}

print("age declaration")
s = c.get("/auth/age-status", headers=auth)
check("status answers for a member with a record", s.status_code == 200, s.text)
check("a member with a record cannot declare", s.json().get("can_declare") is False, s.text)
check("a member with a record can correct", s.json().get("can_correct") is True, s.text)

d = c.post("/auth/age-declaration", headers=auth, json={"date_of_birth": born})
check("declaring again is refused", d.status_code == 409, f"{d.status_code} {d.text}")

d2 = c.post("/auth/age-declaration", headers=auth, json={"date_of_birth": "1950-01-01"})
check("a different date is refused too, not applied", d2.status_code == 409, f"{d2.status_code} {d2.text}")
check("and nothing moved", c.get("/auth/age-status", headers=auth).json().get("tier") == s.json().get("tier"))

check("signed out gets 401", c.post("/auth/age-declaration", json={"date_of_birth": born}).status_code == 401)

print("\nALL PASSED" if ok else "\nFAILURES")
sys.exit(0 if ok else 1)
