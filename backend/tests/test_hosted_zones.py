"""Hosted zones endpoint tests."""

import pytest


def _auth(app_client):
    r = app_client.post(
        "/api/auth/login",
        json={"email": "demo@route53.example", "password": "DemoPass123!"},
    )
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _create_zone(client, name, **kw):
    headers = _auth(client)
    return client.post("/api/hosted-zones", json={"name": name, **kw}, headers=headers)


def test_create_and_get_zone(app_client):
    r = _create_zone(app_client, "example.com", description="My zone", private=True)
    assert r.status_code == 201
    zone = r.json()
    assert zone["name"] == "example.com"
    assert zone["private"] is True

    r = app_client.get(f"/api/hosted-zones/{zone['id']}", headers=_auth(app_client))
    assert r.status_code == 200
    assert r.json()["name"] == "example.com"


def test_list_zones_pagination_and_search(app_client):
    h = _auth(app_client)
    # Use a unique prefix to avoid collision with other test data
    for name in ["alpha.test-zone.com", "beta.test-zone.com", "gamma.test-zone.com", "zebra.other.net"]:
        app_client.post("/api/hosted-zones", json={"name": name}, headers=h)

    r = app_client.get("/api/hosted-zones?search=test-zone", headers=h)
    assert r.json()["total"] == 3
    r = app_client.get("/api/hosted-zones?page_size=2&page=2", headers=h)
    body = r.json()
    assert body["page"] == 2
    assert len(body["items"]) == 2


def test_duplicate_zone_rejected(app_client):
    h = _auth(app_client)
    app_client.post("/api/hosted-zones", json={"name": "dup.com"}, headers=h)
    r = app_client.post("/api/hosted-zones", json={"name": "dup.com"}, headers=h)
    assert r.status_code == 409


def test_invalid_domain_rejected(app_client):
    h = _auth(app_client)
    r = app_client.post("/api/hosted-zones", json={"name": "not a domain!!"}, headers=h)
    assert r.status_code == 422


def test_update_zone(app_client):
    z = _create_zone(app_client, "upd.com").json()
    r = app_client.put(
        f"/api/hosted-zones/{z['id']}", json={"description": "updated"}, headers=_auth(app_client)
    )
    assert r.status_code == 200
    assert r.json()["description"] == "updated"


def test_delete_zone(app_client):
    z = _create_zone(app_client, "del.com").json()
    h = _auth(app_client)
    r = app_client.delete(f"/api/hosted-zones/{z['id']}", headers=h)
    assert r.status_code == 204
    r = app_client.get(f"/api/hosted-zones/{z['id']}", headers=h)
    assert r.status_code == 404


def test_requires_auth(app_client):
    assert app_client.get("/api/hosted-zones").status_code == 401


def test_wildcard_zone_name(app_client):
    """Wildcard zone names like *.example.com are allowed."""
    r = _create_zone(app_client, "*.wild.example.com")
    assert r.status_code == 201
    assert r.json()["name"] == "*.wild.example.com"
