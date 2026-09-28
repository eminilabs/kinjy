"""Profile editing against the live API.

Run: python backend/tests/e2e_profile.py
"""
import random
import string
import struct
import sys
import time
import zlib
from datetime import date

import httpx

BASE = "http://localhost:8200/api"
# Direct ports, each checked by /health before it is trusted: a wrong port
# answers 404 to everything and would make a "refused" check pass by accident.
DIRECT = {"auth-service": "http://localhost:8201", "user-service": "http://localhost:8202",
          "media-service": "http://localhost:8213"}
c = httpx.Client(base_url=BASE, timeout=60)
ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    if not cond:
        ok = False


def tag():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def register(age, country="FR"):
    t = tag()
    today = date.today()
    r = c.post("/auth/register", json={
        "email": f"{t}@example.com", "handle": f"pf{t}", "display_name": f"Profile {t}",
        "password": "Sup3rStrong!Pass", "date_of_birth": date(today.year - age, 1, 15).isoformat(),
        "country": country,
    })
    r.raise_for_status()
    d = r.json()
    return {"Authorization": f"Bearer {d['tokens']['access_token']}"}, d["user"]


def make_png(width, height):
    rows = b"".join(
        b"\x00" + b"".join(bytes((x * 255 // width, y * 255 // height, 90)) for x in range(width))
        for y in range(height)
    )

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b"")


def upload(headers, purpose, finish=True):
    """Run the browser's three steps; returns the asset id."""
    body = make_png(128 + random.randint(0, 50), 128)  # distinct bytes each time
    grant = c.post("/media/profile-images/presign", headers=headers, json={
        "purpose": purpose, "filename": f"{purpose}.png", "mime_type": "image/png", "size_bytes": len(body),
    }).json()
    if not finish:
        return grant["asset_id"]
    r = c.put(grant["upload"]["path"], headers={**headers, "Content-Type": "image/png"}, content=body)
    assert r.status_code == 204, r.text
    for _ in range(30):
        r = c.post(f"/media/profile-images/{grant['asset_id']}/complete", headers=headers)
        if r.status_code != 202:
            break
        time.sleep(2)
    assert r.status_code == 200, r.text
    return grant["asset_id"]


def patch(headers, **fields):
    return c.patch("/users/me", headers=headers, json=fields)


print("== service identity")
for name, url in DIRECT.items():
    got = httpx.get(f"{url}/health", timeout=10).json().get("service")
    check(f"{url} is {name}", got == name, got)
if not ok:
    sys.exit(1)

adult, adult_user = register(30, country="FR")
minor, _ = register(15, country="FR")
other, _ = register(28)

print("== reading my own profile")
me = c.get("/users/me", headers=adult).json()
check("own profile exposes neighborhood and lang", "neighborhood" in me and "lang" in me, me.keys())

print("== a normal edit")
r = patch(adult, display_name="  Amina Diallo ", bio="Agronome.\nJ'aime la cuisine.",
          country="cd", state="Kinshasa", city=" Kinshasa ", languages="FR, ln,fr", lang="fr")
body = r.json()
check("200", r.status_code == 200, r.text)
check("name trimmed", body.get("display_name") == "Amina Diallo", body)
check("country normalised to CD", body.get("country") == "CD", body)
check("languages normalised", body.get("languages") == "fr,ln", body)
check("multi-line bio kept", body.get("bio") == "Agronome.\nJ'aime la cuisine.", body)

print("== the name reaches auth-service, the country does not")
auth_me = c.get("/auth/me", headers=adult).json()
check("auth display_name synced", auth_me.get("display_name") == "Amina Diallo", auth_me)
check("auth lang synced", auth_me.get("lang") == "fr", auth_me)
check("auth country (age jurisdiction) unchanged", auth_me.get("country") == "FR", auth_me)
check("sync route not reachable through the gateway",
      c.patch(f"/internal/users/{adult_user['id']}", json={"display_name": "Hijack"}).status_code == 404)

print("== invalid values are refused")
check("country ZZ -> 422", patch(adult, country="ZZ").status_code == 422)
check("unsupported interface language -> 422", patch(adult, lang="de").status_code == 422)
check("malformed spoken languages -> 422", patch(adult, languages="french").status_code == 422)
check("one-letter name -> 422", patch(adult, display_name="A").status_code == 422)
check("null name -> 422", patch(adult, display_name=None).status_code == 422)
check("control characters in city -> 422", patch(adult, city="Paris\u0000").status_code == 422)
check("right-to-left override in the name -> 422",
      patch(adult, display_name="Amina‮troppuS yjniK").status_code == 422)
check("zero-width space in the name -> 422", patch(adult, display_name="Kinjy​Support").status_code == 422)
r = patch(adult, bio="Papa de 3 \U0001F468‍\U0001F469‍\U0001F467")
check("emoji sequences survive in a bio", r.status_code == 200 and "‍" in r.json()["bio"], r.text)
check("zero-width characters do not hide words from the classifier",
      patch(adult, bio="explicit p​orn n​ude s​ex videos, dm me").status_code == 422)
check("avatar_url is no longer accepted -> 422",
      patch(adult, avatar_url="https://evil.example/pixel.gif").status_code == 422)

print("== clearing fields")
r = patch(adult, bio=None, city="")
check("bio and city cleared", r.status_code == 200 and r.json()["bio"] is None and r.json()["city"] is None, r.text)

print("== bio is public text")
r = patch(adult, bio="explicit porn nude sex videos, dm me")
check("explicit bio -> 422", r.status_code == 422, r.text)
check("refusal does not name the rule", "porn" not in r.text.lower(), r.text)

print("== neighbourhood is a precise location")
check("the editor is told an adult may set it",
      c.get("/users/me/eligibility", headers=adult).json() == {"neighborhood": True})
check("the editor is told a minor may not",
      c.get("/users/me/eligibility", headers=minor).json() == {"neighborhood": False})
check("eligibility needs a session -> 401", c.get("/users/me/eligibility").status_code == 401)
r = patch(adult, neighborhood="Gombe")
check("adult may set it", r.status_code == 200 and r.json()["neighborhood"] == "Gombe", r.text)
public = c.get(f"/users/{adult_user['handle']}").json()
check("public profile shows state", public.get("state") == "Kinshasa", public)
check("public profile never shows neighborhood", "neighborhood" not in public, public.keys())
check("minor may not set it -> 403", patch(minor, neighborhood="Gombe").status_code == 403)
check("minor may still edit the rest", patch(minor, city="Lyon").status_code == 200)

print("== images are referenced by asset id")
avatar = upload(adult, "avatar")
r = patch(adult, avatar_asset_id=avatar)
avatar_url = r.json().get("avatar_url")
check("avatar set from a ready asset", r.status_code == 200 and bool(avatar_url), r.text)
check("public profile shows it", c.get(f"/users/{adult_user['handle']}").json().get("avatar_url") == avatar_url)

cover = upload(adult, "cover")
check("a cover cannot be used as an avatar -> 422", patch(adult, avatar_asset_id=cover).status_code == 422)
r = patch(adult, cover_asset_id=cover)
check("cover set", r.status_code == 200 and bool(r.json().get("cover_url")), r.text)

someone_elses = upload(other, "avatar")
check("someone else's image -> 422", patch(adult, avatar_asset_id=someone_elses).status_code == 422)
check("unknown asset -> 422", patch(adult, avatar_asset_id="mda_doesnotexist").status_code == 422)
pending = upload(adult, "avatar", finish=False)
check("an unfinished upload -> 409", patch(adult, avatar_asset_id=pending).status_code == 409)

print("== replacing and removing")
newer = upload(adult, "avatar")
r = patch(adult, avatar_asset_id=newer)
check("avatar replaced", r.status_code == 200 and r.json()["avatar_url"] != avatar_url, r.text)
gone = httpx.get(f"{DIRECT['media-service']}/internal/media/{avatar}", timeout=10).status_code
check("the replaced image is deleted", gone == 404, gone)
r = patch(adult, avatar_asset_id=None)
check("avatar removed", r.status_code == 200 and r.json()["avatar_url"] is None, r.text)

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
