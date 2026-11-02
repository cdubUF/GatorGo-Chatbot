import json
import logging
import re

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.mews import MewsSandboxReservations, MewsUnavailable
from backend.app.reservations import Verification, reservation_router


def sandbox_transport(request):
    data = json.loads(request.content)
    assert request.url.host == 'api.mews-demo.com'
    assert data['ClientToken'] == 'public-client' and data['AccessToken'] == 'public-access'
    assert 'Guest One' not in request.content.decode()
    if request.url.path.endswith('/reservations/getAll/2023-06-06'):
        if data.get('Numbers') == ['42'] or data.get('ChannelNumbers') == ['OTA-42']:
            return httpx.Response(200, json={'Reservations': [{
                'Id': 'reservation-id', 'AccountId': 'customer-id', 'AccountType': 'Customer',
                'Number': '42', 'ChannelNumber': 'OTA-42', 'State': 'Confirmed',
                'ScheduledStartUtc': '2026-11-14T15:00:00Z', 'ScheduledEndUtc': '2026-11-17T11:00:00Z',
                'PersonCounts': [{'Count': 2}]}], 'Cursor': 'reservation-id'})
        return httpx.Response(200, json={'Reservations': [], 'Cursor': None})
    assert request.url.path.endswith('/customers/getAll')
    assert data['CustomerIds'] == ['customer-id']
    return httpx.Response(200, json={'Customers': [{'Id': 'customer-id', 'FirstName': 'Guest',
                                                     'LastName': 'One'}], 'Cursor': 'customer-id'})


def test_mews_matches_confirmation_name_and_channel_number():
    provider = MewsSandboxReservations('public-client', 'public-access',
                                       transport=httpx.MockTransport(sandbox_transport))
    row = provider.find('42', ' guest  one ')
    assert row['confirmation'] == '42' and row['status'] == 'confirmed' and row['guests'] == 2
    assert provider.find('42', 'Wrong Name') is None
    assert provider.find('OTA-42', 'Guest One')['confirmation'] == '42'
    assert provider.find('missing', 'Guest One') is None


def test_mews_failure_does_not_expose_response_or_credentials():
    provider = MewsSandboxReservations('secret-client', 'secret-access',
        transport=httpx.MockTransport(lambda request: httpx.Response(401, text='sensitive content')))
    with pytest.raises(MewsUnavailable) as error:
        provider.find('42', 'Guest One')
    assert 'secret' not in str(error.value) and 'sensitive' not in str(error.value)


def test_mews_multiple_reservations_require_a_unique_name_match():
    def handler(request):
        if request.url.path.endswith('/reservations/getAll/2023-06-06'):
            return httpx.Response(200, json={'Reservations': [
                {'Id': 'r1', 'AccountId': 'c1', 'AccountType': 'Customer', 'Number': '42', 'State': 'Confirmed'},
                {'Id': 'r2', 'AccountId': 'c2', 'AccountType': 'Customer', 'Number': '42', 'State': 'Confirmed'}]})
        return httpx.Response(200, json={'Customers': [
            {'Id': 'c1', 'FirstName': 'Guest', 'LastName': 'One'},
            {'Id': 'c2', 'FirstName': 'Guest', 'LastName': 'Two'}]})
    provider = MewsSandboxReservations('public-client', 'public-access', transport=httpx.MockTransport(handler))
    assert provider.find('42', 'Guest Two')['id'] == 'r2'
    assert provider.find('42', 'Unknown Person') is None


def test_mews_public_sandbox_verification_is_explicit_and_read_only(tmp_path, monkeypatch, caplog):
    from scripts import seed_reservations
    from backend.app.reservations import SQLiteReservations
    monkeypatch.setattr(seed_reservations, 'PATH', tmp_path / 'test.sqlite3')
    seed_reservations.main()
    mews = MewsSandboxReservations('public-client', 'public-access',
                                   transport=httpx.MockTransport(sandbox_transport))
    service = Verification(SQLiteReservations(seed_reservations.PATH), mews=mews)
    app = FastAPI()
    app.include_router(reservation_router(service, lambda auth: None))
    caplog.set_level(logging.WARNING, logger='gatorgo.reservations')
    with TestClient(app) as client:
        payload = {'hotel': 'mews-sandbox', 'confirmation': '42', 'name': 'Guest One'}
        assert client.post('/api/reservations/lookup', json=payload).status_code == 400
        payload['test_data_only'] = True
        lookup = client.post('/api/reservations/lookup', json=payload)
        code = re.search(r'development only\): (\d{6})', caplog.text).group(1)
        verified = client.post('/api/reservations/verify', json={'challenge_id': lookup.json()['challenge_id'], 'code': code})
        auth = {'Authorization': 'Bearer ' + verified.json()['access_token']}
        row = client.get('/api/reservations/me', headers=auth).json()
        assert row['provider'] == 'mews-sandbox' and row['hotel'] == 'Mews public test property'
        assert client.post('/api/reservations/request-change', headers=auth,
                           json={'details': 'change my dates'}).status_code == 409
