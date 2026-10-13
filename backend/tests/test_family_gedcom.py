"""The GEDCOM generator, on made-up trees, with a strict reader of its own.

Run inside the family container (no database needed):
  docker exec -i -w /app kaluta-family python - < backend/tests/test_family_gedcom.py
"""
import random
import re
import sys
from datetime import date

sys.path.insert(0, "/app")
import gedcom  # noqa: E402
from gedcom import LinkData as L, PersonData as P  # noqa: E402

ok = True


def check(label, cond, detail=""):
    global ok
    print(("  PASS " if cond else "  FAIL ") + label + ("" if cond else f"  <- {str(detail)[:200]}"))
    ok = ok and bool(cond)


LINE = re.compile(r"^(\d+) (?:(@[A-Za-z0-9]+@) )?([A-Z_]+)(?: (.*))?$")


def parse(text):
    """Strict reading of GEDCOM 5.5.1 as far as this generator writes it; raises on anything off."""
    assert text.endswith("\r\n")
    rows, prev = [], -1
    for raw in text.split("\r\n")[:-1]:
        assert len(raw) <= 255, f"line too long: {raw[:40]}"
        m = LINE.match(raw)
        assert m, f"not a GEDCOM line: {raw!r}"
        level, xref, tag, value = int(m.group(1)), m.group(2), m.group(3), m.group(4) or ""
        assert level <= prev + 1, f"level jumps: {raw!r}"
        assert level == 0 or xref is None
        rows.append((level, xref, tag, value))
        prev = level
    assert rows[0][2] == "HEAD" and rows[-1][2] == "TRLR"
    records = {}
    cur = None
    for level, xref, tag, value in rows:
        if level == 0:
            cur = (xref, tag)
            if xref:
                assert xref not in records, f"duplicate {xref}"
                records[xref] = {"tag": tag, "rows": []}
        elif cur and cur[0]:
            records[cur[0]]["rows"].append((level, tag, value))
    pointer_tags = {"FAMC", "FAMS", "HUSB", "WIFE", "CHIL", "SUBM"}
    for xref, rec in records.items():
        for level, tag, value in rec["rows"]:
            if tag in pointer_tags:
                assert value in records, f"dangling pointer {value}"
            else:
                assert "@" not in value.replace("@@", ""), f"unescaped @ in {value!r}"
    for xref, rec in records.items():  # reciprocity
        if rec["tag"] == "FAM":
            for level, tag, value in rec["rows"]:
                if tag in ("HUSB", "WIFE"):
                    assert ("FAMS", xref) in [(t, v) for _l, t, v in records[value]["rows"]], "FAMS missing"
                if tag == "CHIL":
                    assert ("FAMC", xref) in [(t, v) for _l, t, v in records[value]["rows"]], "FAMC missing"
        if rec["tag"] == "INDI":
            for level, tag, value in rec["rows"]:
                if tag == "FAMS":
                    assert any(t in ("HUSB", "WIFE") and v == xref for _l, t, v in records[value]["rows"]), "HUSB/WIFE missing"
                if tag == "FAMC":
                    assert any(t == "CHIL" and v == xref for _l, t, v in records[value]["rows"]), "CHIL missing"
    return rows, records


def indi(records, name):
    return [(x, r) for x, r in records.items() if r["tag"] == "INDI" and any(t == "NAME" and v.startswith(name) and l == 1 for l, t, v in r["rows"])]


T = date(2026, 10, 8)

