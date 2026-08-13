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
