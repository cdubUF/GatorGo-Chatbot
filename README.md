# Gator Go Resort & Spa — virtual concierge

A local course prototype with a FastAPI backend, a resort-themed web interface, sourced FAQ answers, optional model selection, and consent-based **simulated** staff handoffs. Default mode is deterministic and needs no API key. All supplied hotel facts remain **demo-only**; the instructor has not approved them.

## Start

Install Python 3.11+ from python.org. From this directory:

```powershell
# Windows: double-click run.bat, or run:
.\run.bat
```

```bash
# Git Bash, macOS, Linux, or WSL
bash ./run-all.sh
```

Open **http://127.0.0.1:8000**. Ctrl+C stops the API and frontend together. The first launch creates `.venv` and installs dependencies; later launches reuse it. The launchers also attempt to repair an existing environment whose Python is missing. An internet connection is needed for the initial installation, but not to run the mock demo afterward. If no working Python 3.11+ can be found, install Python from python.org and run the launcher again.

Optional: copy `.env.example` to `.env`. Change `PORT` if 8000 is occupied. Never put API keys in frontend files. The server binds to loopback only. `DEMO_MODE=false` excludes every sample policy and fictional reservation; with the currently empty approved knowledge file, hotel questions safely require staff confirmation.

## Demonstrate

1. Ask “What time is check-in?” or “What are the spa hours?” Observe the sample-data label and source ID.
2. Ask “My room is dirty.” Review the prepared summary; **no staff has been contacted**.
3. To demonstrate the queue, set `STAFF_TOKEN` in `.env` to a random value of at least 24 characters and restart. Choose “Allow demo queue submission,” then open `/staff.html` separately and enter the token. Set the simulated disposition to in review or resolved.
4. Type “Start demo check-in,” then `DEMO-2048` and `Parker`. Wrong code/name pairs do not match. `DEMO-3012` pairs with `Lee`. Type “stop” to exit. No real check-in/out, key, charge, or room assignment occurs.
5. Choose New conversation to reset. Safety or human requests interrupt any reservation step.

## Optional model mode

Set `MODEL_PROVIDER=openai`, `MODEL_ID`, and `OPENAI_API_KEY` server-side. The adapter calls the Responses API to select relevant source IDs, then renders the corresponding stored answers. It does **not** generate unrestricted prose or perform hotel actions. Invalid responses, rate limits, and provider outages fall back to explicitly labeled sourced FAQ answers. The adapter has fake-transport tests; the live smoke test encountered HTTP 429 and has not yet succeeded. Model-quality comparison is deferred. See [model selection](docs/model-selection.md).

To check the live connection after configuring `.env`, run `.venv\Scripts\python.exe scripts\model-smoke.py` on Windows (or `.venv/bin/python scripts/model-smoke.py` on macOS/Linux). An HTTP 429 indicates the provider is limiting the request; check API usage, billing, and rate limits. Keep API keys in `.env`, never in the chat or source control.

## Checks

```powershell
.venv\Scripts\python.exe -m pytest -q
.venv\Scripts\python.exe -m ruff check backend scripts tests
.venv\Scripts\python.exe scripts/evaluate.py
```

On macOS/Linux replace `.venv\Scripts\python.exe` with `.venv/bin/python`. Browser checks require Node 20+:

```bash
npm ci
npx playwright install chromium
npm run check
# Start the application in another terminal first.
npm run test:ui
```

Evaluation results and viewport screenshots are written to `artifacts/`. The evaluation uses synthetic scenarios; it does not measure real guest satisfaction or live model quality. [Ticket status](docs/ticket-status.md) records completion evidence and remaining external checks.

## Layout and ownership

```text
frontend/                 HTML/CSS/JS and local SVG avatar — Chris + Gabe
backend/app/              API, schemas, model adapter, routing, sessions — Chris + Bingran
knowledge/                approved/demo records and schema — Wyatt + Bingran
tests/                    backend, behavior, browser scenarios — team
scripts/                  startup, import, evaluation, recording
docs/                     baseline, ticket tracker, presentation and survey
.github/workflows/        automated checks
```

Suggested review ownership: Audrey reviews escalation, consent, and privacy; Wyatt reviews factual grounding and tone; Gabe reviews visual design, accessibility, survey, and presentation. These are suggestions, not GitHub assignments.

Use branches such as `feat/22-handoff-consent` or `fix/11-unknown-facts`. Open a PR describing the user-visible change, ticket planning IDs, tests run, and any remaining limitations. Review source status, empty/error paths, action honesty, and screenshots. The owner has scoped this iteration to a product demo; do not imply unperformed tests or instructor approval.

Knowledge import: `python scripts/import_knowledge.py approved-input.json --dry-run`, review counts, then omit `--dry-run`. See [knowledge guide](docs/knowledge.md). Runtime boundaries, retention, and local-only limitations are described in [architecture](docs/architecture.md) and [privacy](frontend/privacy.html).
