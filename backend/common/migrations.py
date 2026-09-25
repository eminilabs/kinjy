"""Idempotent schema migrations, run at service startup.

``create_all`` only ever creates *missing tables*. It never adds a column to a
table that already exists, so any column introduced after the first deploy is
invisible on a live database — the service boots happily and then fails on the
first insert. That is the gap this module closes.

The contract for every statement passed here:

* **Idempotent.** It runs on every boot, of every replica. ``IF NOT EXISTS``,
  or a ``DO $$ ... IF EXISTS ... $$`` guard around anything that has no such
  clause (``ALTER COLUMN`` in particular).
* **Additive.** Add a column, relax a constraint, backfill. Never drop a column
  holding data anyone might still want to read: a deployment that loses history
  cannot be rolled back.

Failures are logged and skipped rather than fatal. A service that refuses to
boot because one migration is unhappy is worse than a service that starts and
tells you which statement needs attention.
"""
from __future__ import annotations

import logging

from sqlalchemy import text

from common.database import engine

log = logging.getLogger("kaluta.migrations")


def run(statements: list[str], *, service: str = "") -> None:
    if not statements:
        return
    applied = 0
    for statement in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(statement))
            applied += 1
        except Exception as exc:
            log.error("migration failed (%s): %s\n  statement: %s", service, exc, statement.strip()[:200])
    log.info("migrations: %d/%d applied (%s)", applied, len(statements), service or "service")


def column_nullable(schema: str, table: str, column: str) -> str:
    """Drop NOT NULL from a column that may or may not exist any more.

    Used when a column leaves the model but survives in the database: rows
    already written keep their history, and new inserts that no longer mention
    the column do not trip over its NOT NULL.
    """
    return f"""
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = '{schema}' AND table_name = '{table}' AND column_name = '{column}'
        ) THEN
            EXECUTE 'ALTER TABLE {schema}.{table} ALTER COLUMN {column} DROP NOT NULL';
        END IF;
    END $$;
    """
