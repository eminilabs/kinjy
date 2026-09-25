"""SQLAlchemy engine/session shared by every service.

All services talk to one Postgres instance but each owns its own schema, so a
service can never accidentally write another service's tables through the ORM.
"""
from __future__ import annotations

import logging
from typing import Iterator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from common import settings

log = logging.getLogger(__name__)

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
    connect_args={
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
        "connect_timeout": 30,
    },
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base. Each service sets ``__table_args__ = {"schema": ...}``
    via :func:`schema_args` so its tables live in a dedicated namespace."""


def schema_args(schema: str, *args) -> tuple:
    """Helper for ``__table_args__``: ``schema_args("auth", UniqueConstraint(...))``."""
    return (*args, {"schema": schema})


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a session that is always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_schema(schema: str) -> None:
    """Create the service's schema if it does not exist yet."""
    with engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))


def create_all(schema: str) -> None:
    """Create the schema then every table declared on ``Base``.

    Note: ``create_all`` only creates *missing tables* — it never adds a column
    to an existing table. Any column added after the first boot needs a real
    migration; see backend/migrations.
    """
    init_schema(schema)
    Base.metadata.create_all(bind=engine)
    log.info("schema %s ready (%d tables)", schema, len(Base.metadata.tables))
