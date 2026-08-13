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
