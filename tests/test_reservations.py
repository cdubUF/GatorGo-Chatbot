import logging
import re

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from backend.app.reservations import SQLiteReservations, Verification, reservation_router
from scripts import seed_reservations


@pytest.fixture
def reservation_service(tmp_path, monkeypatch, caplog):
    monkeypatch.setattr(seed_reservations, "PATH", tmp_path / "reservations.sqlite3")
    seed_reservations.main()
    now = [1000.0]
    service = Verification(SQLiteReservations(seed_reservations.PATH), clock=lambda: now[0])
    app = FastAPI()
    def staff(auth):
        if auth != "Bearer staff-test-token":
            raise HTTPException(401)
    app.include_router(reservation_router(service, staff))
    caplog.set_level(logging.WARNING, logger="gatorgo.reservations")
    return TestClient(app), service, now, caplog


def begin(client, caplog, confirmation="GG-2026-1048", name="Guest1 Sample"):
    caplog.clear()
    response = client.post("/api/reservations/lookup", json={"confirmation": confirmation, "name": name})
    assert response.status_code == 200
    match = re.search(r"development only\): (\d{6})", caplog.text)
    return response.json(), match.group(1) if match else None


def test_verified_access_and_change_request(reservation_service):
    client, _, _, caplog = reservation_service
    result, code = begin(client, caplog, "  gg-2026-1048  ", "guest1  sample")
    assert code and code not in str(result)
    assert client.get('/api/reservations/me').status_code == 401
    verified = client.post('/api/reservations/verify', json={"challenge_id": result["challenge_id"], "code": code})
    assert verified.status_code == 200
    auth = {"Authorization": "Bearer " + verified.json()["access_token"]}
    reservation = client.get('/api/reservations/me', headers=auth).json()
    assert reservation['confirmation'] == 'GG-2026-1048' and reservation['status'] == 'confirmed'
    assert 'contact' not in reservation
    assert client.get('/api/reservations/me', headers={"Authorization": "Bearer invalid"}).status_code == 401
    change = client.post('/api/reservations/request-change', headers=auth, json={"details": "Request one extra guest"})
    assert change.status_code == 201 and 'not been changed' in change.json()['message']
    assert client.get('/api/reservations/staff/requests').status_code == 401
    queue = client.get('/api/reservations/staff/requests', headers={"Authorization": "Bearer staff-test-token"}).json()
    assert len(queue) == 1 and queue[0]['status'] == 'pending'


@pytest.mark.parametrize('confirmation,name', [('invalid', 'Guest1 Sample'), ('GG-2026-1048', 'Wrong Name')])
def test_unknown_or_mismatched_reservations_are_not_disclosed(reservation_service, confirmation, name):
    client, _, _, caplog = reservation_service
    result, code = begin(client, caplog, confirmation, name)
    assert code is None and 'confirmation' not in result
    assert client.post('/api/reservations/verify', json={"challenge_id": result['challenge_id'], "code": "123456"}).status_code == 401


def test_expiry_attempts_and_one_time_codes(reservation_service):
    client, _, now, caplog = reservation_service
    first, code = begin(client, caplog)
    now[0] += 301
    assert client.post('/api/reservations/verify', json={"challenge_id": first['challenge_id'], "code": code}).status_code == 401
    second, code = begin(client, caplog)
    wrong = '000000' if code != '000000' else '111111'
    for _ in range(5):
        assert client.post('/api/reservations/verify', json={"challenge_id": second['challenge_id'], "code": wrong}).status_code == 401
    assert client.post('/api/reservations/verify', json={"challenge_id": second['challenge_id'], "code": code}).status_code == 401
    third, code = begin(client, caplog)
    payload = {"challenge_id": third['challenge_id'], "code": code}
    assert client.post('/api/reservations/verify', json=payload).status_code == 200
    assert client.post('/api/reservations/verify', json=payload).status_code == 401


def test_lookup_rate_limit(reservation_service):
    client, _, _, _ = reservation_service
    for _ in range(10):
        assert client.post('/api/reservations/lookup', json={"confirmation": "bad", "name": "bad"}).status_code == 200
    assert client.post('/api/reservations/lookup', json={"confirmation": "bad", "name": "bad"}).status_code == 429


def test_guests_only_access_their_own_reservation_and_canceled_change_is_blocked(reservation_service):
    client, _, _, caplog = reservation_service
    tokens = []
    for confirmation, name in [('GG-2026-1048', 'Guest1 Sample'), ('GG-2026-1051', 'Guest4 Sample')]:
        challenge, code = begin(client, caplog, confirmation, name)
        response = client.post('/api/reservations/verify', json={"challenge_id": challenge['challenge_id'], "code": code})
        tokens.append({"Authorization": "Bearer " + response.json()['access_token']})
    assert client.get('/api/reservations/me', headers=tokens[0]).json()['confirmation'] == 'GG-2026-1048'
    assert client.get('/api/reservations/me', headers=tokens[1]).json()['status'] == 'canceled'
    assert client.post('/api/reservations/request-change', headers=tokens[1],
                       json={"details": "Change my dates"}).status_code == 409


def test_fictional_reservations_are_scoped_to_gatorgo(reservation_service):
    client, _, _, caplog = reservation_service
    payload = {"confirmation": "GG-2026-1056", "name": "Guest9 Sample", "hotel": "hilton-uf"}
    caplog.clear()
    wrong_hotel = client.post('/api/reservations/lookup', json=payload)
    assert wrong_hotel.status_code == 200 and 'development only' not in caplog.text
    payload['hotel'] = 'gatorgo'
    right_hotel = client.post('/api/reservations/lookup', json=payload)
    match = re.search(r'development only\): (\d{6})', caplog.text)
    assert right_hotel.status_code == 200 and match
    verified = client.post('/api/reservations/verify', json={"challenge_id": right_hotel.json()['challenge_id'],
                                                             "code": match.group(1)})
    auth = {"Authorization": "Bearer " + verified.json()['access_token']}
    row = client.get('/api/reservations/me', headers=auth).json()
    assert row['hotel'] == 'Gator Go Resort & Spa (fictional)'
    assert row['confirmation'] == 'GG-2026-1056'
