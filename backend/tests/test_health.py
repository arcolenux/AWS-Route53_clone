"""App bootstrap and health endpoint tests."""

from app.main import create_app


def test_app_factory_builds():
    app = create_app()
    assert app.title == "AWS Route53 Clone API"


def test_health_endpoint(app_client):
    r = app_client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}