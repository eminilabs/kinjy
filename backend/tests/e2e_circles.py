"""Circles, against the live API.

A circle is a promise about reach: a post shared to it is read by its members
and its author, and by nobody else. Each half of that promise has failed before
— circle posts reached nobody but their author, and followers-only posts
reached every signed-in member — so both directions are checked here, on every
door a post can be opened through: the feed, the author's page, a direct link,
reactions, comments and reposts.
"""
import json
import random
import string
import sys
import time
from concurrent.futures import ThreadPoolExecutor
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


def born(age):
    t = date.today()
    return date(t.year - age, t.month, min(t.day, 28)).isoformat()


def register(age, name="u"):
    t = tag()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"{name}{t}", "display_name": f"Circle {name} {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": born(age), "country": "US",
    })
    r.raise_for_status()
    d = r.json()
    return d["tokens"]["access_token"], d["user"]


def auth(t):
    return {"Authorization": f"Bearer {t}"}


def post(tok, body, **extra):
    r = c.post("/posts", headers=auth(tok), json={"body": body, **extra})
    return r


def feed_ids(tok, mode):
    r = c.get(f"/feed?mode={mode}&limit=100", headers=auth(tok))
    return [p["id"] for p in r.json().get("items", [])] if r.status_code == 200 else []


def page_ids(tok, author_id):
    r = c.get(f"/posts/by/{author_id}?limit=50", headers=auth(tok) if tok else {})
    return [p["id"] for p in r.json().get("items", [])] if r.status_code == 200 else []


owner_tok, owner = register(30, "own")
member_tok, member = register(31, "mem")
outsider_tok, outsider = register(32, "out")
follower_tok, follower = register(33, "fol")
follower2_tok, follower2 = register(34, "fot")
blocker_tok, blocker = register(35, "blk")
teen_tok, teen = register(15, "teen")

print("\n== a circle can be created, read, renamed ==")
r = c.post("/circles", headers=auth(owner_tok), json={"name": "Close friends", "kind": "close_friends"})
check("create answers 201", r.status_code == 201, r.text[:160])
circle = r.json()["id"] if r.status_code == 201 else None
check("a new circle reaches nobody yet", r.json().get("members_count") == 0, r.text[:160])
r = c.patch(f"/circles/{circle}", headers=auth(owner_tok), json={"name": "Inner circle"})
check("rename answers 200", r.status_code == 200 and r.json()["name"] == "Inner circle", r.text[:160])
r = c.get(f"/circles/{circle}", headers=auth(outsider_tok))
check("someone else's circle is a 404", r.status_code == 404, r.status_code)
r = c.post("/circles", headers=auth(owner_tok), json={"name": "Odd", "kind": "smart"})
check("a smart circle without a rule is refused", r.status_code == 400, r.text[:160])
r = c.post("/circles", headers=auth(owner_tok),
           json={"name": "Odd", "kind": "family", "rule": {"source": "followers"}})
check("a rule on a static circle is refused", r.status_code == 400, r.text[:160])

print("\n== members are managed by the owner, within the rules ==")
r = c.post(f"/circles/{circle}/members/{member['id']}", headers=auth(owner_tok))
check("adding a member answers 201", r.status_code == 201 and r.json().get("added") is True, r.text[:160])
check("the count follows", r.json().get("members_count") == 1, r.text[:160])
r = c.post(f"/circles/{circle}/members/{member['id']}", headers=auth(owner_tok))
check("adding twice is harmless", r.status_code == 201 and r.json().get("already") is True, r.text[:160])
r = c.post(f"/circles/{circle}/members/{owner['id']}", headers=auth(owner_tok))
check("the owner cannot add themselves", r.status_code == 400, r.text[:160])
r = c.post(f"/circles/{circle}/members/usr_doesnotexist", headers=auth(owner_tok))
check("an unknown member is a 404", r.status_code == 404, r.text[:160])
r = c.post(f"/circles/{circle}/members/{teen['id']}", headers=auth(owner_tok))
check("an adult cannot add an unconnected 15-year-old", r.status_code == 403, r.text[:160])
check("and is not told why", "age" not in r.text.lower() and "minor" not in r.text.lower(), r.text[:160])
r = c.post(f"/circles/{circle}/members/{outsider['id']}", headers=auth(member_tok))
check("only the owner manages the list", r.status_code == 404, r.text[:160])
r = c.get(f"/circles/{circle}", headers=auth(owner_tok))
members = {m["user_id"]: m for m in r.json().get("members", [])} if r.status_code == 200 else {}
check("the owner sees the member, active", members.get(member["id"], {}).get("active") is True, members)
check("with a handle to show", members.get(member["id"], {}).get("handle") == member["handle"], members)

