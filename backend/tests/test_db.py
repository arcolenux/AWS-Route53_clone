"""Database layer tests."""

import os
import sqlite3

from app.db import get_connection, init_db
from app.core.config import settings


def test_init_db_creates_tables(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "database_path", str(tmp_path / "test.db"))
    init_db()
    with get_connection() as conn:
        tables = {
            r["name"]
            for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        }
    assert {"users", "hosted_zones", "dns_records"} <= tables


def test_foreign_key_cascade(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "database_path", str(tmp_path / "cascade.db"))
    init_db()
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO hosted_zones (id, name, private, description, created_at, updated_at) "
            "VALUES ('z1', 'example.com', 0, NULL, ?, ?)",
            (now, now),
        )
        conn.execute(
            "INSERT INTO dns_records (id, zone_id, name, type, ttl, value, comment, created_at, updated_at) "
            "VALUES ('r1', 'z1', 'www', 'A', 300, '1.2.3.4', NULL, ?, ?)",
            (now, now),
        )
        conn.execute("DELETE FROM hosted_zones WHERE id = 'z1'")
        orphan = conn.execute(
            "SELECT COUNT(*) AS c FROM dns_records WHERE zone_id = 'z1'"
        ).fetchone()
    assert orphan["c"] == 0
