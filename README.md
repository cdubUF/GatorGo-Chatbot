## Cabana Call: twenty-ticket expansion



Open the local app and press **Talk to Gator** on the welcome screen to start a live voice session. The cream Palm House layout follows the supplied safari references. Spoken questions and answers appear once per speaker in the conversation, without changing a typed draft. **Mute mic**, **Interrupt**, and **End call** control the active session. Replies finish by default; **Voice interruption** enables optional hands-free barge-in. **Settings** offers Lagoon, Palm House, and Coastal Deco themes with independent Light, Dark, and System modes saved on this device.



Use **Activities**, **My plans**, and **Map** in the header. Activities and venues are explicitly fictional sample records. Saved plans last for the current conversation only. Source links open a specific searchable knowledge card. **Call answer & timing** exposes the latest call reply and exports client-clock timing data; captions can be toggled beside audio controls. Preview-corner choices never reopen the camera.



Records: `knowledge/venues.json` and `knowledge/events.json`. `RESORT_TIMEZONE` defaults to `America/New_York`; install pinned requirements including `tzdata` on Windows. The sample pool closure is November 19, 2026; November 20 returns regular hours. Calendar fixtures intentionally use November 18?19, 2026, with honest empty states on other dates.



Validation and remaining hardware acceptance: [docs/20-ticket-verification.md](docs/20-ticket-verification.md). Run `python scripts/evaluate.py --coverage` for curated missing-topic reporting. Coverage fixtures never ingest guest conversations. Feedback aggregates are available at `/api/feedback/aggregate` in the local profile only and reset with the server.



The local live launcher now uses a persistent Realtime/WebRTC speech-to-speech connection. Recorded single-turn and typed-reply audio retain the existing Speech API adapter. Set `REALTIME_ENABLED=false` to use the legacy turn pipeline.



## Live voice demo



Run `run-local-live.bat`, open the localhost URL it prints, choose a guide, then press **Start call** and allow the microphone. Speak a question and pause naturally. The gator answers with AI-generated speech, moves its mouth with the audio, then listens for your next question. **End call** stops the loop. Use **Talk to gator** / **Stop recording** for a single turn; uncheck **Send when recording stops** to review the transcript first. **Stop audio** interrupts speech, and **Replay reply** repeats the last answer. Camera is optional and stays local.



The scene includes an outdoor teak desk, height-constrained characters, randomized blinks and subtle idle movement. Reduced-motion preference disables idle movement and blinks. AI speech uses server-side credentials, never a browser API key. The local demo still uses fictional resort knowledge and cannot make bookings or contact staff.



Voice requires a funded API account. The user authorized disabling the conservative local reservation cutoff (`LOCAL_BUDGET_CUTOFF=false`); the ledger is retained as an estimate, not actual billing. Provider account limits are unchanged. Realtime mode is local-only and requires this explicit cutoff opt-out, since a continuous session does not map to bounded per-request reservations.



The current local voice adapter uses `gpt-4o-mini-tts` with Marin/Cedar. OpenAI documents retirement of this Speech API model on January 6, 2027; migrate this adapter to the Realtime API before then. See https://developers.openai.com/api/docs/guides/text-to-speech .



# Gator Go virtual concierge



Gator Go is a local FastAPI and browser application that uses OpenAI to answer questions. The server handles the API key and logs request status and sanitized provider error categories; it does not log guest messages or keys.



## Guest experience expansion (local)



Use **`run-local.bat`** for a no-key, no-charge English FAQ demo. Use **`run-local-live.bat`** for live text, speech transcription and automatic language routing using the server's existing `OPENAI_API_KEY` in `.env`. Both serve the app at `http://127.0.0.1:8000` (or `PORT`) and disable reservation testing. If an old server is already running, stop it with Ctrl+C before launching again, then refresh the printed URL. Allow microphone access in the browser site settings. If WebRTC audio cannot connect, calls automatically switch to streamed voice after the connection timeout; no microphone reconnection is needed. Loopback is a browser secure context for microphone/camera use. These launchers do not deploy anything.



Choose one of three gators, continue into chat, and use **Change guide** to switch while preserving the conversation. **Record question** captures up to 30 seconds; stop, review/edit the transcript and send. Enable **Speak replies** for the device voice and animated mouth, or stop/mute playback at any time. Click the gator to say hello. Camera is an independent local self-preview. The safari mascot, cream split layout, illustrated map, and navy dark mode follow the latest supplied references.



The local reservation cutoff is disabled as authorized. Hosted profiles continue enforcing their configured budget and do not expose this local Realtime endpoint. See `docs/realtime-latency.md` for measurement details.



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



Local live demo: `run-local-live.bat` sets `LOCAL_BUDGET_CUTOFF=false` as authorized. The conservative reservation ledger continues accumulating but does not disable local calls; it is not actual billing. Set this flag to `true` to restore the configured cutoff. Hosted profiles always enforce the cutoff. Provider account settings and request rate limits are unchanged.



## Expanded fictional demo data



The local sample knowledge base now exposes 144 searchable records, including 105 additional resort Q&A examples and 20 entirely fictional customer profiles. Open `/knowledge.html` to search by topic, guest name or demo ID. Ask ?What room is Alex Morgan in?? followed by ?When do they check out?? or ?Is breakfast included?? Both typed chat and new live voice sessions use the fixture data. These profiles are read-only and never authorize real reservation access.



See [the example questions and customer directory](docs/sample-demo-examples.md). Edit `knowledge/expanded.json` and `knowledge/sample-customers.json`, or regenerate the original fixtures with `python scripts/build-sample-content.py`; restart the server after changing data.


### Guest trip demo and collapsible chat

On the local sample app, ask “What is my room number?” and enter or say `demo` when asked for a trip ID. This selects Alex Morgan’s fictional stay (room 201, checkout November 20, 2026 at 11 AM, breakfast included). The selection lasts for the conversation; it is not real guest authentication. General resort questions do not require a trip ID. The separate synthetic reservation verification mode retains its existing authorization flow.

Use **Close chat** to expand the cabana scene and **Chat** to reopen the sidebar. Closing it preserves the draft, conversation, and active call. **End call** releases the microphone.

Realtime audio now rejects brief input spikes during playback, tolerates transient connection loss for three seconds, and allows 450 ms of silence within a question before committing the turn. This favors complete conversation over the previous aggressive 240 ms detector; it does not guarantee half-second response latency.


Live voice enables hands-free interruption by default. You can also use **Interrupt** to speak sooner without ending the call. Turn off **Voice interruption** when speaker echo causes unwanted cancellations. Playback completion is recorded separately from generation completion and waits for the browser audio tail to drain.


## Unified conversation architecture

Text, recorded voice and realtime calls share a session and bounded screened memory. Weekend follow-ups and supported compound questions keep venue context. Realtime can request sourced knowledge, list dated activities and prepare a reviewable handoff through server-validated tools; it cannot book or dispatch staff. Source links from lookups accompany spoken replies. New conversation clears the shared context.

The implementation audit, 16-item roadmap, validation commands and remaining production requirements are in [docs/conversation-architecture-audit.md](docs/conversation-architecture-audit.md). Run `.venv\Scripts\python.exe scripts/evaluate_conversations.py` for the new architecture regression report. Existing launch commands are unchanged.
