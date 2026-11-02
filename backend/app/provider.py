"""Bounded Responses API adapter. Only validated source selections reach the renderer."""
import asyncio
import json

import httpx

from .config import ROOT


class ProviderUnavailable(Exception):
    def __init__(self, reason="unavailable"):
        super().__init__("Model service unavailable")
        self.reason = reason


class ModelAdapter:
    def __init__(self, settings, transport=None):
        self.settings = settings
        self.transport = transport
        self.prompt = (ROOT / "backend/app/prompts/concierge-v1.txt").read_text("utf-8")

    async def select(self, query, history, records):
        ids = [r.id for r in records]
        if self.settings.provider == "mock":
            return ids[:1]
        payload = {
            "model": self.settings.model, "store": False, "max_output_tokens": 200,
            "instructions": self.prompt,
            "input": [{"role": "user", "content": json.dumps({
                "question": query, "recent_context": history,
                "evidence": [{"id": r.id, "topic": r.topic, "answer": r.answer}
                             for r in records],
            })}],
            "text": {"format": {"type": "json_schema", "name": "source_selection",
                "strict": True, "schema": {"type": "object", "properties": {
                    "source_ids": {"type": "array", "items": {"type": "string"}}},
                    "required": ["source_ids"], "additionalProperties": False}}},
        }
        try:
            # Total deadline also bounds retries, connections, and slow streaming bodies.
            async with asyncio.timeout(self.settings.provider_timeout):
                async with httpx.AsyncClient(timeout=self.settings.provider_timeout,
                                              transport=self.transport) as client:
                    for attempt in range(2):
                        response = await client.post("https://api.openai.com/v1/responses",
                            headers={"Authorization": f"Bearer {self.settings.api_key}"},
                            json=payload)
                        if response.status_code in {429, 500, 502, 503, 504} and attempt == 0:
                            await asyncio.sleep(0.2)
                            continue
                        response.raise_for_status()
                        result = response.json()
                        if result.get("status") != "completed":
                            raise ValueError("Incomplete provider response")
                        output = "".join(c.get("text", "") for item in result.get("output", [])
                            if item.get("type") == "message" for c in item.get("content", [])
                            if c.get("type") == "output_text")
                        selected = json.loads(output)
                        values = selected.get("source_ids")
                        if (set(selected) != {"source_ids"} or not isinstance(values, list)
                            or len(values) > 3 or any(not isinstance(v, str) or v not in ids
                                                     for v in values)):
                            raise ValueError("Invalid source selection")
                        return list(dict.fromkeys(values))
        except httpx.HTTPStatusError as error:
            reason = f"http_{error.response.status_code}"
            if error.response.status_code == 429:
                try:
                    code = error.response.json().get("error", {}).get("code")
                    if code in {"insufficient_quota", "rate_limit_exceeded"}:
                        reason = code
                except (ValueError, TypeError, AttributeError):
                    pass
            raise ProviderUnavailable(reason) from None
        except (httpx.HTTPError, TimeoutError):
            raise ProviderUnavailable("connection_or_timeout") from None
        except (ValueError, TypeError, KeyError, AttributeError):
            raise ProviderUnavailable("invalid_response") from None
        raise ProviderUnavailable()
