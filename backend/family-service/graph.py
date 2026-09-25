"""Relationship derivation over the family graph.

Nothing in here is stored: grandparent, uncle, cousin, half-sibling and the
"Level" view are all computed from the primitive edges each time. That is the
blueprint's rule — the graph is the truth, labels are a presentation.
"""
from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.orm import Session as OrmSession

import models

PARENT_KINDS = ("parent_of", "adoptive_parent_of", "guardian_of")


@dataclass
class Edges:
    """Adjacency built once per request, then queried many times."""

    parents: dict[str, set[str]]
    children: dict[str, set[str]]
    spouses: dict[str, set[str]]
    explicit_siblings: dict[str, set[str]]
    adoptive: set[tuple[str, str]]

    def siblings(self, person_id: str) -> dict[str, str]:
        """``{sibling_id: "full" | "half" | "declared"}``.

        Full siblings share both known parents; half share exactly one. A
        declared sibling is an explicit ``sibling_of`` edge with no shared
        parent recorded — common when the parents are unknown.
        """
        mine = self.parents.get(person_id, set())
        found: dict[str, str] = {}
        for parent in mine:
            for candidate in self.children.get(parent, set()):
                if candidate == person_id:
                    continue
                shared = len(mine & self.parents.get(candidate, set()))
                if shared >= 2:
                    found[candidate] = "full"
                elif shared == 1 and found.get(candidate) != "full":
                    found[candidate] = "half"
        for candidate in self.explicit_siblings.get(person_id, set()):
            found.setdefault(candidate, "declared")
        return found


def load_edges(db: OrmSession, person_ids: set[str] | None = None) -> Edges:
    stmt = select(models.Relationship).where(models.Relationship.status != "disputed")
    if person_ids:
        stmt = stmt.where(
            or_(
                models.Relationship.from_person_id.in_(person_ids),
                models.Relationship.to_person_id.in_(person_ids),
            )
        )

    parents: dict[str, set[str]] = defaultdict(set)
    children: dict[str, set[str]] = defaultdict(set)
    spouses: dict[str, set[str]] = defaultdict(set)
    explicit_siblings: dict[str, set[str]] = defaultdict(set)
    adoptive: set[tuple[str, str]] = set()

    for edge in db.scalars(stmt).all():
        if edge.kind in PARENT_KINDS:
            parents[edge.to_person_id].add(edge.from_person_id)
            children[edge.from_person_id].add(edge.to_person_id)
            if edge.kind != "parent_of":
                adoptive.add((edge.from_person_id, edge.to_person_id))
        elif edge.kind == "spouse_of":
            spouses[edge.from_person_id].add(edge.to_person_id)
            spouses[edge.to_person_id].add(edge.from_person_id)
        elif edge.kind == "sibling_of":
            explicit_siblings[edge.from_person_id].add(edge.to_person_id)
            explicit_siblings[edge.to_person_id].add(edge.from_person_id)

    return Edges(parents, children, spouses, explicit_siblings, adoptive)


def levels(edges: Edges, root: str, max_depth: int = 4) -> dict[str, int]:
    """The Kinjy Level model: root = 0, each parent step +1, each child step -1.

    Lazy loading is the caller's job — ``max_depth`` bounds how far we walk so a
    tree with 10 000 nodes never gets serialised in one response.
    """
    seen = {root: 0}
    queue = deque([(root, 0)])
    while queue:
        current, level = queue.popleft()
        if abs(level) >= max_depth:
            continue
        for parent in edges.parents.get(current, set()):
            if parent not in seen:
                seen[parent] = level + 1
                queue.append((parent, level + 1))
        for child in edges.children.get(current, set()):
            if child not in seen:
                seen[child] = level - 1
                queue.append((child, level - 1))
        # Spouses sit on the same level and are not traversed further, so a
        # spouse's whole birth family doesn't flood the view.
        for spouse in edges.spouses.get(current, set()):
            seen.setdefault(spouse, level)
    return seen


def _neighbours(edges: Edges, person_id: str) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for parent in edges.parents.get(person_id, set()):
        out.append((parent, "parent"))
    for child in edges.children.get(person_id, set()):
        out.append((child, "child"))
    for spouse in edges.spouses.get(person_id, set()):
        out.append((spouse, "spouse"))
    for sibling in edges.explicit_siblings.get(person_id, set()):
        out.append((sibling, "sibling"))
    return out


