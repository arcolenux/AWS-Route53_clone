"""Pydantic request/response schemas.

These are the API boundary — everything crossing the HTTP edge is validated
here, keeping validation logic out of the routers.
"""

from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------
class UserOut(BaseModel):
    id: str
    email: EmailStr
    display_name: str


class RegisterIn(BaseModel):
    email: EmailStr
    display_name: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    user: UserOut
    token: str


# --------------------------------------------------------------------------
# Hosted Zones
# --------------------------------------------------------------------------
class HostedZoneIn(BaseModel):
    name: str = Field(..., max_length=253)
    private: bool = False
    description: Optional[str] = Field(default=None, max_length=255)


class HostedZoneUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=253)
    description: Optional[str] = Field(default=None, max_length=255)


class HostedZoneOut(BaseModel):
    id: str
    name: str
    private: bool
    description: Optional[str]
    created_at: str
    updated_at: str
    record_count: int = 0


class HostedZoneList(BaseModel):
    items: List[HostedZoneOut]
    total: int
    page: int
    page_size: int


# --------------------------------------------------------------------------
# DNS Records
# --------------------------------------------------------------------------
RECORD_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"]


class DNSRecordIn(BaseModel):
    name: str = Field(..., max_length=253)
    type: str
    ttl: int = Field(default=300, ge=0, le=2147483647)
    values: List[str]
    comment: Optional[str] = Field(default=None, max_length=255)


class DNSRecordUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=253)
    ttl: Optional[int] = Field(default=None, ge=0, le=2147483647)
    values: Optional[List[str]] = None
    comment: Optional[str] = Field(default=None, max_length=255)


class DNSRecordOut(BaseModel):
    id: str
    zone_id: str
    name: str
    type: str
    ttl: int
    values: List[str]
    comment: Optional[str]
    created_at: str
    updated_at: str


class DNSRecordList(BaseModel):
    items: List[DNSRecordOut]
    total: int
    page: int
    page_size: int
