"""Expansion acceptance tests use fictional fixtures, never approved property claims."""
import asyncio
import io
import json
import wave
from dataclasses import replace

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.languages import LANGUAGES, UNKNOWN, translate
from backend.app.main import create_app
from backend.app.provider import ModelAdapter, ProviderUnavailable
from backend.app.retrieval import Retriever
from backend.app.speech import MAX_AUDIO_BYTES, transcribe, validate_audio
from backend.app.usage import Usage
from test_retrieval import record


def wav(seconds=1, rate=16000):
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(rate)
        audio.writeframes(b'\x00\x00' * int(rate * seconds))
    return buffer.getvalue()


def test_global_limit_survives_new_sessions_and_precedes_provider():
    settings = Settings(public_requests_per_minute=2)
    with TestClient(create_app(settings)) as client:
        assert client.post('/api/chat', json={'message': 'hello'}).status_code == 200
        assert client.post('/api/chat', json={'message': 'hello'}).status_code == 200
        assert client.post('/api/chat', json={'message': 'hello'}).status_code == 429


def test_budget_persists_and_exhaustion_stops_paid_calls(tmp_path):
    settings = Settings(provider='openai', api_key='fictional', provider_budget_usd=1,
                        budget_path=str(tmp_path / 'budget.sqlite3'))
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(500)
    adapter = ModelAdapter(settings, httpx.MockTransport(handler), Usage(settings))
    with pytest.raises(HTTPException) as error:
        asyncio.run(adapter.answer('pool', [], []))
    assert error.value.status_code == 503 and len(calls) == 1
    with pytest.raises(HTTPException):
        Usage(settings).reserve()


def test_audio_limits_validated_from_actual_file():
    validate_audio(wav(30))
    for data, status in [(wav(31), 413), (b'x' * (MAX_AUDIO_BYTES + 1), 413),
                         (b'bad audio', 415), (wav()[:-20], 415), (wav(0), 413)]:
        with pytest.raises(HTTPException) as error:
            validate_audio(data)
        assert error.value.status_code == status


def test_speech_contract_quota_and_sanitized_failures(caplog):
    settings = Settings(provider='openai', api_key='fictional-secret', speech_enabled=True)
    usage = Usage(settings)
    def handler(request):
        assert request.headers['authorization'] == 'Bearer fictional-secret'
        assert b'utterance.wav' in request.content
        return httpx.Response(200, json={'text': 'When is breakfast?'})
    assert asyncio.run(transcribe(settings, usage, wav(), 'es', httpx.MockTransport(handler))) == 'When is breakfast?'
    with pytest.raises(HTTPException) as error:
        asyncio.run(transcribe(settings, usage, wav(), 'auto', httpx.MockTransport(
            lambda request: httpx.Response(500, json={'secret': 'fictional-secret', 'transcript': 'private-fixture'}))))
    assert 'fictional-secret' not in str(error.value) + caplog.text
    assert 'private-fixture' not in str(error.value) + caplog.text
    app = create_app(replace(settings, speech_requests_per_minute=2))
    with TestClient(app) as client:
        assert client.post('/api/speech', content=wav(), headers={'Content-Type': 'video/mp4'}).status_code == 415
        assert client.post('/api/speech', content=wav(31), headers={'Content-Type': 'audio/wav'}).status_code == 413
        assert client.post('/api/speech', content=wav(), headers={'Content-Type': 'audio/wav'}).status_code == 429


def public(**kwargs):
    return Settings(profile='public', demo=False, trusted_hosts=('testserver',),
                    guest_origins=('https://guest.example.test',), **kwargs)


def test_public_routes_headers_and_readiness():
    with TestClient(create_app(public())) as client:
        for path in ['/staff.html', '/staff.js', '/api/staff/handoffs', '/api/reservations/providers', '/api/handoffs']:
            assert client.get(path).status_code == 404
            assert client.post(path, json={}).status_code == 404
        assert client.get('/api/ready').status_code == 503
        assert client.get('/api/health').json()['reservation_testing'] is False
        assert client.get('/', headers={'host': 'untrusted.example'}).status_code == 400
        response = client.get('/')
        assert 'camera=(self)' in response.headers['permissions-policy']
        assert "connect-src 'self'" in response.headers['content-security-policy']
    with TestClient(create_app(public(), records=[record()])) as client:
        assert client.get('/api/ready').status_code == 200
    with pytest.raises(ValueError):
        public(reservation_mode='synthetic')


