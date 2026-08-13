"""Auth router — register, login, logout, me.

All endpoints are stateless; the only state is the demo user seeded at
startup. Tokens are JWTs signed with the configured secret.
"""

import hashlib
import secrets
from datetime import datetime, timezone

import sqlite3
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import create_token, get_current_user
from app.db import get_connection
from app.models import User
from app.schemas import AuthOut, LoginIn, RegisterIn, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return hashlib.sha256(("route53-clone::" + password).encode()).hexdigest()


@router.post("/register", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn):
    user_id = secrets.token_hex(8)
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO users (id, email, display_name, password_hash, created_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (
                    user_id,
                    body.email,
                    body.display_name,
                    hash_password(body.password),
                    now,
                ),
            )
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
    user = User(
        id=user_id,
        email=body.email,
        display_name=body.display_name,
        created_at=now,
    )
    return AuthOut(
        user=UserOut(id=user.id, email=user.email, display_name=user.display_name),
        token=create_token(user),
    )


@router.post("/login", response_model=AuthOut)
def login(body: LoginIn):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, display_name, created_at FROM users "
            "WHERE email = ? AND password_hash = ?",
            (body.email, hash_password(body.password)),
        ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    user = User(
        id=row["id"],
        email=row["email"],
        display_name=row["display_name"],
        created_at=row["created_at"],
    )
    return AuthOut(
        user=UserOut(id=user.id, email=user.email, display_name=user.display_name),
        token=create_token(user),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> None:
    return None


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut(id=user.id, email=user.email, display_name=user.display_name)