print("\n== a circle post reaches its members and nobody else ==")
r = post(outsider_tok, "into someone else's circle", visibility="circle", circle_id=circle)
check("posting into another member's circle is refused", r.status_code == 404, r.text[:160])
r = post(owner_tok, "for the inner circle only", visibility="circle", circle_id=circle)
check("the owner can post to it", r.status_code == 201, r.text[:160])
secret = r.json()["id"] if r.status_code == 201 else None

check("the member sees it in the Circles feed", secret in feed_ids(member_tok, "circles"))
check("the member sees it on the owner's page", secret in page_ids(member_tok, owner["id"]))
check("the member can open it", c.get(f"/posts/{secret}", headers=auth(member_tok)).status_code == 200)
check("the member can react", c.post(f"/posts/{secret}/react", headers=auth(member_tok),
                                     json={"kind": "love"}).status_code == 200)
check("the member can comment", c.post(f"/posts/{secret}/comments", headers=auth(member_tok),
                                       json={"body": "lovely"}).status_code == 201)
check("the owner sees it in the Circles feed too", secret in feed_ids(owner_tok, "circles"))

check("an outsider does not see it in any feed",
      all(secret not in feed_ids(outsider_tok, m) for m in ("circles", "for_you", "new", "global")))
check("nor on the owner's page", secret not in page_ids(outsider_tok, owner["id"]))
check("a visitor does not see it on the owner's page", secret not in page_ids(None, owner["id"]))
for label, call in (
    ("open it by link", lambda: c.get(f"/posts/{secret}", headers=auth(outsider_tok))),
    ("load its media", lambda: c.get(f"/posts/{secret}/media", headers=auth(outsider_tok))),
    ("ask why it is shown", lambda: c.get(f"/feed/why/{secret}?mode=circles", headers=auth(outsider_tok))),
    ("read its reactions", lambda: c.get(f"/posts/{secret}/reactions", headers=auth(outsider_tok))),
    ("react to it", lambda: c.post(f"/posts/{secret}/react", headers=auth(outsider_tok), json={"kind": "like"})),
    ("read its comments", lambda: c.get(f"/posts/{secret}/comments", headers=auth(outsider_tok))),
    ("comment on it", lambda: c.post(f"/posts/{secret}/comments", headers=auth(outsider_tok), json={"body": "hi"})),
    ("open it signed out", lambda: c.get(f"/posts/{secret}")),
):
    r = call()
    check(f"an outsider cannot {label} (404)", r.status_code == 404, r.status_code)

r = c.post(f"/posts/{secret}/repost", headers=auth(member_tok), json={"body": ""})
check("a member cannot reshare it to their own audience", r.status_code == 400, r.text[:160])

print("\n== leaving the circle closes the door at once ==")
r = c.delete(f"/circles/{circle}/members/{member['id']}", headers=auth(owner_tok))
check("removing answers 204", r.status_code == 204, r.status_code)
check("the removed member can no longer open it", c.get(f"/posts/{secret}", headers=auth(member_tok)).status_code == 404)
check("nor find it in the Circles feed", secret not in feed_ids(member_tok, "circles"))

print("\n== a block cuts the circle off too ==")
c.post(f"/circles/{circle}/members/{blocker['id']}", headers=auth(owner_tok))
check("before the block the member can read it", c.get(f"/posts/{secret}", headers=auth(blocker_tok)).status_code == 200)
r = c.post(f"/users/{owner['id']}/block", headers=auth(blocker_tok))
check("the member blocks the owner", r.status_code in (200, 201), r.text[:160])
check("after it they cannot", c.get(f"/posts/{secret}", headers=auth(blocker_tok)).status_code == 404)
r = c.get(f"/circles/{circle}", headers=auth(owner_tok))
members = {m["user_id"]: m for m in r.json().get("members", [])} if r.status_code == 200 else {}
check("the owner sees them listed as no longer reached", members.get(blocker["id"], {}).get("active") is False, members)
check("and the count says who is reached", r.json().get("members_count") == 0, r.text[:200])

