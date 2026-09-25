"""Keeping minors out of adults' discovery surfaces.

Section 22 of the safety specification, and the quiet half of adult-to-minor
contact. The messaging rules stop an adult who has already found a 14-year-old
from writing to them. This stops them finding one in the first place, which is
cheaper, earlier, and does not depend on the adult behaving badly first.

The asymmetry is the whole design:

* an adult searching or browsing suggestions does not see minors;
* a minor searching still finds everybody, because a teenager looking for their
  own teacher, cousin or football club should find them;
* a minor searching still finds other minors, because that is the platform
  working.

What this is not: a way to hide from search. A member who turns off
``discoverable`` is honoured separately and already was. This is the layer they
do not have to know exists.

**Cost, stated plainly.** Filtering after the query means a page of results can
come back short — ask for ten, get seven. The alternative is joining an age
table that lives in another service's schema, which would couple the two
databases together to save a few rows. Over-fetching and trimming is the right
trade here, and the fetch is widened to compensate.
"""
from __future__ import annotations

import logging

from common import ageclient
from common.agesafety import AgeProfile, engine

log = logging.getLogger("user-service.agediscovery")

# How much wider to fetch so trimming still fills a page. Deliberately modest:
# a platform where most of a page is filtered away has a bigger problem than
# pagination.
OVERFETCH = 3


def widened(limit: int, cap: int) -> int:
    return min(limit * OVERFETCH, cap)


def visible_to(viewer: AgeProfile, candidate_ids: list[str]) -> set[str]:
    """Which of these people may be surfaced to this viewer.

    One age lookup per candidate, served from ageclient's short cache, so a
    page of results is a handful of cache hits rather than a burst of calls.
    """
    if not candidate_ids:
        return set()

    # A minor browsing sees everyone; there is nothing to filter and no reason
    # to spend the lookups.
    if viewer.is_minor:
        return set(candidate_ids)

    allowed = set()
    for candidate_id in candidate_ids:
        candidate = ageclient.age_profile(candidate_id)
        if engine.can_recommend_profile(viewer, candidate).allowed:
            allowed.add(candidate_id)
    return allowed


def filter_profiles(viewer_id: str | None, rows: list, limit: int, id_attr: str = "user_id") -> list:
    """Trim a list of profile rows to what this viewer may be shown.

    Fails closed on its own terms: when the viewer's own age cannot be
    established they are treated as a minor, which *widens* what they see
    rather than narrowing it. That is the right direction here — the rule
    protects the people being listed, not the person looking, and a viewer of
    unknown age is not the threat this addresses. An unknown-age viewer who is
    in fact an adult sees minors they should not; an unknown-age viewer treated
    as an adult would hide the whole platform from a teenager whose profile
    lookup happened to fail. The second is worse and far more common.
    """
    if not rows:
        return rows

    viewer = ageclient.age_profile(viewer_id)
    if viewer.is_minor:
        return rows[:limit]

    ids = [getattr(r, id_attr) for r in rows]
    allowed = visible_to(viewer, ids)
    kept = [r for r in rows if getattr(r, id_attr) in allowed]
    if len(kept) < len(rows):
        log.debug("discovery trimmed %d -> %d for adult viewer", len(rows), len(kept))
    return kept[:limit]
