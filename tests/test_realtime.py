"""Realtime negotiation and grounded session contracts."""
import asyncio
from dataclasses import replace
import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from backend.app.config import Settings
from backend.app.main import create_app
from backend.app.realtime import negotiate, session_config
from backend.app.usage import Usage


def test_realtime_session_has_grounded_facts_and_bounded_turn_detection():
    settings = Settings(demo=False, sample_knowledge=True)
    app = create_app(settings)
    config = session_config(settings, app.state.service.retriever, [], 'desk', 'auto')
    assert '3:00 PM' in config['instructions'] and 'Nature Walk' in config['instructions']
    assert 'Never claim to book' in config['instructions']
    assert config['audio']['input']['turn_detection'] is None
    assert config['max_output_tokens'] == 1024


def test_realtime_route_rejects_cross_origin_and_invalid_offers(monkeypatch):
    import backend.app.main as main
    async def fake(*args):
        return 'v=0\r\n'
    monkeypatch.setattr(main, 'negotiate', fake)
    settings = Settings(demo=False, provider='openai', api_key='fixture', speech_enabled=True,
                        realtime_enabled=True, local_budget_cutoff=False, guest_origins=('http://testserver',))
    with TestClient(create_app(settings)) as client:
        headers={'content-type':'application/sdp','origin':'http://testserver'}
        assert client.post('/api/realtime',content='v=0\r\n',headers=headers).status_code == 200
        assert client.post('/api/realtime',content='v=0\r\n',headers={**headers,'origin':'https://evil.example'}).status_code == 403
        assert client.post('/api/realtime',content='bad',headers=headers).status_code == 422
        assert client.post('/api/realtime',content='v=0'+'a'*65536,headers=headers).status_code == 413
    with TestClient(create_app(replace(settings,local_budget_cutoff=True))) as client:
        assert client.post('/api/realtime',content='v=0\r\n',headers=headers).status_code == 503


def test_realtime_negotiation_keeps_key_server_side_and_sanitizes_errors():
    settings=Settings(provider='openai',api_key='private-fixture',local_budget_cutoff=False)
    usage=Usage(settings)
    def respond(request):
        assert request.headers['authorization']=='Bearer private-fixture'
        assert b'gpt-realtime' in request.content
        return httpx.Response(201,text='v=0\r\n')
    result=asyncio.run(negotiate(settings,usage,'v=0',{'model':'gpt-realtime-2.1'},httpx.MockTransport(respond)))
    assert result=='v=0\r\n' and 'private' not in result
    with pytest.raises(HTTPException) as error:
        asyncio.run(negotiate(settings,usage,'v=0',{},httpx.MockTransport(lambda _:httpx.Response(401,json={'error':'private-fixture'}))))
    assert 'private' not in str(error.value.detail)
