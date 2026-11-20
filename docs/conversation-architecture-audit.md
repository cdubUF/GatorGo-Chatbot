# Conversation architecture audit and implementation

The pasted architecture review was checked against the actual repository on November 19, 2026. Streaming audio, microphone permissions, local voice activity detection, cancellation, structured resort records, source filtering, language routing, themes and media cleanup already existed. The remaining local gaps were shared session identity, useful bounded memory, compound question handling, a validated realtime tool bridge, central avatar states and reproducible architecture checks. These are now implemented; this is a local assistant, not a connected production front desk.

## What changed

- `backend/app/conversation.py` owns the text and recorded-voice pipeline: session locking, language routing, policy/retrieval, answer generation, translation, feedback and numeric tracing. HTTP routes delegate to it. Realtime voice keeps its direct audio transport and uses the same session memory and deterministic knowledge/policy services through explicitly registered tools.
- `frontend/conversation.js` holds one session ID and temporary voice capability in tab memory. Typed answers, recorded turns and realtime negotiation adopt that ID. Transcribed voice turns sync idempotently to the server. Switching to text waits for pending sync and retries a failed sync before submitting. Reset invalidates pending client work and deletes the old server session.
- `backend/app/memory.py` keeps a bounded window of screened actual questions/replies, controlled preferences and the eight most recent sourced topics. Truncating older turns does not discard the selected venue or preferences. Sensitive/injection matches and reservation replies are omitted. This is deterministic structured compaction, not an unbounded transcript or an LLM summary. Screening is imperfect: do not enter real private data. Spoken assistant wording is not promoted into verified facts.
- `backend/app/intents.py` splits supported compound requests. Policy examines the full utterance first, so an emergency cannot be hidden in a later clause. Sources and actions are combined. Model synthesis uses the resolved evidence once. Unsupported facts stay unknown. Named venue comparisons and weekend/weekday follow-ups use structured dates; dated exceptions override weekly hours, then normal hours.
- `backend/app/tools.py` registers only `lookup_resort`, `list_activities` and `prepare_handoff`. Models request tools; the server validates names and strict argument models. Knowledge lookup uses a copy of conversation state, preventing a late tool result from overwriting newer guest memory. Recent tool IDs are idempotent and cannot be reused with different arguments; the result cache is bounded to 100 entries. Per-session and global limits bound requests. Handoff preparation returns a reviewable draft, never a dispatch confirmation.
- `frontend/conversation-state.js` centralizes idle, connecting, listening, thinking, speaking, interrupted, muted and error states with allowed transitions. Existing audio analysers still own mouth movement. Faces and hands observe this state. State traces retain numeric timestamps and state names only.
- Realtime tools execute only from completed responses, never partial/cancelled function arguments. Duplicate completion events are ignored; interruption or ending/resetting a call suppresses late tool continuations. Tool rounds are bounded. Tool-returned source links appear beside spoken answers.
- Turn identifiers remain monotonic when the 100-entry timing window rolls over, so newer voice turns cannot overwrite earlier bubbles or be mistaken for retried sync requests. Reset aborts pending voice sync, and typing while microphone permission is pending cancels capture before it starts.
- A reset defect exposed by the new voice/text test was fixed: the optional reservation introduction may have been removed, so reset must tolerate the missing intent element.

## Knowledge and retrieval

The current resort corpus is small and structured. Each validated record is already an atomic knowledge chunk with source, status, date, tags and optional venue data. Lexical/alias retrieval filters expired, contradictory and injected records and gives approved property data precedence over samples. Topic filtering prevents unrelated fee guidance from answering a pool-fee question. Structured venue resolution handles dates before the model phrases the response.

No embedding service or vector database was added. Embeddings are an optional scaling/relevance improvement, not evidence that an answer is correct. They should be evaluated against these same source/expiry/attribute checks if longer unstructured documents are introduced. No availability endpoint exists: static knowledge cannot establish live inventory, reservations or capacity.

## The 16-item roadmap

