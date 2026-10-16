"""What a real translation provider may be asked to do, and for whom.

A real provider costs money and receives somebody's writing. Two limits, both applied
only when a real provider is about to be called - a cached answer, or the stand-in, costs
nothing and sends nothing:

* **AI credits, by plan.** A member has a number of credits a calendar month, set by their
  plan (blueprint section 12); a credit is a fixed number of characters sent to the provider.
  Without a limit one account can turn the platform's balance into translations of whatever
  it likes; with a flat one, the plans mean nothing.
* **A monthly budget for the whole platform**, in dollars, from the cost each real call
  was recorded with. When it is spent translation pauses for everybody until the month
  turns or somebody raises it, rather than the prepaid balance running out in the middle
  of somebody's publication.

Pure functions, so the rules can be tested without a database; main.py supplies the sums.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

TIERS = ("free", "basic", "premium")


@dataclass
class LimitReached(Exception):
    status: int
    message: str

    def __str__(self) -> str:
        return self.message


def credits_for(tier: str, *, free: int, basic: int, premium: int) -> int:
    """How many credits a month a plan gives. An unknown plan is the Free one."""
    return {"free": free, "basic": basic, "premium": premium}.get(tier, free)


def to_credits(chars: int, credit_chars: int) -> int:
    """Characters as whole credits, rounded up: a member is never shown 0 left with 3 characters spare."""
    return math.ceil(chars / credit_chars) if chars > 0 else 0


def credits_left(allowance_chars: int, used_chars: int, credit_chars: int) -> int:
    """Whole credits still to spend. Rounded *down*: a member is never told they have a credit
    they cannot spend in full. Used credits are then the total minus these, so the two add up."""
    return max(0, (allowance_chars - used_chars) // credit_chars)


def check(
    *,
    spent_this_month: float,
    monthly_budget: float,
    used_this_month_chars: int,
    allowance_chars: int,
    text_chars: int,
    tier: str = "free",
    credit_chars: int = 1000,
    renews_on: str = "the 1st of next month",
) -> None:
    """Raise :class:`LimitReached` if this call must not be made; return otherwise.

    The platform's budget is checked first: when it is gone nobody's credits matter.
    A budget of zero (or less) means no real spending at all.
    """
    if spent_this_month >= monthly_budget:
        raise LimitReached(503, "Translation is paused: this month's AI budget has been used up.")
    if used_this_month_chars + text_chars > allowance_chars:
        total = to_credits(allowance_chars, credit_chars)
        left = credits_left(allowance_chars, used_this_month_chars, credit_chars)
        need = to_credits(text_chars, credit_chars)
        hint = " Basic and Premium include more." if tier == "free" else ""
        raise LimitReached(
            429,
            f"Not enough AI credits: this needs {need}, you have {left} of the {total} in your {tier.capitalize()} plan. "
            f"They renew on {renews_on}.{hint}",
        )
