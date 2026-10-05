"""The sticker catalogue: the only thing a reaction may point at.

A reaction stores an id from this list and nothing else. The server never
accepts a URL, an image or a name from the client, so what a member can put
under a message is limited to artwork that was chosen, licensed and checked
for every age before it was added here.

The images are our own SVG files, served by the frontend at
``/stickers/<pack>/<name>.svg`` (see ``app/public/stickers``). An id is
``<pack>.<name>``; the client derives the path from it, so there is no URL to
validate. To add a sticker: add the SVG, add one line here.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Sticker:
    id: str
    pack: str
    name: str  # what a screen reader announces
    keywords: tuple[str, ...]  # local search, never sent to a third party


PACKS = {"classic": "Classic"}

CATALOGUE: tuple[Sticker, ...] = (
    Sticker("classic.like", "classic", "Thumbs up", ("like", "yes", "ok", "good", "pouce")),
    Sticker("classic.love", "classic", "Heart", ("love", "heart", "coeur", "amour")),
    Sticker("classic.laugh", "classic", "Laughing", ("laugh", "lol", "funny", "rire")),
    Sticker("classic.wow", "classic", "Surprised", ("wow", "surprise", "shock", "surpris")),
    Sticker("classic.sad", "classic", "Sad", ("sad", "cry", "triste", "pleur")),
    Sticker("classic.angry", "classic", "Angry", ("angry", "mad", "colere", "fache")),
    Sticker("classic.clap", "classic", "Applause", ("clap", "bravo", "applause", "applaudir")),
    Sticker("classic.fire", "classic", "Fire", ("fire", "hot", "feu", "chaud")),
    Sticker("classic.party", "classic", "Celebration", ("party", "celebrate", "fete", "congrats")),
    Sticker("classic.think", "classic", "Thinking", ("think", "hmm", "reflechir", "question")),
)

BY_ID = {s.id: s for s in CATALOGUE}


def is_valid(sticker_id: str | None) -> bool:
    return sticker_id in BY_ID


def listing() -> dict:
    return {
        "packs": [{"id": pid, "name": name} for pid, name in PACKS.items()],
        "items": [
            {"id": s.id, "pack": s.pack, "name": s.name, "keywords": list(s.keywords)}
            for s in CATALOGUE
        ],
    }