| Item | Local implementation and evidence | External/release requirement |
| --- | --- | --- |
| Reusable conversation services | ConversationEngine; frontend conversation and state modules | None for local demo |
| Streaming audio and VAD | WebRTC speech-to-speech; bounded local VAD; streamed legacy PCM | Live device/network listening tests |
| One voice/text session | Shared ID, realtime context seed, screened voice sync, reset | Multi-device continuity needs authenticated storage |
| Interruptions and cancellation | Audio clear/cancel, stale-event guards, cancelled-tool suppression | Measure acoustic echo/interrupt success on target hardware |
| RAG with citations | Structured chunks, source/status/expiry filtering; spoken tool citations | Populate and approve actual resort content |
| Multi-turn memory | Bounded turns, structured topic/preferences summary, TTL | Privacy review before real guest use |
| Compound questions and tools | Multi-intent planner; three validated tools; idempotency and limits | Real inventory/service adapters require separate authorization |
| Multilingual processing | Existing detection/translation pipeline and language fixtures retained | Qualify each target language with live audio and human review |
| Avatar synchronization | Shared state machine; existing audio-driven mouth, faces and gestures | Hardware listening/visual review |
| Responsive layout and themes | Existing mobile/desktop, light/dark/system themes retained | Review target devices |
| Accessible controls | Labelled text, mic, mute, interrupt, captions, reduced motion | Formal assistive-technology audit before release |
| Connection and error states | Explicit central states and existing user-facing status messages | Production reconnect/availability monitoring |
| Authentication, authorization, limits, secrets | Existing server-only keys, origin/host checks, staff/synthetic verification; new scoped voice capabilities and tool limits | Capability tokens are not guest identity verification; add real IdP/SSO before private property tools |
| Sensitive-action validation/approval | Allowlisted schemas; review-only handoffs; existing explicit demo consent | No live write tools; real actions need verified guest scope, approval and audited hotel adapters |
| Tests and evaluation datasets | Backend/browser regressions; 34 original scenarios and eight architecture scenarios | Live model and language qualification |
| Tracing, monitoring, deployment checks | Per-response trace ID and phase timings; content-free local diagnostics; evaluations in CI; existing readiness checks | Hosted telemetry, alerting, secrets deployment and security/load review |

## Validation

Run from the repository root:

```powershell
.venv\Scripts\python.exe -m pytest -q
.venv\Scripts\python.exe -m ruff check backend scripts tests
.venv\Scripts\python.exe scripts/evaluate.py
.venv\Scripts\python.exe scripts/evaluate_conversations.py
npm.cmd run check
npm.cmd run test:ui
```

Validation completed: 174 backend tests passed; the full 67-case browser suite passed, followed by a 16-case focused run covering the updated transports and three new regressions (70 distinct browser cases in total). Ruff, JavaScript syntax checks and whitespace checks passed. The original 34 scenario contracts and the eight new architecture contracts passed.

The new evaluation writes `artifacts/conversation-evaluation.json`, reporting individual contract results and server phase timings. `/api/diagnostics` is local-only and contains counters, not guest text. Language, answer and translation timings are separate from microphone-to-speaker latency. Existing browser latency reports remain the appropriate transport measurement, with their explicit acoustic limitation.

The suggested 1.5-second voice latency, 95% factual/context/interrupt accuracy and 99% tool-execution success are targets, not claims made by these fixtures. Curated mock pass rates do not establish live-model accuracy or production reliability. Current validation uses synthetic fixtures and mocked provider/voice events; no real hotel operations or deployment were performed.

## Trying the improved flow

Start `run-local-live.bat`, open the printed local HTTP address, choose a guide and start a call. Ask about Lagoon Pool, then ask "What about on weekends?". Ask "What time does it close? And is there somewhere to eat nearby?". End the call and continue typing about the same venue. New conversation clears that context. A request for towels can produce a reviewable handoff summary; it cannot send housekeeping to a room.

Realtime protocol implementation follows the [official conversation guide](https://developers.openai.com/api/docs/guides/realtime-conversations) and [official realtime tools guide](https://developers.openai.com/api/docs/guides/realtime-mcp).
