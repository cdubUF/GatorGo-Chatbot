# Local expansion verification

Scope: G01-G11 from GatorGo_Expansion_Tickets.csv. On November 18, 2026 the owner explicitly changed the scope to **local only**, and supplied two visual references for the picker and cabana view. No staging deployment, public URL or hosted release is claimed.

## Run locally

- `run-local.bat`: English sourced FAQ, no paid calls or key needed.
- `run-local-live.bat`: existing server key in `.env`, live text, transcription, 20-language routing. Does not change `.env` or expose its key. Uses the same browser/server on loopback.
- Clean checkout: Python 3.11+, then the launcher installs pinned `requirements.txt` in `.venv`. Node 20+ is only required for browser checks: `npm ci`, `npx playwright install chromium`.
- Open `http://127.0.0.1:8000`, or the configured `PORT`. One process owns the static frontend and API. Loopback supports browser media without a hosted certificate. A phone cannot reach another computer's loopback; physical-phone camera/microphone qualification needs a separately configured trusted HTTPS connection and was not performed.

## Ticket evidence and limits

| Ticket | Implemented locally | Qualification remaining |
| --- | --- | --- |
| G01 | Three illustrated cards, keyboard/touch selection, visible checkmark/name, tab selection storage, preview and continue | None for automated local journey |
| G02 | Existing transcript/evidence/composer, per-guide header and bubbles, preserved conversations, idle/thinking/error states, responsive stacked scene, reduced motion | Real phone keyboard behavior |
| G03 | Approved records override conflicting samples; explicit unknown without approved facts; approved contact when present; reload/new-instance regression; four-domain fictional test set | Genuine property facts were not supplied; `knowledge/approved.json` remains empty |
| G04 | Separate start/stop/cancel, editable transcript, shared typed submission/session, independent mic capture, 30-second verified PCM duration, 4 MiB upload cap, in-memory discard and cleanup | Live transcription and physical microphone qualification across devices |
| G05 | Optional browser voice, stop/mute, speaking mouth frames tied to playback start/end/error, recording interrupts playback, text/voice fallback | Device voice availability and native-listener review in all languages; animation is playback-gated, not phoneme-exact lip sync |
| G06 | Camera off by default, local self-preview only, independent controls, permission/device recovery, all tracks stop on off/hide/leave | Real camera/phone testing; synthetic Chromium network trace verifies no uploads |
| G07 | Named 20-language matrix, auto-detection/English retrieval query, manual reply override, localized replies/fallbacks, numeric preservation rejection, RTL Arabic, live qualification runner | 20 independently recorded utterances, real-provider accuracy, names/prices review and per-device voice matrix are not claimed |
| G08 | Global limit independent of sessions, speech quota, pre-provider body/media/duration validation, durable conservative spending reservations, safe errors/logging | Deployment-wide distributed controls are outside local scope; reserve rates need review when model/prices change |
| G09 | Local synthetic routes retained; hosted profile blocks staff/reservation/handoff routes, exact trusted hosts/origins, CSP and media permissions; public readiness fails without current approved facts | Hosted HTTPS verification excluded by requested scope |
| G10 | Reproducible local launch, health/readiness, restart behavior and rollback procedure | HTTPS staging deployment excluded by requested scope |
| G11 | Pytest and Playwright critical journeys, desktop/phone-width screenshots, denied permissions, failed requests, unknown facts, media cleanup, RTL and playback events | Physical phone and 20-language human qualification; no production release claim |

## Data and media

`tests/fixtures/reference-knowledge.json` covers dining, arrival, amenities and transportation. Its `approved` statuses exist ONLY inside fictional automated fixtures. They do not authorize real property claims and are never loaded by the normal app. The existing sample dataset stays visibly labeled in chat.

Missing property facts: authoritative check-in/out policy; named dining venues/hours/prices; amenity hours/access rules; transportation schedules and verified front-desk contact. Import genuine approved records with the existing importer and restart. Fresh sessions use the new data. No booking or staff-notification integration was added.

Recorded audio is mono 16-bit PCM WAV, up to 30 seconds and 4 MiB. Browser and server both enforce boundaries. There are no temporary audio files. Cancellation stops local capture and aborts upload; it cannot retract audio already sent to the transcription provider. Camera frames never enter recording or fetch code. Device speech voices may have their own OS network behavior.

## Language matrix

English (en), Spanish (es), French (fr), German (de), Italian (it), Portuguese (pt), Dutch (nl), Swedish (sv), Danish (da), Norwegian (no), Finnish (fi), Polish (pl), Turkish (tr), Russian (ru), Ukrainian (uk), Arabic (ar, RTL), Hindi (hi), Japanese (ja), Korean (ko), Chinese (zh).

