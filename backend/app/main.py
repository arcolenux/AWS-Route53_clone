"""Route 53 Clone API entrypoint.

``app`` is the ASGI application served by uvicorn. ``create_app`` is a factory
used by tests so each suite can build an isolated app.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def create_app() -> FastAPI:
    app = FastAPI(
        title="AWS Route53 Clone API",
        version="1.0.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # relaxed for local dev; tightened in deployment
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
