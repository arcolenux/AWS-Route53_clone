"""SQLite access layer.

A single shared connection factory keeps the schema in one place. All
statements are parameterized to avoid SQL injection. Foreign keys are enabled
per-connection so ON DELETE CASCADE behaves as expected.
"""

import sqlite3
from contextlib import contextmanager

from app.core.config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hosted_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    private INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dns_records (
    id TEXT PRIMARY KEY,
    zone_id TEXT NOT NULL REFERENCES hosted_zones(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('A','AAAA','CNAME','TXT','MX','NS','PTR','SRV','CAA')),
    ttl INTEGER NOT NULL DEFAULT 300,
    value TEXT NOT NULL,
    comment TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_zones_name ON hosted_zones(name);
CREATE INDEX IF NOT EXISTS idx_records_zone ON dns_records(zone_id);
"""


@contextmanager
def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.database_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(SCHEMA)
