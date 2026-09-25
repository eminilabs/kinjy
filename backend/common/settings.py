"""Central settings shared by every Kinjy service.

Everything is read from the environment (docker-compose injects it). Values are
plain attributes rather than a BaseSettings model so that a missing optional key
never blocks a service from booting in development.
"""
from __future__ import annotations

import os
from decimal import Decimal


def _str(key: str, default: str = "") -> str:
    return os.getenv(key, default)


def _int(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, "") or default)
    except ValueError:
        return default


def _dec(key: str, default: str) -> Decimal:
    try:
        return Decimal(os.getenv(key, "") or default)
    except Exception:
        return Decimal(default)


# --- Infrastructure ---------------------------------------------------------
DATABASE_URL = _str("DATABASE_URL", "postgresql://kaluta:kaluta@postgres:5432/kaluta")
REDIS_URL = _str("REDIS_URL", "redis://redis:6379/0")
RABBITMQ_URL = _str("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
SERVICE_NAME = _str("SERVICE_NAME", os.getenv("SERVICE", "kaluta-service"))
ENV = _str("ENV", "development")

# --- Security ---------------------------------------------------------------
JWT_SECRET = _str("JWT_SECRET", "dev-insecure-secret-change-me")
JWT_ALGORITHM = _str("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_TTL_MIN = _int("ACCESS_TOKEN_TTL_MIN", 30)
REFRESH_TOKEN_TTL_DAYS = _int("REFRESH_TOKEN_TTL_DAYS", 30)
WEBAUTHN_RP_ID = _str("WEBAUTHN_RP_ID", "localhost")
WEBAUTHN_RP_NAME = _str("WEBAUTHN_RP_NAME", "Kinjy")
WEBAUTHN_ORIGIN = _str("WEBAUTHN_ORIGIN", "http://localhost:3030")

# --- Public URLs ------------------------------------------------------------
FRONTEND_URL = _str("FRONTEND_URL", "http://localhost:3030")
GATEWAY_URL = _str("GATEWAY_URL", "http://localhost:8200")

# --- Economy ----------------------------------------------------------------
# Marketplace / agency: customer price = vendor price * (1 + markup). A vendor
# listing at $100 with a 20% markup is sold at $120; Kinjy's *revenue* on that
# deal is the $20 markup — the $100 is the seller's money passing through.
MARKETPLACE_MARKUP_PCT = _dec("MARKETPLACE_MARKUP_PCT", "20")

# The direct affiliate programme. One level, no depth: the member who sponsored
# the person generating the revenue is paid this percentage OF KINJY'S REVENUE.
# Where Kinjy acts as an agent between a buyer and a seller (digital products,
# private subscription clubs), Kinjy's revenue is the markup above — so the
# commission comes out of the markup and never out of the seller's price.
SPONSOR_COMMISSION_PCT = _dec("SPONSOR_COMMISSION_PCT", "20")

# Kinjy Leaders: this share of monthly company revenue is set aside as it is
# earned and distributed at month end to the members with the highest direct
# commissions, in proportion to those commissions.
LEADERS_POOL_PCT = _dec("LEADERS_POOL_PCT", "5")
LEADERS_POOL_SIZE = _int("LEADERS_POOL_SIZE", 10000)

# Creator ad revenue share. The creator's cut is an expense against the ad
# revenue; the sponsor commission is then computed on what Kinjy retains, so a
# single advertising dollar never pays commission twice.
CREATOR_SHARE_PCT = _dec("CREATOR_SHARE_PCT", "40")

# Referral pool: members buy a seat, and sign-ups that arrive with no personal
# invitation link are assigned to seats at random. The pool closes to new
# entrants once it is full.
REFERRAL_POOL_ENTRY_USD = _dec("REFERRAL_POOL_ENTRY_USD", "100")
REFERRAL_POOL_CAP = _int("REFERRAL_POOL_CAP", 10000)

# --- Escrow / custody -------------------------------------------------------
# Buyer money is held by an authorised financial institution, not by Kinjy, and
# is released to the seller only once the buyer confirms receipt. If the buyer
# neither confirms nor disputes, it auto-releases after this many days.
CUSTODIAN_PROVIDER = _str("CUSTODIAN_PROVIDER", "mangopay")
CUSTODIAN_NAME = _str("CUSTODIAN_NAME", "Mangopay S.A.")
CUSTODIAN_LICENCE = _str("CUSTODIAN_LICENCE", "Electronic Money Institution (Luxembourg, CSSF)")
ESCROW_AUTO_RELEASE_DAYS = _int("ESCROW_AUTO_RELEASE_DAYS", 7)
# Once a dispute is open the seller has this long to answer before the case is
# escalated to Kinjy arbitration on the buyer's side of the record.
DISPUTE_RESPONSE_DAYS = _int("DISPUTE_RESPONSE_DAYS", 3)
DISPUTE_ARBITRATION_DAYS = _int("DISPUTE_ARBITRATION_DAYS", 10)

PAYOUT_THRESHOLD_USD = _dec("PAYOUT_THRESHOLD_USD", "1.00")
KYC_ANNUAL_FEE_USD = _dec("KYC_ANNUAL_FEE_USD", "10.00")

# --- Payment rails ----------------------------------------------------------
NOWPAYMENTS_API_KEY = _str("NOWPAYMENTS_API_KEY")
NOWPAYMENTS_IPN_SECRET = _str("NOWPAYMENTS_IPN_SECRET")
NOWPAYMENTS_PAYOUT_CURRENCY = _str("NOWPAYMENTS_PAYOUT_CURRENCY", "usdtbsc")
MANGOPAY_CLIENT_ID = _str("MANGOPAY_CLIENT_ID")
MANGOPAY_API_KEY = _str("MANGOPAY_API_KEY")
MANGOPAY_BASE_URL = _str("MANGOPAY_BASE_URL", "https://api.sandbox.mangopay.com")

# --- AI ---------------------------------------------------------------------
AI_DEFAULT_PROVIDER = _str("AI_DEFAULT_PROVIDER", "mock")

# --- Media ------------------------------------------------------------------
MEDIA_ROOT = _str("MEDIA_ROOT", "/data/media")
MEDIA_PUBLIC_BASE = _str("MEDIA_PUBLIC_BASE", "http://localhost:8200/media")

# --- Languages (platform-wide) ---------------------------------------------
SUPPORTED_LANGS = ["en", "sw", "fr", "ar", "zh"]
DEFAULT_LANG = "en"
RTL_LANGS = {"ar"}