def test_approved_precedence_unknown_and_reload():
    approved = record()
    conflicting = record(id='demo-pool', status='demo_only', answer='Pool opens at 3 AM.')
    assert Retriever([approved, conflicting], demo=True).search('pool')[0][0] == approved
    contact = record(id='contact', topic='Front desk contact', tags=['contact', 'front desk'],
                     answer='Call the fictional desk at 555-0100.')
    for answer in ['Pool opens at 8 AM.', 'Pool opens at 10 AM.']:
        with TestClient(create_app(public(), records=[record(answer=answer), contact])) as client:
            result = client.post('/api/chat', json={'message': 'pool hours'}).json()
            assert answer in result['reply'] and result['sources'][0]['status'] == 'approved'
            unknown = client.post('/api/chat', json={'message': 'airport shuttle schedule'}).json()
            assert "don't have verified" in unknown['reply'] and '555-0100' in unknown['reply']
            assert 'No booking was made' in unknown['reply']


@pytest.mark.parametrize('locale', LANGUAGES)
def test_language_pipeline_contract_and_localized_unknown(locale):
    class LanguageProvider:
        settings = Settings()
        async def _request(self, payload):
            fields = payload['text']['format']['schema']['required']
            if 'detected' in fields:
                return {'detected': locale, 'query': 'airport shuttle schedule'}
            return {'text': UNKNOWN[locale]}
    settings = public(provider='openai', api_key='fictional', multilingual=True)
    with TestClient(create_app(settings, provider=LanguageProvider())) as client:
        result = client.post('/api/chat', json={'message': 'fictional utterance', 'locale': locale}).json()
        assert result['detected_locale'] == result['reply_locale'] == locale
        assert (result['reply'] == UNKNOWN[locale] if locale != 'en' else 'verified information' in result['reply']) and result['sources'] == []


def test_translation_rejects_changed_numeric_facts():
    class Translator:
        settings = Settings()
        async def _request(self, payload):
            return {'text': 'La piscine ouvre à 9:00.'}
    with pytest.raises(ProviderUnavailable):
        asyncio.run(translate(Translator(), 'Pool opens at 8:00.', 'fr'))


def test_fictional_fixture_contract():
    # This is a test set, deliberately outside knowledge/approved.json.
    rows = json.loads(open('tests/fixtures/reference-knowledge.json', encoding='utf-8').read())
    assert {r['category'] for r in rows} == {'Dining', 'Arrival', 'Amenities', 'Transportation'}

def test_sensitive_text_never_enters_language_provider():
    class MustNotCall:
        async def _request(self, payload):
            raise AssertionError('Sensitive text reached paid provider')
    settings = public(provider='openai', api_key='fixture-key', multilingual=True)
    with TestClient(create_app(settings, provider=MustNotCall())) as client:
        response = client.post('/api/chat', json={'message': 'My email is fictional@example.test'})
        assert response.status_code == 200 and "don't share" in response.json()['reply']


def test_request_logs_do_not_echo_unknown_path_or_headers(caplog):
    import logging
    caplog.set_level(logging.INFO)
    with TestClient(create_app(Settings())) as client:
        response = client.post('/api/fictional-private-transcript', content=b'fictional-raw-audio',
            headers={'Authorization': 'Bearer fictional-bearer-secret'})
        assert response.status_code in {404, 405}
    application_logs = ' '.join(r.getMessage() for r in caplog.records if r.name.startswith('gatorgo'))
    assert 'fictional-private-transcript' not in application_logs
    assert 'fictional-raw-audio' not in application_logs
    assert 'fictional-bearer-secret' not in application_logs

def test_ai_voice_budget_format_and_safe_failures():
    from backend.app.speech import synthesize
    settings = Settings(provider='openai', api_key='fixture', speech_enabled=True, provider_budget_usd=1)
    calls = []
    def handler(request):
        calls.append(json.loads(request.content))
        return httpx.Response(200, content=wav())
    usage = Usage(settings)
    assert asyncio.run(synthesize(settings, usage, 'Welcome!', 'desk', httpx.MockTransport(handler))) == wav()
    assert calls[0]['voice'] == 'marin' and calls[0]['input'] == 'Welcome!'
    with pytest.raises(HTTPException):
        asyncio.run(synthesize(settings, usage, 'Again', 'trail', httpx.MockTransport(handler)))
    assert len(calls) == 1
    with pytest.raises(HTTPException) as error:
        asyncio.run(synthesize(settings, Usage(settings), 'Welcome', 'pool', httpx.MockTransport(lambda r: httpx.Response(200, content=b'bad'))))
    assert error.value.status_code == 503


def test_voice_endpoint_disabled_and_input_bounds():
    with TestClient(create_app(Settings())) as client:
        assert client.post('/api/voice', json={'text': 'hello'}).status_code == 503
        assert client.post('/api/voice', json={'text': 'x' * 4001}).status_code == 422
        assert client.post('/api/voice', json={'text': 'hello', 'guide': 'bad'}).status_code == 422
