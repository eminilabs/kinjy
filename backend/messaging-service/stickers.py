"""The sticker catalogue.

Held by the server, not the client, for three reasons that all matter more than
the convenience of hard-coding a list in the app:

* **A message stores an id, never a picture.** So a sticker cannot be used to
  put an arbitrary image into a conversation, which is otherwise a neat way to
  send something nobody moderates, or to load a tracking pixel that tells a
  sender exactly when their message was read.
* **A sticker withdrawn here disappears everywhere at once**, including from
  messages already sent. With the catalogue in the app, a sticker that turns
  out to be a problem lives on in every client that has not updated.
* **Age rating is a property of the sticker**, decided here. A set that is
  fine in a group of adults is not automatically fine in a thread a fifteen
  year old is in, and the decision belongs where the policy is.

These are glyph stickers: the catalogue carries the character and the client
draws it large. `image_url` is the seam for real artwork - fill it in and the
client prefers it without any other change. Nothing here needs an asset
pipeline, a CDN, or a download before the first sticker can be sent, which on
the connections most members are on is the difference between a feature and a
spinner.
"""
from __future__ import annotations

# tier: the strictest age tier this sticker is allowed in. "GENERAL" is
# everyone. Nothing in the starting set is above GENERAL, which is the point:
# a sticker set is not a place to be edgy at somebody else's expense.
PACKS: list[dict] = [
    {
        "id": "reactions",
        "name": "Reactions",
        "stickers": [
            {"id": "react.yes", "glyph": "👍", "label": "Yes"},
            {"id": "react.no", "glyph": "👎", "label": "No"},
            {"id": "react.clap", "glyph": "👏", "label": "Well done"},
            {"id": "react.laugh", "glyph": "😂", "label": "Laughing"},
            {"id": "react.love", "glyph": "❤️", "label": "Love"},
            {"id": "react.wow", "glyph": "😮", "label": "Wow"},
            {"id": "react.sad", "glyph": "😢", "label": "Sad"},
            {"id": "react.think", "glyph": "🤔", "label": "Thinking"},
        ],
    },
    {
        "id": "everyday",
        "name": "Everyday",
        "stickers": [
            {"id": "day.hello", "glyph": "👋", "label": "Hello"},
            {"id": "day.thanks", "glyph": "🙏", "label": "Thank you"},
            {"id": "day.ok", "glyph": "👌", "label": "Okay"},
            {"id": "day.onmyway", "glyph": "🏃", "label": "On my way"},
            {"id": "day.late", "glyph": "⏰", "label": "Running late"},
            {"id": "day.call", "glyph": "📞", "label": "Call me"},
            {"id": "day.food", "glyph": "🍲", "label": "Food"},
            {"id": "day.home", "glyph": "🏠", "label": "Home"},
        ],
    },
    {
        "id": "celebrate",
        "name": "Celebrate",
        "stickers": [
            {"id": "joy.party", "glyph": "🎉", "label": "Congratulations"},
            {"id": "joy.cake", "glyph": "🎂", "label": "Happy birthday"},
            {"id": "joy.gift", "glyph": "🎁", "label": "Gift"},
            {"id": "joy.star", "glyph": "⭐", "label": "Star"},
            {"id": "joy.fire", "glyph": "🔥", "label": "Fire"},
            {"id": "joy.music", "glyph": "🎵", "label": "Music"},
            {"id": "joy.sun", "glyph": "☀️", "label": "Sunshine"},
            {"id": "joy.flower", "glyph": "🌺", "label": "Flower"},
        ],
    },
]

# Flat, for the one lookup this module exists to answer.
_BY_ID: dict[str, dict] = {
    sticker["id"]: {**sticker, "pack": pack["id"], "image_url": None}
    for pack in PACKS
    for sticker in pack["stickers"]
}


def catalogue() -> list[dict]:
    """Every pack, for the picker."""
    return [
        {
            "id": pack["id"],
            "name": pack["name"],
            "stickers": [{**s, "image_url": None} for s in pack["stickers"]],
        }
        for pack in PACKS
    ]


def get(sticker_id: str | None) -> dict | None:
    """One sticker, or None if the id is not in the catalogue.

    None is what makes the id trustworthy: an id the server does not recognise
    never becomes a message, so nothing can be sent that this file does not
    describe.
    """
    if not sticker_id:
        return None
    return _BY_ID.get(sticker_id)
