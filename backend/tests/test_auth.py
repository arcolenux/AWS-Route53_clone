"""Authentication endpoint tests."""

import pytest


def _auth(app_client):
    """Convenience: log in as the demo user, return the auth header dict."""
    r = app_client.post(
        "/api/auth/login",
        json={"email": "demo@route53.example", "password": "DemoPass123!"},
    )
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_register_login_logout_me(app_client):
    r = app_client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "display_name": "New User",
            "password": "VeryStrongPass1!",
        },
    )
    assert r.status_code == 201
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = app_client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == "new@example.com"

    r = app_client.post("/api/auth/login", json={"email": "new@example.com", "password": "VeryStrongPass1!"})
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "new@example.com"

    r = app_client.post("/api/auth/logout", headers=headers)
    assert r.status_code == 204

    # Now the token is no longer valid on the client side; calling /me without it fails
    r = app_client.get("/api/auth/me")
    assert r.status_code == 401


def test_register_duplicate_email_rejected(app_client):
    app_client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "display_name": "A", "password": "VeryStrongPass1!"},
    )
    r = app_client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "display_name": "B", "password": "VeryStrongPass1!"},
    )
    assert r.status_code == 409


def test_login_wrong_password_rejected(app_client):
    app_client.post(
        "/api/auth/register",
        json={"email": "x@example.com", "display_name": "X", "password": "VeryStrongPass1!"},
    )
    r = app_client.post(
        "/api/auth/login",
        json={"email": "x@example.com", "password": "wrong"},
    )
    assert r.status_code == 401


def test_demo_user_seeded(app_client):
    r = app_client.post(
        "/api/auth/login",
        json={"email": "demo@route53.example", "password": "DemoPass123!"},
    )
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "demo@route53.example"


def test_me_requires_token(app_client):
    r = app_client.get("/api/auth/me")
    assert r.status_code == 401
