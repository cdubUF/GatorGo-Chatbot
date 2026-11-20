"""Acceptance contracts for the twenty Cabana Call tickets."""
import asyncio
from datetime import datetime, timezone
from dataclasses import replace
import json

from fastapi.testclient import TestClient

from backend.app.config import Settings, ROOT
from backend.app.main import create_app
from backend.app.retrieval import read_records, Retriever
from backend.app.sessions import Session
from backend.app.schemas import ChatResponse, KnowledgeRecord
from backend.app.venues import resolve_venue, local_day
from scripts.evaluate import coverage_report


def fixture_client():
    return TestClient(create_app(Settings(demo=False, sample_knowledge=True)))


def test_venue_card_sources_ambiguity_followup_and_reset():
    with fixture_client() as client:
        records = client.get('/api/knowledge').json()
        assert next(r for r in records if r['id'] == 'sunset-lounge')['venue']['hours'] == ''
        answer = client.post('/api/chat', json={'message': 'When does it close?'}).json()
        assert len(answer['choices']) == 5 and not answer['sources']
        sid = answer['session_id']
        answer = client.post('/api/chat', json={'message': 'Palm Grill', 'session_id': sid}).json()
        assert '9:00 PM' in answer['reply'] and answer['sources'][0]['id'] == 'palm-grill'
        answer = client.post('/api/chat', json={'message': 'Where is it?', 'session_id': sid}).json()
        assert 'east terrace' in answer['reply'] and answer['venue_id'] == 'palm-grill'
        assert 'Where is it?' in answer['suggestions']
        assert answer['actions'] == [{'type': 'map', 'venue_id': 'palm-grill', 'label': 'View on map'}]
        client.post('/api/chat', json={'message': 'What about the pool?', 'session_id': sid})
        answer = client.post('/api/chat', json={'message': 'Where is it?', 'session_id': sid}).json()
        assert answer['venue_id'] == 'lagoon-pool' and 'central garden' in answer['reply']
        client.delete('/api/sessions/' + sid)
        answer = client.post('/api/chat', json={'message': 'When does it close?'}).json()
        assert len(answer['choices']) == 5


def test_timezone_closure_and_next_open_date():
    settings = Settings(sample_knowledge=True)
    records = read_records(ROOT / 'knowledge/venues.json')
    retriever = Retriever(records, demo=True)
    session = Session()
    now = datetime(2026, 11, 19, 2, tzinfo=timezone.utc)
    assert local_day(settings, now).isoformat() == '2026-11-18'
    for question, wanted in [('Lagoon Pool today', '8:00 AM'), ('Lagoon Pool tomorrow', 'Closed'), ('Lagoon Pool 2026-11-20', '8:00 AM')]:
        response = ChatResponse(session_id=session.id, reply='', demo=True)
        assert resolve_venue(session, question, response, retriever, settings, now)
        assert wanted in response.reply


def test_calendar_event_answer_and_aggregate_privacy():
    with fixture_client() as client:
        calendar = client.get('/api/activities').json()
        assert calendar['timezone'] == 'America/New_York' and len(calendar['events']) == 3
        answer = client.post('/api/chat', json={'message': 'Tell me about Garden Discovery Walk'}).json()
        assert '10:00' in answer['reply'] and '2026-11-18' in answer['reply']
        body = {'session_id': answer['session_id'], 'reply_id': answer['reply_id'], 'reason': 'wrong_venue'}
        assert client.post('/api/feedback', json=body).status_code == 200
        assert client.post('/api/feedback', json=body).status_code == 409
        aggregate = client.get('/api/feedback/aggregate').json()
        assert aggregate == [{'record_id': 'nature-walk', 'reason': 'wrong_venue', 'count': 1}]
        assert client.post('/api/feedback', json={**body, 'message': 'sensitive text'}).status_code == 422


def test_coverage_gap_resolves_after_adding_record():
    cases = json.loads((ROOT / 'tests/fixtures/coverage-gaps.json').read_text('utf-8'))
    records = read_records(ROOT / 'knowledge/venues.json')
    report = coverage_report(records, cases)
    assert {g['expected_record'] for g in report['gaps']} == {'airport-shuttle', 'kids-club'}
    records.append(KnowledgeRecord(id='airport-shuttle', topic='Airport shuttle', category='transport', answer='Airport shuttle hours: 8 AM to 5 PM.', source='Fictional fixture', status='demo_only', updated='2026-11-18', tags=['airport shuttle']))
    assert {g['expected_record'] for g in coverage_report(records, cases)['gaps']} == {'kids-club'}


