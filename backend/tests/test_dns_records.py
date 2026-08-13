"""DNS records endpoint tests."""

import pytest


def _auth(app_client):
    r = app_client.post(
        "/api/auth/login",
        json={"email": "demo@route53.example", "password": "DemoPass123!"},
    )
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture()
def zone(app_client):
    import uuid

    name = f"test-{uuid.uuid4().hex[:8]}.com"
    r = app_client.post(
        "/api/hosted-zones", json={"name": name}, headers=_auth(app_client)
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_roundtrip_all_types(app_client, zone):
    h = _auth(app_client)
    cases = [
        ("A", "1.2.3.4"),
        ("AAAA", "2001:db8::1"),
        ("CNAME", "target.example.com"),
        ("TXT", "hello world"),
        ("MX", "10 mail.example.com"),
        ("NS", "ns1.awsdns.com"),
        ("PTR", "host.example.com"),
        ("SRV", "1 5 5060 sip.example.com"),
        ("CAA", '0 issue "letsencrypt.org"'),
    ]
    for rtype, value in cases:
        r = app_client.post(
            f"/api/hosted-zones/{zone}/records",
            json={"name": "www", "type": rtype, "ttl": 300, "values": [value]},
            headers=h,
        )
        assert r.status_code == 201, (rtype, r.text)


def test_record_crud(app_client, zone):
    h = _auth(app_client)
    r = app_client.post(
        f"/api/hosted-zones/{zone}/records",
        json={"name": "api", "type": "A", "ttl": 60, "values": ["10.0.0.1", "10.0.0.2"]},
        headers=h,
    )
    assert r.status_code == 201
    rec = r.json()
    assert rec["values"] == ["10.0.0.1", "10.0.0.2"]

    r = app_client.get(f"/api/hosted-zones/{zone}/records/{rec['id']}", headers=h)
    assert r.json()["ttl"] == 60

    r = app_client.put(
        f"/api/hosted-zones/{zone}/records/{rec['id']}",
        json={"ttl": 120, "values": ["10.0.0.9"]},
        headers=h,
    )
    assert r.json()["ttl"] == 120
    assert r.json()["values"] == ["10.0.0.9"]

    r = app_client.delete(f"/api/hosted-zones/{zone}/records/{rec['id']}", headers=h)
    assert r.status_code == 204
    assert (
        app_client.get(f"/api/hosted-zones/{zone}/records/{rec['id']}", headers=h).status_code
        == 404
    )


def test_record_search_and_filter(app_client, zone):
    h = _auth(app_client)
    for name, rtype, val in [
        ("www", "A", "1.1.1.1"),
        ("mail", "MX", "10 mail.example.com"),
        ("txt", "TXT", "v=spf1"),
    ]:
        app_client.post(
            f"/api/hosted-zones/{zone}/records",
            json={"name": name, "type": rtype, "ttl": 300, "values": [val]},
            headers=h,
        )

    r = app_client.get(f"/api/hosted-zones/{zone}/records?type=A", headers=h)
    assert r.json()["total"] == 1
    r = app_client.get(f"/api/hosted-zones/{zone}/records?search=mail", headers=h)
    assert r.json()["total"] == 1


def test_record_validation(app_client, zone):
    h = _auth(app_client)
    # Unsupported type
    r = app_client.post(
        f"/api/hosted-zones/{zone}/records",
        json={"name": "x", "type": "BOGUS", "ttl": 300, "values": ["x"]},
        headers=h,
    )
    assert r.status_code == 422
    # CNAME requires exactly one value
    r = app_client.post(
        f"/api/hosted-zones/{zone}/records",
        json={"name": "x", "type": "CNAME", "ttl": 300, "values": ["a", "b"]},
        headers=h,
    )
    assert r.status_code == 422
    # A record requires valid IP
    r = app_client.post(
        f"/api/hosted-zones/{zone}/records",
        json={"name": "x", "type": "A", "ttl": 300, "values": ["not-an-ip"]},
        headers=h,
    )
    assert r.status_code == 422
    # MX requires priority + server
    r = app_client.post(
        f"/api/hosted-zones/{zone}/records",
        json={"name": "x", "type": "MX", "ttl": 300, "values": ["mail.example.com"]},
        headers=h,
    )
    assert r.status_code == 422


def test_records_zone_404(app_client):
    assert (
        app_client.get("/api/hosted-zones/nope/records", headers=_auth(app_client)).status_code
        == 404
    )
