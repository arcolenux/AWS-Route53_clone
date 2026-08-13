"""Shared pytest fixtures.

``ROUTE53_DATABASE_PATH`` is pointed at a throwaway file before the app is
imported so every test run starts from an empty database.
"""

import os
import tempfile

import pytest
from fastapi.testclient import TestClient

# Point the app at a scratch DB before any app module is imported.
_os_environ_backup = os.environ.copy()
os.environ["ROUTE53_DATABASE_PATH"] = os.path.join(
    tempfile.gettempdir(), "route53_clone_pytest.db"
)
if os.path.exists(os.environ["ROUTE53_DATABASE_PATH"]):
    os.remove(os.environ["ROUTE53_DATABASE_PATH"])

from app.main import create_app  # noqa: E402


@pytest.fixture()
def app_client():
    app = create_app()
    with TestClient(app) as client:
        yield client
