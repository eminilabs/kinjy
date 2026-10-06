"""Rebuild Kinjy's member base from DSM, which is the same people.

    docker exec kaluta-auth python /tmp/import_members.py /tmp/members.json [--apply]

Without --apply it reports and writes nothing.

The source is DSM's live database, not the older `profile.json` export, because
the database has what the export lost: a real email for every member instead of
8 845, a password hash for every member instead of 2 176, and names and country
from `user_infos`. Nobody gets a `@migration.local` address.

Two judgements worth stating, because both are about telling the truth:

**Birth dates.** 7 257 members carry `1900-01-01`, which is the shape of a form
default rather than a date anybody typed. Those, along with dates before 1920,
dates in the future, and any implying an age under 13, are treated as *no date*:
the member is imported with no age profile, which the policy engine reads as
UNKNOWN and treats as a minor until they say otherwise. Writing 1900 into the
age system would make 7 257 people 126 years old and silently adult.

**Rights.** DSM's `admin_rights` is not carried over. Administering a
marketplace is not administering a social network.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import random
import re
import string
import sys
from datetime import date, datetime, timezone

sys.path.insert(0, "/app")

from sqlalchemy import delete, text  # noqa: E402

from common.database import SessionLocal  # noqa: E402
from common.ids import new_id  # noqa: E402

import models  # noqa: E402

HANDLE_OK = re.compile(r"^[a-z0-9_.-]{3,40}$")
ALPHABET = string.ascii_uppercase + string.digits
EMAIL_OK = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Everything a deleted member leaves behind, children before parents. Kinjy
# keeps a schema per service and references members by id rather than by
# foreign key, so nothing cascades: a row missed here becomes a post by a
# member who does not exist.
TABLES = [
    "social.reactions", "social.post_views", "social.post_media", "social.comments",
    "social.content_reports", "social.moderation_appeals", "social.moderation_decisions",
    "social.content_safety", "social.feed_signals", "social.posts",
    "users.blocks", "users.circle_members", "users.circles", "users.connections",
    "users.follows", "users.supervision_requests", "users.parental_supervision",
    "users.usage", "users.preferences", "users.profiles",
    "auth.sessions", "auth.login_events", "auth.registration_attempts",
    "auth.user_age_profiles",
]


def tier_for(born: date, today: date) -> str:
    age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    if age < 13:
        return "UNDER_MINIMUM"
    if age < 16:
        return "TEEN_HIGH_PROTECTION"
    if age < 18:
        return "TEEN_PROTECTED"
    return "ADULT"


def usable_dob(value: str | None, today: date) -> date | None:
    if not value:
        return None
    try:
        born = datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError:
        return None
    if born.year < 1920 or born > today:
        return None
    if tier_for(born, today) == "UNDER_MINIMUM":
        # Below Kinjy's minimum age. Importing it would create an account the
        # product says may not exist; treating it as unstated lets them say.
        return None
    return born


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    today = date.today()
    rows = json.loads(pathlib.Path(args.source).read_text(encoding="utf-8"))

    prepared: list[dict] = []
    skipped: list[tuple[str, str]] = []
    handles: set[str] = set()
    emails: set[str] = set()

    for row in rows:
        handle = (row.get("handle") or "").strip().lower()
        handle = re.sub(r"[^a-z0-9_.-]", "_", handle)[:40]
        # One address in DSM carries an internal space. Repairing it keeps the
        # member rather than dropping them over a typo in their own record.
        email = re.sub(r"\s+", "", (row.get("email") or "")).lower()
        if not HANDLE_OK.match(handle):
            skipped.append((row.get("handle") or "?", "handle unusable"))
            continue
        if not EMAIL_OK.match(email):
            skipped.append((handle, f"email unusable: {email[:40]}"))
            continue
        if handle in handles or email in emails:
            skipped.append((handle, "duplicate"))
            continue
        handles.add(handle)
        emails.add(email)

        name = (row.get("display_name") or "").strip() or handle
        prepared.append({
            "handle": handle,
            "email": email,
            "password_hash": (row.get("password_hash") or "").strip() or None,
            "display_name": name[:120],
            "country": (row.get("country") or "").strip().upper()[:2] or None,
            "born": usable_dob(row.get("dob"), today),
            "joined": row.get("joined"),
            "sponsor": (row.get("sponsor") or "").strip().lower() or None,
        })

    print(f"source rows        {len(rows)}")
    print(f"  importable       {len(prepared)}")
    print(f"  with a password  {sum(1 for p in prepared if p['password_hash'])}")
    print(f"  with a birth date{sum(1 for p in prepared if p['born']):6d}"
          f"   (the rest: no age profile, read as UNKNOWN = treated as a minor)")
    print(f"  skipped          {len(skipped)}")
    for who, why in skipped[:10]:
        print(f"      {who}: {why}")

    if not args.apply:
        print("\nreport only — nothing written. Pass --apply to write.")
        return 0

    db = SessionLocal()
    try:
        cleared = {}
        for table in TABLES:
            cleared[table] = db.execute(text(f"DELETE FROM {table}")).rowcount
        removed = db.execute(delete(models.User)).rowcount
        print(f"\ndeleted {removed} members and "
              f"{sum(v for v in cleared.values())} rows of their content")

        codes: set[str] = set()
        by_handle: dict[str, str] = {}
        for i, p in enumerate(prepared, 1):
            while True:
                code = "".join(random.choices(ALPHABET, k=8))
                if code not in codes:
                    codes.add(code)
                    break
            user = models.User(
                id=new_id("usr"),
                email=p["email"],
                handle=p["handle"],
                password_hash=p["password_hash"],
                display_name=p["display_name"],
                country=p["country"],
                referral_code=code,
            )
            if p["joined"]:
                try:
                    user.created_at = datetime.strptime(p["joined"][:10], "%Y-%m-%d").replace(
                        tzinfo=timezone.utc)
                except ValueError:
                    pass
            db.add(user)
            by_handle[p["handle"]] = user.id

            if p["born"]:
                db.add(models.UserAgeProfile(
                    id=new_id("agp"),
                    user_id=user.id,
                    date_of_birth=p["born"],
                    tier=tier_for(p["born"], today),
                    jurisdiction=p["country"] or "XX",
                    policy_version="import:dsm",
                    assurance_level="self_declared",
                ))
            if i % 2500 == 0:
                db.flush()
                print(f"  prepared {i}")

        db.flush()
        print(f"inserted {len(prepared)} members")

        linked = 0
        for p in prepared:
            sponsor = by_handle.get(p["sponsor"] or "")
            mine = by_handle[p["handle"]]
            if sponsor and sponsor != mine:
                db.execute(models.User.__table__.update()
                           .where(models.User.id == mine).values(invited_by=sponsor))
                linked += 1
        print(f"linked {linked} sponsors")

        db.commit()
        print("committed")
    except Exception:
        db.rollback()
        print("rolled back — nothing changed")
        raise
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