print("\n== followers-only posts reach followers only ==")
r = c.post(f"/users/{owner['id']}/follow", headers=auth(follower_tok))
check("a follower follows", r.status_code in (200, 201), r.text[:160])
r = post(owner_tok, "for my followers", visibility="followers")
fans = r.json()["id"] if r.status_code == 201 else None
check("the follower can open it", c.get(f"/posts/{fans}", headers=auth(follower_tok)).status_code == 200)
check("the Following feed is no longer empty", fans in feed_ids(follower_tok, "following"))
check("an outsider cannot open it", c.get(f"/posts/{fans}", headers=auth(outsider_tok)).status_code == 404)
check("nor find it in a feed", all(fans not in feed_ids(outsider_tok, m) for m in ("for_you", "new", "global")))

print("\n== a smart circle is a rule, asked again at every read ==")
c.post(f"/users/{owner['id']}/follow", headers=auth(follower2_tok))
r = c.patch("/users/me", headers=auth(follower_tok), json={"city": "Kigoma"})
check("a follower says they live in Kigoma", r.status_code == 200, r.text[:160])
r = c.post("/circles", headers=auth(owner_tok), json={
    "name": "Followers in Kigoma", "kind": "smart", "rule": {"source": "followers", "city": "kigoma"},
})
check("a smart circle is created", r.status_code == 201, r.text[:200])
smart = r.json()["id"] if r.status_code == 201 else None
ids = [m["user_id"] for m in r.json().get("members", [])] if r.status_code == 201 else []
check("it holds the follower who lives there", follower["id"] in ids, ids)
check("and not the follower who said nothing", follower2["id"] not in ids, ids)
r = c.post(f"/circles/{smart}/members/{outsider['id']}", headers=auth(owner_tok))
check("nobody is added by hand to a smart circle", r.status_code == 400, r.text[:160])
r = post(owner_tok, "Kigoma market day", visibility="circle", circle_id=smart)
local = r.json()["id"] if r.status_code == 201 else None
check("the Kigoma follower reads it", c.get(f"/posts/{local}", headers=auth(follower_tok)).status_code == 200)
check("the other follower does not", c.get(f"/posts/{local}", headers=auth(follower2_tok)).status_code == 404)
c.patch("/users/me", headers=auth(follower2_tok), json={"city": "Kigoma"})
check("moving to Kigoma brings them in, with nothing to sync",
      c.get(f"/posts/{local}", headers=auth(follower2_tok)).status_code == 200)
c.delete(f"/users/{owner['id']}/follow", headers=auth(follower_tok))
check("unfollowing takes them out again", c.get(f"/posts/{local}", headers=auth(follower_tok)).status_code == 404)

print("\n== changing kind and deleting ==")
r = c.patch(f"/circles/{circle}", headers=auth(owner_tok), json={"kind": "smart"})
check("turning a circle smart needs a rule", r.status_code == 400, r.text[:160])
r = c.patch(f"/circles/{circle}", headers=auth(owner_tok), json={"kind": "smart", "rule": {"source": "followers"}})
check("with one it becomes smart", r.status_code == 200 and r.json()["kind"] == "smart", r.text[:200])
r = c.patch(f"/circles/{smart}", headers=auth(owner_tok), json={"kind": "family"})
check("a smart circle can turn static, and starts empty",
      r.status_code == 200 and r.json()["rule"] is None and r.json()["members"] == [], r.text[:200])
c.post(f"/circles/{smart}/members/{member['id']}", headers=auth(owner_tok))
r = post(owner_tok, "last one", visibility="circle", circle_id=smart)
last = r.json()["id"] if r.status_code == 201 else None
check("before deletion the member reads it", c.get(f"/posts/{last}", headers=auth(member_tok)).status_code == 200)
check("deleting answers 204", c.delete(f"/circles/{smart}", headers=auth(owner_tok)).status_code == 204)
check("after it, a post shared to that circle reaches nobody",
      c.get(f"/posts/{last}", headers=auth(member_tok)).status_code == 404)
check("except its author", c.get(f"/posts/{last}", headers=auth(owner_tok)).status_code == 200)

print("\n== input is validated, not trusted ==")
r = c.post("/circles", headers=auth(owner_tok), json={"name": "   "})
check("a name of spaces is refused", r.status_code == 422, r.text[:160])
r = c.patch(f"/circles/{circle}", headers=auth(owner_tok), json={"name": "  "})
check("renaming to spaces is refused", r.status_code == 422, r.text[:160])
r = c.post("/circles", headers=auth(owner_tok),
           json={"name": "Bad country", "kind": "smart", "rule": {"source": "followers", "country": "1!"}})
check("a country that is not two letters is refused", r.status_code == 422, r.text[:160])
r = c.post("/circles", headers=auth(owner_tok),
           json={"name": "Blank city", "kind": "smart", "rule": {"source": "followers", "city": "   ", "country": "ke"}})
