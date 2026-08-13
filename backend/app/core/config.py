"""Application configuration.

All settings are read from environment variables so the app behaves the same
locally, under pytest, and in Docker. See ``.env.example`` for the full set.
"""

import os


class Settings:
    def __init__(self) -> None:
        self.database_path = os.getenv("ROUTE53_DATABASE_PATH", "route53.db")
        self.secret_key = os.getenv("ROUTE53_SECRET_KEY", "dev-secret-key")
        self.token_expire_minutes = int(os.getenv("ROUTE53_TOKEN_EXPIRE_MINUTES", "480"))
        self.seed_password = os.getenv("ROUTE53_SEED_PASSWORD", "DemoPass123!")


settings = Settings()
