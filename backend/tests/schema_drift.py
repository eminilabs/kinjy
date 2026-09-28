"""Find columns that exist in a model and not in the database.

create_all only ever creates missing *tables*. A column added to a model after
that table first existed is invisible to it, so the service boots happily and
then throws UndefinedColumn on the first query that touches the new field — and
because that query is often inside an internal endpoint, the symptom surfaces
somewhere else entirely as "could not verify permission".

Run this after adding any column, and before any deploy:

    python backend/tests/schema_drift.py
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# service directory -> postgres schema name
SERVICES = {
    "auth-service": "auth",
    "user-service": "users",
    "social-service": "social",
    "community-service": "community",
    "family-service": "family",
    "memorial-service": "memorial",
    "messaging-service": "messaging",
    "creator-service": "creator",
    "commerce-service": "commerce",
    "ledger-service": "ledger",
    "payment-service": "payment",
    "media-service": "media",
    "ai-service": "ai",
}

COMPOSE = ["docker", "compose", "exec", "-T", "postgres", "psql", "-U", "kaluta", "-d", "kaluta"]


def live_columns() -> dict[tuple[str, str], set[str]]:
    out = subprocess.run(
        COMPOSE + ["-t", "-A", "-F", "|", "-c",
                   "SELECT table_schema, table_name, column_name FROM information_schema.columns"],
        capture_output=True, text=True, cwd=ROOT.parent,
    )
    if out.returncode != 0:
        print("could not read the database:", out.stderr.strip()[:200])
        sys.exit(2)
    table: dict[tuple[str, str], set[str]] = {}
    for line in out.stdout.splitlines():
        parts = line.strip().split("|")
        if len(parts) != 3:
            continue
        schema, name, column = parts
        table.setdefault((schema, name), set()).add(column)
    return table


def model_columns(path: Path) -> dict[str, set[str]]:
    """Parse __tablename__ and Mapped[...] declarations out of a models file.

    Regex rather than importing the module: importing pulls in the whole
    service, its settings and a database connection, and this has to run
    without any of that.
    """
    src = path.read_text(encoding="utf-8")
    tables: dict[str, set[str]] = {}
    current: str | None = None
    for line in src.splitlines():
        m = re.match(r'\s+__tablename__\s*=\s*"([^"]+)"', line)
        if m:
            current = m.group(1)
            tables.setdefault(current, set())
            continue
        if current:
            c = re.match(r"\s{4}(\w+):\s*Mapped\[", line)
            if c:
                # relationship() declares an ORM association, not a column.
                # Counting them as drift would report every model that has one.
                if "relationship(" not in line:
                    tables[current].add(c.group(1))
            elif re.match(r"^class \w+", line):
                current = None
    return tables


def main() -> int:
    live = live_columns()
    drift = []
    for service, schema in SERVICES.items():
        models_path = ROOT / service / "models.py"
        if not models_path.exists():
            continue
        for table, columns in model_columns(models_path).items():
            have = live.get((schema, table))
            if have is None:
                continue  # table not created yet; create_all will make it
            missing = sorted(columns - have)
            if missing:
                drift.append((service, f"{schema}.{table}", missing))

    if not drift:
        print("no drift: every modelled column exists in the database")
        return 0

    print("SCHEMA DRIFT — these columns are in a model and not in the database:\n")
    for service, table, missing in drift:
        print(f"  {service:<20} {table}")
        for column in missing:
            print(f"      {column}")
        print(f'      ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {missing[0]} ...;')
        print()
    print("Add them to that service's MIGRATIONS list; create_all will not.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
