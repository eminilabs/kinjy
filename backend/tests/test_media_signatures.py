"""What a file's first bytes must say for the type it is declared as.

Run: python -m pytest backend/tests/test_media_signatures.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "media-service"))
import signatures  # noqa: E402

REAL = {
    "image/jpeg": bytes.fromhex("ffd8ffe000104a46494600"),
    "image/png": bytes.fromhex("89504e470d0a1a0a0000000d49484452"),
    "image/gif": b"GIF89a\x01\x00\x01\x00",
    "image/webp": b"RIFF\x24\x00\x00\x00WEBPVP8 ",
    "video/mp4": b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00",
    "video/webm": b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01",
    "audio/mpeg": b"ID3\x04\x00\x00\x00\x00\x00\x00",
    "audio/ogg": b"OggS\x00\x02\x00\x00",
    "audio/wav": b"RIFF\x24\x00\x00\x00WAVEfmt ",
    "application/pdf": b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n",
}


@pytest.mark.parametrize("content_type", sorted(REAL))
def test_a_real_header_is_accepted(content_type):
    assert signatures.matches(content_type, REAL[content_type])


@pytest.mark.parametrize("content_type", sorted(REAL))
@pytest.mark.parametrize(
    "lie",
    [b"x" * 64, b"<!doctype html><script>alert(1)</script>", b"<svg xmlns='http://www.w3.org/2000/svg'/>", b""],
    ids=["filler", "html", "svg", "empty"],
)
def test_text_and_filler_named_as_media_are_refused(content_type, lie):
    assert not signatures.matches(content_type, lie)


def test_a_header_for_the_wrong_type_is_refused():
    assert not signatures.matches("video/mp4", REAL["image/png"])
    assert not signatures.matches("image/png", REAL["image/jpeg"])
    # Both are RIFF, and only the form tag tells them apart.
    assert not signatures.matches("image/webp", REAL["audio/wav"])
    assert not signatures.matches("audio/wav", REAL["image/webp"])


@pytest.mark.parametrize("box", [b"ftyp", b"moov", b"mdat", b"free", b"skip", b"wide"])
def test_mp4_may_open_with_any_of_its_usual_boxes(box):
    assert signatures.matches("video/mp4", b"\x00\x00\x00\x20" + box + b"isom")


def test_an_mp3_may_start_straight_on_a_frame():
    assert signatures.matches("audio/mpeg", b"\xff\xfb\x90\x00")
    assert not signatures.matches("audio/mpeg", b"\xff\x1b\x90\x00")


def test_a_pdf_header_may_follow_a_little_junk():
    assert signatures.matches("application/pdf", b"\n\n  %PDF-1.4\n")
    assert not signatures.matches("application/pdf", b"x" * 2000 + b"%PDF-1.4")


def test_a_type_with_no_signature_is_not_refused():
    # A chat attachment may be anything; only types we can recognise are held to it.
    assert signatures.matches("application/zip", b"anything")
    assert not signatures.checkable("application/zip")
    assert all(signatures.checkable(t) for t in REAL)


def test_the_window_covers_the_widest_check():
    assert signatures.HEAD_BYTES >= 1024
