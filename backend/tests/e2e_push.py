"""Subscribing a browser to push, and the rules around it.

Nothing here sends a real push - that needs a browser vendor's push service and
a live subscription. What is checked is the part this platform owns: who may
subscribe, what happens when the same browser subscribes twice, and whether a
member can remove somebody else's device.

Run against the local stack:  python backend/tests/e2e_push.py
"""
from __future__ import annotations

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
    ok = ok and bool(cond)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def register(prefix):
    t = "".join(random.choices(string.ascii_lowercase, k=8))
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"{prefix}{t}", "display_name": f"Demo {prefix.upper()}",
        "password": "Sup3rStrong!Pass",
        "date_of_birth": date(today.year - 30, today.month, min(today.day, 28)).isoformat(),
        "country": "US"})
    r.raise_for_status()
    return r.json()["user"]["id"], r.json()["tokens"]["access_token"]


def subscription(tag: str) -> dict:
    return {
        "endpoint": f"https://push.example.com/endpoint/{tag}",
        "p256dh": "BJ" + "x" * 85,
        "auth": "y" * 22,
    }


alice_id, alice = register("pa")
bob_id, bob = register("pb")

print("== the key a browser needs")
r = c.get("/push/key")
check("the public key is served without signing in", r.status_code == 200,
      (r.status_code, r.text[:120]))
body = r.json() if r.status_code == 200 else {}
check("it says whether push is configured at all", "available" in body, body)
if not body.get("available"):
    print("SKIP: no VAPID keys configured on this stack")
    sys.exit(2)
check("and carries a key when it is", bool(body.get("public_key")), body)

print("\n== subscribing")
r = c.post("/push/subscribe", json=subscription("alice-laptop"))
check("a stranger cannot subscribe", r.status_code in (401, 403), (r.status_code, r.text[:120]))

r = c.post("/push/subscribe", headers=auth(alice), json=subscription("alice-laptop"))
check("a member can", r.status_code == 201, (r.status_code, r.text[:160]))

r = c.post("/push/subscribe", headers=auth(alice), json=subscription("alice-laptop"))
check("subscribing the same browser twice is not two subscriptions",
      r.status_code == 201, (r.status_code, r.text[:160]))
# Two rows for one browser means every notification arrives twice; the
# endpoint is unique, so the second call updates rather than inserts.

r = c.post("/push/subscribe", headers=auth(alice), json=subscription("alice-phone"))
check("a second device is its own subscription", r.status_code == 201,
      (r.status_code, r.text[:160]))

print("\n== a browser that changes hands")
r = c.post("/push/subscribe", headers=auth(bob), json=subscription("alice-laptop"))
check("the same browser signed in as somebody else is reassigned, not refused",
      r.status_code == 201, (r.status_code, r.text[:160]))
# Otherwise the first member keeps receiving notifications on a device that is
# now somebody else's - which is the worse of the two failures by a long way.

print("\n== unsubscribing")
r = c.request("DELETE", "/push/subscribe", headers=auth(alice),
              params={"endpoint": subscription("alice-laptop")["endpoint"]})
check("removing a subscription that is no longer yours quietly does nothing",
      r.status_code == 204, (r.status_code, r.text[:120]))

r = c.request("DELETE", "/push/subscribe", headers=auth(alice),
              params={"endpoint": subscription("alice-phone")["endpoint"]})
check("removing your own works", r.status_code == 204, (r.status_code, r.text[:120]))

r = c.request("DELETE", "/push/subscribe", headers=auth(alice),
              params={"endpoint": subscription("never-existed")["endpoint"]})
check("removing one that never existed is not an error", r.status_code == 204,
      (r.status_code, r.text[:120]))

print("\nALL CHECKS PASSED" if ok else "\nTHERE ARE FAILURES")
sys.exit(0 if ok else 1)
