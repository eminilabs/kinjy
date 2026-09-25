"""The Kinjy economy — every split formula in one auditable place.

**One affiliate level, not ten.** The member who sponsored the person generating
a transaction is paid ``SPONSOR_COMMISSION_PCT`` of *Kinjy's revenue* on it.
Nobody above the sponsor is paid anything: there is no upline, no depth, no
level-2..10 residuals. A sponsor who brings nobody earns nothing, and a sponsor
who brings a buyer earns on every transaction that buyer generates.

What "Kinjy's revenue" means per transaction type:

* **Agency deals** (a digital product, a private subscription club — anything
  where Kinjy connects a buyer to a seller): the seller names a price, Kinjy
  adds ``MARKETPLACE_MARKUP_PCT`` on top, and *that markup* is the revenue. The
  commission comes out of the markup. The seller's own price is untouched —
  money that was never Kinjy's cannot be paid away as commission.
* **Advertising bought from Kinjy**: the whole purchase is revenue.
* **Creator ad revenue**: the creator's share is an expense against the ad
  money; commission is computed on what Kinjy retains, so a single advertising
  dollar never pays a commission twice.

On top of that, ``LEADERS_POOL_PCT`` of the same revenue is set aside for the
**Kinjy Leaders** programme and distributed monthly (see
:func:`distribute_leaders_pool`).

Two invariants every function here guarantees:

1. **No drift.** Splits are computed in cents with ``ROUND_DOWN`` and the
   rounding remainder is assigned to the platform, so the parts always sum
   *exactly* back to the source amount. Never let a split lose a cent.
2. **An unsponsored member is not silently free money.** When the member has no
   sponsor, that share is explicitly attributed to ``platform`` with reason
   ``unclaimed_sponsor_commission`` so the ledger can report how much of the
   programme went unclaimed. It is recorded, not dropped.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP

from common import settings

CENT = Decimal("0.01")
HUNDRED = Decimal("100")


def money(value: Decimal | float | int | str) -> Decimal:
    """Quantise to 2 decimals, half-up. Use for *prices*, not for splits."""
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def _floor_cents(value: Decimal) -> Decimal:
    return Decimal(value).quantize(CENT, rounding=ROUND_DOWN)


def pct_of(amount: Decimal, percent: Decimal) -> Decimal:
    """``percent`` % of ``amount``, floored to the cent."""
    return _floor_cents(Decimal(amount) * Decimal(percent) / HUNDRED)


@dataclass
class Share:
    """One line of a split."""

    beneficiary: str          # "creator" | "platform" | "leaders_pool" | a user id
    role: str                 # "sponsor" | "creator" | "platform" | "leaders_pool" | "vendor"
    amount: Decimal
    reason: str = ""

    def __post_init__(self) -> None:
        self.amount = Decimal(self.amount)


@dataclass
class Split:
    """Result of a distribution. ``shares`` always sums exactly to ``source``."""

    source: Decimal
    basis: Decimal            # the amount percentages were applied to (the revenue)
    shares: list[Share] = field(default_factory=list)

    @property
    def total(self) -> Decimal:
        return sum((s.amount for s in self.shares), Decimal("0"))

    @property
    def distributed(self) -> Decimal:
        return sum((s.amount for s in self.shares if s.role != "platform"), Decimal("0"))

    def to_platform(self, remainder_reason: str = "residual") -> None:
        """Assign whatever is left of ``source`` to the platform."""
        left = Decimal(self.source) - self.total
        if left != 0:
            self.shares.append(
                Share(beneficiary="platform", role="platform", amount=left, reason=remainder_reason)
            )

    def check(self) -> None:
        if self.total != Decimal(self.source):
            raise AssertionError(f"split drift: {self.total} != {self.source}")


# ---------------------------------------------------------------------------
# Agency pricing
# ---------------------------------------------------------------------------

def marketplace_pricing(vendor_price: Decimal) -> dict[str, Decimal]:
    """vendor $100 -> customer $120, Kinjy's revenue $20 (a 20% *markup*).

    Note the wording trap: a 20% markup over the vendor price is 16.67% of what
    the customer pays. Everything downstream — the sponsor commission, the
    Leaders pool, the accounts — uses ``margin``, never ``customer_price``.
    """
    vendor = money(vendor_price)
    margin = money(vendor * settings.MARKETPLACE_MARKUP_PCT / HUNDRED)
    return {
        "vendor_price": vendor,
        "margin": margin,
        "customer_price": vendor + margin,
        "markup_pct": settings.MARKETPLACE_MARKUP_PCT,
        "margin_pct_of_customer": (margin / (vendor + margin) * HUNDRED).quantize(Decimal("0.01"))
        if vendor + margin
        else Decimal("0"),
    }


# ---------------------------------------------------------------------------
# The direct affiliate programme
# ---------------------------------------------------------------------------

def revenue_split(revenue: Decimal, sponsor_id: str | None, *, kind: str = "revenue") -> Split:
    """The whole programme, in one function.

    ``revenue`` is Kinjy's revenue on the transaction — for an agency deal that
    is the markup, never the customer price. Out of it::

        sponsor        SPONSOR_COMMISSION_PCT  (20%)
        Kinjy Leaders  LEADERS_POOL_PCT        (5%)
        platform       the rest                (75%)
    """
    source = money(revenue)
    split = Split(source=source, basis=source)

    commission = pct_of(source, settings.SPONSOR_COMMISSION_PCT)
    split.shares.append(
        Share(
            beneficiary=sponsor_id or "platform",
            role="sponsor" if sponsor_id else "platform",
            amount=commission,
            reason=f"{kind}_sponsor_commission" if sponsor_id else "unclaimed_sponsor_commission",
        )
    )

    split.shares.append(
        Share(
            beneficiary="leaders_pool",
            role="leaders_pool",
            amount=pct_of(source, settings.LEADERS_POOL_PCT),
            reason="leaders_pool_contribution",
        )
    )

    split.to_platform(f"{kind}_platform_share")
    split.check()
    return split


def ad_purchase_split(purchase_amount: Decimal, sponsor_id: str | None) -> Split:
    """An advertiser buys from Kinjy: the whole purchase is Kinjy's revenue."""
    return revenue_split(purchase_amount, sponsor_id, kind="ad")


