"""Single process owns the API and static frontend; Ctrl+C stops both."""
import socket
import sys
import logging
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import uvicorn  # noqa: E402
from uvicorn.protocols.http.h11_impl import H11Protocol  # noqa: E402
from backend.app.config import ROOT, load_settings  # noqa: E402
from backend.app.main import create_app  # noqa: E402


class LocalHTTPProtocol(H11Protocol):
    """Explain TLS sent to the local HTTP listener without recording request bytes."""
    def connection_made(self, transport):
        self.first_bytes = True
        super().connection_made(transport)

    def data_received(self, data):
        if self.first_bytes and data:
            self.first_bytes = False
            if data[0] == 0x16:
                self.logger.warning(
                    "HTTPS was sent to the HTTP-only local server. Open http://127.0.0.1:%s instead.",
                    self.server[1],
                )
                self.transport.close()
                return
        super().data_received(data)


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
                        datefmt="%H:%M:%S", stream=sys.stdout, force=True)
    try:
        settings = load_settings()
        if settings.reservation_mode == "synthetic" and not (ROOT / "data/synthetic-hotel-reservations.sqlite3").is_file():
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
                               "RESERVATION_MODE must", "DEMO_MODE must", "SAMPLE_KNOWLEDGE must",
                               "MEWS_SANDBOX_ENABLED must", "Mews sandbox needs", "Mews sandbox requires")):
            sys.exit(f"Configuration error: {message}")
        sys.exit(f"Configuration or knowledge error ({type(error).__name__}). Check .env values and knowledge files.")
    print(f"Gator Go: http://127.0.0.1:{settings.port} | provider={settings.provider} | model={settings.model}", flush=True)
    records = app.state.service.retriever.records
    approved = sum(record.status == "approved" for record in records)
    samples = sum(record.status == "demo_only" for record in records)
    general = sum(record.status == "general" for record in records)
    print(f"Knowledge: {samples} project test records, {general} general guidance records, {approved} approved | staff notifications: not connected", flush=True)
    print(f"Reservations: {settings.reservation_mode} (synthetic mode is local development only)", flush=True)
    print("Live request status and safe error codes appear below. API keys and message contents are not logged.", flush=True)
    if settings.reservation_mode == "synthetic":
        print("Local synthetic reservation verification codes will appear in this console.", flush=True)
    # Uvicorn's Windows default is a Proactor loop, which can emit an unhandled
    # connection-lost callback traceback when a local client resets a socket.
    # The selector loop is sufficient for this localhost, single-process app.
    loop_factory = asyncio.SelectorEventLoop if sys.platform == "win32" else "auto"
    uvicorn.run(app, host="127.0.0.1", port=settings.port, access_log=False,
                log_level="info", loop=loop_factory, http=LocalHTTPProtocol)


if __name__ == "__main__":
    main()
