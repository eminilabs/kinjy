"""Kinjy · commerce-service — the agency marketplace, custodial escrow, disputes
and the ad platform.

Kinjy does not hold buyer money. Payment goes to an authorised financial
institution acting as custodian; it reaches the seller only once the buyer
confirms receipt, or once the confirmation window closes with nothing contested.
A dispute freezes that clock at both ends: the seller cannot wait out a buyer
raising a problem, and a buyer cannot keep the goods and the money by opening a
case and going quiet.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from common import economy, events, settings
from common.auth import AdminUser, CurrentUser
from common.notify import notify, notify_many
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import models

log = logging.getLogger("commerce-service")
LEDGER_URL = "http://ledger-service:8000"
PAYMENT_URL = "http://payment-service:8000"

# Escrow and dispute columns added to an existing orders table. create_all
# cannot alter a live table, and an order row missing custody_ref would make
# every settlement unattributable.
MIGRATIONS = [
    f"ALTER TABLE {models.SCHEMA}.orders ADD COLUMN IF NOT EXISTS custodian VARCHAR(40)",
    f"ALTER TABLE {models.SCHEMA}.orders ADD COLUMN IF NOT EXISTS custody_ref VARCHAR(120)",
    f"ALTER TABLE {models.SCHEMA}.orders ADD COLUMN IF NOT EXISTS escrow_funded_at TIMESTAMPTZ",
    f"ALTER TABLE {models.SCHEMA}.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ",
    f"ALTER TABLE {models.SCHEMA}.orders ADD COLUMN IF NOT EXISTS delivery_note TEXT",
    f"ALTER TABLE {models.SCHEMA}.orders "
    "ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(18,2) DEFAULT 0",
]

app = create_app(
    name="commerce-service",
    schema=models.SCHEMA,
    description="Agency marketplace, custodial escrow, dispute resolution, advertising.",
    migrations=MIGRATIONS,
)


class ProductIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str = ""
    kind: str = Field(default="product", pattern="^(product|service|digital)$")
    vendor_price: Decimal = Field(gt=0)
    stock: int | None = None
    country: str | None = None
    city: str | None = None
    images: list[str] = Field(default_factory=list)


class OrderIn(BaseModel):
    product_id: str
    quantity: int = Field(default=1, ge=1)


class CampaignIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    objective: str = Field(pattern="^(awareness|traffic|leads|sales|local)$")
    pricing_model: str
    bid: Decimal = Field(gt=0)
    budget: Decimal = Field(gt=0)
    target_country: str | None = None
    target_city: str | None = None
    target_radius_km: int | None = None
    target_age_min: int | None = None
    target_age_max: int | None = None
    creative_headline: str | None = None
    creative_body: str | None = None


# --- marketplace -----------------------------------------------------------

@app.get("/commerce/pricing", tags=["marketplace"])
def pricing_preview(vendor_price: Decimal):
    """Shows exactly how a vendor price becomes a customer price."""
    pricing = economy.marketplace_pricing(vendor_price)
    return {
        **{k: str(v) for k, v in pricing.items()},
        "explanation": (
            f"The vendor receives {pricing['vendor_price']}. Kinjy adds a "
            f"{pricing['markup_pct']}% markup ({pricing['margin']}), so the customer pays "
            f"{pricing['customer_price']}. Affiliate commissions are paid out of the "
            f"{pricing['margin']} margin only."
        ),
    }


@app.post("/commerce/products", status_code=201, tags=["marketplace"])
def create_product(payload: ProductIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    data = payload.model_dump(exclude={"images"})
    product = models.Product(
        id=new_id("prd"),
        vendor_id=principal.user_id,
        images=",".join(payload.images) or None,
        **data,
    )
    db.add(product)
    db.commit()
    pricing = economy.marketplace_pricing(product.vendor_price)
    return {"id": product.id, "pricing": {k: str(v) for k, v in pricing.items()}}


@app.get("/commerce/products", tags=["marketplace"])
def list_products(
    q: str | None = None,
    country: str | None = None,
    kind: str | None = None,
    limit: int = 30,
    offset: int = 0,
    db: OrmSession = Depends(get_db),
):
    stmt = select(models.Product).where(models.Product.status == "active")
    if q:
        stmt = stmt.where(func.lower(models.Product.title).like(f"%{q.lower()}%"))
    if country:
        stmt = stmt.where(models.Product.country == country.upper())
    if kind:
        stmt = stmt.where(models.Product.kind == kind)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(models.Product.created_at.desc()).limit(min(limit, 100)).offset(offset)).all()
    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "kind": r.kind,
                "vendor_id": r.vendor_id,
                "customer_price": str(economy.marketplace_pricing(r.vendor_price)["customer_price"]),
                "currency": r.currency,
                "country": r.country,
                "city": r.city,
                "images": [i for i in (r.images or "").split(",") if i],
            }
            for r in rows
        ],
    }


class DeliveryIn(BaseModel):
    note: str = Field(default="", max_length=2000)


class DisputeIn(BaseModel):
    category: str = Field(pattern="^(not_received|not_as_described|damaged|unauthorised|other)$")
    reason: str = Field(min_length=10, max_length=4000)
    amount_claimed: Decimal | None = None
    evidence: list[str] = Field(default_factory=list)


class DisputeMessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    evidence: list[str] = Field(default_factory=list)


class ResolveIn(BaseModel):
    outcome: str = Field(pattern="^(release_to_seller|refund_buyer|split)$")
    refund_amount: Decimal | None = None
    note: str = Field(min_length=3, max_length=4000)


def _custody_window() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.ESCROW_AUTO_RELEASE_DAYS)


def _ledger_escrow(
    order: models.Order, action: str, amount: Decimal, description: str = "", key: str = ""
) -> None:
    """Record the movement of custodial money. Raises on failure.

    Deliberately not best-effort: custody that the ledger does not know about is
    money nobody can reconcile.
    """
    response = httpx.post(
        f"{LEDGER_URL}/internal/post/escrow",
        json={
            "order_id": order.id,
            "amount": str(amount),
            "action": action,
            "description": description,
            "idempotency_key": key or f"escrow:{action}:{order.id}",
        },
        timeout=10,
    )
    response.raise_for_status()


def _settle(db: OrmSession, order: models.Order, *, vendor_price: Decimal) -> dict:
    """Release custody and post the settlement that recognises the revenue.

    ``vendor_price`` may be below the order's own price when a dispute ended in
    a partial refund: the seller is paid for what the buyer kept, and Kinjy's
    markup — and therefore the sponsor's commission — shrinks with it.
    """
    _ledger_escrow(order, "release", order.customer_price - order.refunded_amount, "buyer confirmed receipt")
    response = httpx.post(
        f"{LEDGER_URL}/internal/post/marketplace-order",
        json={
            "buyer_id": order.buyer_id,
            "vendor_id": order.vendor_id,
            "vendor_price": str(vendor_price),
            "order_id": order.id,
            "idempotency_key": f"order:{order.id}",
        },
        timeout=10,
    )
    response.raise_for_status()
    result = response.json()

    order.status = "part_refunded" if order.refunded_amount > 0 else "settled"
    order.escrow_released_at = datetime.now(timezone.utc)
    order.ledger_journal_id = result["journal"]["id"]
    return result


def _refund(db: OrmSession, order: models.Order, amount: Decimal, reason: str, key: str) -> None:
    """Send money back to the buyer out of custody. Raises on ledger failure.

    ``key`` makes the posting idempotent *per refund*, not per order: keying it
    on the order alone would make a second partial refund a silent no-op that
    still told the buyer their money was on its way.
    """
    _ledger_escrow(order, "refund", amount, reason, key=f"escrow:refund:{key}")
    order.refunded_amount = Decimal(order.refunded_amount or 0) + amount
    try:
        httpx.post(
            f"{PAYMENT_URL}/internal/escrow/refund",
            json={
                "order_id": order.id,
                "buyer_id": order.buyer_id,
                "amount": str(amount),
                "custody_ref": order.custody_ref,
                "reason": reason,
            },
            timeout=10,
        ).raise_for_status()
    except Exception as exc:
        # The ledger already records the refund as owed to the buyer, so the
        # money is not lost — but the rail did not move it, and somebody has to
        # know. Loud, and the order stays disputed until it is chased.
        log.error("refund rail failed for order %s: %s", order.id, exc)
        raise HTTPException(
            status_code=503,
            detail="The refund is recorded but the payment rail did not confirm it. Support has been alerted.",
        )


def _order_out(order: models.Order, viewer_id: str | None = None) -> dict:
    return {
        "id": order.id,
        "role": None
        if viewer_id is None
        else ("buyer" if order.buyer_id == viewer_id else "seller"),
        "product_id": order.product_id,
        "quantity": order.quantity,
        "customer_price": str(order.customer_price),
        "vendor_price": str(order.vendor_price),
        "margin": str(order.margin),
        "refunded_amount": str(order.refunded_amount or 0),
        "status": order.status,
        "custodian": order.custodian,
        "escrow_funded_at": order.escrow_funded_at,
        "delivered_at": order.delivered_at,
        "delivery_note": order.delivery_note,
        "dispute_window_ends": order.dispute_window_ends,
        "escrow_released_at": order.escrow_released_at,
        "created_at": order.created_at,
    }


@app.get("/commerce/escrow/terms", tags=["escrow"])
def escrow_terms():
    """Who holds the money, under what licence, and for how long.

    Public on purpose: a buyer deciding whether to pay a stranger should be able
    to read the custody arrangement without an account.
    """
    return {
        "custodian": settings.CUSTODIAN_NAME,
        "provider": settings.CUSTODIAN_PROVIDER,
        "licence": settings.CUSTODIAN_LICENCE,
        "holds_funds": "the custodian, in a segregated client-money account — not Kinjy",
        "released_when": "the buyer confirms receipt",
        "auto_release_days": settings.ESCROW_AUTO_RELEASE_DAYS,
        "dispute_response_days": settings.DISPUTE_RESPONSE_DAYS,
        "arbitration_days": settings.DISPUTE_ARBITRATION_DAYS,
        "outcomes": ["release_to_seller", "refund_buyer", "split"],
    }


@app.post("/commerce/orders", status_code=201, tags=["marketplace"])
async def create_order(payload: OrderIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Places an order. Nothing is posted to the ledger and nothing reaches the
    seller yet — the next step is payment into the custodian's hands."""
    product = db.get(models.Product, payload.product_id)
    if product is None or product.status != "active":
        raise HTTPException(status_code=404, detail="Product not available")
    if product.vendor_id == principal.user_id:
        raise HTTPException(status_code=400, detail="You cannot buy your own listing")
    if product.stock is not None and product.stock < payload.quantity:
        raise HTTPException(status_code=409, detail="Not enough stock")

    pricing = economy.marketplace_pricing(product.vendor_price * payload.quantity)
    order = models.Order(
        id=new_id("ord"),
        buyer_id=principal.user_id,
        vendor_id=product.vendor_id,
        product_id=product.id,
        quantity=payload.quantity,
        vendor_price=pricing["vendor_price"],
        margin=pricing["margin"],
        customer_price=pricing["customer_price"],
        custodian=settings.CUSTODIAN_PROVIDER,
        status="pending",
    )
    db.add(order)
    if product.stock is not None:
        product.stock -= payload.quantity
    db.commit()

    await events.publish("order.created", {"order_id": order.id, "amount": str(order.customer_price)})
    return {
        "id": order.id,
        "status": order.status,
        "customer_price": str(order.customer_price),
        "custodian": settings.CUSTODIAN_NAME,
        "pay_at": "/api/payments/checkout",
    }