def service_affiliate_split(basis: Decimal, sponsor_id: str | None) -> Split:
    """``basis`` is the *markup* on an agency deal, or a fee Kinjy charges directly.

    Never the full customer price: the seller's money is not Kinjy's revenue and
    cannot fund a commission.
    """
    return revenue_split(basis, sponsor_id, kind="service")


def creator_revenue_split(revenue: Decimal, creator_id: str, sponsor_id: str | None) -> Split:
    """creator ``CREATOR_SHARE_PCT`` first, then the programme on what Kinjy keeps."""
    source = money(revenue)
    split = Split(source=source, basis=source)

    creator_share = pct_of(source, settings.CREATOR_SHARE_PCT)
    split.shares.append(
        Share(beneficiary=creator_id, role="creator", amount=creator_share, reason="creator_revenue_share")
    )

    retained = source - creator_share
    split.basis = retained
    for share in revenue_split(retained, sponsor_id, kind="creator").shares:
        # The inner split's own platform remainder is dropped: the outer split
        # assigns the platform residual once, at the end, so it can never be
        # counted twice or leave the journal unbalanced.
        if share.role == "platform" and not share.reason.startswith("unclaimed_"):
            continue
        split.shares.append(share)

    split.to_platform("creator_platform_share")
    split.check()
    return split


def marketplace_order_split(vendor_price: Decimal, sponsor_id: str | None) -> dict:
    """Full agency settlement: the seller is paid their price, the markup is split."""
    pricing = marketplace_pricing(vendor_price)
    split = service_affiliate_split(pricing["margin"], sponsor_id)
    return {"pricing": pricing, "margin_split": split}


# ---------------------------------------------------------------------------
# Kinjy Leaders
# ---------------------------------------------------------------------------

def leader_share_ratios(
    commissions: dict[str, Decimal], pool_size: int | None = None
) -> dict[str, Decimal]:
    """Rank members by the direct commission they earned during the month.

    The top ``pool_size`` qualify, and each takes the pool in proportion to
    their own commission over the **sum of the qualifying members' commissions**
    — not over everyone's. A member ranked 10,001st contributes nothing to the
    denominator, which is what makes the top slice worth holding.

    Returns ``{member_id: ratio}`` where the ratios sum to 1 (or {} when empty).
    """
    size = pool_size or settings.LEADERS_POOL_SIZE
    ranked = sorted(
        ((uid, Decimal(amount)) for uid, amount in commissions.items() if Decimal(amount) > 0),
        key=lambda item: (-item[1], item[0]),
    )[:size]
    total = sum((amount for _, amount in ranked), Decimal("0"))
    if not total:
        return {}
    return {uid: (amount / total) for uid, amount in ranked}


def distribute_leaders_pool(pool_amount: Decimal, commissions: dict[str, Decimal]) -> Split:
    """Split the monthly pool by commission ratio; the remainder rolls over."""
    source = money(pool_amount)
    split = Split(source=source, basis=source)
    for uid, ratio in leader_share_ratios(commissions).items():
        split.shares.append(
            Share(
                beneficiary=uid,
                role="leaders_payout",
                amount=_floor_cents(source * ratio),
                reason="kinjy_leaders_monthly",
            )
        )
    split.to_platform("leaders_pool_rounding_rollover")
    split.check()
    return split


# ---------------------------------------------------------------------------
# Payout eligibility (info-payments.md)
# ---------------------------------------------------------------------------

def is_payout_eligible(*, accrued_usd: Decimal, kyc_verified: bool, wallet_on_file: bool) -> tuple[bool, str | None]:
    """A member joins the next payout batch only when all three hold."""
    if not kyc_verified:
        return False, "kyc_required"
    if not wallet_on_file:
        return False, "wallet_required"
    if Decimal(accrued_usd) < settings.PAYOUT_THRESHOLD_USD:
        return False, "below_threshold"
    return True, None
