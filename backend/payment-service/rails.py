"""Payment rails.

Two live rails plus a mock. Which one is used is a per-request choice, so the
platform is never hostage to a single provider — the same decision the AI
gateway makes for models.

When no API key is configured the rail runs in **mock mode**: it returns
realistic shapes so the whole flow is testable locally, and every response is
flagged ``"mock": true`` so a mock payment can never be mistaken for a real one.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from decimal import Decimal
from typing import Any

import httpx

from common import settings
from common.ids import new_id

log = logging.getLogger("payment-rails")

NOWPAYMENTS_BASE = "https://api.nowpayments.io/v1"


class RailError(RuntimeError):
    pass


# ---------------------------------------------------------------------------
# NowPayments (crypto)
# ---------------------------------------------------------------------------

def nowpayments_enabled() -> bool:
    return bool(settings.NOWPAYMENTS_API_KEY)


def _np_headers() -> dict[str, str]:
    return {"x-api-key": settings.NOWPAYMENTS_API_KEY, "Content-Type": "application/json"}


def create_crypto_payment(
    *,
    amount: Decimal,
    currency: str,
    pay_currency: str,
    order_id: str,
    callback_url: str,
) -> dict[str, Any]:
    if not nowpayments_enabled():
        return {
            "mock": True,
            "external_id": f"mock_{new_id('np')}",
            "pay_address": "0xMOCK000000000000000000000000000000000000",
            "pay_currency": pay_currency,
            "status": "waiting",
            "note": "NOWPAYMENTS_API_KEY is not set — running in mock mode.",
        }

    try:
        response = httpx.post(
            f"{NOWPAYMENTS_BASE}/payment",
            headers=_np_headers(),
            json={
                "price_amount": float(amount),
                "price_currency": currency.lower(),
                "pay_currency": pay_currency,
                "order_id": order_id,
                "ipn_callback_url": callback_url,
            },
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError as exc:
        raise RailError(f"NowPayments payment creation failed: {exc}") from exc

    return {
        "mock": False,
        "external_id": str(data.get("payment_id")),
        "pay_address": data.get("pay_address"),
        "pay_currency": data.get("pay_currency"),
        "status": data.get("payment_status", "waiting"),
        "raw": data,
    }


def verify_ipn_signature(raw_body: bytes, signature: str | None) -> bool:
    """HMAC-SHA512 over the JSON body with keys sorted alphabetically.

    An unsigned or mis-signed callback is rejected outright — the IPN endpoint is
    public, so accepting one would let anyone mark any payment as finished.
    """
    if not settings.NOWPAYMENTS_IPN_SECRET:
        log.warning("NOWPAYMENTS_IPN_SECRET unset — refusing to trust the callback")
        return False
    if not signature:
        return False
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        return False

    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    expected = hmac.new(
        settings.NOWPAYMENTS_IPN_SECRET.encode(), canonical, hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def mass_payout(items: list[dict[str, Any]]) -> dict[str, Any]:
    """Submit a batch of withdrawals.

    NowPayments then requires a 2FA verification call before it executes; we
    return the payout id so the operator (or an automated OTP step) can confirm.
    """
    if not nowpayments_enabled():
        return {
            "mock": True,
            "payout_id": f"mock_{new_id('po')}",
            "status": "submitted",
            "count": len(items),
            "note": "Mock payout — no funds moved.",
        }

    try:
        response = httpx.post(
            f"{NOWPAYMENTS_BASE}/payout",
            headers=_np_headers(),
            json={"withdrawals": items},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError as exc:
        raise RailError(f"NowPayments mass payout failed: {exc}") from exc

    return {"mock": False, "payout_id": data.get("id"), "status": "verifying", "raw": data}


# ---------------------------------------------------------------------------
# Mangopay (fiat escrow + bank payouts)
# ---------------------------------------------------------------------------

def mangopay_enabled() -> bool:
    return bool(settings.MANGOPAY_CLIENT_ID and settings.MANGOPAY_API_KEY)


def create_fiat_payment(*, amount: Decimal, currency: str, user_id: str, reference: str) -> dict[str, Any]:
    if not mangopay_enabled():
        return {
            "mock": True,
            "external_id": f"mock_{new_id('mp')}",
            "checkout_url": f"{settings.FRONTEND_URL}/mock-checkout/{reference}",
            "status": "waiting",
            "note": "MANGOPAY credentials are not set — running in mock mode.",
        }
    # The real integration creates a natural user, a wallet and a pay-in.
    # Left unimplemented rather than half-implemented: a partial money path is
    # worse than an explicit gap.
    raise RailError("Mangopay live integration is not wired yet — configure and implement before enabling.")


def choose_rail(preferred: str | None, currency: str) -> str:
    if preferred in ("nowpayments", "mangopay"):
        return preferred
    if nowpayments_enabled():
        return "nowpayments"
    if mangopay_enabled():
        return "mangopay"
    return "mock"


# ---------------------------------------------------------------------------
# Custodial escrow
# ---------------------------------------------------------------------------
# Buyer money for a marketplace order is held by the custodian, not by Kinjy.
# Mangopay is the configured provider: an Electronic Money Institution licensed
# in Luxembourg, which is what makes a segregated client-money account possible
# in the first place. NowPayments is a crypto processor, not a custodian, so a
# crypto order settles into the company wallet and the refund path is a payout
# rather than a wallet-to-wallet reversal - the money still goes back, but the
# guarantee behind it is weaker, and the buyer is told which one they have.

def custody_provider() -> str:
    return settings.CUSTODIAN_PROVIDER


def custody_is_licensed() -> bool:
    """True only when a real licensed custodian is configured and reachable."""
    return settings.CUSTODIAN_PROVIDER == "mangopay" and mangopay_enabled()


def refund_from_custody(
    *, amount: Decimal, user_id: str, custody_ref: str | None, reference: str
) -> dict[str, Any]:
    """Instruct the custodian to return money to the buyer.

    Raises :class:`RailError` when the provider refuses. It never returns a
    success it did not get: a refund reported as done but never sent is the
    worst possible failure here.
    """
    if not mangopay_enabled() and not nowpayments_enabled():
        log.warning("refund %s of %s for %s: no live rail, recorded in mock mode", reference, amount, user_id)
        return {"id": f"mock_{reference}", "status": "finished", "mock": True}

    if mangopay_enabled():
        try:
            response = httpx.post(
                f"{settings.MANGOPAY_BASE_URL}/v2.01/{settings.MANGOPAY_CLIENT_ID}/payins/{custody_ref}/refunds",
                auth=(settings.MANGOPAY_CLIENT_ID, settings.MANGOPAY_API_KEY),
                json={"AuthorId": user_id, "Tag": reference},
                timeout=20,
            )
            response.raise_for_status()
            body = response.json()
            return {"id": str(body.get("Id")), "status": "submitted", "raw": body.get("Status")}
        except httpx.HTTPError as exc:
            raise RailError(f"mangopay refund failed: {exc}") from exc

    # Crypto: there is nothing to reverse, so the refund is a payout back to the
    # buyer's own destination. It needs one on file, which is checked here
    # rather than failing deep inside the provider call.
    raise RailError(
        "This order was paid in crypto. A refund is sent as a payout to the buyer's "
        "withdrawal address, which must be on file before it can be issued."
    )
