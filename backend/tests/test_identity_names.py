"""The account name, as auth-service accepts it (auth-service/schemas.py).

The name is copied from auth-service into every profile, notification and
message header, so the rules profilefields applies on an edit must already
hold at registration and on the internal sync route: otherwise a name refused
on the profile page could simply be registered.

Run: python -m pytest backend/tests/test_identity_names.py -q
"""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import pytest
from pydantic import ValidationError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "auth-service"))
import schemas  # noqa: E402

TRICKS = [
    "Amina‮troppuS yjniK",   # right-to-left override
    "Kinjy​Support",         # zero-width space
    "Ki⁦njy",                # direction isolate
    "Amina\x00",                  # control character
    "A",                          # too short
    "​​​",         # nothing visible
]


def register(display_name: str) -> schemas.RegisterIn:
    return schemas.RegisterIn(
        email="amina@example.com", date_of_birth=date(1990, 1, 15), password="Sup3rStrong!Pass",
        display_name=display_name, handle="amina",
    )


@pytest.mark.parametrize("name", TRICKS)
def test_registration_refuses_a_name_that_lies_about_itself(name):
    with pytest.raises(ValidationError):
        register(name)


@pytest.mark.parametrize("name", TRICKS)
def test_the_sync_route_refuses_it_too(name):
    with pytest.raises(ValidationError):
        schemas.IdentitySyncIn(display_name=name)


def test_registration_normalises_the_name():
    # NFKC folds full-width letters to ordinary ones; ends are trimmed.
    assert register("  Ａｍｉｎａ Diallo ").display_name == "Amina Diallo"


def test_ordinary_names_in_any_script_pass():
    for name in ("Amina Diallo", "Nguyễn Thị Lan", "محمد علي", "王小明", "Zoë O'Brien-Nkosi"):
        assert register(name).display_name == name


def test_the_sync_route_still_takes_only_name_and_language():
    assert schemas.IdentitySyncIn(lang="fr").display_name is None
    with pytest.raises(ValidationError):
        schemas.IdentitySyncIn(country="US")