@app.post("/internal/orders/{order_id}/funded", tags=["internal"])
def mark_funded(order_id: str, custody_ref: str | None = None, db: OrmSession = Depends(get_db)):
    """payment-service calls this when the buyer's money reaches the custodian."""
    order = db.get(models.Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "pending":
        return _order_out(order)

    try:
        _ledger_escrow(order, "hold", order.customer_price, "buyer funds received by custodian")
    except httpx.HTTPError as exc:
        log.error("escrow hold posting failed for %s: %s", order_id, exc)
        raise HTTPException(status_code=503, detail="Could not record the escrow hold; retry")

    order.status = "in_escrow"
    order.custody_ref = custody_ref
    order.escrow_funded_at = datetime.now(timezone.utc)
    order.dispute_window_ends = _custody_window()
    db.commit()

    notify(
        order.vendor_id,
        "order_funded",
        "An order is paid and in escrow",
        body="Deliver it, then the buyer confirms and the money is released to you.",
        link=f"/app/orders/{order.id}",
    )
    notify(
        order.buyer_id,
        "order_funded",
        "Your payment is held in escrow",
        body=f"{settings.CUSTODIAN_NAME} is holding it. Confirm receipt to release it to the seller.",
        link=f"/app/orders/{order.id}",
    )
    return _order_out(order)


# Kept for callers written against the old name.
@app.post("/commerce/orders/{order_id}/paid", tags=["internal"])
def mark_paid(order_id: str, db: OrmSession = Depends(get_db)):
    return mark_funded(order_id, None, db)


@app.post("/commerce/orders/{order_id}/delivered", tags=["marketplace"])
def mark_delivered(
    order_id: str, payload: DeliveryIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """The seller says they have delivered. This does **not** release the money.

    Only the buyer's confirmation, or the window expiring, does — otherwise a
    seller could release their own escrow by ticking a box.
    """
    order = db.get(models.Order, order_id)
    if order is None or order.vendor_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ("in_escrow", "delivered"):
        raise HTTPException(status_code=409, detail=f"Order is {order.status}")

    order.status = "delivered"
    order.delivered_at = datetime.now(timezone.utc)
    order.delivery_note = payload.note or None
    db.commit()

    notify(
        order.buyer_id,
        "order_delivered",
        "Your order has been marked delivered",
        body="Confirm receipt to release the payment, or open a dispute if something is wrong.",
        link=f"/app/orders/{order.id}",
    )
    return _order_out(order, principal.user_id)


@app.post("/commerce/orders/{order_id}/confirm-delivery", tags=["marketplace"])
async def confirm_delivery(order_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Buyer confirms receipt -> custody clears -> the ledger settles the split."""
    order = db.get(models.Order, order_id)
    if order is None or order.buyer_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "disputed":
        raise HTTPException(status_code=409, detail="This order is in dispute; resolve the dispute first")
    if order.status not in ("in_escrow", "delivered"):
        raise HTTPException(status_code=409, detail=f"Order is {order.status}, not in escrow")

    try:
        result = _settle(db, order, vendor_price=order.vendor_price)
    except httpx.HTTPError as exc:
        # Leave the order in escrow rather than marking it settled without the
        # ledger entry — a settled order with no journal is unrecoverable.
        log.error("ledger posting failed for order %s: %s", order_id, exc)
        raise HTTPException(status_code=503, detail="Settlement failed; the order stays in escrow. Retry shortly.")
    db.commit()

    notify(
        order.vendor_id,
        "order_settled",
        "Payment released to you",
        body=f"{order.vendor_price} for order {order.id} is now in your wallet.",
        link=f"/app/orders/{order.id}",
    )
    await events.publish("order.settled", {"order_id": order.id, "journal_id": order.ledger_journal_id})
    return {"id": order.id, "status": order.status, "settlement": result}


@app.get("/commerce/orders/me", tags=["marketplace"])
def my_orders(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.Order)
        .where((models.Order.buyer_id == principal.user_id) | (models.Order.vendor_id == principal.user_id))
        .order_by(models.Order.created_at.desc())
    ).all()
    open_disputes = {
        d.order_id: d.id
        for d in db.scalars(
            select(models.Dispute).where(
                models.Dispute.order_id.in_([r.id for r in rows] or [""]),
                models.Dispute.status != "withdrawn",
            )
        ).all()
    }
    return {
        "items": [
            {**_order_out(r, principal.user_id), "dispute_id": open_disputes.get(r.id)} for r in rows
        ]
    }


@app.get("/commerce/orders/{order_id}", tags=["marketplace"])
def get_order(order_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    order = db.get(models.Order, order_id)
    if order is None or principal.user_id not in (order.buyer_id, order.vendor_id):
        raise HTTPException(status_code=404, detail="Order not found")
    dispute = db.scalar(select(models.Dispute).where(models.Dispute.order_id == order_id))
    return {
        **_order_out(order, principal.user_id),
        "custodian_name": settings.CUSTODIAN_NAME,
        "dispute_id": dispute.id if dispute else None,
    }


# ---------------------------------------------------------------------------
# Disputes
# ---------------------------------------------------------------------------

def _dispute_out(dispute: models.Dispute, messages: list[models.DisputeMessage] | None = None) -> dict:
    out = {
        "id": dispute.id,
        "order_id": dispute.order_id,
        "opened_by": dispute.opened_by,
        "against": dispute.against,
        "role": dispute.role,
        "category": dispute.category,
        "reason": dispute.reason,
        "amount_claimed": str(dispute.amount_claimed),
        "status": dispute.status,
        "outcome": dispute.outcome,
        "refund_amount": str(dispute.refund_amount),
        "resolution_note": dispute.resolution_note,
        "respond_by": dispute.respond_by,
        "arbitrate_by": dispute.arbitrate_by,
        "resolved_at": dispute.resolved_at,
        "created_at": dispute.created_at,
    }
    if messages is not None:
        out["messages"] = [
            {
                "author_id": m.author_id,
                "author_role": m.author_role,
                "body": m.body,
                "evidence": [e for e in (m.evidence or "").split("\n") if e],
                "created_at": m.created_at,
            }
            for m in messages
        ]
    return out


def _load_dispute(db: OrmSession, dispute_id: str, user_id: str) -> tuple[models.Dispute, models.Order, str]:
    dispute = db.get(models.Dispute, dispute_id)
    if dispute is None:
        raise HTTPException(status_code=404, detail="Dispute not found")
    order = db.get(models.Order, dispute.order_id)
    if order is None or user_id not in (order.buyer_id, order.vendor_id):
        raise HTTPException(status_code=404, detail="Dispute not found")
    return dispute, order, "buyer" if order.buyer_id == user_id else "seller"


@app.post("/commerce/orders/{order_id}/dispute", status_code=201, tags=["disputes"])
def open_dispute(
    order_id: str, payload: DisputeIn, principal: CurrentUser, db: OrmSession = Depends(get_db)
):
    """Open a case. Either side may; the escrow freezes either way.

    Refused once the money has left custody: after settlement there is nothing
    to hold back, and pretending otherwise would promise a protection that does
    not exist.
    """
    order = db.get(models.Order, order_id)
    if order is None or principal.user_id not in (order.buyer_id, order.vendor_id):
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status in ("settled", "part_refunded", "refunded", "cancelled"):
        raise HTTPException(
            status_code=409,
            detail="This order has already been settled — the funds are no longer in escrow.",
        )
    existing = db.scalar(
        select(models.Dispute).where(
            models.Dispute.order_id == order_id,
            models.Dispute.status.in_(("open", "answered", "arbitration")),
        )
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="A dispute is already open on this order")

    role = "buyer" if order.buyer_id == principal.user_id else "seller"
    against = order.vendor_id if role == "buyer" else order.buyer_id
    claimed = payload.amount_claimed
    if claimed is None:
        claimed = order.customer_price if role == "buyer" else Decimal("0")
    if claimed > order.customer_price:
        raise HTTPException(status_code=400, detail="You cannot claim more than the order is worth")

    now = datetime.now(timezone.utc)
    dispute = models.Dispute(
        id=new_id("dsp"),
        order_id=order.id,
        opened_by=principal.user_id,
        against=against,
        role=role,
        category=payload.category,
        reason=payload.reason,
        amount_claimed=claimed,
        status="open",
        respond_by=now + timedelta(days=settings.DISPUTE_RESPONSE_DAYS),
        arbitrate_by=now + timedelta(days=settings.DISPUTE_ARBITRATION_DAYS),
    )
    db.add(dispute)
    db.add(
        models.DisputeMessage(
            dispute_id=dispute.id,
            author_id=principal.user_id,
            author_role=role,
            body=payload.reason,
            evidence="\n".join(payload.evidence) or None,
        )
    )
    # Freezing the window is the whole point: the auto-release must not fire
    # while a case is open, or the dispute would resolve itself in the seller's
    # favour by running out the clock.
    order.status = "disputed"
    order.dispute_window_ends = None
    db.commit()

    notify(
        against,
        "dispute_opened",
        "A dispute was opened on your order",
        body=f"You have {settings.DISPUTE_RESPONSE_DAYS} days to respond before it goes to arbitration.",
        link=f"/app/disputes/{dispute.id}",
    )
    return _dispute_out(dispute)


@app.get("/commerce/disputes/me", tags=["disputes"])
def my_disputes(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.Dispute)
        .where(
            (models.Dispute.opened_by == principal.user_id)
            | (models.Dispute.against == principal.user_id)
        )
        .order_by(models.Dispute.created_at.desc())
    ).all()
    return {"items": [_dispute_out(d) for d in rows]}


@app.get("/commerce/disputes/{dispute_id}", tags=["disputes"])
def get_dispute(dispute_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    dispute, _order, _role = _load_dispute(db, dispute_id, principal.user_id)
    messages = db.scalars(
        select(models.DisputeMessage)
        .where(models.DisputeMessage.dispute_id == dispute_id)
        .order_by(models.DisputeMessage.created_at)
    ).all()
    return _dispute_out(dispute, messages)


@app.post("/commerce/disputes/{dispute_id}/messages", status_code=201, tags=["disputes"])
def add_dispute_message(
    dispute_id: str,
    payload: DisputeMessageIn,
    principal: CurrentUser,
    db: OrmSession = Depends(get_db),
):
    dispute, _order, role = _load_dispute(db, dispute_id, principal.user_id)
    if dispute.status in ("resolved", "withdrawn"):
        raise HTTPException(status_code=409, detail="This dispute is closed")

    db.add(
        models.DisputeMessage(
            dispute_id=dispute.id,
            author_id=principal.user_id,
            author_role=role,
            body=payload.body,
            evidence="\n".join(payload.evidence) or None,
        )
    )
    # The first answer from the other side moves the case out of "waiting".
    if dispute.status == "open" and principal.user_id == dispute.against:
        dispute.status = "answered"
    db.commit()

    other = dispute.against if principal.user_id == dispute.opened_by else dispute.opened_by
    notify(
        other,
        "dispute_message",
        "New message on your dispute",
        link=f"/app/disputes/{dispute.id}",
    )
    return {"ok": True, "status": dispute.status}


@app.post("/commerce/disputes/{dispute_id}/withdraw", tags=["disputes"])
def withdraw_dispute(dispute_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """The opener drops the case; the escrow clock restarts."""
    dispute, order, _role = _load_dispute(db, dispute_id, principal.user_id)
    if dispute.opened_by != principal.user_id:
        raise HTTPException(status_code=403, detail="Only the member who opened it can withdraw it")
    if dispute.status in ("resolved", "withdrawn"):
        raise HTTPException(status_code=409, detail="This dispute is closed")

    dispute.status = "withdrawn"
    dispute.outcome = "withdrawn"
    dispute.resolved_at = datetime.now(timezone.utc)
    order.status = "delivered" if order.delivered_at else "in_escrow"
    order.dispute_window_ends = _custody_window()
    db.commit()

    notify(dispute.against, "dispute_withdrawn", "A dispute against you was withdrawn",
           link=f"/app/orders/{order.id}")
    return _dispute_out(dispute)


@app.post("/commerce/disputes/{dispute_id}/concede", tags=["disputes"])
def concede_dispute(dispute_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """The other side accepts the claim, and it is settled without arbitration.

    A seller conceding refunds the buyer what was claimed; a buyer conceding
    releases the money to the seller. Either way it resolves in minutes rather
    than days, which is what most cases actually need.
    """
    dispute, order, _role = _load_dispute(db, dispute_id, principal.user_id)
    if principal.user_id != dispute.against:
        raise HTTPException(status_code=403, detail="Only the member the dispute is against can concede")
    if dispute.status in ("resolved", "withdrawn"):
        raise HTTPException(status_code=409, detail="This dispute is closed")

    if dispute.role == "buyer":
        _resolve(db, dispute, order, outcome="refund_buyer" if dispute.amount_claimed >= order.customer_price
                 else "split", refund_amount=dispute.amount_claimed,
                 note="Conceded by the seller.", resolved_by=principal.user_id)
    else:
        _resolve(db, dispute, order, outcome="release_to_seller", refund_amount=Decimal("0"),
                 note="Conceded by the buyer.", resolved_by=principal.user_id)
    db.commit()
    return _dispute_out(dispute)


def _resolve(
    db: OrmSession,
    dispute: models.Dispute,
    order: models.Order,
    *,
    outcome: str,
    refund_amount: Decimal,
    note: str,
    resolved_by: str,
) -> None:
    """Apply an outcome to the money, then close the case.

    The money moves first. Marking a dispute resolved and *then* failing to move
    the funds would leave a closed case over an unsettled escrow, which is the
    one state nobody can recover from the outside.
    """
    refund_amount = Decimal(refund_amount or 0)
    if outcome == "release_to_seller":
        refund_amount = Decimal("0")
    elif outcome == "refund_buyer":
        refund_amount = order.customer_price - Decimal(order.refunded_amount or 0)
    if refund_amount < 0 or refund_amount > order.customer_price - Decimal(order.refunded_amount or 0):
        raise HTTPException(status_code=400, detail="The refund cannot exceed what is still held in escrow")

    if refund_amount > 0:
        _refund(db, order, refund_amount, f"dispute {dispute.id}: {outcome}", key=dispute.id)

    if outcome == "refund_buyer":
        # The refund above already cleared custody. Nothing reaches the seller,
        # so no revenue is recognised and no commission accrues: there was no
        # completed sale to earn one on.
        order.status = "refunded"
        order.escrow_released_at = datetime.now(timezone.utc)
    else:
        # What the buyer kept still carries the markup, so the seller's price
        # and Kinjy's revenue shrink together — the sponsor's commission with
        # them. Paying a full commission on a partly refunded order would pay
        # out of money that went back to the buyer.
        kept = order.customer_price - Decimal(order.refunded_amount or 0)
        markup = Decimal("1") + settings.MARKETPLACE_MARKUP_PCT / Decimal("100")
        vendor_price = economy.money(kept / markup)
        try:
            _settle(db, order, vendor_price=vendor_price)
        except httpx.HTTPError as exc:
            log.error("settlement after dispute %s failed: %s", dispute.id, exc)
            raise HTTPException(status_code=503, detail="Could not settle the order; the case stays open")

    dispute.status = "resolved"
    dispute.outcome = outcome
    dispute.refund_amount = refund_amount
    dispute.resolution_note = note
    dispute.resolved_by = resolved_by
    dispute.resolved_at = datetime.now(timezone.utc)

    notify_many(
        [order.buyer_id, order.vendor_id],
        "dispute_resolved",
        "Your dispute has been resolved",
        body=note,
        link=f"/app/orders/{order.id}",
    )


@app.get("/admin/disputes", tags=["disputes"])
def admin_disputes(
    _: AdminUser, status: str | None = None, limit: int = 50, db: OrmSession = Depends(get_db)
):
    stmt = select(models.Dispute).order_by(models.Dispute.created_at)
    if status:
        stmt = stmt.where(models.Dispute.status == status)
    rows = db.scalars(stmt.limit(min(limit, 200))).all()
    return {"items": [_dispute_out(d) for d in rows]}


@app.get("/admin/disputes/{dispute_id}", tags=["disputes"])
def admin_dispute(dispute_id: str, _: AdminUser, db: OrmSession = Depends(get_db)):
    dispute = db.get(models.Dispute, dispute_id)
    if dispute is None:
        raise HTTPException(status_code=404, detail="Dispute not found")
    messages = db.scalars(
        select(models.DisputeMessage)
        .where(models.DisputeMessage.dispute_id == dispute_id)
        .order_by(models.DisputeMessage.created_at)
    ).all()
    order = db.get(models.Order, dispute.order_id)
    return {
        **_dispute_out(dispute, messages),
        "order": _order_out(order) if order else None,
    }


@app.post("/admin/disputes/{dispute_id}/resolve", tags=["disputes"])
def resolve_dispute(
    dispute_id: str, payload: ResolveIn, admin: AdminUser, db: OrmSession = Depends(get_db)
):
    """Kinjy arbitrates. The note is mandatory and is shown to both parties."""
    dispute = db.get(models.Dispute, dispute_id)
    if dispute is None:
        raise HTTPException(status_code=404, detail="Dispute not found")
    if dispute.status in ("resolved", "withdrawn"):
        raise HTTPException(status_code=409, detail="This dispute is closed")
    order = db.get(models.Order, dispute.order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if payload.outcome == "split" and payload.refund_amount is None:
        raise HTTPException(status_code=400, detail="A split outcome needs a refund amount")

    _resolve(
        db,
        dispute,
        order,
        outcome=payload.outcome,
        refund_amount=payload.refund_amount or Decimal("0"),
        note=payload.note,
        resolved_by=admin.user_id,
    )
    db.commit()
    return _dispute_out(dispute)


@app.post("/internal/escrow/sweep", tags=["internal"])
def escrow_sweep(db: OrmSession = Depends(get_db)):
    """Release escrows whose window closed, and escalate silent disputes.

    Idempotent and safe to run on a schedule. A buyer who neither confirms nor
    disputes must not strand the seller's money forever, and a seller who never
    answers a dispute must not stall it forever either.
    """
    now = datetime.now(timezone.utc)
    released, escalated, failed = [], [], []

    due = db.scalars(
        select(models.Order).where(
            models.Order.status.in_(("in_escrow", "delivered")),
            models.Order.dispute_window_ends.is_not(None),
            models.Order.dispute_window_ends <= now,
        )
    ).all()
    for order in due:
        try:
            _settle(db, order, vendor_price=order.vendor_price)
            db.commit()
            released.append(order.id)
            notify(
                order.vendor_id,
                "order_settled",
                "Payment released to you",
                body="The buyer's confirmation window closed with no dispute.",
                link=f"/app/orders/{order.id}",
            )
        except Exception as exc:
            db.rollback()
            log.error("auto-release failed for %s: %s", order.id, exc)
            failed.append(order.id)

    stale = db.scalars(
        select(models.Dispute).where(
            models.Dispute.status == "open",
            models.Dispute.respond_by.is_not(None),
            models.Dispute.respond_by <= now,
        )
    ).all()
    for dispute in stale:
        dispute.status = "arbitration"
        escalated.append(dispute.id)
        notify_many(
            [dispute.opened_by, dispute.against],
            "dispute_arbitration",
            "A dispute has gone to Kinjy arbitration",
            body="The response deadline passed. Kinjy will decide the outcome.",
            link=f"/app/disputes/{dispute.id}",
        )
    db.commit()

    return {
        "released": released,
        "escalated": escalated,
        "failed": failed,
        "checked_at": now,
    }


# --- advertising -----------------------------------------------------------

@app.get("/ads/rate-card", tags=["ads"])
def rate_card():
    return {
        "floors": models.AD_FLOORS,
        "currency": "USD",
        "note": "Floors are minimums for the auction. The AI adjusts bids upward by demand, never below the floor.",
        "sponsorships": {
            "country": "by auction",
            "global": "by auction",
        },
    }


@app.post("/ads/campaigns", status_code=201, tags=["ads"])
def create_campaign(payload: CampaignIn, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    floor = models.AD_FLOORS.get(payload.pricing_model)
    if floor is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown pricing model. Available: {', '.join(models.AD_FLOORS)}",
        )
    if payload.bid < Decimal(floor):
        raise HTTPException(status_code=400, detail=f"Bid is below the {payload.pricing_model} floor of ${floor}")

    campaign = models.Campaign(
        id=new_id("cmp"), advertiser_id=principal.user_id, status="draft", **payload.model_dump()
    )
    db.add(campaign)
    db.commit()
    return {"id": campaign.id, "status": campaign.status, "floor": floor}


@app.post("/ads/campaigns/{campaign_id}/submit", tags=["ads"])
def submit_campaign(campaign_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    campaign = db.get(models.Campaign, campaign_id)
    if campaign is None or campaign.advertiser_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if not campaign.creative_headline:
        raise HTTPException(status_code=400, detail="A campaign needs a creative before review")
    campaign.status = "pending_approval"
    db.commit()
    return {"id": campaign_id, "status": campaign.status}


@app.post("/admin/ads/campaigns/{campaign_id}/approve", tags=["ads"])
async def approve_campaign(campaign_id: str, admin: AdminUser, db: OrmSession = Depends(get_db)):
    """Human approval before launch — required even when the AI wrote everything."""
    campaign = db.get(models.Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = "active"
    campaign.approved_by = admin.user_id
    db.commit()

    # The advertiser's spend is Kinjy revenue: their own sponsor is paid the
    # direct commission on it, and the Leaders pool takes its share.
    try:
        httpx.post(
            f"{LEDGER_URL}/internal/post/ad-purchase",
            json={
                "advertiser_id": campaign.advertiser_id,
                "amount": str(campaign.budget),
                "campaign_id": campaign.id,
                "idempotency_key": f"campaign:{campaign.id}",
            },
            timeout=10,
        ).raise_for_status()
    except Exception as exc:
        log.error("ad purchase posting failed for %s: %s", campaign_id, exc)
        raise HTTPException(status_code=503, detail="Campaign approved but the ledger posting failed; retry")

    await events.publish("ad.purchased", {"campaign_id": campaign.id, "amount": str(campaign.budget)})
    return {"id": campaign_id, "status": campaign.status}


@app.get("/ads/campaigns/me", tags=["ads"])
def my_campaigns(principal: CurrentUser, db: OrmSession = Depends(get_db)):
    rows = db.scalars(
        select(models.Campaign).where(models.Campaign.advertiser_id == principal.user_id)
    ).all()
    return {
        "items": [
            {
                "id": r.id,
                "name": r.name,
                "objective": r.objective,
                "pricing_model": r.pricing_model,
                "bid": str(r.bid),
                "budget": str(r.budget),
                "spent": str(r.spent),
                "status": r.status,
                "ai_generated": r.ai_generated,
            }
            for r in rows
        ]
    }
