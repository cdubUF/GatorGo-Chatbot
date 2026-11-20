"""Character propagation, grounded venue phrasing and safe fallback contracts."""
import asyncio
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.main import create_app
from backend.app.personalities import PROFILES, conversation_instructions
from backend.app.provider import ModelAdapter, ProviderUnavailable
from backend.app.realtime import session_config


@pytest.mark.parametrize('guide', PROFILES)
def test_character_reaches_both_model_transports(guide):
    settings = Settings(provider='openai', api_key='fixture', sample_knowledge=True)
    def handler(request):
        instructions = json.loads(request.content)['instructions']
        assert conversation_instructions(guide) in instructions
        assert 'Never invent a customer anecdote' in instructions
        return httpx.Response(200, json={'status': 'completed', 'output': [{
            'type': 'message', 'content': [{'type': 'output_text', 'text': json.dumps({
                'reply': 'Hello!', 'source_ids': []})}]}]})
    adapter = ModelAdapter(settings, httpx.MockTransport(handler))
    asyncio.run(adapter.answer('Hello', [], [], guide=guide))
    app = create_app(settings)
    config = session_config(settings, app.state.service.retriever, [], guide, 'en')
    assert conversation_instructions(guide) in config['instructions']


@pytest.mark.parametrize('failure', [False, True])
def test_venue_character_retains_grounded_closure_and_actions(failure):
    class Provider:
        async def answer(self, question, history, records, *, guide='desk'):
            assert guide == 'pool'
            assert '2026-11-19: Closed' in records[0].answer
            if failure:
                raise ProviderUnavailable()
            return 'Lagoon Pool is closed on November 19 for scheduled cleaning.', [records[0].id]
    settings = Settings(provider='openai', api_key='fixture', sample_knowledge=True, multilingual=False)
    with TestClient(create_app(settings, provider=Provider())) as client:
        reply = client.post('/api/chat', json={
            'message': 'Tell me about Lagoon Pool on 2026-11-19', 'guide': 'pool'}).json()
        assert reply['venue_id'] == 'lagoon-pool'
        assert reply['sources'][0]['id'] == 'lagoon-pool'
        assert reply['actions'][0]['type'] == 'map'
        if failure:
            assert reply['mode'] == 'faq_fallback'
            assert 'Closed' in reply['reply']
        else:
            assert 'closed' in reply['reply']
        assert client.post('/api/chat', json={'message': 'Hello', 'guide': 'invented'}).status_code == 422
