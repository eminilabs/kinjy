"""Encryption at rest (common/crypto.py).

The promises worth pinning down: a sealed value opens only where it was
sealed and only with its key; a sealed file comes back byte for byte, in any
range, and refuses to come back shorter, shuffled or from another asset;
rotation keeps old data readable; and a signed attachment link is good for its
asset and its lifetime only. messaging-test.py covers the same code end to end
against the running stack; these run in milliseconds and reach the edges.

Run: python -m pytest backend/tests/test_crypto.py -q
"""
from __future__ import annotations

import base64
import io
import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from common import crypto, settings  # noqa: E402


def make_key(key_id: str) -> str:
    return f"{key_id}:{base64.urlsafe_b64encode(os.urandom(32)).decode()}"


K1, K2 = make_key("k1"), make_key("k2")


@pytest.fixture
def keys(monkeypatch):
    """Set MESSAGES_ENCRYPTION_KEY for one test; the keyring is cached, so clear it."""

    def use(raw: str | None) -> None:
        if raw is None:
            monkeypatch.delenv(crypto.KEY_ENV, raising=False)
        else:
            monkeypatch.setenv(crypto.KEY_ENV, raw)
        crypto.keyring.cache_clear()

    yield use
    crypto.keyring.cache_clear()


# --- the keyring ---------------------------------------------------------------

def test_no_key_means_encryption_is_off(keys):
    keys(None)
    assert crypto.enabled() is False
    with pytest.raises(crypto.CryptoConfigError):
        crypto.seal_text("hello", "msg:1:body")


@pytest.mark.parametrize(
    "raw",
    [
        "k1",                                                   # no separator
        "K1:" + K1.split(":", 1)[1],                            # uppercase id
        "toolongid:" + K1.split(":", 1)[1],                     # id over 8 chars
        "k1:" + base64.urlsafe_b64encode(os.urandom(16)).decode(),  # 16 bytes, not 32
        "k1:%%%not-base64%%%",
        f"{K1},{K1}",                                           # same id twice
    ],
)
def test_a_malformed_key_is_always_fatal(raw):
    with pytest.raises(crypto.CryptoConfigError):
        crypto.parse_keyring(raw)


def test_the_first_key_is_the_active_one(keys):
    keys(f"{K2},{K1}")
    assert crypto.keyring().active_id == "k2"


def test_production_refuses_to_start_without_a_key(keys, monkeypatch):
    keys(None)
    monkeypatch.setattr(settings, "ENV", "production")
    with pytest.raises(crypto.CryptoConfigError):
        crypto.require_in_production("messaging-service")


def test_development_starts_without_a_key(keys, monkeypatch):
    keys(None)
    monkeypatch.setattr(settings, "ENV", "development")
    crypto.require_in_production("messaging-service")  # no exception


# --- short values ----------------------------------------------------------------

def test_text_round_trips_and_is_not_stored_in_the_clear(keys):
    keys(K1)
    key_id, token = crypto.seal_text("Rendez-vous à 8 h", "msg:42:body")
    assert key_id == "k1"
    assert "Rendez-vous" not in token
    assert crypto.open_text(key_id, token, "msg:42:body") == "Rendez-vous à 8 h"


def test_sealing_twice_gives_two_different_tokens(keys):
    keys(K1)
    _, first = crypto.seal_text("same text", "msg:1:body")
    _, second = crypto.seal_text("same text", "msg:1:body")
    assert first != second  # fresh nonce each time


def test_a_value_moved_to_another_row_or_field_does_not_open(keys):
    keys(K1)
    key_id, token = crypto.seal_text("secret", "msg:1:body")
    for context in ("msg:2:body", "msg:1:name"):
        with pytest.raises(crypto.DecryptionError):
            crypto.open_text(key_id, token, context)


def test_a_tampered_token_does_not_open(keys):
    keys(K1)
    key_id, token = crypto.seal_text("secret", "msg:1:body")
    raw = bytearray(base64.b64decode(token))
    raw[-1] ^= 0x01
    with pytest.raises(crypto.DecryptionError):
        crypto.open_text(key_id, base64.b64encode(bytes(raw)).decode(), "msg:1:body")


def test_garbage_raises_decryption_error_not_something_else(keys):
    keys(K1)
    for token in ("", "not base64 !!", base64.b64encode(b"short").decode()):
        with pytest.raises(crypto.DecryptionError):
            crypto.open_text("k1", token, "msg:1:body")