def shortest_path(edges: Edges, source: str, target: str, limit: int = 12) -> list[tuple[str, str]] | None:
    """"How are we related?" — BFS returning ``[(person_id, step_kind), ...]``."""
    if source == target:
        return []
    previous: dict[str, tuple[str, str]] = {}
    seen = {source}
    queue = deque([(source, 0)])
    while queue:
        current, depth = queue.popleft()
        if depth >= limit:
            continue
        for neighbour, kind in _neighbours(edges, current):
            if neighbour in seen:
                continue
            seen.add(neighbour)
            previous[neighbour] = (current, kind)
            if neighbour == target:
                path: list[tuple[str, str]] = []
                cursor = target
                while cursor != source:
                    parent, step = previous[cursor]
                    path.append((cursor, step))
                    cursor = parent
                return list(reversed(path))
            queue.append((neighbour, depth + 1))
    return None


def ancestors(edges: Edges, person_id: str, max_depth: int = 12) -> dict[str, int]:
    """``{ancestor_id: generations_up}`` including step-parents."""
    out: dict[str, int] = {}
    queue = deque([(person_id, 0)])
    while queue:
        current, depth = queue.popleft()
        if depth >= max_depth:
            continue
        for parent in edges.parents.get(current, set()):
            if parent not in out or out[parent] > depth + 1:
                out[parent] = depth + 1
                queue.append((parent, depth + 1))
    return out


def common_ancestors(edges: Edges, a: str, b: str) -> list[dict]:
    """Closest shared ancestors, nearest first."""
    up_a, up_b = ancestors(edges, a), ancestors(edges, b)
    shared = set(up_a) & set(up_b)
    return sorted(
        (
            {"person_id": pid, "generations_from_a": up_a[pid], "generations_from_b": up_b[pid]}
            for pid in shared
        ),
        key=lambda item: item["generations_from_a"] + item["generations_from_b"],
    )


def describe(edges: Edges, source: str, target: str) -> str:
    """A human label for the relation, derived — never stored.

    Falls back to a generic description rather than inventing a term: an
    exotic-but-wrong label ("first cousin twice removed") is worse than
    "related through 4 steps".
    """
    if source == target:
        return "self"

    if target in edges.parents.get(source, set()):
        return "adoptive parent" if (target, source) in edges.adoptive else "parent"
    if target in edges.children.get(source, set()):
        return "adoptive child" if (source, target) in edges.adoptive else "child"
    if target in edges.spouses.get(source, set()):
        return "spouse"

    sibling_kind = edges.siblings(source).get(target)
    if sibling_kind:
        return {"full": "sibling", "half": "half-sibling", "declared": "sibling (declared)"}[sibling_kind]

    up_source = ancestors(edges, source)
    up_target = ancestors(edges, target)

    if target in up_source:
        generations = up_source[target]
        return "grandparent" if generations == 2 else f"{'great-' * (generations - 2)}grandparent"
    if source in up_target:
        generations = up_target[source]
        return "grandchild" if generations == 2 else f"{'great-' * (generations - 2)}grandchild"

    shared = set(up_source) & set(up_target)
    if shared:
        best = min(shared, key=lambda pid: up_source[pid] + up_target[pid])
        a, b = up_source[best], up_target[best]
        if a == 2 and b == 2:
            return "first cousin"
        if min(a, b) == 1:
            return "aunt/uncle" if b < a else "niece/nephew"
        degree = min(a, b) - 1
        removed = abs(a - b)
        label = f"cousin (degree {degree})"
        return label if not removed else f"{label}, {removed} removed"

    path = shortest_path(edges, source, target)
    if path is None:
        return "no known relation"
    return f"related through {len(path)} steps"


def closeness(edges: Edges, source: str, target: str) -> int:
    """Lower = closer. Used to rank a tree view and to pick the 3 corroborators
    for a deceased person's verification."""
    ranking = {"self": 0, "parent": 1, "child": 1, "spouse": 1, "sibling": 2, "half-sibling": 3}
    label = describe(edges, source, target)
    if label in ranking:
        return ranking[label]
    path = shortest_path(edges, source, target)
    return 99 if path is None else 3 + len(path)
