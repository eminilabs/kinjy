"""A paid community is joined by paying, and by nothing else.

Until now `join` answered 402 and pointed at a checkout that did not exist, so a
paid community could only be entered through an invitation, which is free. The
rule under test: the price comes from the community, a settled payment makes the
buyer an active member, and no other door (join, invite) hands out the seat.

Needs payment-service and ledger-service on top of the usual stack, and no live
payment rail (the mock settlement is refused when one is configured).

Run against the live stack:  python backend/tests/e2e_paid_membership.py
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


def born(age):
    t = date.today()
    return date(t.year - age, t.month, min(t.day, 28)).isoformat()


def register(age=30):
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": f"Demo {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"]


def auth(t):
    return {"Authorization": f"Bearer {t}"}


def checkout(tok, community_id, amount):
    return c.post("/payments/checkout", headers=auth(tok), json={
        "purpose": "community_membership", "amount": amount,
        "reference": community_id, "rail": "mock",
    })


owner_tok, owner = register()
buyer_tok, buyer = register()
friend_tok, friend = register()
banned_tok, banned = register()

r = c.post("/communities", headers=auth(owner_tok), json={
    "name": f"paid {tag()}", "description": "Paid garden club", "kind": "paid", "price_usd": 12.5,
})
r.raise_for_status()
paid = r.json()["id"]

print("\n== the only door is a payment ==")
r = c.post(f"/communities/{paid}/join", headers=auth(buyer_tok))
check("join answers 402 and states the price", r.status_code == 402 and "12.5" in r.text,
      f"{r.status_code} {r.text[:120]}")
r = c.post(f"/communities/{paid}/invite", headers=auth(owner_tok), json={"user_id": friend["id"]})
check("an invitation does not hand out a paid seat", r.status_code == 402, f"{r.status_code} {r.text[:120]}")

print("\n== the price comes from the community ==")
r = checkout(buyer_tok, paid, 0.01)
check("a checkout for a cent is refused", r.status_code == 400, f"{r.status_code} {r.text[:120]}")
r = c.post("/payments/checkout", headers=auth(buyer_tok), json={
    "purpose": "community_membership", "amount": 12.5, "rail": "mock"})
check("a checkout without a community is refused", r.status_code == 400, f"{r.status_code}")
r = checkout(buyer_tok, "cmy_doesnotexist", 12.5)
check("a checkout for a missing community is refused", r.status_code == 404, f"{r.status_code}")

print("\n== paying makes the buyer a member ==")
r = checkout(buyer_tok, paid, 12.5)
check("checkout at the right price opens", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
pay_id = r.json().get("payment_id")
r = c.get(f"/communities/{paid}", headers=auth(buyer_tok))
check("not a member before the payment settles", r.json().get("my_status") != "active", r.text[:160])
r = c.post(f"/payments/{pay_id}/mock-settle", headers=auth(buyer_tok))
check("the payment settles", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
r = c.post(f"/communities/{paid}/join", headers=auth(buyer_tok))
check("the buyer is now an active member", r.status_code == 200 and r.json().get("status") == "active",
      f"{r.status_code} {r.text[:120]}")
r = checkout(buyer_tok, paid, 12.5)
check("a member cannot pay twice", r.status_code == 409, f"{r.status_code} {r.text[:120]}")

print("\n== the money is booked ==")
r = c.get("/wallet", headers=auth(owner_tok))
check("the owner earned a share", r.status_code == 200 and float(r.json().get("lifetime_earned", 0)) > 0,
      f"{r.status_code} {r.text[:160]}")

print("\n== a banned member cannot buy back in ==")
r = c.post("/communities", headers=auth(owner_tok), json={
    "name": f"paid2 {tag()}", "description": "Second paid club", "kind": "paid", "price_usd": 5,
})
second = r.json()["id"]
r = checkout(banned_tok, second, 5)
pay2 = r.json()["payment_id"]
c.post(f"/payments/{pay2}/mock-settle", headers=auth(banned_tok))
r = c.post(f"/communities/{second}/members/{banned['id']}", headers=auth(owner_tok),
           json={"action": "ban"})
check("the owner bans the member", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
r = checkout(banned_tok, second, 5)
check("a banned member's checkout is refused", r.status_code == 403, f"{r.status_code} {r.text[:120]}")

print()
print("ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
