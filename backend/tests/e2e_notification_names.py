"""Notifications name people, not handles.

A notification is read on a lock screen, out of context. "@k_mbeki3 liked your
post" asks the reader to decode a handle before they know whether they care,
and "Someone replied to you" does not even offer one. Both were real: the
message notification carried an @handle, the comment one carried nobody, and
reacting to a post notified no one at all.

Every check here reads the title the server actually stored, because that is
the string that ends up on the phone.
"""
import random
import string
import sys
import time
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
c = httpx.Client(base_url=BASE, timeout=60)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    if not cond:
        ok = False


def tag():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def register(name):
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": name,
        "password": "Sup3rStrong!Pass", "date_of_birth": date(1990, 2, 2).isoformat(),
        "country": "UG",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"], d["user"]


def H(t):
    return {"Authorization": f"Bearer {t['access_token']}"}


def titles(token, kind=None):
    """The notification titles waiting for somebody, newest first."""
    for _ in range(12):
        r = c.get("/notifications", headers=H(token))
        if r.status_code == 200:
            items = r.json().get("items", [])
            found = [i["title"] for i in items if kind is None or i.get("kind") == kind]
            if found:
                return found
        time.sleep(0.5)
    return []


AUTHOR_NAME = "Ada Nkemelu"
ACTOR_NAME = "Kofi Mbeki"

author_t, author = register(AUTHOR_NAME)
actor_t, actor = register(ACTOR_NAME)

print("Reacting to a post")

r = c.post("/posts", headers=H(author_t), json={"body": "Something worth reacting to.", "visibility": "public"})
r.raise_for_status()
post = r.json()["id"]

r = c.post(f"/posts/{post}/like", headers=H(actor_t))
check("a like is accepted", r.status_code == 200, f"{r.status_code} {r.text[:120]}")

seen = titles(author_t, "reaction")
check("the author is told somebody reacted", bool(seen), "no reaction notification arrived")
check("and it names them", any(ACTOR_NAME in t for t in seen), str(seen))
check("by name, never by handle",
      not any("@" in t or actor["handle"] in t for t in seen), str(seen))

# Taking it back is not news, and neither is reacting to your own post.
before = len(titles(author_t, "reaction"))
c.post(f"/posts/{post}/like", headers=H(actor_t))
time.sleep(1)
check("taking a reaction back sends nothing", len(titles(author_t, "reaction")) == before,
      "a withdrawn reaction notified the author")

c.post(f"/posts/{post}/react", headers=H(author_t), json={"kind": "love"})
time.sleep(1)
check("reacting to your own post sends nothing",
      len(titles(author_t, "reaction")) == before, "the author was notified about themself")

print()
print("Commenting")

r = c.post(f"/posts/{post}/comments", headers=H(actor_t), json={"body": "A thought about this."})
check("a comment is accepted", r.status_code in (200, 201), f"{r.status_code} {r.text[:120]}")
seen = titles(author_t, "comment")
check("the author is told who commented", any(ACTOR_NAME in t for t in seen), str(seen))
check("and not by handle", not any("@" in t for t in seen), str(seen))

print()
print("A message")

# They have to be connected before one can write to the other.
c.post(f"/connections/{author['id']}", headers=H(actor_t), json={"message": None})
c.post(f"/connections/{actor['id']}/respond?accept=true", headers=H(author_t))
# Not end-to-end encrypted, so the server can read a preview - the notification
# path being tested. An encrypted thread notifies with a title and no body,
# which is correct and is not what this check is about.
r = c.post("/conversations", headers=H(actor_t),
           json={"kind": "direct", "participant_ids": [author["id"]], "encrypted": False})
r.raise_for_status()
conversation = r.json()["id"]
r = c.post(f"/conversations/{conversation}/messages", headers=H(actor_t), json={"body": "Hello there."})
check("a message is accepted", r.status_code in (200, 201), f"{r.status_code} {r.text[:120]}")

seen = titles(author_t, "message")
check("the message notification names the sender", any(ACTOR_NAME in t for t in seen), str(seen))
check("and carries no @handle", not any("@" in t for t in seen), str(seen))

print("OK" if ok else "FAILED")
sys.exit(0 if ok else 1)
