import asyncio
import json

import httpx
import pytest

from backend.app.config import Settings
from backend.app.provider import ModelAdapter, ProviderUnavailable
from test_retrieval import record


def response(ids):
    return {"status": "completed", "output": [{"type": "message", "content": [
        {"type": "output_text", "text": json.dumps({"source_ids": ids})}]}]}


def test_provider_contract_and_no_freeform_output():
    def handler(request):
        body = json.loads(request.content)
        assert body["store"] is False and body["max_output_tokens"] == 200
        assert body["text"]["format"]["strict"] is True
        assert request.headers["authorization"] == "Bearer testing"
        return httpx.Response(200, json=response(["pool"]))
    adapter = ModelAdapter(Settings(provider="openai", api_key="testing"), httpx.MockTransport(handler))
    assert asyncio.run(adapter.select("pool", [], [record()])) == ["pool"]


@pytest.mark.parametrize("body", [response(["invented"]), response("pool"),
    {"status": "incomplete"}, {}, {"status": "completed", "output": None}, response([{}])])
def test_invalid_response(body):
    adapter = ModelAdapter(Settings(provider="openai", api_key="testing"),
                           httpx.MockTransport(lambda req: httpx.Response(200, json=body)))
    with pytest.raises(ProviderUnavailable):
        asyncio.run(adapter.select("pool", [], [record()]))


def test_retry_is_bounded():
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(429, json={"error": "private error"})
    adapter = ModelAdapter(Settings(provider="openai", api_key="testing"), httpx.MockTransport(handler))
    with pytest.raises(ProviderUnavailable, match="Model service unavailable"):
        asyncio.run(adapter.select("pool", [], [record()]))
    assert len(calls) == 2


def test_timeout_is_bounded():
    async def handler(request):
        await asyncio.sleep(1)
        return httpx.Response(200, json=response(["pool"]))
    adapter = ModelAdapter(Settings(provider="openai", api_key="testing", provider_timeout=0.01),
                           httpx.MockTransport(handler))
    with pytest.raises(ProviderUnavailable):
        asyncio.run(adapter.select("pool", [], [record()]))


def test_live_answer_supports_no_property_evidence():
    def handler(request):
        body = json.loads(request.content)
        assert json.loads(body["input"][0]["content"])["evidence"] == []
        return httpx.Response(200, json={"status": "completed", "output": [{
            "type": "message", "content": [{"type": "output_text", "text": json.dumps({
                "reply": "I can help with your stay.", "source_ids": []})}]}]})
    adapter = ModelAdapter(Settings(provider="openai", api_key="testing"), httpx.MockTransport(handler))
    assert asyncio.run(adapter.answer("Hello", [], [])) == ("I can help with your stay.", [])


def test_live_answer_rejects_invented_source():
    body = {"status": "completed", "output": [{"type": "message", "content": [
        {"type": "output_text", "text": json.dumps({"reply": "Hello", "source_ids": ["made-up"]})}]}]}
    adapter = ModelAdapter(Settings(provider="openai", api_key="testing"),
                           httpx.MockTransport(lambda req: httpx.Response(200, json=body)))
    with pytest.raises(ProviderUnavailable):
        asyncio.run(adapter.answer("Hello", [], []))


def test_live_answer_sends_source_status_and_provenance():
    def handler(request):
        body = json.loads(request.content)
        evidence = json.loads(body["input"][0]["content"])["evidence"]
        assert evidence[0]["status"] == "demo_only" and evidence[0]["source"] == "Test fixture only"
        return httpx.Response(200, json={"status": "completed", "output": [{"type": "message",
            "content": [{"type": "output_text", "text": json.dumps({
                "reply": "Sample information.", "source_ids": ["pool"]})}]}]})
    adapter = ModelAdapter(Settings(provider="openai", api_key="testing"), httpx.MockTransport(handler))
    assert asyncio.run(adapter.answer("pool", [], [record(status="demo_only")]))[1] == ["pool"]


def test_astra_uses_low_reasoning_and_allows_sufficient_output():
    def handler(request):
        body = json.loads(request.content)
        assert body["model"] == "gpt-6-astra"
        assert body["reasoning"] == {"effort": "low"}
        assert body["max_output_tokens"] >= 1000
        return httpx.Response(200, json={"status": "completed", "output": [{"type": "message",
            "content": [{"type": "output_text", "text": json.dumps({
                "reply": "Hello!", "source_ids": []})}]}]})
    adapter = ModelAdapter(Settings(provider="openai", api_key="testing", model="gpt-6-astra"),
                           httpx.MockTransport(handler))
    assert asyncio.run(adapter.answer("Hello", [], []))[0] == "Hello!"
