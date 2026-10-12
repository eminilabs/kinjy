"""An invitation that survives the visit, against the live API.

The thing being protected: somebody follows an invite link, reads three more
pages, and signs up twenty minutes later. The member who invited them has to
be credited. Until now the code was only read on the shared-post page, so an
invitation to the home page, a profile or the pricing page credited nobody.

The browser half of that lives in ReferralWatch and localStorage, which this
cannot reach. What it can check is the piece underneath it: the lookup that
decides whether a code off a link is real, which is what stops a tracking
parameter from a mangled share walking over somebody's invitation.
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


def register(referral_code=None, age=30):
    t = tag()
    body = {
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"Ref {t}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(date.today().year - age, 5, 5).isoformat(),
        "country": "US",
    }
    if referral_code:
        body["referral_code"] = referral_code
    return c.post("/auth/register", json=body)


print("Invitation links")

r = register()
r.raise_for_status()
inviter = r.json()["user"]
code = inviter["referral_code"]
print(f"  (inviter {inviter['handle']}, code {code})")

found = c.get(f"/auth/referral/{code}")
check("a real code resolves", found.status_code == 200, f"{found.status_code} {found.text[:120]}")
if found.status_code == 200:
    body = found.json()
    check("it names the inviter", body.get("display_name") == inviter["display_name"], str(body))
    check("it gives back the canonical code", body.get("code") == code, str(body))
    # Only the public half. An invitation is shown to strangers by design, so
    # anything that is not already on a profile has no business in it.
    check("and nothing private", set(body) == {"code", "display_name", "handle"}, str(sorted(body)))

check("lower case resolves to the same code",
      c.get(f"/auth/referral/{code.lower()}").status_code == 200)

# The whole point of the lookup: these are the shapes that used to be able to
# displace a real invitation, because they look exactly like a code.
for noise in ("WHATSAPP", "TWITTER", "NEWSLETTER", "ABCD1234", "hello"):
    check(f"'{noise}' is not an invitation", c.get(f"/auth/referral/{noise}").status_code == 404,
          str(c.get(f"/auth/referral/{noise}").status_code))

check("no code at all is refused", c.get("/auth/referral/%20").status_code == 404)

# Unauthenticated on purpose: the visitor following the link has no account
# yet, which is the entire situation.
anon = httpx.Client(base_url=BASE, timeout=30)
check("a signed-out visitor can ask", anon.get(f"/auth/referral/{code}").status_code == 200)

# And the code still does what it is for.
invited = register(referral_code=code)
check("signing up with it is accepted", invited.status_code in (200, 201),
      f"{invited.status_code} {invited.text[:150]}")
check("signing up with a lower-case copy is accepted",
      register(referral_code=code.lower()).status_code in (200, 201))
bad = register(referral_code="WHATSAPP")
check("signing up with noise is refused rather than silently uncredited",
      bad.status_code == 400, f"{bad.status_code} {bad.text[:120]}")

print("OK" if ok else "FAILED")
sys.exit(0 if ok else 1)