def test_streaming_call_is_separate_and_produces_audio_before_done(monkeypatch):
    import backend.app.main as module
    async def transcribe(*args):
        return 'Where is Palm Grill?'
    async def stream_speech(*args):
        yield b'\x01\x02' * 100
        await asyncio.sleep(.001)
        yield b'\x03\x04' * 100
    monkeypatch.setattr(module, 'transcribe', transcribe)
    monkeypatch.setattr(module, 'stream_speech', stream_speech)
    settings = Settings(demo=False, sample_knowledge=True, provider='openai', api_key='fixture', speech_enabled=True)
    with TestClient(create_app(settings)) as client:
        from test_expansion import wav
        response = client.post('/api/call?locale=en', content=wav(), headers={'Content-Type': 'audio/wav'})
        events = [json.loads(line) for line in response.text.splitlines()]
        assert [e['type'] for e in events] == ['reply', 'audio', 'audio', 'done']
        assert events[0]['reply']['venue_id'] == 'palm-grill'
        assert response.headers['cache-control'] == 'no-store'
        assert client.post('/api/call?guide=invalid', content=wav()).status_code == 422
        assert client.post('/api/call', content=b'x').status_code == 415
        assert client.get('/api/feedback/aggregate').json() == []
        assert TestClient(create_app(replace(settings, speech_enabled=False))).post('/api/call').status_code == 503

def test_exhausted_allowance_keeps_sourced_chat_without_paid_calls():
    settings = Settings(provider='openai', api_key='test-only', demo=False, sample_knowledge=True,
                        multilingual=True, speech_enabled=True, provider_budget_usd=0)
    app = create_app(settings)
    with TestClient(app) as client:
        health = client.get('/api/health').json()
        assert not health['speech_enabled'] and health['mode'] == 'faq_fallback'
        assert 'allowance' in health['service_notice']
        response = client.post('/api/chat', json={'message': 'Palm Grill hours'})
        assert response.status_code == 200
        assert response.json()['mode'] == 'faq_fallback'
        assert '9:00 PM' in response.json()['reply']
        call = client.post('/api/call', content=b'no audio sent upstream', headers={'content-type': 'audio/wav'})
        assert call.status_code == 503 and 'allowance' in call.json()['detail']
        assert app.state.usage.db.execute('SELECT reserved FROM budget').fetchone()[0] == 0


def test_common_voice_question_skips_text_model_calls(monkeypatch):
    import backend.app.main as module
    async def transcribe(*args):
        return 'What time is check-in?'
    async def speech(*args):
        yield b'\x00\x01' * 10
    async def unexpected(*args, **kwargs):
        raise AssertionError('Common sourced voice question must not wait on a text model')
    monkeypatch.setattr(module, 'transcribe', transcribe)
    monkeypatch.setattr(module, 'stream_speech', speech)
    monkeypatch.setattr(module.ModelAdapter, '_request', unexpected)
    settings = Settings(provider='openai', api_key='fixture', demo=False, sample_knowledge=True,
                        speech_enabled=True, multilingual=True)
    with TestClient(create_app(settings)) as client:
        from test_expansion import wav
        response = client.post('/api/call', content=wav(), headers={'content-type':'audio/wav'})
        events = [json.loads(line) for line in response.text.splitlines()]
        assert [event['type'] for event in events] == ['reply', 'audio', 'done']
        assert '3:00 PM' in events[0]['reply']['reply']
        assert events[0]['reply']['sources']
        assert events[0]['reply']['mode'] == 'mock'

def test_local_cutoff_opt_out_preserves_ledger_and_hosted_guard():
    import pytest
    from fastapi import HTTPException
    from backend.app.usage import Usage
    settings = Settings(provider_budget_usd=0, local_budget_cutoff=False)
    usage = Usage(settings)
    usage.reserve()
    assert usage.available() and usage.db.execute('SELECT reserved FROM budget').fetchone()[0] == 1
    hosted = Usage(replace(settings, profile='staging', demo=False, guest_origins=('https://example.com',)))
    assert not hosted.available()
    with pytest.raises(HTTPException):
        hosted.reserve()

def test_spoken_venue_name_joined_words_updates_followup():
    with fixture_client() as client:
        first = client.post('/api/chat', json={'message':'Where is Lagoon Pool?'}).json()
        trail = client.post('/api/chat', json={'message':'Where is Naturewalk?', 'session_id':first['session_id']}).json()
        assert trail['venue_id'] == 'nature-walk' and 'north garden gate' in trail['reply']
        followup = client.post('/api/chat', json={'message':'When does it close?', 'session_id':first['session_id']}).json()
        assert followup['venue_id'] == 'nature-walk' and '6:00 PM' in followup['reply']
