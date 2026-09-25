"""Identifier helpers.

Public ids are prefixed ULID-ish strings (sortable by creation time, opaque to
the client) so a leaked id never reveals a row count.
"""
from __future__ import annotations

import os
import time
import uuid

_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"  # Crockford base32


def _b32(value: int, length: int) -> str:
    out = []
    for _ in range(length):
        out.append(_ALPHABET[value & 31])
        value >>= 5
    return "".join(reversed(out))


def ulid() -> str:
    """26-char lexicographically sortable id (48-bit time + 80-bit random)."""
    return _b32(int(time.time() * 1000), 10) + _b32(int.from_bytes(os.urandom(10), "big"), 16)


def new_id(prefix: str) -> str:
    """``new_id("usr")`` -> ``usr_01J8...``"""
    return f"{prefix}_{ulid()}"


def uuid4() -> str:
    return str(uuid.uuid4())


# Conventional prefixes, kept in one place so services agree.
USER = "usr"
SESSION = "ses"
POST = "pst"
COMMENT = "cmt"
CIRCLE = "cir"
COMMUNITY = "cmy"
FORUM_THREAD = "thr"
PERSON = "prs"          # family-tree person node
RELATIONSHIP = "rel"    # family-tree edge
MEMORIAL = "mem"
TRIBUTE = "trb"
CONVERSATION = "cnv"
MESSAGE = "msg"
PRODUCT = "prd"
ORDER = "ord"
CAMPAIGN = "cmp"
LEDGER_ENTRY = "led"
JOURNAL = "jrn"
WALLET = "wlt"
COMMISSION = "com"
PAYOUT = "pay"
PAYMENT = "pmt"
MEDIA = "mda"
