"""Domain dataclasses.

These are lightweight domain models used internally; API serialization is
handled by the Pydantic schemas in ``app.schemas``.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class User:
    id: str
    email: str
    display_name: str
    created_at: str


@dataclass
class HostedZone:
    id: str
    name: str
    private: bool
    description: Optional[str]
    created_at: str
    updated_at: str
    record_count: int = 0


@dataclass
class DNSRecord:
    id: str
    zone_id: str
    name: str
    type: str
    ttl: int
    values: list
    comment: Optional[str]
    created_at: str
    updated_at: str