def test_rotation_keeps_old_values_readable_and_seals_new_ones_with_the_new_key(keys):
    keys(K1)
    old_id, old_token = crypto.seal_text("before rotation", "msg:1:body")
    keys(f"{K2},{K1}")
    assert crypto.open_text(old_id, old_token, "msg:1:body") == "before rotation"
    new_id, _ = crypto.seal_text("after rotation", "msg:2:body")
    assert new_id == "k2"


def test_a_value_whose_key_was_removed_does_not_open(keys):
    keys(K1)
    key_id, token = crypto.seal_text("orphan", "msg:1:body")
    keys(K2)
    with pytest.raises(crypto.DecryptionError):
        crypto.open_text(key_id, token, "msg:1:body")


def test_a_sealed_value_with_encryption_switched_off_says_so(keys):
    keys(K1)
    key_id, token = crypto.seal_text("sealed", "msg:1:body")
    keys(None)
    with pytest.raises(crypto.DecryptionError):
        crypto.open_text(key_id, token, "msg:1:body")


# --- files ----------------------------------------------------------------------

def seal_file(tmp_path, data: bytes, asset_id: str = "mda_test", write_size: int = 7919) -> Path:
    path = tmp_path / asset_id
    with path.open("wb") as out:
        sealer = crypto.FileSealer(out, asset_id)
        for i in range(0, len(data), write_size):
            sealer.write(data[i:i + write_size])
        sealer.close()
    return path


def read_range(path: Path, asset_id: str, size: int, start: int, end: int) -> bytes:
    return b"".join(crypto.open_file_range(str(path), asset_id, size, start, end))


@pytest.fixture
def small_chunks(monkeypatch):
    """1 MiB chunks make multi-chunk files slow to build; the layout does not care."""
    monkeypatch.setattr(crypto, "CHUNK", 1024)


@pytest.mark.parametrize("size", [0, 1, 1023, 1024, 1025, 3 * 1024, 3 * 1024 + 17])
def test_a_file_round_trips_at_every_chunk_boundary(keys, small_chunks, tmp_path, size):
    keys(K1)
    data = os.urandom(size)
    path = seal_file(tmp_path, data)
    assert crypto.is_sealed_file(str(path))
    if size:
        assert read_range(path, "mda_test", size, 0, size - 1) == data
    # Only meaningful from a few bytes up: a 1-byte file's one byte turns up
    # somewhere in its ciphertext by pure chance about one run in seven.
    if size >= 16:
        assert data[:64] not in path.read_bytes()


@pytest.mark.parametrize(
    "start,end",
    [(0, 0), (1023, 1024), (1000, 2100), (2048, 3 * 1024 + 16), (3 * 1024 + 16, 3 * 1024 + 16), (500, 99_999)],
)
def test_any_byte_range_comes_back_exactly(keys, small_chunks, tmp_path, start, end):
    keys(K1)
    size = 3 * 1024 + 17
    data = os.urandom(size)
    path = seal_file(tmp_path, data)
    assert read_range(path, "mda_test", size, start, end) == data[start:min(end, size - 1) + 1]


def test_a_file_opens_only_as_the_asset_it_was_sealed_for(keys, small_chunks, tmp_path):
    keys(K1)
    data = os.urandom(2000)
    path = seal_file(tmp_path, data, asset_id="mda_one")
    with pytest.raises(crypto.DecryptionError):
        read_range(path, "mda_two", len(data), 0, len(data) - 1)


def test_a_truncated_file_does_not_pass_for_a_shorter_one(keys, small_chunks, tmp_path):
    keys(K1)
    data = os.urandom(3 * 1024)
    path = seal_file(tmp_path, data)
    header = 4 + 1 + len("k1") + 8
    # Keep two whole sealed chunks and claim the file was two chunks long: the
    # second chunk was sealed as "not final", so it must refuse to end the file.
    path.write_bytes(path.read_bytes()[: header + 2 * (1024 + crypto.TAG)])
    with pytest.raises(crypto.DecryptionError):
        read_range(path, "mda_test", 2 * 1024, 0, 2 * 1024 - 1)


def test_swapped_chunks_do_not_open(keys, small_chunks, tmp_path):
    keys(K1)
    data = os.urandom(3 * 1024)
    path = seal_file(tmp_path, data)
    raw = path.read_bytes()
    header = 4 + 1 + len("k1") + 8
    step = 1024 + crypto.TAG
    first, second = raw[header:header + step], raw[header + step:header + 2 * step]
    path.write_bytes(raw[:header] + second + first + raw[header + 2 * step:])
    with pytest.raises(crypto.DecryptionError):
        read_range(path, "mda_test", len(data), 0, len(data) - 1)


