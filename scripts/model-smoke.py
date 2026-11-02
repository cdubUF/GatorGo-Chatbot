"""Optional live smoke test; only run intentionally with server-side credentials."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.app.config import load_settings  # noqa: E402
from backend.app.provider import ModelAdapter, ProviderUnavailable  # noqa: E402


async def main():
    settings = load_settings()
    if settings.provider != "openai":
        sys.exit("Set MODEL_PROVIDER=openai and server-side credentials to run a live test.")
    try:
        reply, sources = await ModelAdapter(settings).answer("Hello, how can a concierge help?", [], [])
    except ProviderUnavailable as error:
        advice = {
            "insufficient_quota": "Check API billing and available quota.",
            "rate_limit_exceeded": "Wait and check your API rate limits.",
            "http_429": "Check API billing, quota, and rate limits.",
            "http_401": "Check the server-side API key.",
            "http_403": "Check model and project permissions.",
            "http_404": "Check the configured model ID and model access.",
        }.get(error.reason, "Check the API key, model access, and network.")
        sys.exit(f"Provider smoke test failed ({error.reason}). {advice} No key or provider response was displayed.")
    if not reply or sources:
        sys.exit("Provider smoke test returned an invalid response.")
    print(f"Live provider response passed for model {settings.model}.")


if __name__ == "__main__":
    asyncio.run(main())
