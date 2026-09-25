"""Inter-service event bus (RabbitMQ topic exchange ``kaluta.events``).

Services publish facts, never commands: ``user.registered``, ``post.published``,
``ad.purchased``, ``order.settled``. The ledger and the AI layer subscribe.

Publishing is best-effort and never blocks a request: if the broker is down the
event is logged and dropped rather than failing the caller's write. Anything
that must not be lost (money) goes through the ledger's own outbox table.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

import aio_pika

from common import settings

log = logging.getLogger(__name__)

EXCHANGE = "kaluta.events"

_connection: aio_pika.RobustConnection | None = None
_exchange: aio_pika.abc.AbstractExchange | None = None
_lock = asyncio.Lock()


async def _ensure() -> aio_pika.abc.AbstractExchange | None:
    global _connection, _exchange
    if _exchange is not None:
        return _exchange
    async with _lock:
        if _exchange is not None:
            return _exchange
        try:
            _connection = await aio_pika.connect_robust(settings.RABBITMQ_URL, timeout=5)
            channel = await _connection.channel()
            _exchange = await channel.declare_exchange(
                EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
            )
        except Exception as exc:  # broker not up yet — degrade quietly
            log.warning("event bus unavailable (%s); events will be dropped", exc)
            return None
    return _exchange


async def publish(routing_key: str, payload: dict[str, Any]) -> bool:
    """Publish an event. Returns False when it could not be delivered."""
    exchange = await _ensure()
    body = {
        "event": routing_key,
        "source": settings.SERVICE_NAME,
        "emitted_at": datetime.now(timezone.utc).isoformat(),
        "data": payload,
    }
    if exchange is None:
        log.info("event dropped %s %s", routing_key, payload)
        return False
    try:
        await exchange.publish(
            aio_pika.Message(
                body=json.dumps(body, default=str).encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=routing_key,
        )
        return True
    except Exception as exc:
        log.warning("event publish failed %s: %s", routing_key, exc)
        return False


async def subscribe(queue_name: str, routing_keys: list[str], handler) -> None:
    """Bind ``queue_name`` to the given routing keys and run ``handler(body)``."""
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=16)
    exchange = await channel.declare_exchange(EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True)
    queue = await channel.declare_queue(queue_name, durable=True)
    for key in routing_keys:
        await queue.bind(exchange, routing_key=key)

    async with queue.iterator() as it:
        async for message in it:
            async with message.process():
                try:
                    await handler(json.loads(message.body))
                except Exception:
                    log.exception("event handler failed for %s", message.routing_key)


async def close() -> None:
    global _connection, _exchange
    if _connection is not None:
        await _connection.close()
    _connection = None
    _exchange = None