`tests/fixtures/language-matrix.json` contains a check-in and unknown-fact question for each. `tests/test_expansion.py` verifies the language contract with deterministic fictional providers; this is not evidence of real recognition accuracy. The mock local app advertises English only. The live app advertises the 20 configured languages.

For opt-in live qualification, put independent human recordings at a private folder as `en.wav`, `es.wav`, etc., start the live app, then run:

```powershell
.venv\Scripts\python.exe scripts\qualify_languages.py --recordings C:\private\gator-recordings
```

This makes paid calls and can hit the configured quota/budget. Results contain actual answer/source/locale and mark missing recordings explicitly. Review with native speakers for names, prices, intent and natural language; record browser/OS and voice name separately. Do not commit private recordings or guest transcripts.

## Budget and lifecycle

The process admits at most 120 chat/speech requests per minute in total and 10 speech requests per minute, regardless of session ID; each session also retains its existing 30/minute limit. Defaults are configurable. These are intentionally global local limits, so clients sharing the instance share the quota.

Every attempted paid provider call, including retries and translation, atomically reserves the configured amount before contacting the provider. Default live launcher total is $10 and reserve is $1/call. Reservations are not refunded, so this deliberately overestimates billing. The SQLite ledger persists across process restart; do not delete it to refill the budget. Raise the total deliberately if needed. This is an application reservation ceiling, not a statement of provider pricing: configure reserves to exceed the maximum cost of the bounded request and use provider-side account controls as well. A model/pricing change requires reviewing those reserve amounts. Runtime settings loaded without a budget default to 0 (paid calls fail closed).

Chat sessions, speech/camera state, and per-minute counters are in memory. Restart clears sessions and queues; the browser's next request receives a new server session. The guide choice stays in session storage for the tab. The budget ledger survives. Run exactly one process for this local architecture.

Rollback locally: stop the server, switch to a previous known-good checkout (preserve `.env` and the budget ledger outside source snapshots), run its documented launcher, open a fresh browser chat and check `/api/health`. Do not overwrite local user changes. No hosted rollback is claimed.

## Live smoke evidence

The English and Spanish live-provider smoke tests passed with automatic detection, matching reply locales, the `checkin` source and preserved `3:00 PM`. Results are in `artifacts/live-expansion-smoke.json`. Initial sandbox network failures were retried with approved network access. This limited smoke test does not qualify all 20 languages.

## Checks

Final local checks: **141 pytest tests, 19 browser tests, and 34 deterministic scenarios passed**. Ruff and JavaScript syntax checks passed. An additional isolated-server browser smoke passed.

Run `.venv\Scripts\python.exe -m pytest -q`, `.venv\Scripts\ruff.exe check backend scripts tests`, `npm run check`, then `npm run test:ui`. Playwright starts and stops its own isolated mock server on port 8012; set `TEST_BASE_URL` only to target an already-running instance. Screenshots are in `artifacts/expansion-*.png` and the HTML test report is in `playwright-report/`.

Tested base revision: `79c09325a938153d1a63156c12edecf8ea7cb0d1`, plus the uncommitted expansion changes. Final run results are recorded in `artifacts/expansion-checks.txt`.

## Artwork

Built-in image generation produced project assets `frontend/assets/stadium-resort.png` and `frontend/assets/gator-atlas.png`. The atlas has closed/open mouth rows for each guide and preserves transparent alpha. Prompts and provenance are in `docs/expansion-image-prompts.md`. The stadium/resort is a fictional composite, not a photograph of an existing UF resort or a claim of affiliation.


## Live-demo revision (2026-11-18)

Replaced device speech with server-generated AI WAV audio; added an in-memory voice endpoint with existing global/speech admission and durable budget reservations. Mouth opening follows decoded audio amplitude, not a free-running talking timer. Start conversation detects a pause, submits the transcript, plays the answer, and reopens the microphone after playback. Manual recording/transcript correction remains available. Added blink frames, idle movement, outdoor desk, and height-bounded staging; removed automatic input focus that scrolled the scene offscreen on mobile.

Live provider roundtrip passed: generated test question -> actual transcription -> grounded check-in answer -> actual AI speech (319244-byte WAV). Evidence: artifacts/live-voice-smoke.json and artifacts/ai-answer-smoke.wav. Input was generated audio, not a human recording; physical microphone/speaker conditions and all 20 live languages remain unqualified.

Speech API model deprecation is documented in README. Local hosting scope remains unchanged.
