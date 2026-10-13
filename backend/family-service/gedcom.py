"""A family tree as GEDCOM 5.5.1: pure, no database, no network.

Three rules shape everything here, and the preview and the file's own header say them
to the person exporting:

* **Private by default.** A person is written in full only when they are explicitly
  recorded as deceased *and* their record is verified. Nobody is judged dead by their
  age. Everyone else is written as ``Private``: no name, sex, dates, places or notes -
  but still in the structure, so the file shows that they exist and how they are related.
* **Nothing invented.** HUSB and WIFE mean father and mother in GEDCOM 5.5.1. They are
  written only from the role a parent link records; an unknown or contradictory role is
  left out and counted, never filled in from order or from gender.
* **Nothing of Kinjy leaks.** Identifiers are renumbered, and accounts, authors, roles of
  members, confirmations, disputes, invitations and files never appear.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date

MONTHS = ("JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC")
FEMALE = {"female", "f", "woman", "femme", "femelle"}
MALE = {"male", "m", "man", "homme", "mâle"}
LINE = 248  # a GEDCOM line holds at most 255 characters, tag included


@dataclass
class PersonData:
    id: str
    given_name: str
    family_name: str | None = None
    other_names: str | None = None
    gender: str | None = None
    birth_date: date | None = None
    birth_place: str | None = None
    death_date: date | None = None
    death_place: str | None = None
    deceased: bool = False
    status: str = "pending"
    biography: str | None = None


@dataclass
class LinkData:
    from_id: str
    to_id: str
    kind: str
    role: str | None = None


@dataclass
class Stats:
    people: int = 0
    included: int = 0
    masked_unverified: int = 0  # record not verified (pending or disputed)
    masked_living: int = 0  # verified, but not explicitly recorded as deceased
    omitted: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    @property
    def masked(self) -> int:
        return self.masked_unverified + self.masked_living

    def as_dict(self) -> dict:
        return {
            "people": self.people,
            "included": self.included,
            "masked": self.masked,
            "masked_unverified": self.masked_unverified,
            "masked_living": self.masked_living,
            "omitted_links": dict(self.omitted),
            "omitted_links_total": sum(self.omitted.values()),
        }


OMITTED_LABEL = {
    "guardian": "guardian links (GEDCOM has no equivalent)",
    "declared_sibling": "brothers and sisters declared without a shared parent (no equivalent)",
    "disputed": "links that are disputed",
    "parent_role_unknown": "parents whose role (father or mother) is not recorded",
    "parent_role_conflict": "parents whose role clashes with another parent's in the same family",
    "couple_without_roles": "couples with no recorded father/mother roles",
}

MASK_WARNING = (
    "People who are hidden still appear as 'Private', with their family links: "
    "the file shows that they exist and how they are related."
)


def explicitly_deceased(p: PersonData) -> bool:
    return bool(p.deceased or p.death_date)


def mask_reason(p: PersonData) -> str | None:
    if p.status != "verified":
        return "unverified"
    if not explicitly_deceased(p):
        return "living"
    return None


# --- text -----------------------------------------------------------------------------------

def _clean(value: str) -> str:
    """One line of text: no control characters, '@' doubled as GEDCOM asks."""
    out = "".join(ch for ch in value if ch >= " " and ch != "\x7f")
    return out.replace("@", "@@")


def _name(value: str) -> str:
    return _clean(value).replace("/", " ").strip()


def _lines(level: int, tag: str, text: str) -> list[str]:
    """``text`` as a value, broken over CONT (new line) and CONC (long line) as the format requires."""
    out: list[str] = []
    for i, paragraph in enumerate(text.replace("\r\n", "\n").replace("\r", "\n").split("\n")):
        cleaned = _clean(paragraph)
        chunks = [cleaned[j : j + LINE] for j in range(0, len(cleaned), LINE)] or [""]
        for k, chunk in enumerate(chunks):
            if i == 0 and k == 0:
                out.append(f"{level} {tag} {chunk}".rstrip())
            else:
                out.append(f"{level + 1} {'CONT' if k == 0 else 'CONC'} {chunk}".rstrip())
    return out


def _date(d: date) -> str:
    return f"{d.day} {MONTHS[d.month - 1]} {d.year:04d}"


def _sex(gender: str | None) -> str | None:
    value = (gender or "").strip().lower()
    return "F" if value in FEMALE else "M" if value in MALE else None


# --- the file -------------------------------------------------------------------------------

def build(people: list[PersonData], links: list[LinkData], today: date, disputed_links: int = 0) -> tuple[str, Stats]:
    stats = Stats(people=len(people))
    if disputed_links:
        stats.omitted["disputed"] += disputed_links
    ordered = sorted(people, key=lambda p: p.id)
    ref = {p.id: f"@I{i}@" for i, p in enumerate(ordered, 1)}
    by_id = {p.id: p for p in ordered}

    # Families: the parents of a child, kept apart for birth and adoption; roles come only from the links.
    kids: dict[tuple[str, frozenset[str]], list[str]] = defaultdict(list)
    roles: dict[tuple[str, frozenset[str]], dict[str, set[str | None]]] = defaultdict(lambda: defaultdict(set))
    parents_of: dict[tuple[str, str], set[str]] = defaultdict(set)  # (child, 'birth'|'adopted') -> parents
    link_role: dict[tuple[str, str, str], str | None] = {}
    spouses: set[frozenset[str]] = set()
    for link in links:
        if link.from_id not in by_id or link.to_id not in by_id:
            continue
        if link.kind in ("parent_of", "adoptive_parent_of"):
            nature = "birth" if link.kind == "parent_of" else "adopted"
            parents_of[(link.to_id, nature)].add(link.from_id)
            link_role[(link.from_id, link.to_id, nature)] = link.role
        elif link.kind == "spouse_of":
            spouses.add(frozenset((link.from_id, link.to_id)))
        elif link.kind == "guardian_of":
            stats.omitted["guardian"] += 1
        elif link.kind == "sibling_of":
            stats.omitted["declared_sibling"] += 1
    for (child, nature), parents in parents_of.items():
        key = (nature, frozenset(parents))
        kids[key].append(child)
        for parent in parents:
            roles[key][parent].add(link_role.get((parent, child, nature)))

    families: dict[tuple[str, frozenset[str]], dict] = {}
    for key in sorted(kids, key=lambda k: (k[0], sorted(k[1]))):
        nature, parents = key
        slots: dict[str, list[str]] = {"HUSB": [], "WIFE": []}
        for parent in sorted(parents):
            known = roles[key][parent]
            if known == {"father"}:
                slots["HUSB"].append(parent)
            elif known == {"mother"}:
                slots["WIFE"].append(parent)
            elif known <= {None}:
                stats.omitted["parent_role_unknown"] += 1
            else:
                stats.omitted["parent_role_conflict"] += 1
        for tag in slots:
            if len(slots[tag]) > 1:  # two fathers (or two mothers): neither can be placed without choosing
                stats.omitted["parent_role_conflict"] += len(slots[tag])
                slots[tag] = []
        families[key] = {"HUSB": slots["HUSB"][0] if slots["HUSB"] else None, "WIFE": slots["WIFE"][0] if slots["WIFE"] else None, "kids": sorted(kids[key]), "nature": nature}

    # A couple with no child in common is a family only if both are known to be a father and a mother.
    held = {key[1] for key in families}
    person_roles: dict[str, set[str]] = defaultdict(set)
    for (parent, _child, _nature), role in link_role.items():
        if role:
            person_roles[parent].add(role)
    for pair in sorted(spouses, key=lambda s: sorted(s)):
        if pair in held:
            continue
        a, b = sorted(pair)
        ra, rb = person_roles.get(a, set()), person_roles.get(b, set())
        if ra == {"father"} and rb == {"mother"}:
            families[("couple", pair)] = {"HUSB": a, "WIFE": b, "kids": [], "nature": "couple"}
        elif ra == {"mother"} and rb == {"father"}:
            families[("couple", pair)] = {"HUSB": b, "WIFE": a, "kids": [], "nature": "couple"}
        else:
            stats.omitted["couple_without_roles"] += 1

    fam_ref = {key: f"@F{i}@" for i, key in enumerate(families, 1)}
    fams_of: dict[str, list[str]] = defaultdict(list)
    famc_of: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for key, fam in families.items():
        for slot in ("HUSB", "WIFE"):
            if fam[slot]:
                fams_of[fam[slot]].append(fam_ref[key])
        for child in fam["kids"]:
            famc_of[child].append((fam_ref[key], "adopted" if fam["nature"] == "adopted" else "birth"))

    out: list[str] = ["0 HEAD", "1 SOUR KINJY", "2 NAME Kinjy Family Tree", f"1 DATE {_date(today)}", "1 SUBM @U1@",
                      "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8"]
    body: list[str] = []
    for p in ordered:
        reason = mask_reason(p)
        body.append(f"0 {ref[p.id]} INDI")
        if reason is None:
            stats.included += 1
            given = _name(p.given_name)
            family = _name(p.family_name or "")
            body.append(f"1 NAME {given} /{family}/".rstrip() if family else f"1 NAME {given}")
            body.append(f"2 GIVN {given}")
            if family:
                body.append(f"2 SURN {family}")
            if p.other_names and _name(p.other_names):
                body += [f"1 NAME {_name(p.other_names)}", "2 TYPE aka"]
            if _sex(p.gender):
                body.append(f"1 SEX {_sex(p.gender)}")
            if p.birth_date or p.birth_place:
                body.append("1 BIRT")
                if p.birth_date:
                    body.append(f"2 DATE {_date(p.birth_date)}")
                if p.birth_place:
                    body += _lines(2, "PLAC", p.birth_place)
            if p.death_date or p.death_place:
                body.append("1 DEAT")
                if p.death_date:
                    body.append(f"2 DATE {_date(p.death_date)}")
                if p.death_place:
                    body += _lines(2, "PLAC", p.death_place)
            else:
                body.append("1 DEAT Y")
            if p.biography and p.biography.strip():
                body += _lines(1, "NOTE", p.biography.strip())
        else:
            if reason == "unverified":
                stats.masked_unverified += 1
            else:
                stats.masked_living += 1
            body.append("1 NAME Private")
        for fam in fams_of.get(p.id, []):
            body.append(f"1 FAMS {fam}")
        for fam, nature in famc_of.get(p.id, []):
            body += [f"1 FAMC {fam}", f"2 PEDI {nature}"]
    for key, fam in families.items():
        body.append(f"0 {fam_ref[key]} FAM")
        for slot in ("HUSB", "WIFE"):
            if fam[slot]:
                body.append(f"1 {slot} {ref[fam[slot]]}")
        for child in fam["kids"]:
            body.append(f"1 CHIL {ref[child]}")

    note = [f"This file has {stats.people} people: {stats.included} written in full, {stats.masked} hidden as 'Private'."]
    if stats.masked:
        note.append(f"Hidden: {stats.masked_living} verified but not recorded as deceased, {stats.masked_unverified} whose record is not verified.")
        note.append(MASK_WARNING)
    for kind, count in sorted(stats.omitted.items()):
        note.append(f"Not representable in GEDCOM 5.5.1 and left out: {count} {OMITTED_LABEL[kind]}.")
    for i, text in enumerate(note):
        out += _lines(1, "NOTE", text) if i == 0 else [f"2 CONT {_clean(text)}"]
    out += ["0 @U1@ SUBM", "1 NAME Kinjy export"] + body + ["0 TRLR"]
    return "\r\n".join(out) + "\r\n", stats
