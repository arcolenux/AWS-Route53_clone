"""DNS records router — CRUD + search + filter + pagination with per-type validation."""

import re
import secrets
import sqlite3
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.db import get_connection
from app.models import User
from app.schemas import (
    DNSRecordIn,
    DNSRecordList,
    DNSRecordOut,
    DNSRecordUpdate,
    RECORD_TYPES,
)

router = APIRouter(prefix="/api/hosted-zones/{zone_id}/records", tags=["dns-records"])


_SIMPLE_REGEX = {
    "A": r"^\d{1,3}(\.\d{1,3}){3}$",
    "AAAA": r"^[0-9a-fA-F:]+$",
    "CNAME": r"^[\w\-.*]+\.?$",
    "NS": r"^[\w\-.*]+\.?$",
    "PTR": r"^[\w\-.*]+\.?$",
    "CAA": r"^\d+\s(issue|issuewild|iodef)\s[\'\"]\S+[\'\"]$",
}


def _validate_record(name, rtype, ttl, values, zone_name):
    """Validate record based on type. Raises HTTPException on failure."""
    if rtype not in RECORD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported record type: {rtype}",
        )
    if not values or any(not v.strip() for v in values):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one non-empty value is required",
        )
    if rtype in ("CNAME", "NS") and len(values) != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{rtype} records require exactly one value",
        )
    if rtype == "MX":
        for v in values:
            parts = v.split()
            if len(parts) != 2 or not parts[0].isdigit():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid MX value: {v}",
                )
    if rtype == "SRV":
        for v in values:
            parts = v.split()
            if len(parts) != 4 or not all(p.isdigit() for p in parts[:3]):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid SRV value: {v}",
                )
    if rtype == "TXT":
        for v in values:
            if len(v) > 255:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="TXT record value exceeds 255 characters",
                )
    if rtype in _SIMPLE_REGEX:
        for v in values:
            if not re.match(_SIMPLE_REGEX[rtype], v.strip()):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid {rtype} value: {v}",
                )


def _row_to_record(row) -> DNSRecordOut:
    return DNSRecordOut(
        id=row["id"],
        zone_id=row["zone_id"],
        name=row["name"],
        type=row["type"],
        ttl=row["ttl"],
        values=[v for v in row["value"].split("\n") if v != ""],
        comment=row["comment"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _get_zone_or_404(conn, zone_id):
    row = conn.execute(
        "SELECT * FROM hosted_zones WHERE id = ?", (zone_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Hosted zone not found"
        )
    return row


@router.get("", response_model=DNSRecordList)
def list_records(
    zone_id: str,
    search: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    _: User = Depends(get_current_user),
):
    with get_connection() as conn:
        _get_zone_or_404(conn, zone_id)
        where = ["zone_id = ?"]
        params = [zone_id]
        if search:
            where.append("(name LIKE ? OR value LIKE ?)")
            like = f"%{search}%"
            params.extend([like, like])
        if type:
            where.append("type = ?")
            params.append(type)
        total = conn.execute(
            f"SELECT COUNT(*) AS c FROM dns_records WHERE {' AND '.join(where)}",
            params,
        ).fetchone()["c"]
        rows = conn.execute(
            f"SELECT * FROM dns_records WHERE {' AND '.join(where)} ORDER BY type, name COLLATE NOCASE "
            f"LIMIT ? OFFSET ?",
            params + [page_size, (page - 1) * page_size],
        ).fetchall()
    return DNSRecordList(
        items=[_row_to_record(r) for r in rows], total=int(total), page=page, page_size=page_size
    )


@router.post("", response_model=DNSRecordOut, status_code=status.HTTP_201_CREATED)
def create_record(zone_id: str, body: DNSRecordIn, _: User = Depends(get_current_user)):
    with get_connection() as conn:
        zone = _get_zone_or_404(conn, zone_id)
        _validate_record(body.name, body.type, body.ttl, body.values, zone["name"])
        record_id = secrets.token_hex(8)
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO dns_records (id, zone_id, name, type, ttl, value, comment, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                record_id,
                zone_id,
                body.name,
                body.type,
                body.ttl,
                "\n".join(body.values),
                body.comment,
                now,
                now,
            ),
        )
        row = conn.execute(
            "SELECT * FROM dns_records WHERE id = ?", (record_id,)
        ).fetchone()
    return _row_to_record(row)


@router.get("/{record_id}", response_model=DNSRecordOut)
def get_record(zone_id: str, record_id: str, _: User = Depends(get_current_user)):
    with get_connection() as conn:
        _get_zone_or_404(conn, zone_id)
        row = conn.execute(
            "SELECT * FROM dns_records WHERE id = ? AND zone_id = ?",
            (record_id, zone_id),
        ).fetchone()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="DNS record not found"
            )
    return _row_to_record(row)


@router.put("/{record_id}", response_model=DNSRecordOut)
def update_record(
    zone_id: str, record_id: str, body: DNSRecordUpdate, _: User = Depends(get_current_user)
):
    with get_connection() as conn:
        zone = _get_zone_or_404(conn, zone_id)
        row = conn.execute(
            "SELECT * FROM dns_records WHERE id = ? AND zone_id = ?",
            (record_id, zone_id),
        ).fetchone()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="DNS record not found"
            )
        new_name = body.name if body.name is not None else row["name"]
        new_ttl = body.ttl if body.ttl is not None else row["ttl"]
        new_values = body.values if body.values is not None else [
            v for v in row["value"].split("\n") if v
        ]
        new_comment = body.comment if body.comment is not None else row["comment"]
        _validate_record(new_name, row["type"], new_ttl, new_values, zone["name"])
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "UPDATE dns_records SET name = ?, ttl = ?, value = ?, comment = ?, updated_at = ? WHERE id = ?",
            (new_name, new_ttl, "\n".join(new_values), new_comment, now, record_id),
        )
        row = conn.execute(
            "SELECT * FROM dns_records WHERE id = ?", (record_id,)
        ).fetchone()
    return _row_to_record(row)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(zone_id: str, record_id: str, _: User = Depends(get_current_user)):
    with get_connection() as conn:
        _get_zone_or_404(conn, zone_id)
        cur = conn.execute(
            "DELETE FROM dns_records WHERE id = ? AND zone_id = ?",
            (record_id, zone_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="DNS record not found"
            )
    return None