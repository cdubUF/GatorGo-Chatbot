"""Single process owns the API and static frontend; Ctrl+C stops both."""
import socket
import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import uvicorn  # noqa: E402
from backend.app.config import ROOT, load_settings  # noqa: E402
from backend.app.main import create_app  # noqa: E402


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
                        datefmt="%H:%M:%S", stream=sys.stdout, force=True)
    try:
        settings = load_settings()
        if settings.reservation_mode == "synthetic" and not (ROOT / "data/synthetic-reservations.sqlite3").is_file():
            sys.exit("Synthetic reservation database missing. Run scripts/seed_reservations.py first.")
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", settings.port))
        app = create_app(settings)
    except OSError:
        sys.exit("Port unavailable. Stop the other service or change PORT in .env.")
    except (ValueError, TypeError) as error:
        message = str(error)
        if message.startswith(("MODEL_PROVIDER must", "Set OPENAI_API_KEY", "PORT must",
                               "Use SESSION_TTL", "Use PROVIDER_TIMEOUT", "STAFF_TOKEN needs",
                               "RESERVATION_MODE must", "DEMO_MODE must")):
            sys.exit(f"Configuration error: {message}")
        sys.exit(f"Configuration or knowledge error ({type(error).__name__}). Check .env values and knowledge files.")
    print(f"Gator Go: http://127.0.0.1:{settings.port} | provider={settings.provider} | model={settings.model}", flush=True)
    print(f"Knowledge: {len(app.state.service.retriever.records)} records loaded | staff notifications: not connected", flush=True)
    print(f"Reservations: {settings.reservation_mode} (synthetic mode is local development only)", flush=True)
    print("Live request status and safe error codes appear below. API keys and message contents are not logged.", flush=True)
    if settings.reservation_mode == "synthetic":
        print("Local synthetic reservation verification codes will appear in this console.", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=settings.port, access_log=False, log_level="info")


if __name__ == "__main__":
    main()