# --- a family with every case ----------------------------------------------------------------
people = [
    P("a1", "Ama", "Mensah", gender="female", birth_date=date(1930, 4, 3), birth_place="Accra", death_date=date(2001, 1, 2), deceased=True, status="verified", biography="Line one\nLine two with @ sign"),
    P("a2", "Kofi", "Mensah", gender="Homme", birth_date=date(1928, 1, 1), deceased=True, status="verified", other_names="Kofi \"K\" Boateng/Sr"),
    P("a3", "Yaw", "Mensah", birth_date=date(1955, 5, 5), status="verified"),  # alive as far as the record says
    P("a4", "Esi", "Mensah", gender="female", deceased=True, status="pending"),  # deceased but unverified
    P("a5", "Old", None, birth_date=date(1700, 1, 1), status="verified"),  # born long ago, NOT recorded deceased: never assumed dead
    P("a6", "Kwesi", "Mensah", death_date=date(1990, 1, 1), status="verified"),  # a death date is explicit even if the flag is off
    P("g1", "Guardian", None, deceased=True, status="verified"),
    P("c1", "Adopted", "Child", deceased=True, status="verified"),
    P("m1", "Mother", None, deceased=True, status="verified"),
    P("f1", "Father2", None, deceased=True, status="verified"),
    P("f2", "Father3", None, deceased=True, status="verified"),
    P("n1", "NoRole", None, deceased=True, status="verified"),
    P("k1", "Kid", None, deceased=True, status="verified"),
    P("w1", "Husband", None, deceased=True, status="verified"),
    P("w2", "Wife", None, deceased=True, status="verified"),
    P("w3", "Unknown1", None, deceased=True, status="verified"),
    P("w4", "Unknown2", None, deceased=True, status="verified"),
]
links = [
    L("a2", "a3", "parent_of", "father"), L("a1", "a3", "parent_of", "mother"),
    L("a2", "a1", "spouse_of"),
    L("g1", "a3", "guardian_of"), L("a3", "a4", "sibling_of"),
    L("a2", "c1", "adoptive_parent_of", "father"), L("a1", "c1", "adoptive_parent_of", "mother"),
    L("f1", "k1", "parent_of", "father"), L("f2", "k1", "parent_of", "father"), L("n1", "k1", "parent_of"), L("m1", "k1", "parent_of", "mother"),
    L("w1", "w2", "spouse_of"), L("w3", "w4", "spouse_of"),
    L("w1", "x1", "parent_of", "father"), L("w2", "x1", "parent_of", "mother"),  # x1 unknown: link to a person outside the list is ignored
]
# the couple with roles but no children, via roles on other links
people += [P("x2", "Other", None, deceased=True, status="verified"), P("r1", "Rone", None, deceased=True, status="verified"), P("r2", "Rtwo", None, deceased=True, status="verified"),
           P("rk1", "RK1", None, deceased=True, status="verified"), P("rk2", "RK2", None, deceased=True, status="verified")]
links += [L("w1", "x2", "parent_of", "father"), L("r1", "r2", "spouse_of"), L("r1", "rk1", "parent_of", "father"), L("r2", "rk2", "parent_of", "mother")]
text, stats = gedcom.build(people, links, T)
rows, records = parse(text)
print("Structure")
check("the file is well formed GEDCOM 5.5.1 (strict reader)", True)
check("header: 5.5.1, UTF-8, lineage-linked, a submitter record without a person", ("VERS", "5.5.1") in [(t, v) for l, _x, t, v in rows] and ("CHAR", "UTF-8") in [(t, v) for l, _x, t, v in rows] and records["@U1@"]["rows"] == [(1, "NAME", "Kinjy export")])

print("\nWho is written in full")
full = {p.id for p in people if gedcom.mask_reason(p) is None}
check("only verified AND explicitly deceased (flag or death date) are written in full", full == {"a1", "a2", "a6", "g1", "c1", "m1", "f1", "f2", "n1", "k1", "w1", "w2", "w3", "w4", "x2", "r1", "r2", "rk1", "rk2"}, full)
check("a person born long ago but not recorded as deceased is hidden: no inference from age", gedcom.mask_reason(P("o", "Old", birth_date=date(1700, 1, 1), status="verified")) == "living")
check("a death date alone counts as explicit", gedcom.mask_reason(P("o", "X", death_date=date(1990, 1, 1), status="verified")) is None)
check("a deceased person whose record is pending is hidden", gedcom.mask_reason(P("o", "X", deceased=True, status="pending")) == "unverified")
check("and a disputed one", gedcom.mask_reason(P("o", "X", deceased=True, status="disputed")) == "unverified")
check("counts: written in full, hidden as living, hidden as unverified", (stats.included, stats.masked_living, stats.masked_unverified) == (19, 2, 1), stats.as_dict())
hidden = [r for x, r in records.items() if r["tag"] == "INDI" and (1, "NAME", "Private") in r["rows"]]
check("a hidden person is 'Private' and nothing else about them", len(hidden) == 3 and all({t for l, t, v in r["rows"] if l == 1} <= {"NAME", "FAMS", "FAMC"} for r in hidden), hidden)
check("they stay in the structure (links kept)", any(any(t in ("FAMS", "FAMC") for l, t, v in r["rows"]) for r in hidden))
check("hidden given names do not appear", all(n not in text for n in ("Yaw", "Esi")) and "1700" not in text and "1955" not in text)
check("the header says how many were hidden, why, and that the links still show", "3 hidden" in text and "2 verified but not recorded as deceased" in text and "1 whose record is not verified" in text and "how they are related" in text)

print("\nFathers and mothers are never invented")
fams = {x: r for x, r in records.items() if r["tag"] == "FAM"}
def fam_of(child_name):
    x, r = indi(records, child_name)[0]
    return [v for l, t, v in r["rows"] if t == "FAMC"]
def members(fx):
    return {t: v for l, t, v in fams[fx]["rows"] if t in ("HUSB", "WIFE")}
