"""Reacting to a comment, and comments that are more than one line.

A comment could only ever be one line, because the box it was written in was an
`<input>`: Enter submitted the form and there was no other key to try. And it
could only be answered with a thumb, when the thing people reach for in a
thread is a sticker.

Both of those are the same kind of bug - the data model allowed it all along
and the composer did not - so both are checked here against what comes back
out of the server, not against what the page drew.
"""
import random
import string
import sys
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
c = httpx.Client(base_url=BASE, timeout=30)
ok = True
NL = chr(10)


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


def find(items, comment_id):
    """A comment anywhere in the returned tree."""
    for item in items:
        if item["id"] == comment_id:
            return item
        found = find(item.get("children") or [], comment_id)
        if found:
            return found
    return None


print("Comments over more than one line")

author_t, author = register("Test Author")
reader_t, reader = register("Test Reader")
other_t, other = register("Test Other")

r = c.post("/posts", headers=H(author_t), json={"body": "A post to comment on.", "visibility": "public"})
r.raise_for_status()
post = r.json()["id"]

multi = NL.join(["First line.", "Second line.", "", "And a fourth."])
r = c.post(f"/posts/{post}/comments", headers=H(reader_t), json={"body": multi})
check("a comment with line breaks is accepted", r.status_code in (200, 201),
      f"{r.status_code} {r.text[:150]}")
comment = r.json()["id"]

thread = c.get(f"/posts/{post}/comments", headers=H(reader_t)).json()
stored = find(thread["items"], comment)
check("and comes back exactly as written",
      stored is not None and stored["body"] == multi, repr(stored and stored["body"]))

print(NL + "Reacting with a sticker")

# The catalogue is the server's, so the test asks for it rather than assuming
# an id - a hard-coded sticker id is a test that breaks when the set is edited.
packs = c.get("/stickers", headers=H(reader_t)).json()["packs"]
first = packs[0]["stickers"][0]["id"]
second = packs[0]["stickers"][1]["id"]

r = c.post(f"/comments/{comment}/reaction", headers=H(author_t), json={"sticker_id": first})
check("a sticker can answer a comment", r.status_code == 200, f"{r.status_code} {r.text[:150]}")
check("it is counted as that sticker", r.json()["stickers"].get(first) == 1, str(r.json()))
check("and remembered as this reader's own", r.json()["my_sticker"] == first, str(r.json()))

r = c.post(f"/comments/{comment}/reaction", headers=H(author_t), json={"sticker_id": second})
body = r.json()
check("a second sticker replaces the first rather than stacking",
      body["stickers"].get(second) == 1 and first not in body["stickers"], str(body))
check("so one person is still one reaction", body["likes"] == 1, str(body))

r = c.post(f"/comments/{comment}/reaction", headers=H(author_t), json={"sticker_id": second})
check("sending the same one again takes it back", r.json()["likes"] == 0, str(r.json()))
check("and leaves nothing behind", not r.json()["stickers"], str(r.json()))

# A plain like still works, and is counted apart from the stickers so the
# thumb and the stickers can be drawn as the different things they are.
c.post(f"/comments/{comment}/reaction", headers=H(author_t), json={"sticker_id": None})
r = c.post(f"/comments/{comment}/reaction", headers=H(other_t), json={"sticker_id": first})
body = r.json()
check("a like and a sticker are counted apart",
      body["likes"] == 2 and body["stickers"].get(first) == 1, str(body))

thread = c.get(f"/posts/{post}/comments", headers=H(other_t)).json()
seen = find(thread["items"], comment)
check("the thread reports the stickers on a comment",
      seen is not None and seen.get("stickers", {}).get(first) == 1, str(seen and seen.get("stickers")))
check("and which one this reader chose",
      seen is not None and seen.get("my_sticker") == first, str(seen and seen.get("my_sticker")))

r = c.post(f"/comments/{comment}/reaction", headers=H(reader_t), json={"sticker_id": "not.a.sticker"})
check("a sticker that is not in the catalogue is refused", r.status_code == 422,
      f"{r.status_code} {r.text[:120]}")

print("OK" if ok else "FAILED")
sys.exit(0 if ok else 1)
