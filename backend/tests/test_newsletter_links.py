"""The signed links of a newsletter, and the shape of its text, as pure rules.

A link in a confirmation or an unsubscribe mail is the only thing that proves anything: whoever holds a valid
one may change that subscription, and nobody else may. So what it must refuse is tested as carefully as what
it accepts.
"""
from __future__ import annotations

import importlib.util
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

_spec = importlib.util.spec_from_file_location("newsletter_links_under_test", ROOT / "creator-service" / "newsletter_links.py")
nl = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = nl
_spec.loader.exec_module(nl)

SUB = "nws_01TESTSUBSCRIBER"


def test_a_signed_link_names_its_subscriber_and_nobody_else():
    assert nl.verify(nl.sign(SUB, "confirm"), "confirm") == SUB
    assert nl.verify(nl.sign(SUB, "unsubscribe"), "unsubscribe") == SUB


def test_a_confirmation_link_cannot_unsubscribe_and_the_other_way_round():
    assert nl.verify(nl.sign(SUB, "confirm"), "unsubscribe") is None
    assert nl.verify(nl.sign(SUB, "unsubscribe"), "confirm") is None


def test_a_link_for_one_subscriber_does_not_work_for_another():
    token = nl.sign(SUB, "unsubscribe")
    forged = token.replace(SUB, "nws_01SOMEBODYELSE", 1)
    assert nl.verify(forged, "unsubscribe") is None


@pytest.mark.parametrize("mutate", [
    lambda t: t[:-1] + ("A" if t[-1] != "A" else "B"),      # one wrong character in the signature
    lambda t: t.rsplit(".", 1)[0] + ".",                      # no signature
    lambda t: t.replace(".", "", 1),                          # a missing separator
    lambda t: "",                                             # nothing
    lambda t: "a.b.c",                                        # not even a number
    lambda t: t + "x",                                        # a longer signature
])
def test_a_link_that_has_been_altered_in_any_way_is_refused(mutate):
    assert nl.verify(mutate(nl.sign(SUB, "unsubscribe")), "unsubscribe") is None


def test_a_confirmation_runs_out_after_two_weeks_and_an_unsubscribe_never_does():
    issued = int(time.time())
    token = nl.sign(SUB, "confirm", issued)
    assert nl.verify(token, "confirm", now=issued + 13 * 86400) == SUB
    assert nl.verify(token, "confirm", now=issued + 15 * 86400) is None
    assert nl.verify(nl.sign(SUB, "unsubscribe"), "unsubscribe", now=time.time() + 10 * 365 * 86400) == SUB


def test_changing_the_issue_time_of_a_confirmation_breaks_it_so_it_cannot_be_renewed():
    sub, issued, sig = nl.sign(SUB, "confirm", 1_000_000).split(".")
    assert nl.verify(f"{sub}.{int(time.time())}.{sig}", "confirm") is None


def test_the_links_point_at_the_public_api(monkeypatch):
    monkeypatch.setattr(nl.settings, "GATEWAY_URL", "https://kinjy.example/")
    assert nl.link("confirm", "T") == "https://kinjy.example/api/creators/newsletter/confirm?token=T"


@pytest.mark.parametrize("email, masked", [("amina.k@example.com", "a***@example.com"), ("x@y.org", "x***@y.org")])
def test_an_address_is_masked_to_its_first_letter_and_its_domain(email, masked):
    assert nl.mask(email) == masked


def test_a_studio_newsletter_becomes_a_subject_and_a_body_without_the_studios_own_footer():
    studio = "Subject: Market day\n\nThe mangoes were sweet.\n\nCome with me.\n\n—\nSent to your subscribers on Kinjy."
    assert nl.split_newsletter(studio) == ("Market day", "The mangoes were sweet.\n\nCome with me.")


def test_a_text_that_does_not_open_with_a_subject_line_uses_its_first_line():
    assert nl.split_newsletter("Plain headline\n\nBody here.") == ("Plain headline", "Body here.")


def test_a_very_long_subject_is_cut_not_refused():
    subject, _ = nl.split_newsletter("Subject: " + "x" * 500 + "\n\nbody")
    assert len(subject) == 200
