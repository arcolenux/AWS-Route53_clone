"""Route 53 Clone API entrypoint.

``app`` is the ASGI application served by uvicorn. ``create_app`` is a factory
used by tests so each suite can build an isolated app.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import create_token
from app.core.config import settings
from app.db import get_connection, init_db
from app.routers import auth, hosted_zones, dns_records
from app.schemas import UserOut


def seed_demo_user() -> None:
    """Create the demo account used by the sign-in page."""
    from datetime import datetime, timezone

    import hashlib

    with get_connection() as conn:
        exists = conn.execute(
            "SELECT id FROM users WHERE id = 'demo' OR email = 'demo@route53.example'"
        ).fetchone()
        if exists:
            return
        conn.execute(
            "INSERT OR IGNORE INTO users (id, email, display_name, password_hash, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                "demo",
                "demo@route53.example",
                "Demo User",
                hashlib.sha256(
                    ("route53-clone::" + settings.seed_password).encode()
                ).hexdigest(),
                datetime.now(timezone.utc).isoformat(),
            ),
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    seed_demo_user()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="AWS Route53 Clone API",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # relaxed for local dev; tightened in deployment
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(hosted_zones.router)
    app.include_router(dns_records.router)

    @app.get("/api/health")
    def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()