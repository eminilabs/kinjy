"""The gateway must wait at least as long as media-service may take to answer an upload.

With post media at UploadCenter, media-service answers an upload only after it has sent
the file on and waited for the scan, which can take minutes. If the gateway gives up
sooner, the member sees a 504 for an upload that goes on to succeed and leaves the file
behind. The two numbers live in different services, so this ties them together.

Run: python -m pytest backend/tests/test_gateway_timeouts.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "media-service"))

import uploadcenter  # noqa: E402


def gateway_constants() -> dict[str, float]:
    """Read the gateway's numbers from its source rather than importing the app.

    Importing it would start building a FastAPI app and need its websocket client,
    for the sake of two integers.
    """
    import re

    source = (ROOT / "gateway" / "main.py").read_text(encoding="utf-8")
    return {
        name: float(re.search(rf"^{name}\s*=\s*([0-9.]+)", source, re.MULTILINE).group(1))
        for name in ("UPLOAD_READ_SECONDS", "BODY_DEADLINE_MEDIA")
    }


def test_the_gateway_waits_longer_than_media_service_can_take():
    worst_case = uploadcenter.PUT_MAX_SECONDS + uploadcenter.READY_MAX_SECONDS
    assert gateway_constants()["UPLOAD_READ_SECONDS"] >= worst_case, (
        "a member would see a 504 for an upload that still completes"
    )


def test_an_ordinary_call_keeps_the_short_wait():
    source = (ROOT / "gateway" / "main.py").read_text(encoding="utf-8")
    assert "httpx.Timeout(30.0, connect=5.0)" in source  # the client default, unchanged
    assert 'if large and request.method in ("POST", "PUT")' in source, "only uploads wait long"
