"""Authentication helpers: stateless JWT sessions + the auth dependency.

This is intentionally a *mocked* authentication layer (the assignment says
IAM/accounts can be mocked). Tokens are signed with the app secret key and
carry the user id as the subject; there is no real AWS IAM integration.
"""

from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Header, HTTPException, status

from app.core.config import settings
from app.db import get_connection
from app.models import User

ALGORITHM = "HS256"


def create_token(user: User) -> str:
    payload = {
        "sub": user.id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.token_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )


def get_current_user(authorization: str = Header(default="")) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    payload = decode_token(authorization[7:].strip())
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, display_name, created_at FROM users WHERE id = ?",
            (payload["sub"],),
        ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session user no longer exists",
        )
    return User(
        id=row["id"],
        email=row["email"],
        display_name=row["display_name"],
        created_at=row["created_at"],
    )