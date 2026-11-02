# Gator Go virtual concierge

Gator Go is a local FastAPI and browser application that uses OpenAI to answer questions. The server handles the API key and logs request status and sanitized provider error categories; it does not log guest messages or keys.

## Start

Install Python 3.11 or newer, copy `.env.example` to `.env`, and set `OPENAI_API_KEY` in `.env`. Keep the file private. `MODEL_PROVIDER=openai` and `DEMO_MODE=false` are the defaults. The OpenAI API requires network access and may incur usage charges.

The default model is `gpt-6-astra`, using low reasoning effort for chat. As of November 2, 2026, OpenAI lists standard text pricing of $10 per million input tokens and $50 per million output tokens; see the [official model page](https://developers.openai.com/api/docs/models/gpt-6-astra) for current pricing. Set `MODEL_ID` in `.env` to use another supported model.

On Windows, double-click `run.bat` or run `./run.bat`. In Git Bash, macOS, Linux, or WSL, run `bash ./run-all.sh`. The launcher checks Python and installs project dependencies when necessary. Open **http://127.0.0.1:8000** and use Ctrl+C to stop the server. If port 8000 is occupied, stop the other service or set `PORT` in `.env`.

The local server uses HTTP, not HTTPS. If the console reports an HTTPS request on the HTTP port, open the printed `http://127.0.0.1:8000` address exactly and check whether the browser is forcing secure connections. Other malformed requests still appear as warnings.

The console displays startup settings, request status and timing, and safe error codes. Run `.venv\Scripts\python.exe scripts\model-smoke.py` on Windows (or `.venv/bin/python scripts/model-smoke.py` on macOS/Linux) to test the configured model. A 429 response requires checking API billing, quota, and rate limits. Avoid posting keys or guest data when sharing diagnostics.

## Knowledge and limits

The application uses the 14 original hotel records in `knowledge/demo.json` as project test data. It also retrieves six general hotel guidance records and uses 360 example question phrasings extracted from the Bitext Hospitality and Customer Support datasets to recognize relevant topics. This is retrieval, not model training. The dataset examples do not establish policies or services at a real property. `knowledge/approved.json` can hold verified property facts, which take priority over overlapping test data. Set `SAMPLE_KNOWLEDGE=false` to exclude the test records and general guidance.

The application cannot make reservations, change bookings, charge guests, dispatch services, or notify staff. Handoff summaries are displayed to the guest for direct contact. The app binds to localhost and is not ready for public deployment or actual hotel operations.

## Local reservation verification

Reservation lookup is disabled by default. To exercise the verification flow with **fictional data only**, run `.venv\Scripts\python.exe scripts\seed_reservations.py` on Windows (or `.venv/bin/python scripts/seed_reservations.py` on macOS/Linux), set `RESERVATION_MODE=synthetic` in `.env`, and restart. The script creates 24 fictional records in ignored `data/synthetic-hotel-reservations.sqlite3` and refuses to overwrite an existing database. It preserves any earlier `synthetic-reservations.sqlite3` database.

Choose a hotel in the reservation form and use its fictional confirmation and name:

Use **AI chat** and **Reservation testing** at the top of the interface to switch views. Open **Sample reservation details** for test credentials, and use **Start another lookup** to reset the form. Switching views preserves the current chat and lookup.

| Test hotel | Confirmation | Full name |
|---|---|---|
| Gator Go Resort & Spa | `GG-2026-1048` | `Guest1 Sample` |
| Hilton University of Florida Conference Center Gainesville | `GG-2026-1056` | `Guest9 Sample` |
| Hyatt Place Gainesville Downtown | `GG-2026-1064` | `Guest17 Sample` |

The [Hilton](https://www.hilton.com/en/hotels/gvncchf-hilton-university-of-florida-conference-center-gainesville/) and [Hyatt](https://www.hyattplacegnv.com/hotel) names refer to real Gainesville hotels, but these reservations are fictional. This application is not affiliated with or connected to either hotel.

Ask the concierge to check a reservation. Enter the details in the separate form; if they match, a six-digit development-only code appears in the server console. The lookup response is the same for missing or mismatched records. The code expires after five minutes and a verified access token expires after ten minutes; attempts and requests are limited. After verification, AI chat uses the selected hotel, stay dates, room type, guest count, and status as test reservation context. The guest name, confirmation number, and verification code are not included. Disconnect the reservation, start another lookup, or start a new conversation to stop sharing; authorization also expires after ten minutes. The selected property is respected, so Gator Go sample property facts are not applied to other hotels. A relevant chat topic appears in the reservation view. This console simulator does not send email or SMS, and must never be used for real guest data.

After verification, a change request can be saved locally for staff review; no actual booking is changed and no staff member is notified. Configure a private `STAFF_TOKEN` of at least 24 characters and open `/staff.html` to view the local queue. The same queue is available through `GET /api/reservations/staff/requests` with an `Authorization: Bearer <token>` header. The queue and fictional bookings are local SQLite data, not an integration with a hotel. The reservation API also provides `POST /api/reservations/lookup`, `POST /api/reservations/verify`, `GET /api/reservations/me`, and `POST /api/reservations/request-change`; the last two require the short-lived verified bearer token.

To enable the **read-only Mews public test property**, set `MEWS_SANDBOX_ENABLED=true` and add Mews's published sandbox `MEWS_CLIENT_TOKEN` and `MEWS_ACCESS_TOKEN` to `.env`. `RESERVATION_MODE=synthetic` must also be enabled. The adapter uses only `https://api.mews-demo.com`, filters by Mews or channel confirmation number, and checks the guest name locally before issuing a console-only test code. Mews reservation changes are not supported. Mews's [environment documentation](https://docs.mews.com/connector-api/guidelines/environments) says the public sandbox must never contain real data. For a real property, an authorized connection, genuine code delivery, certification, and a separate security/operational review are required; this test adapter cannot be pointed at production.

See [knowledge guidance](docs/knowledge.md) for the approved-data format and importer. After importing verified records, restart the server.

## Checks

```powershell
.venv\Scripts\python.exe -m pytest -q
.venv\Scripts\ruff.exe check backend scripts tests
npm run check
```

For browser checks, install Node 20+, run `npm ci` and `npx playwright install chromium`, start the server, then run `npm run test:ui`. The browser tests stub the provider; they do not prove that a paid API account works. The deterministic provider remains available for automated tests via `MODEL_PROVIDER=mock`; it is not the normal application mode.
