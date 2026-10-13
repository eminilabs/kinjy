"""Group conversations, against the live API.

What a group has to be, in the words people already use for it: a room with a
name and a purpose, somebody who runs it, people who can be brought in and can
walk out, and a line in the thread whenever any of that changes.

And the one everybody is in. A member who registers is in the welcome group
before they have done anything, the people already there hear that somebody
arrived, and nobody is put out of it on another member's say-so.
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


def register(name):
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"u{t}", "display_name": name,
        "password": "Sup3rStrong!Pass", "date_of_birth": date(1990, 2, 2).isoformat(),
        "country": "UG",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"]


def H(token):
    return {"Authorization": f"Bearer {token}"}


def body_of(token, conversation_id):
    """The system lines in a thread, which is where group changes are recorded."""
    r = c.get(f"/conversations/{conversation_id}/messages", headers=H(token))
    if r.status_code != 200:
        return []
    return [m.get("body") for m in r.json().get("items", []) if m.get("kind") == "system"]


def connect(a_token, a, b_token, b):
    """Make two members connected.

    Not scaffolding: the default setting is "connections only", so being able
    to put somebody in a room is already gated on their having accepted you.
    The test has to do what a member would.
    """
    c.post(f"/connections/{b['id']}", headers=H(a_token), json={"message": None})
    c.post(f"/connections/{a['id']}/respond?accept=true", headers=H(b_token))


print("Groups")

owner_t, owner = register("Test Owner")
mate_t, mate = register("Test Mate")
later_t, later = register("Test Latecomer")
connect(owner_t, owner, mate_t, mate)
connect(owner_t, owner, later_t, later)
connect(mate_t, mate, later_t, later)

r = c.post("/conversations", headers=H(owner_t), json={
    "kind": "group",
    "title": "Saturday football",
    "description": "Where we agree the time.",
    "participant_ids": [mate["id"]],
})
check("a group is created", r.status_code in (200, 201), f"{r.status_code} {r.text[:150]}")
group = r.json()["id"]

# Three or more people cannot share an end-to-end key here, so a group must not
# claim they do.
check("a group is not claimed to be end-to-end encrypted", r.json().get("encrypted") is False,
      str(r.json()))

r = c.get(f"/conversations/{group}/participants", headers=H(owner_t))
roles = {p["display_name"]: p["role"] for p in r.json()["items"]}
check("the creator owns it and the other is a member",
      roles.get("Test Owner") == "owner" and roles.get("Test Mate") == "member", str(roles))
check("admins are listed first", r.json()["items"][0]["role"] == "owner", str(roles))

# A member cannot run the room.
r = c.patch(f"/conversations/{group}", headers=H(mate_t), json={"title": "Hijacked"})
check("a member cannot rename the group", r.status_code == 403, str(r.status_code))

r = c.patch(f"/conversations/{group}", headers=H(owner_t), json={
    "title": "Sunday football", "description": "Now on Sundays.",
})
check("an admin can rename it", r.status_code == 200 and r.json()["title"] == "Sunday football",
      f"{r.status_code} {r.text[:120]}")
check("the rename is written into the thread",
      any("renamed the group" in (line or "") for line in body_of(owner_t, group)),
      str(body_of(owner_t, group)))

r = c.post(f"/conversations/{group}/participants", headers=H(mate_t),
           json={"user_ids": [later["id"]]})
check("a member cannot add people", r.status_code == 403, str(r.status_code))

r = c.post(f"/conversations/{group}/participants", headers=H(owner_t),
           json={"user_ids": [later["id"]]})
check("an admin can add people", r.status_code in (200, 201), f"{r.status_code} {r.text[:120]}")
check("and the thread says so",
      any("added Test Latecomer" in (line or "") for line in body_of(owner_t, group)),
      str(body_of(owner_t, group)))

r = c.post(f"/conversations/{group}/participants", headers=H(owner_t),
           json={"user_ids": [later["id"]]})
check("adding somebody twice adds nothing", r.json().get("added") == [], str(r.json()))

r = c.post(f"/conversations/{group}/participants/{mate['id']}/role", headers=H(owner_t),
           json={"role": "admin"})
check("an admin can be named", r.status_code == 200 and r.json()["role"] == "admin",
      f"{r.status_code} {r.text[:120]}")
r = c.post(f"/conversations/{group}/participants/{mate['id']}/role", headers=H(later_t),
           json={"role": "member"})
check("a plain member cannot change roles", r.status_code == 403, str(r.status_code))
r = c.post(f"/conversations/{group}/participants/{owner['id']}/role", headers=H(mate_t),
           json={"role": "member"})
check("the owner's role cannot be taken", r.status_code == 403, str(r.status_code))

r = c.delete(f"/conversations/{group}/participants/{owner['id']}", headers=H(mate_t))
check("an admin cannot remove the owner", r.status_code == 403, str(r.status_code))

r = c.delete(f"/conversations/{group}/participants/{later['id']}", headers=H(mate_t))
check("an admin can remove a member", r.status_code == 200, f"{r.status_code} {r.text[:120]}")

r = c.delete(f"/conversations/{group}/participants/{mate['id']}", headers=H(mate_t))
check("anybody can leave", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
check("leaving is written into the thread",
      any("left" in (line or "") for line in body_of(owner_t, group)),
      str(body_of(owner_t, group)))

print("\nThe welcome group")

fresh_t, fresh = register("Test Newcomer")
r = c.get("/conversations", headers=H(fresh_t))
groups = [
    item for item in r.json().get("items", [])
    if item.get("kind") == "group" and (item.get("title") or "").startswith("Welcome")
]
check("a new member is in it the moment they register", len(groups) == 1,
      str([i.get("title") for i in r.json().get("items", [])]))

if groups:
    welcome = groups[0]["id"]
    check("it has a description", bool(groups[0].get("description")), str(groups[0]))
    check("the arrival is written into the thread",
          any("Test Newcomer joined" in (line or "") for line in body_of(fresh_t, welcome)),
          str(body_of(fresh_t, welcome)[-3:]))

    # Everybody registered before them is in the same room, so they see it too.
    r = c.get("/conversations", headers=H(owner_t))
    check("everybody else is in the same one",
          any(i["id"] == welcome for i in r.json().get("items", [])),
          "the welcome group is missing for an older member")

    r = c.delete(f"/conversations/{welcome}/participants/{fresh['id']}", headers=H(owner_t))
    check("nobody is put out of the welcome group by somebody else",
          r.status_code == 403, str(r.status_code))

    # The welcome group holds the whole platform, so every response about it is
    # a response about every member unless it is deliberately bounded. Both of
    # these were unbounded and both broke: the list resolved names through a
    # batch endpoint that refuses more than 300 ids and so showed none at all,
    # and it carried a participant and a read-receipt row per member on every
    # poll.
    listed = groups[0]
    check("the list does not carry every member of a group",
          len(listed["participants"]) <= 8, str(len(listed["participants"])))
    check("but it does say how many there are",
          listed.get("participant_count", 0) >= len(listed["participants"]),
          str(listed.get("participant_count")))
    check("and it still resolves the names of the few it sends",
          len(listed.get("profiles") or {}) == len(listed["participants"]),
          f"{len(listed.get('profiles') or {})} names for {len(listed['participants'])} people")
    check("no read receipt per member of a group", not listed.get("read_state"),
          str(len(listed.get("read_state") or {})))

    r = c.get(f"/conversations/{welcome}/participants", headers=H(fresh_t))
    page = r.json()
    check("the member list is a page", len(page["items"]) <= 60, str(len(page["items"])))
    check("every member of the page has a name",
          all(not p["display_name"].startswith("usr_") for p in page["items"]),
          str([p["display_name"] for p in page["items"][:3]]))
    # Nobody runs the room everybody is in. It is created by the platform
    # rather than by a member, so there is no owner to rename it, no admin to
    # put anybody out of it, and nothing for one member to do to another. The
    # ordering of admins is tested on a real group above.
    check("nobody owns the welcome group",
          all(p["role"] == "member" for p in page["items"]),
          str([p["role"] for p in page["items"] if p["role"] != "member"]))
    check("so even an admin elsewhere cannot rename it",
          c.patch(f"/conversations/{welcome}", headers=H(owner_t),
                  json={"title": "Mine now"}).status_code == 403,
          "the welcome group was renamed by a member")
    if page.get("has_more"):
        second = c.get(f"/conversations/{welcome}/participants?offset={len(page['items'])}",
                       headers=H(fresh_t)).json()
        first_ids = {p["user_id"] for p in page["items"]}
        check("the next page is different people",
              not first_ids & {p["user_id"] for p in second["items"]},
              "the pages overlap")

    # A thread has to be able to name its own senders, because the conversation
    # list no longer carries a profile for every member of the room.
    said = c.post(f"/conversations/{welcome}/messages", headers=H(fresh_t),
                  json={"body": "Hello everybody."})
    check("a member can write in the welcome group", said.status_code in (200, 201),
          f"{said.status_code} {said.text[:120]}")
    thread = c.get(f"/conversations/{welcome}/messages", headers=H(owner_t)).json()
    check("the thread names whoever wrote in it",
          thread.get("profiles", {}).get(fresh["id"], {}).get("display_name") == "Test Newcomer",
          str(list((thread.get("profiles") or {}).values())[:2]))

print("OK" if ok else "FAILED")
sys.exit(0 if ok else 1)
