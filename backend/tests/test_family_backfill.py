"""The role migration on made-up trees: it names an owner only when the history shows one.

Run inside the family container (it writes and removes its own rows):
  docker exec -i kaluta-family python - < backend/tests/test_family_backfill.py
"""
import sys
sys.path.insert(0, "/app")
import memberships  # noqa: E402
import models  # noqa: E402
from common.database import SessionLocal  # noqa: E402
from sqlalchemy import delete, select  # noqa: E402

ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {detail}"))
    ok = ok and bool(cond)


T = "bf" + __import__("secrets").token_hex(3)
ids = []


def P(db, name, user=None, by=None):
    p = models.Person(given_name=name, user_id=user, created_by=by if by is not None else "")
    db.add(p); db.flush(); ids.append(p.id); return p


def link(db, a, b, kind="parent_of"):
    db.add(models.Relationship(from_person_id=a.id, to_person_id=b.id, kind=kind, asserted_by="x"))


def roles_of(db, tree_ids):
    return {(m.user_id, m.role) for m in db.scalars(select(models.Membership).where(models.Membership.person_id.in_(tree_ids))).all()}


with SessionLocal() as db:
    try:
        # 1. one member started the tree (added their own place); another was claimed by an invitation-like act
        a = P(db, "A1", user=f"{T}a", by=f"{T}a"); kid = P(db, "A2", by=f"{T}a"); b = P(db, "A3", user=f"{T}b", by=f"{T}a")
        link(db, a, kid); link(db, a, b); db.commit()
        r = memberships.backfill(db, only={a.id})
        check("one self-founder: they are the owner, the other member a contributor", roles_of(db, {a.id, kid.id, b.id}) == {(f"{T}a", "owner"), (f"{T}b", "contributor")}, roles_of(db, {a.id, kid.id, b.id}))
        check("no review needed", r["reviews"] == 0, r)
        check("people without an account got no membership", db.scalar(select(models.Membership).where(models.Membership.person_id == kid.id)) is None)

        # 2. two members each added their own place: ambiguous
        c1 = P(db, "C1", user=f"{T}c", by=f"{T}c"); d1 = P(db, "D1", user=f"{T}d", by=f"{T}d"); link(db, c1, d1, "spouse_of"); db.commit()
        r = memberships.backfill(db, only={c1.id})
        check("two self-founders: nobody is made owner", {x[1] for x in roles_of(db, {c1.id, d1.id})} == {"contributor"} and len(roles_of(db, {c1.id, d1.id})) == 2)
        check("and the tree is written down for review", db.get(models.OwnershipReview, min(c1.id, d1.id)) is not None and r["reviews"] == 1)

        # 3. nobody added their own place: only authors
        e1 = P(db, "E1", by=f"{T}e"); e2 = P(db, "E2", by=f"{T}f"); link(db, e1, e2); db.commit()
        memberships.backfill(db, only={e1.id})
        check("a tree known only through its authors: contributors, no owner", roles_of(db, {e1.id, e2.id}) == {(f"{T}e", "contributor"), (f"{T}f", "contributor")})
        check("and flagged", db.get(models.OwnershipReview, min(e1.id, e2.id)) is not None)

        # 4. a person with no account and no author at all
        g = P(db, "Nobody", by=""); db.commit()
        r = memberships.backfill(db, only={g.id})
        check("no account and no author: no membership, no review", db.scalar(select(models.Membership).where(models.Membership.person_id == g.id)) is None and r["reviews"] == 0, r)

        # 5. idempotent
        before = roles_of(db, {a.id, kid.id, b.id})
        memberships.backfill(db, only={a.id})
        check("running it again changes nothing", roles_of(db, {a.id, kid.id, b.id}) == before)
        # 6. the self-founder rule needs the member's own place, not just an authored one
        h1 = P(db, "H1", user=f"{T}h", by=f"{T}i"); h2 = P(db, "H2", by=f"{T}h"); link(db, h1, h2); db.commit()
        memberships.backfill(db, only={h1.id})
        check("a member whose place someone else added is not taken for the founder", ("%sh" % T, "owner") not in roles_of(db, {h1.id, h2.id}), roles_of(db, {h1.id, h2.id}))
    finally:
        db.rollback()
        db.execute(delete(models.OwnershipReview).where(models.OwnershipReview.person_id.in_(ids)))
        db.execute(delete(models.Membership).where(models.Membership.person_id.in_(ids)))
        db.execute(delete(models.Relationship).where(models.Relationship.from_person_id.in_(ids)))
        db.execute(delete(models.Person).where(models.Person.id.in_(ids)))
        db.commit()

print("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE")
sys.exit(0 if ok else 1)
