"""Optional live smoke test; only run intentionally with server-side credentials."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.app.config import load_settings  # noqa: E402
from backend.app.provider import ModelAdapter, ProviderUnavailable  # noqa: E402
from backend.app.retrieval import read_records  # noqa: E402
from backend.app.config import ROOT  # noqa: E402


async def main():
    settings = load_settings()
    if settings.provider != "openai":
        sys.exit("Set MODEL_PROVIDER=openai and server-side credentials to run a live test.")
    records = read_records(ROOT / "knowledge/demo.json")[:1]
    try:
        result = await ModelAdapter(settings).select("What time is check-in?", [], records)
    except ProviderUnavailable:
        sys.exit("Provider smoke test failed; no credentials or provider diagnostics are displayed.")
    if result != ["checkin"]:
        sys.exit("Provider smoke test returned an unexpected source selection.")
    print(f"Live provider selection passed for model {settings.model}; synthetic sample only.")


if __name__ == "__main__":
    asyncio.run(main())
