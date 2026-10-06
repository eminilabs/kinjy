"""What the family graph refuses to hold.

Every rule here is one the data cannot be right without; none is a judgement
about what a family ought to look like. A parent edge may not close a loop, two
people are not both spouses and parent and child, the same marriage is one
marriage whichever way round it was typed, and nobody is born after they died or
in the future. Each refusal says which rule was broken, so the person using the
tree can fix the thing they got wrong rather than guess.

Checked before writing, and backed by the unique indexes in models.py for the
case where two requests race past the check.
"""
from __future__ import annotations

from datetime import date

from fastapi import HTTPException

import graph
import models


def _refuse(detail: str, status_code: int = 400) -> HTTPException:
    return HTTPException(status_code=status_code, detail=detail)


def _linked(edges: graph.Edges, a: str, b: str) -> dict[str, bool]:
    """How two people are already tied, in either direction."""
    return {
        "parent": b in edges.parents.get(a, set()) or a in edges.parents.get(b, set()),
        "spouse": b in edges.spouses.get(a, set()),
        "sibling": b in edges.explicit_siblings.get(a, set()),
    }


def check_new_edge(
    edges: graph.Edges,
    left: models.Person,
    right: models.Person,
    kind: str,
) -> None:
    """Raise if recording ``left -kind-> right`` would leave the graph contradicting itself."""
    a, b = left.id, right.id
    if a == b:
        raise _refuse("A person cannot be related to themselves")

    tied = _linked(edges, a, b)

    if kind in graph.PARENT_KINDS:
        if b in edges.parents.get(a, set()):
            raise _refuse("They are already recorded the other way round: the child cannot also be the parent")
        if a in edges.parents.get(b, set()):
            raise _refuse("A parent is already recorded between these two people", 409)
        if tied["spouse"]:
            raise _refuse("They are recorded as spouses; a spouse cannot also be a parent or child")
        if tied["sibling"]:
            raise _refuse("They are recorded as siblings; a sibling cannot also be a parent or child")
        # A parent edge that closes a loop would make someone their own ancestor.
        if b in graph.ancestors(edges, a):
            raise _refuse("This edge would make a person their own ancestor")
        if (
            kind == "parent_of"
            and left.birth_date
            and right.birth_date
            and left.birth_date >= right.birth_date
        ):
            raise _refuse("A parent cannot be born on or after the day their child was")
        return

    if kind == "spouse_of":
        if tied["spouse"]:
            raise _refuse("They are already recorded as spouses", 409)
        if tied["parent"]:
            raise _refuse("They are recorded as parent and child; they cannot also be spouses")
        if tied["sibling"]:
            raise _refuse("They are recorded as siblings; they cannot also be spouses")
        return

    if kind == "sibling_of":
        if tied["sibling"]:
            raise _refuse("They are already recorded as siblings", 409)
        if tied["parent"]:
            raise _refuse("They are recorded as parent and child; they cannot also be siblings")
        if tied["spouse"]:
            raise _refuse("They are recorded as spouses; they cannot also be siblings")
        # sibling_of exists for siblings whose parents are not known. Once a shared parent is
        # recorded the relationship is already derived from it, and stating it again would
        # say the same thing twice.
        if edges.siblings(a).get(b) in ("full", "half"):
            raise _refuse("They already share a parent in the tree, so they are siblings already", 409)
        return


def canonical_pair(kind: str, a: str, b: str) -> tuple[str, str]:
    """Spouse and sibling edges are stored one way only, so they cannot be doubled."""
    if kind in models.Relationship.SYMMETRIC and a > b:
        return b, a
    return a, b


def check_life_dates(
    birth_date: date | None,
    death_date: date | None,
    deceased: bool | None = None,
) -> None:
    today = date.today()
    if birth_date and birth_date > today:
        raise _refuse("A birth date cannot be in the future")
    if death_date and death_date > today:
        raise _refuse("A death date cannot be in the future")
    if birth_date and death_date and death_date < birth_date:
        raise _refuse("A person cannot die before they were born")
    if deceased is False and death_date:
        raise _refuse("A person with a death date is deceased")
