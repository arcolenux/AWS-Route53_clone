"""Hosted zones router — CRUD + search + pagination."""

import re
import secrets
import sqlite3
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.db import get_connection
from app.models import User
from app.schemas import HostedZoneIn, HostedZoneList, HostedZoneOut, HostedZoneUpdate

router = APIRouter(prefix="/api/hosted-zones", tags=["hosted-zones"])

# Domain regex: labels of alnum + hyphen, then TLD of letters, optional trailing "."
# Allows leading "*." for wildcards.
_DOMAIN_RE = re.compile(
    r"^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.?$"
)


def _row_to_zone(row, record_count: int = 0) -> HostedZoneOut:
    return HostedZoneOut(
        id=row["id"],
        name=row["name"],
        private=bool(row["private"]),
        description=row["description"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        record_count=record_count,
    )


def _count_records(zone_id: str) -> int:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS c FROM dns_records WHERE zone_id = ?", (zone_id,)
        ).fetchone()
        return int(row["c"])


def _validate_domain(name: str) -> None:
    if not _DOMAIN_RE.match(name) or name == ".":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid hosted zone name",
        )


@router.get("", response_model=HostedZoneList)
def list_zones(
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    _: User = Depends(get_current_user),
):
    sql = "SELECT * FROM hosted_zones"
    params = []
    if search:
        sql += " WHERE name LIKE ? OR COALESCE(description, '') LIKE ?"
        like = f"%{search}%"
        params.extend([like, like])
    sql += " ORDER BY name COLLATE NOCASE"
    offset = (page - 1) * page_size
    sql += " LIMIT ? OFFSET ?"
    params.extend([page_size, offset])

    with get_connection() as conn:
        total = conn.execute(
            "SELECT COUNT(*) AS c FROM hosted_zones"
            + (" WHERE name LIKE ? OR COALESCE(description, '') LIKE ?" if search else ""),
            [f"%{search}%", f"%{search}%"] if search else [],
        ).fetchone()["c"]
        rows = conn.execute(sql, params).fetchall()

    items = [_row_to_zone(r, _count_records(r["id"])) for r in rows]
    return HostedZoneList(items=items, total=int(total), page=page, page_size=page_size)


@router.post("", response_model=HostedZoneOut, status_code=status.HTTP_201_CREATED)
def create_zone(body: HostedZoneIn, _: User = Depends(get_current_user)):
    _validate_domain(body.name)
    zone_id = secrets.token_hex(8)
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO hosted_zones (id, name, private, description, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (zone_id, body.name, int(body.private), body.description, now, now),
            )
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A hosted zone with this name already exists",
        )
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM hosted_zones WHERE id = ?", (zone_id,)).fetchone()
    return _row_to_zone(row)


@router.get("/{zone_id}", response_model=HostedZoneOut)
def get_zone(zone_id: str, _: User = Depends(get_current_user)):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM hosted_zones WHERE id = ?", (zone_id,)).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Hosted zone not found"
        )
    return _row_to_zone(row, _count_records(zone_id))


@router.put("/{zone_id}", response_model=HostedZoneOut)
def update_zone(zone_id: str, body: HostedZoneUpdate, _: User = Depends(get_current_user)):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM hosted_zones WHERE id = ?", (zone_id,)).fetchone()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Hosted zone not found"
            )
        new_name = body.name if body.name is not None else row["name"]
        if body.name is not None:
            _validate_domain(new_name)
        new_desc = body.description if body.description is not None else row["description"]
        now = datetime.now(timezone.utc).isoformat()
        try:
            conn.execute(
                "UPDATE hosted_zones SET name = ?, description = ?, updated_at = ? WHERE id = ?",
                (new_name, new_desc, now, zone_id),
            )
            row = conn.execute("SELECT * FROM hosted_zones WHERE id = ?", (zone_id,)).fetchone()
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A hosted zone with this name already exists",
            )
    return _row_to_zone(row, _count_records(zone_id))


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(zone_id: str, _: User = Depends(get_current_user)):
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM hosted_zones WHERE id = ?", (zone_id,))
        if cur.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Hosted zone not found"
            )
    return None