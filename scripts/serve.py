"""Single process owns the API and static frontend; Ctrl+C stops both."""
import socket
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import uvicorn  # noqa: E402
from backend.app.config import load_settings  # noqa: E402
from backend.app.main import create_app  # noqa: E402


def main():
    try:
        settings = load_settings()
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", settings.port))
        app = create_app(settings)
    except OSError:
        sys.exit("Port unavailable. Stop the other service or change PORT in .env.")
    except (ValueError, TypeError):
        sys.exit("Invalid configuration or knowledge. Check .env.example and run scripts/import_knowledge.py --help.")
    print(f"Gator Go: http://127.0.0.1:{settings.port} | {settings.provider} | demo={settings.demo}")
    uvicorn.run(app, host="127.0.0.1", port=settings.port, access_log=False, log_level="warning")


if __name__ == "__main__":
    main()