def test_a_file_sealed_with_an_old_key_still_opens_after_rotation(keys, small_chunks, tmp_path):
    keys(K1)
    data = os.urandom(1500)
    path = seal_file(tmp_path, data)
    keys(f"{K2},{K1}")
    assert read_range(path, "mda_test", len(data), 0, len(data) - 1) == data


@pytest.mark.parametrize("size", [0, 700, 3 * 1024 + 17])
def test_rotation_reseals_a_file_onto_the_new_key_so_the_old_one_can_go(keys, small_chunks, tmp_path, size):
    keys(K1)
    data = os.urandom(size)
    old = seal_file(tmp_path, data)
    keys(f"{K2},{K1}")
    new = tmp_path / "resealed"
    assert crypto.reseal_file(str(old), str(new), "mda_test", size) == "k2"
    keys(K2)  # k1 removed: the re-sealed copy must not need it
    assert crypto.file_key_available(str(new))
    if size:
        assert read_range(new, "mda_test", size, 0, size - 1) == data


def test_a_file_stored_in_the_clear_is_sealed_by_reseal(keys, small_chunks, tmp_path):
    keys(K1)
    data = os.urandom(2500)
    plain = tmp_path / "before-encryption.pdf"
    plain.write_bytes(data)
    sealed = tmp_path / "sealed"
    crypto.reseal_file(str(plain), str(sealed), "mda_test", len(data))
    assert crypto.is_sealed_file(str(sealed))
    assert read_range(sealed, "mda_test", len(data), 0, len(data) - 1) == data


def test_a_damaged_file_is_not_resealed_into_a_valid_looking_one(keys, small_chunks, tmp_path):
    keys(K1)
    data = os.urandom(2500)
    path = seal_file(tmp_path, data)
    raw = bytearray(path.read_bytes())
    raw[-5] ^= 0x01
    path.write_bytes(bytes(raw))
    keys(f"{K2},{K1}")
    with pytest.raises(crypto.DecryptionError):
        crypto.reseal_file(str(path), str(tmp_path / "out"), "mda_test", len(data))


def test_file_key_available_reads_the_key_from_the_file_itself(keys, small_chunks, tmp_path):
    keys(K1)
    path = seal_file(tmp_path, os.urandom(100))
    assert crypto.file_key_available(str(path))
    keys(K2)
    assert not crypto.file_key_available(str(path))
    assert not crypto.file_key_available(str(tmp_path / "missing"))
    empty = tmp_path / "empty"
    empty.write_bytes(b"")
    assert not crypto.file_key_available(str(empty))


def test_a_plain_file_is_not_mistaken_for_a_sealed_one(tmp_path):
    path = tmp_path / "plain.jpg"
    path.write_bytes(b"\xff\xd8\xff\xe0 not sealed")
    assert crypto.is_sealed_file(str(path)) is False


# --- signed attachment links ----------------------------------------------------

def parse_link(url: str) -> tuple[str, str]:
    query = dict(part.split("=", 1) for part in url.split("?", 1)[1].split("&"))
    return query["exp"], query["sig"]


def test_a_signed_link_is_valid_for_its_asset_only():
    exp, sig = parse_link(crypto.sign_media_url("http://x/media/mda_a", "mda_a"))
    assert crypto.media_signature_valid("mda_a", exp, sig)
    assert not crypto.media_signature_valid("mda_b", exp, sig)


def test_a_signed_link_expires(monkeypatch):
    exp, sig = parse_link(crypto.sign_media_url("http://x/media/mda_a", "mda_a"))
    monkeypatch.setattr(crypto.time, "time", lambda: int(exp) + 1)
    assert not crypto.media_signature_valid("mda_a", exp, sig)


def test_a_link_with_its_expiry_pushed_back_is_refused():
    exp, sig = parse_link(crypto.sign_media_url("http://x/media/mda_a", "mda_a"))
    assert not crypto.media_signature_valid("mda_a", str(int(exp) + 3600), sig)


@pytest.mark.parametrize("exp,sig", [(None, None), ("", "x"), ("abc", "x"), ("-5", "x"), ("9999999999", None)])
def test_missing_or_malformed_link_parts_are_refused(exp, sig):
    assert not crypto.media_signature_valid("mda_a", exp, sig)


def test_a_link_keeps_an_existing_query_string():
    url = crypto.sign_media_url("http://x/media/mda_a?download=1", "mda_a")
    assert "?download=1&exp=" in url


def test_the_private_fingerprint_is_stable_and_is_not_the_plain_hash():
    digest = "ab" * 32
    assert crypto.private_fingerprint(digest) == crypto.private_fingerprint(digest)
    assert crypto.private_fingerprint(digest) != digest
