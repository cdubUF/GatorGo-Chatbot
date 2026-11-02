"""Server-only configuration. Never serialize Settings into API responses."""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    provider: str = "mock"
    model: str = "gpt-5.4-mini-2026-03-17"
    api_key: str = ""
    demo: bool = True
    port: int = 8000
    session_ttl: int = 1800
    history_limit: int = 12
    threshold: float = 1.5
    provider_timeout: float = 8
    staff_token: str = ""
    reservation_mode: str = "disabled"
    sample_knowledge: bool = False

    def __post_init__(self):
        if self.provider not in {"mock", "openai"}:
            raise ValueError("MODEL_PROVIDER must be mock or openai")
        if self.provider == "openai" and not self.api_key:
            raise ValueError("Set OPENAI_API_KEY on the server or choose MODEL_PROVIDER=mock")
        if not 1024 <= self.port <= 65535:
            raise ValueError("PORT must be between 1024 and 65535")
        if not 1 <= self.session_ttl <= 86400 or not 2 <= self.history_limit <= 40:
            raise ValueError("Use SESSION_TTL_SECONDS=1..86400 and HISTORY_LIMIT=2..40")
        if not 0 < self.provider_timeout <= 10 or not 0 < self.threshold <= 20:
            raise ValueError("Use PROVIDER_TIMEOUT_SECONDS=0..10 and RETRIEVAL_THRESHOLD=0..20")
        if self.staff_token and len(self.staff_token) < 24:
            raise ValueError("STAFF_TOKEN needs at least 24 characters, or leave it empty")
        if self.reservation_mode not in {"disabled", "synthetic"}:
            raise ValueError("RESERVATION_MODE must be disabled or synthetic")


def load_settings():
    load_dotenv(ROOT / ".env", override=False)
    flag = os.getenv("DEMO_MODE", "false").lower()
    if flag not in {"true", "false"}:
        raise ValueError("DEMO_MODE must be true or false")
    samples = os.getenv("SAMPLE_KNOWLEDGE", "true").lower()
    if samples not in {"true", "false"}:
        raise ValueError("SAMPLE_KNOWLEDGE must be true or false")
    return Settings(
        provider=os.getenv("MODEL_PROVIDER", "openai"),
        model=os.getenv("MODEL_ID", "gpt-5.4-mini-2026-03-17"),
        api_key=os.getenv("OPENAI_API_KEY", ""), demo=flag == "true",
        port=int(os.getenv("PORT", "8000")),
        session_ttl=int(os.getenv("SESSION_TTL_SECONDS", "1800")),
        history_limit=int(os.getenv("HISTORY_LIMIT", "12")),
        threshold=float(os.getenv("RETRIEVAL_THRESHOLD", "1.5")),
        provider_timeout=float(os.getenv("PROVIDER_TIMEOUT_SECONDS", "8")),
        staff_token=os.getenv("STAFF_TOKEN", ""),
        reservation_mode=os.getenv("RESERVATION_MODE", "disabled"),
        sample_knowledge=samples == "true",
    )