birth = members(fam_of("Kwesi")[0]) if fam_of("Kwesi") else None
a3 = [x for x, r in records.items() if r["tag"] == "INDI" and any(t == "NAME" and v == "Private" for l, t, v in r["rows"]) and any(t == "FAMC" for l, t, v in r["rows"])]
check("a family takes HUSB from the father role and WIFE from the mother role", any(set(members(f)) == {"HUSB", "WIFE"} for f in fams))
kid = indi(records, "Kid")[0][1]
kfam = [v for l, t, v in kid["rows"] if t == "FAMC"][0]
check("two fathers: neither is placed, the mother is, the one without a role is left out", set(members(kfam)) == {"WIFE"}, members(kfam))
check("those are counted, not hidden", stats.omitted["parent_role_conflict"] == 2 and stats.omitted["parent_role_unknown"] == 1, dict(stats.omitted))
check("a person left out of a family has no FAMS to it", all(("FAMS", kfam) not in [(t, v) for l, t, v in r["rows"]] for x, r in records.items() if r["tag"] == "INDI" and any(v.startswith(("Father2", "Father3", "NoRole")) for l, t, v in r["rows"] if t == "NAME")))
check("an adopted child has PEDI adopted on its family", any(t == "PEDI" and v == "adopted" for l, t, v in indi(records, "Adopted")[0][1]["rows"]))
check("couples with no recorded roles are left out and counted (two here)", stats.omitted["couple_without_roles"] == 2, dict(stats.omitted))
check("guardian and declared-sibling links are left out and counted", stats.omitted["guardian"] == 1 and stats.omitted["declared_sibling"] == 1, dict(stats.omitted))
check("the header lists what could not be represented", "Not representable" in text and "guardian links" in text)
check("two spouses recorded as a father and a mother elsewhere form a family on their own", sum(1 for f in fams if set(members(f)) == {"HUSB", "WIFE"} and not [1 for l, t, v in fams[f]["rows"] if t == "CHIL"]) == 1)

print("\nText")
ama = indi(records, "Ama")[0][1]
note = [(l, t, v) for l, t, v in ama["rows"] if t in ("NOTE", "CONT", "CONC")]
check("a biography with a newline is split over CONT and '@' is doubled", ("CONT" in [t for l, t, v in note]) and "@@" in text and any(v == "Line two with @@ sign" for l, t, v in note), note)
long = P("L", "Long", deceased=True, status="verified", biography="x" * 700)
lt, _ = gedcom.build([long], [], T)
lr, _ = parse(lt)
check("a long line is cut over CONC lines of at most 255 characters and joins back", "".join(v for l, _x, t, v in lr if t == "CONC") + [v for l, _x, t, v in lr if t == "NOTE" and l == 1 and v.startswith("x")][0] == "x" * 700)
kofi = indi(records, "Kofi")[0][1]
check("a slash in a name cannot break the surname delimiter", "Boateng Sr" in text and "Boateng/Sr" not in text, [v for l, t, v in kofi["rows"] if t == "NAME"])
check("sex is M or F only, from the person's own gender", ("SEX", "M") in [(t, v) for l, t, v in kofi["rows"]] and ("SEX", "F") in [(t, v) for l, t, v in ama["rows"]])
check("no sex when gender is not clearly one or the other", not any(t == "SEX" for l, t, v in indi(records, "Guardian")[0][1]["rows"]))
check("dates are 'D MON YYYY'", "2 DATE 3 APR 1930" in text and "2 DATE 2 JAN 2001" in text)
check("a deceased person with no death date says DEAT Y", "1 DEAT Y" in text)

print("\nNothing of Kinjy leaks")
check("no Kinjy identifier, account, or word of the internal model appears", not re.search(r"prs_|usr_|created_by|asserted_by|user_id|verified|pending|disputed", text.replace("verified but not", "").replace("not verified", "")), re.findall(r"prs_|usr_|verified|pending|disputed", text)[:3])
check("no URL or media reference", "http" not in text and "OBJE" not in text and "/media" not in text)

print("\nStable and honest")
shuffled_p, shuffled_l = people[:], links[:]
random.Random(7).shuffle(shuffled_p); random.Random(8).shuffle(shuffled_l)
check("the same tree gives the same file whatever the order it is listed in", gedcom.build(shuffled_p, shuffled_l, T)[0] == text)
et, es = gedcom.build([], [], T)
parse(et)
check("an empty tree is still a valid file", es.people == 0 and es.masked == 0)
check("disputed links passed in are counted", gedcom.build([], [], T, disputed_links=3)[1].omitted["disputed"] == 3)
check("with nobody hidden the warning about links is not shown", "how they are related" not in gedcom.build([P("z", "Z", deceased=True, status="verified")], [], T)[0])

print("ALL CHECKS PASSED" if ok else "THERE ARE FAILURES ABOVE")
sys.exit(0 if ok else 1)
