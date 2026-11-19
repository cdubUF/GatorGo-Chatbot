## Live voice demo

Run `run-local-live.bat`, open the localhost URL it prints, choose a guide, then press **Start conversation** and allow the microphone. Speak a question and pause for about 1.4 seconds. The gator answers with AI-generated speech, moves its mouth with the audio, then listens for your next question. **End conversation** stops the loop. Use **Talk to gator** / **Stop recording** for a single turn; uncheck **Send when recording stops** to review the transcript first. **Stop audio** interrupts speech, and **Replay reply** repeats the last answer. Camera is optional and stays local.

The scene includes an outdoor teak desk, height-constrained characters, randomized blinks and subtle idle movement. Reduced-motion preference disables idle movement and blinks. AI speech uses server-side credentials, never a browser API key. The local demo still uses fictional resort knowledge and cannot make bookings or contact staff.

Voice requires a funded API account and available configured budget. The durable conservative budget ledger is preserved across restarts; test calls consume its allowance. The live launcher defaults to $0.25 reserved per bounded provider call, within the unchanged $10 cumulative allowance; these are conservative reservations, not reported actual costs. Explicit environment overrides take precedence. `PROVIDER_BUDGET_USD` and per-call reserve settings remain operator-controlled. Audio errors leave the text answer available. A real microphone/speaker rehearsal on the presentation computer is still necessary.

The current local voice adapter uses `gpt-4o-mini-tts` with Marin/Cedar. OpenAI documents retirement of this Speech API model on January 6, 2027; migrate this adapter to the Realtime API before then. See https://developers.openai.com/api/docs/guides/text-to-speech .

# Gator Go virtual concierge

Gator Go is a local FastAPI and browser application that uses OpenAI to answer questions. The server handles the API key and logs request status and sanitized provider error categories; it does not log guest messages or keys.

## Guest experience expansion (local)

Use **`run-local.bat`** for a no-key, no-charge English FAQ demo. Use **`run-local-live.bat`** for live text, speech transcription and automatic language routing using the server's existing `OPENAI_API_KEY` in `.env`. Both serve the app at `http://127.0.0.1:8000` (or `PORT`) and disable reservation testing. Loopback is a browser secure context for microphone/camera use. These launchers do not deploy anything.

Choose one of three gators, continue into chat, and use **Change guide** to switch while preserving the conversation. **Record question** captures up to 30 seconds; stop, review/edit the transcript and send. Enable **Speak replies** for the device voice and animated mouth, or stop/mute playback at any time. Click the gator to say hello. Camera is an independent local self-preview. Blue/green styling and the stadium-resort backdrop follow the supplied references.

The live launcher allows $10 of cumulative conservative request reservations, at $1 per provider call including retries. This is deliberately stricter than actual billing; a multilingual turn can use multiple reservations. The ledger persists in `data/provider-budget.sqlite3`, and restarting does not refill it. Increase the configured total only deliberately. Set the budget to 0 to stop paid calls. See [local expansion verification](docs/expansion-verification.md) for test evidence, language qualification limits, restart/rollback and exact ticket status.

## Start

Install Python 3.11 or newer, copy `.env.example` to `.env`, and set `OPENAI_API_KEY` in `.env`. Keep the file private. `MODEL_PROVIDER=openai` and `DEMO_MODE=false` are the defaults. The OpenAI API requires network access and may incur usage charges.