check("a blank city is dropped, not stored as a filter",
      r.status_code == 201 and r.json()["rule"] == {"source": "followers", "country": "KE"}, r.text[:200])
if r.status_code == 201:
    c.delete(f"/circles/{r.json()['id']}", headers=auth(owner_tok))

print("\n== the same member added six times at once ==")
dup_tok, dup = register(38, "dup")
r = c.post("/circles", headers=auth(owner_tok), json={"name": "Race", "kind": "custom"})
race = r.json()["id"]
add_url = f"{BASE}/circles/{race}/members/{dup['id']}"
with ThreadPoolExecutor(6) as pool:
    codes = list(pool.map(lambda _: httpx.post(add_url, headers=auth(owner_tok), timeout=60).status_code, range(6)))
check("no request fails with a server error", all(code == 201 for code in codes), codes)
r = c.get(f"/circles/{race}", headers=auth(owner_tok))
check("and they are listed once", [m["user_id"] for m in r.json()["members"]] == [dup["id"]], r.text[:200])
c.delete(f"/circles/{race}", headers=auth(owner_tok))

print("\n== an owner cannot make circles without end ==")
cap_tok, cap = register(39, "cap")
for i in range(100):
    c.post("/circles", headers=auth(cap_tok), json={"name": f"Circle {i}"})
r = c.post("/circles", headers=auth(cap_tok), json={"name": "One too many"})
check("the 101st circle is refused", r.status_code == 400, r.text[:160])
check("with a reason the member can act on", "100" in r.text, r.text[:160])


def notified(tok, needle):
    r = c.get("/notifications?limit=50", headers=auth(tok))
    items = r.json().get("items", []) if r.status_code == 200 else []
    return any(needle in ((i.get("body") or "") + (i.get("title") or "")) for i in items)


print("\n== a removed member hears nothing more ==")
gone_tok, gone = register(36, "gon")
stay_tok, stay = register(37, "sty")
r = c.post("/circles", headers=auth(owner_tok), json={"name": "Thread", "kind": "custom"})
thread = r.json()["id"]
for who in (gone, stay):
    c.post(f"/circles/{thread}/members/{who['id']}", headers=auth(owner_tok))
talk = post(owner_tok, "a thread for the circle", visibility="circle", circle_id=thread).json()["id"]
first = c.post(f"/posts/{talk}/comments", headers=auth(gone_tok), json={"body": "my first word"}).json()["id"]
c.post(f"/posts/{talk}/comments", headers=auth(stay_tok), json={"body": "reply while you are in", "parent_id": first})
seen = any(notified(gone_tok, "reply while you are in") or time.sleep(1) for _ in range(8))
check("while a member, a reply to them notifies them", seen)
c.delete(f"/circles/{thread}/members/{gone['id']}", headers=auth(owner_tok))
r = c.post(f"/posts/{talk}/comments", headers=auth(stay_tok),
           json={"body": "said after you left", "parent_id": first})
check("the thread goes on", r.status_code == 201, r.text[:160])
time.sleep(4)
check("but the removed member is not sent its words", not notified(gone_tok, "said after you left"))

print("\n== the live channel follows the same rule ==")
from websockets.sync.client import connect  # noqa: E402

WS = BASE.replace("http", "ws", 1) + "/ws"
public = post(owner_tok, "a public post").json()["id"]


def granted(tok, topics):
    # The token is the first frame, not part of the URL: it would otherwise be
    # written to every proxy's access log on the way.
    with connect(WS, open_timeout=20) as ws:
        ws.send(json.dumps({"action": "auth", "token": tok}))
        ws.recv(timeout=20)  # ready
        ws.send(json.dumps({"action": "subscribe", "topics": topics}))
        while True:
            frame = json.loads(ws.recv(timeout=20))
            if frame.get("type") == "subscribed":
                return frame["topics"]


check("a member may listen to the circle post", f"post:{talk}" in granted(stay_tok, [f"post:{talk}"]))
check("a removed member may not", f"post:{talk}" not in granted(gone_tok, [f"post:{talk}"]))
check("nor an outsider", f"post:{talk}" not in granted(outsider_tok, [f"post:{talk}"]))
both = granted(outsider_tok, [f"post:{public}", "feed"])
check("public posts and the feed stay open to everyone", f"post:{public}" in both and "feed" in both, both)

print("\n" + ("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE"))
sys.exit(0 if ok else 1)
