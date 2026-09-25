"""The referral pool.

A member buys a seat for ``REFERRAL_POOL_ENTRY_USD``. From then on, every
sign-up that arrives **without a personal invitation link** is assigned to a
seat drawn at random, and that seat holder becomes the new member's sponsor —
earning exactly the same direct commission as if they had invited them by hand.

The pool closes to new entrants once ``REFERRAL_POOL_CAP`` seats are sold.
Seats already bought keep receiving assignments after that: a seat that stopped
working the moment the last one sold would make the final purchases worthless,
which is not a programme anybody would buy into.

Two things this module is careful about:

* **Overselling.** The cap is checked under a transaction-scoped advisory lock
  on Postgres, so two people buying the last seat at the same instant cannot
  both get it. Without it the check-then-insert is a plain race.
* **Auditability.** Every draw writes a :class:`models.PoolAssignment` row with
  the number of seats that were in the draw. A member disputing their sponsor,
  or a fraud review looking for a seat that took an implausible share of
  sign-ups, has something to read.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from common import settings
from common.ids import new_id

import models

log = logging.getLogger("auth-service.referral_pool")

# Any 64-bit constant; it only has to be unique among this database's advisory
# locks, and it is released when the transaction ends.
_POOL_LOCK_KEY = 871_402_551


def _lock(db: OrmSession) -> None:
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        db.execute(select(func.pg_advisory_xact_lock(_POOL_LOCK_KEY)))


def seats_taken(db: OrmSession) -> int:
    return db.scalar(select(func.count()).select_from(models.ReferralPoolSeat)) or 0


def active_seats(db: OrmSession) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(models.ReferralPoolSeat)
            .where(models.ReferralPoolSeat.status == "active")
        )
        or 0
    )


def state(db: OrmSession, member_id: str | None = None) -> dict:
    """Everything the join screen needs, in one query set."""
    taken = seats_taken(db)
    cap = settings.REFERRAL_POOL_CAP
    mine = None
    if member_id:
        seat = db.scalar(
            select(models.ReferralPoolSeat).where(models.ReferralPoolSeat.member_id == member_id)
        )
        if seat is not None:
            mine = {
                "seat_id": seat.id,
                "seat_number": seat.seat_number,
                "status": seat.status,
                "assigned_count": seat.assigned_count,
                "last_assigned_at": seat.last_assigned_at,
                "joined_at": seat.created_at,
            }
    return {
        "entry_price": str(settings.REFERRAL_POOL_ENTRY_USD),
        "currency": "USD",
        "cap": cap,
        "seats_taken": taken,
        "seats_left": max(cap - taken, 0),
        "open": taken < cap,
        "active_seats": active_seats(db),
        "my_seat": mine,
        "note": (
            "Sign-ups that arrive without a personal invitation link are assigned "
            "to a seat at random. The pool closes to new members at "
            f"{cap:,} seats; seats already held keep receiving assignments."
        ),
    }


def grant_seat(
    db: OrmSession,
    member_id: str,
    *,
    price_paid: Decimal | str,
    payment_ref: str | None = None,
    currency: str = "USD",
) -> tuple[models.ReferralPoolSeat | None, str | None]:
    """Seat a member who has paid. Returns ``(seat, error_code)``.

    Called after the money has settled, never before: a seat handed out on an
    unconfirmed payment is a seat that has to be taken back.
    """
    _lock(db)

    existing = db.scalar(
        select(models.ReferralPoolSeat).where(models.ReferralPoolSeat.member_id == member_id)
    )
    if existing is not None:
        return existing, "already_seated"

    taken = seats_taken(db)
    if taken >= settings.REFERRAL_POOL_CAP:
        return None, "pool_full"

    seat = models.ReferralPoolSeat(
        id=new_id("seat"),
        member_id=member_id,
        seat_number=taken + 1,
        price_paid=str(price_paid),
        currency=currency,
        payment_ref=payment_ref,
        status="active",
    )
    db.add(seat)
    db.flush()
    return seat, None


def draw_seat(db: OrmSession, new_member_id: str) -> models.ReferralPoolSeat | None:
    """Pick a seat at random for a sign-up that arrived with no invitation link.

    Returns None when the pool is empty — the member is then simply unsponsored
    and the commission on their activity is recorded as unclaimed. Best-effort
    on purpose: a failure here must never block a registration.
    """
    try:
        seat = db.scalar(
            select(models.ReferralPoolSeat)
            .where(
                models.ReferralPoolSeat.status == "active",
                models.ReferralPoolSeat.member_id != new_member_id,
            )
            .order_by(func.random())
            .limit(1)
        )
        if seat is None:
            return None

        seat.assigned_count += 1
        seat.last_assigned_at = datetime.now(timezone.utc)
        db.add(
            models.PoolAssignment(
                seat_id=seat.id,
                sponsor_id=seat.member_id,
                new_member_id=new_member_id,
                seats_in_draw=active_seats(db),
            )
        )
        db.flush()
        return seat
    except Exception as exc:  # pragma: no cover - defensive
        log.error("referral pool draw failed for %s: %s", new_member_id, exc)
        return None