The default model is `gpt-6-astra`, using low reasoning effort for chat. As of November 2, 2026, OpenAI lists standard text pricing of $10 per million input tokens and $50 per million output tokens; see the [official model page](https://developers.openai.com/api/docs/models/gpt-6-astra) for current pricing. Set `MODEL_ID` in `.env` to use another supported model.

On Windows, double-click `run.bat` or run `./run.bat`. In Git Bash, macOS, Linux, or WSL, run `bash ./run-all.sh`. The launcher checks Python and installs project dependencies when necessary. Open **http://127.0.0.1:8000** and use Ctrl+C to stop the server. If port 8000 is occupied, stop the other service or set `PORT` in `.env`.

The local server uses HTTP, not HTTPS. If the console reports an HTTPS request on the HTTP port, open the printed `http://127.0.0.1:8000` address exactly and check whether the browser is forcing secure connections. Other malformed requests still appear as warnings.

The console displays startup settings, request status and timing, and safe error codes. Run `.venv\Scripts\python.exe scripts\model-smoke.py` on Windows (or `.venv/bin/python scripts/model-smoke.py` on macOS/Linux) to test the configured model. A 429 response requires checking API billing, quota, and rate limits. Avoid posting keys or guest data when sharing diagnostics.

## Knowledge and limits

Open **Knowledge base** in the app to inspect the resort topics the assistant uses. Edit `knowledge/demo.json` to update the project test information. Each entry has a topic, answer, category, source, status, and searchable tags. The server retrieves relevant entries for each question and sends them to the model; it does not train the model. Instructor-provided information can replace the sample records using the importer described below.

The application uses the 14 original hotel records in `knowledge/demo.json` as project test data. It also retrieves six general hotel guidance records and uses 360 example question phrasings extracted from the Bitext Hospitality and Customer Support datasets to recognize relevant topics. This is retrieval, not model training. The dataset examples do not establish policies or services at a real property. `knowledge/approved.json` can hold verified property facts, which take priority over overlapping test data. Set `SAMPLE_KNOWLEDGE=false` to exclude the test records and general guidance.

The application cannot make reservations, change bookings, charge guests, dispatch services, or notify staff. Handoff summaries are displayed to the guest for direct contact. The app binds to localhost and is not ready for public deployment or actual hotel operations.

## Local reservation verification

Reservation lookup is disabled by default. To exercise the verification flow with **fictional data only**, run `.venv\Scripts\python.exe scripts\seed_reservations.py` on Windows (or `.venv/bin/python scripts/seed_reservations.py` on macOS/Linux), set `RESERVATION_MODE=synthetic` in `.env`, and restart. The script creates 24 fictional records in ignored `data/synthetic-hotel-reservations.sqlite3` and refuses to overwrite an existing database. It preserves any earlier `synthetic-reservations.sqlite3` database.

Use this fictional Gator Go confirmation and name:

Use **AI chat** and **Reservation testing** at the top of the interface to switch views. Open **Sample reservation details** for test credentials, and use **Start another lookup** to reset the form. Switching views preserves the current chat and lookup.

| Test hotel | Confirmation | Full name |
|---|---|---|
| Gator Go Resort & Spa | `GG-2026-1048` | `Guest1 Sample` |

Ask the concierge to check a reservation. Enter the details in the separate form; if they match, a six-digit development-only code appears in the server console. The lookup response is the same for missing or mismatched records. The code expires after five minutes and a verified access token expires after ten minutes; attempts and requests are limited. After verification, AI chat uses the selected hotel, stay dates, room type, guest count, and status as test reservation context. The guest name, confirmation number, and verification code are not included. Disconnect the reservation, start another lookup, or start a new conversation to stop sharing; authorization also expires after ten minutes. A relevant chat topic appears in the reservation view. This console simulator does not send email or SMS, and must never be used for real guest data.

After verification, a change request can be saved locally for staff review; no actual booking is changed and no staff member is notified. Configure a private `STAFF_TOKEN` of at least 24 characters and open `/staff.html` to view the local queue. The same queue is available through `GET /api/reservations/staff/requests` with an `Authorization: Bearer <token>` header. The queue and fictional bookings are local SQLite data, not an integration with a hotel. The reservation API also provides `POST /api/reservations/lookup`, `POST /api/reservations/verify`, `GET /api/reservations/me`, and `POST /api/reservations/request-change`; the last two require the short-lived verified bearer token.

See [knowledge guidance](docs/knowledge.md) for the approved-data format and importer. After importing verified records, restart the server.

## Checks

```powershell
.venv\Scripts\python.exe -m pytest -q
.venv\Scripts\ruff.exe check backend scripts tests
npm run check
```

For browser checks, install Node 20+, run `npm ci` and `npx playwright install chromium`, start the server, then run `npm run test:ui`. The browser tests stub the provider; they do not prove that a paid API account works. The deterministic provider remains available for automated tests via `MODEL_PROVIDER=mock`; it is not the normal application mode.
