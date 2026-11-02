# Gator Go Resort & Spa — GitHub issue backlog

**42 draft issues** based on the project plan, instructor requirements, market-examination video handout, and inspected prototype.

**Existing prototype:** static `index.html`, `styles.css`, `app.js`, `knowledge_base.json`, and `README.md`. The bot is currently rule-based and uses invented **demo-only** hotel facts. No backend, live LLM, real bookings, or real staff notifications are implemented.

**Important:** Ticket IDs 01–42 are planning IDs, *not* real GitHub issue numbers. Suggested owners are based on team responsibilities in the project plan and are not assignments.

## Recommended implementation order

1. **Minimum demo foundation:** 01–06, 08–09, 11–12, 14–18, 20–22, 27–29, 32, 34–35, 37–38.
2. **Finish core product:** 07, 10, 13, 19, 23–26, 30–31, 33, 36, 39, 41.
3. **Optional if time remains:** 40 and 42.

## Quick index

| ID | Ticket | Priority | Owner | Dependencies |
|---|---|---|---|---|
| 01 | [Audit the existing chatbot prototype and establish the MVP baseline](issues/01-audit-the-existing-chatbot-prototype-and-establish-the-mvp-baseline.md) | P0 | Chris + Bingran | — |
| 02 | [Create maintainable frontend/backend project structure](issues/02-create-maintainable-frontend-backend-project-structure.md) | P0 | Chris + Bingran | 01 |
| 03 | [Create one-command startup scripts for Windows and macOS/Linux](issues/03-create-one-command-startup-scripts-for-windows-and-macos-linux.md) | P0 | Chris | 02, 04, 05 |
| 04 | [Configure dependencies, environment variables, and safe secrets handling](issues/04-configure-dependencies-environment-variables-and-safe-secrets-handling.md) | P0 | Bingran | 02 |
| 05 | [Implement FastAPI backend foundation and health endpoint](issues/05-implement-fastapi-backend-foundation-and-health-endpoint.md) | P0 | Bingran | 02, 04 |
| 06 | [Connect existing chat UI to backend API with graceful offline fallback](issues/06-connect-existing-chat-ui-to-backend-api-with-graceful-offline-fallback.md) | P0 | Chris | 05, 15 |
| 07 | [Write contributor setup, branching, and local run documentation](issues/07-write-contributor-setup-branching-and-local-run-documentation.md) | P1 | Chris | 02, 03, 04, 05 |
| 08 | [Collect and distinguish instructor-approved hotel information from prototype samples](issues/08-collect-and-distinguish-instructor-approved-hotel-information-from-pro.md) | P0 | Wyatt + Bingran | 01 |
| 09 | [Define structured hotel knowledge schema with categories and provenance](issues/09-define-structured-hotel-knowledge-schema-with-categories-and-provenanc.md) | P0 | Bingran + Wyatt | 08 |
| 10 | [Build knowledge import and validation pipeline](issues/10-build-knowledge-import-and-validation-pipeline.md) | P1 | Bingran | 09 |
| 11 | [Implement searchable knowledge retrieval service](issues/11-implement-searchable-knowledge-retrieval-service.md) | P0 | Bingran | 09 |
| 12 | [Handle missing, conflicting, and outdated hotel information](issues/12-handle-missing-conflicting-and-outdated-hotel-information.md) | P0 | Wyatt + Bingran | 09, 11 |
| 13 | [Create hotel FAQ coverage map and test question set](issues/13-create-hotel-faq-coverage-map-and-test-question-set.md) | P1 | Wyatt | 08, 11 |
| 14 | [Evaluate LLM provider/model choice and document tradeoffs](issues/14-evaluate-llm-provider-model-choice-and-document-tradeoffs.md) | P0 | Chris + Bingran | 04 |
| 15 | [Implement server-side LLM adapter and configurable mock mode](issues/15-implement-server-side-llm-adapter-and-configurable-mock-mode.md) | P0 | Chris + Bingran | 05, 14 |
| 16 | [Define concierge system prompt, personality, and instruction boundaries](issues/16-define-concierge-system-prompt-personality-and-instruction-boundaries.md) | P0 | Wyatt + Chris | 14, 15 |
| 17 | [Implement session state and multi-turn conversation context](issues/17-implement-session-state-and-multi-turn-conversation-context.md) | P0 | Chris | 05, 15, 16 |
| 18 | [Build retrieval-augmented answer generation with source grounding](issues/18-build-retrieval-augmented-answer-generation-with-source-grounding.md) | P0 | Chris + Bingran | 11, 12, 15, 16, 17 |
| 19 | [Add AI safety and prompt-injection regression protections](issues/19-add-ai-safety-and-prompt-injection-regression-protections.md) | P1 | Chris + Bingran | 16, 18 |
| 20 | [Implement three-level request decision framework (AI / assisted / human)](issues/20-implement-three-level-request-decision-framework-ai-assisted-human.md) | P0 | Audrey + Chris | 16 |
| 21 | [Detect explicit human requests, serious complaints, distress, and emergencies](issues/21-detect-explicit-human-requests-serious-complaints-distress-and-emergen.md) | P0 | Audrey + Bingran | 20 |
| 22 | [Generate transparent staff-handoff summaries and guest consent flow](issues/22-generate-transparent-staff-handoff-summaries-and-guest-consent-flow.md) | P0 | Audrey + Chris | 20, 21 |
| 23 | [Provide an internal handoff queue or clearly labeled demo dashboard](issues/23-provide-an-internal-handoff-queue-or-clearly-labeled-demo-dashboard.md) | P1 | Audrey + Bingran | 22, 27 |
| 24 | [Improve sample reservation lookup and simulated check-in/check-out flows](issues/24-improve-sample-reservation-lookup-and-simulated-check-in-check-out-flo.md) | P1 | Bingran + Chris | 17, 20, 27 |
| 25 | [Support guest maintenance and housekeeping service-request triage](issues/25-support-guest-maintenance-and-housekeeping-service-request-triage.md) | P1 | Audrey + Chris | 20, 21, 22 |
| 26 | [Implement optional local-area and transportation guidance based on verified sources](issues/26-implement-optional-local-area-and-transportation-guidance-based-on-ver.md) | P2 | Wyatt + Bingran | 08, 11, 18 |
| 27 | [Minimize guest data and document safe handling of sensitive requests](issues/27-minimize-guest-data-and-document-safe-handling-of-sensitive-requests.md) | P0 | Chris + Audrey | 05, 17, 20 |
| 28 | [Polish the guest concierge interface for a modern resort experience](issues/28-polish-the-guest-concierge-interface-for-a-modern-resort-experience.md) | P0 | Gabe + Chris | 02, 06 |
| 29 | [Design and integrate a recognizable concierge avatar](issues/29-design-and-integrate-a-recognizable-concierge-avatar.md) | P0 | Gabe | 28, 16 |
| 30 | [Improve conversation composer, suggested prompts, and loading behavior](issues/30-improve-conversation-composer-suggested-prompts-and-loading-behavior.md) | P1 | Chris | 06, 28 |
| 31 | [Add accessible, mobile-friendly interaction and keyboard support](issues/31-add-accessible-mobile-friendly-interaction-and-keyboard-support.md) | P1 | Gabe + Chris | 28, 30 |
| 32 | [Display escalation state and action limits directly in the guest UI](issues/32-display-escalation-state-and-action-limits-directly-in-the-guest-ui.md) | P0 | Audrey + Gabe | 22, 28 |
| 33 | [Create backend unit tests for retrieval, chat schemas, routing, and sessions](issues/33-create-backend-unit-tests-for-retrieval-chat-schemas-routing-and-sessi.md) | P0 | Chris + Bingran | 05, 11, 12, 17, 20 |
| 34 | [Build behavior evaluation suite for empathy, accuracy, and escalation](issues/34-build-behavior-evaluation-suite-for-empathy-accuracy-and-escalation.md) | P0 | Gabe + Chris + Audrey | 13, 18, 21 |
| 35 | [Define performance metrics and minimal analytics for the final presentation](issues/35-define-performance-metrics-and-minimal-analytics-for-the-final-present.md) | P1 | Chris + Gabe | 34, 35 |
| 36 | [Create market-examination guest survey and results template](issues/36-create-market-examination-guest-survey-and-results-template.md) | P1 | Gabe + Audrey | 35 |
| 37 | [Create polished 60-second virtual-concierge demo script and storyboard](issues/37-create-polished-60-second-virtual-concierge-demo-script-and-storyboard.md) | P0 | Gabe + Chris + Audrey | 28, 29, 32, 35 |
| 38 | [Record, review, and export the PowerPoint-ready 60-second video](issues/38-record-review-and-export-the-powerpoint-ready-60-second-video.md) | P0 | Gabe + Chris | 37 |
| 39 | [Create technical architecture diagram and speaking notes for final presentation](issues/39-create-technical-architecture-diagram-and-speaking-notes-for-final-pre.md) | P1 | Chris + Bingran | 05, 18, 20, 28 |
| 40 | [Add GitHub Actions CI for linting, unit tests, and build validation](issues/40-add-github-actions-ci-for-linting-unit-tests-and-build-validation.md) | P2 | Bingran | 02, 04, 33 |
| 41 | [Implement safe model-error fallback and service-status messaging](issues/41-implement-safe-model-error-fallback-and-service-status-messaging.md) | P1 | Chris | 06, 15, 28 |
| 42 | [Prepare optional deployment or offline demo packaging](issues/42-prepare-optional-deployment-or-offline-demo-packaging.md) | P2 | Chris + Bingran | 03, 04, 06, 39 |

---

# Full copy-and-paste ticket bodies


## Ticket 01 — [FOUNDATION] Audit the existing chatbot prototype and establish the MVP baseline

## Goal
Inventory the uploaded rule-based demo before connecting AI or rearranging files.

**Priority:** P0  
**Suggested owner(s):** Chris + Bingran  
**Area:** FOUNDATION  
**Dependencies:** None

## Scope / Implementation tasks
- [ ] Inspect `index.html`, `styles.css`, `app.js`, `knowledge_base.json`, and `README.md`.
- [ ] Document the current conversational logic, keyword matching, simulated reservation flow, and escalation copy.
- [ ] Identify which UI components can be retained and which features are simulated.
- [ ] Create an MVP checklist with clear distinction between demo behavior and live functionality.

## Acceptance criteria / Definition of done
- [ ] Baseline application runs locally without errors.
- [ ] A concise `docs/current-state.md` lists existing features, known gaps, and proposed reuse.
- [ ] No sample reservation or hotel policy is presented as real data.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 02 — [FOUNDATION] Create maintainable frontend/backend project structure

## Goal
Reorganize the single-folder prototype so frontend, API, verified knowledge, tests, and scripts can evolve separately.

**Priority:** P0  
**Suggested owner(s):** Chris + Bingran  
**Area:** FOUNDATION  
**Dependencies:** Ticket 01

## Scope / Implementation tasks
- [ ] Introduce `frontend/`, `backend/app/`, `knowledge/`, `tests/`, `scripts/`, and `docs/`.
- [ ] Move static web assets without changing visual behavior.
- [ ] Separate API routes, schemas, services, model client, retrieval, and policy rules into clear Python modules.
- [ ] Add `.gitignore` for `.env`, caches, virtual environments, and generated artifacts.

## Acceptance criteria / Definition of done
- [ ] Existing UI still opens after migration.
- [ ] Backend import paths are valid and a sample API starts.
- [ ] README includes a tree of directories and ownership boundaries.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 03 — [FOUNDATION] Create one-command startup scripts for Windows and macOS/Linux

## Goal
Allow any teammate to launch both services without memorizing multiple commands.

**Priority:** P0  
**Suggested owner(s):** Chris  
**Area:** FOUNDATION  
**Dependencies:** Ticket 02, Ticket 04, Ticket 05

## Scope / Implementation tasks
- [ ] Create `scripts/dev.ps1` for Windows and `scripts/dev.sh` for macOS/Linux, plus optional root `run.bat`.
- [ ] Check Python installation, create or reuse `.venv`, install pinned dependencies when needed, and launch backend plus frontend.
- [ ] Set predictable local URLs and detect port conflicts with readable error messages.
- [ ] Stop child processes cleanly when launcher exits.

## Acceptance criteria / Definition of done
- [ ] A fresh clone starts from one documented command on Windows and one on Unix-like systems.
- [ ] Missing configuration prints actionable guidance, never a secret.
- [ ] Startup and shutdown tested locally; actual URLs are displayed.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 04 — [FOUNDATION] Configure dependencies, environment variables, and safe secrets handling

## Goal
Set up reproducible Python dependencies and model configuration without exposing credentials.

**Priority:** P0  
**Suggested owner(s):** Bingran  
**Area:** FOUNDATION  
**Dependencies:** Ticket 02

## Scope / Implementation tasks
- [ ] Add pinned backend dependencies and supported Python version.
- [ ] Provide `.env.example` for model provider, model ID, API key, port, and explicit demo-mode flag.
- [ ] Load environment variables on the server only; validate required config at startup.
- [ ] Document how to start in offline/mock mode when no provider key exists.

## Acceptance criteria / Definition of done
- [ ] No API keys appear in browser JavaScript, the repo, screenshots, or logs.
- [ ] The app reports whether AI mode or offline demo mode is active.
- [ ] Fresh setup steps work with only README and sample environment file.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 05 — [BACKEND] Implement FastAPI backend foundation and health endpoint

## Goal
Create a stable backend boundary for all AI requests and guest-service routing.

**Priority:** P0  
**Suggested owner(s):** Bingran  
**Area:** BACKEND  
**Dependencies:** Ticket 02, Ticket 04

## Scope / Implementation tasks
- [ ] Implement `GET /api/health` and `POST /api/chat` under a versionable API router.
- [ ] Use Pydantic request/response models with `session_id`, `message`, `reply`, `status`, and optional `sources`.
- [ ] Configure a restricted local CORS origin, validation errors, and safe exception messages.
- [ ] Add request IDs and bounded body sizes.

## Acceptance criteria / Definition of done
- [ ] API starts with the project launcher and returns health information.
- [ ] Valid chat requests return JSON conforming to schema; malformed inputs return 4xx.
- [ ] Unhandled errors do not leak credentials or stack traces to clients.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 06 — [FRONTEND] Connect existing chat UI to backend API with graceful offline fallback

## Goal
Replace local keyword-only replies with backend-driven answers while preserving a clearly labeled demo fallback.

**Priority:** P0  
**Suggested owner(s):** Chris  
**Area:** FRONTEND  
**Dependencies:** Ticket 05, Ticket 15

## Scope / Implementation tasks
- [ ] Create a small API client with configurable relative backend URL.
- [ ] Send text plus session ID; render assistant message, optional sourced answer, and handoff state.
- [ ] Show loading, timeout, retry, and human-readable error messages.
- [ ] Only allow offline fallback if demo mode is explicitly enabled; label it as rule-based.

## Acceptance criteria / Definition of done
- [ ] A real backend response appears in the existing chat panel.
- [ ] API failure cannot silently masquerade as a live AI response.
- [ ] New conversation clears chat state and requests a fresh session.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 07 — [FOUNDATION] Write contributor setup, branching, and local run documentation

## Goal
Make collaborative development predictable across team members.

**Priority:** P1  
**Suggested owner(s):** Chris  
**Area:** FOUNDATION  
**Dependencies:** Ticket 02, Ticket 03, Ticket 04, Ticket 05

## Scope / Implementation tasks
- [ ] Document installation, supported operating systems, environment setup, service URLs, and troubleshooting.
- [ ] Recommend branch naming, PR review checklist, and how to run tests.
- [ ] Describe who owns UI, knowledge base, AI, human handoff, and presentation.
- [ ] Add note that all hotel facts must be approved by the team/instructor.

## Acceptance criteria / Definition of done
- [ ] A new teammate can install and launch the project using README alone.
- [ ] Links to launch scripts and sample scenarios are correct.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 08 — [KNOWLEDGE] Collect and distinguish instructor-approved hotel information from prototype samples

## Goal
Create the authoritative hotel information inventory, avoiding fabricated policies.

**Priority:** P0  
**Suggested owner(s):** Wyatt + Bingran  
**Area:** KNOWLEDGE  
**Dependencies:** Ticket 01

## Scope / Implementation tasks
- [ ] Request/import the instructor-provided Gator Go hotel knowledge base.
- [ ] Inventory confirmed facts: policies, amenities, restaurants, opening hours, contact/handoff guidance, and location.
- [ ] Tag each record as `approved`, `unverified`, or `demo_only` and capture source details.
- [ ] Identify missing fields that the concierge must escalate instead of guessing.

## Acceptance criteria / Definition of done
- [ ] All demo-generated details (e.g. times and sample booking IDs) are explicitly tagged or replaced.
- [ ] Approved knowledge is stored separately from illustrative content.
- [ ] A gap list identifies questions the approved source cannot answer.

## Important note
Instructor-approved hotel data was not included in the supplied PDFs; do not treat the demo JSON as verified.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 09 — [KNOWLEDGE] Define structured hotel knowledge schema with categories and provenance

## Goal
Use one documented schema for hotel information rather than unstructured strings scattered across code.

**Priority:** P0  
**Suggested owner(s):** Bingran + Wyatt  
**Area:** KNOWLEDGE  
**Dependencies:** Ticket 08

## Scope / Implementation tasks
- [ ] Define records with stable ID, category, question/topic, answer, source, status, updated date, and optional tags.
- [ ] Provide JSON schema or Pydantic models and a sample approved/dummy file.
- [ ] Define semantics for conflicting records and time-sensitive facts.
- [ ] Separate static hotel FAQ from mock reservation records and internal escalation rules.

## Acceptance criteria / Definition of done
- [ ] Schema validation catches missing required fields and invalid status values.
- [ ] Each answerable hotel fact has source/provenance metadata.
- [ ] No policy is considered confirmed solely because it appears in sample JSON.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 10 — [KNOWLEDGE] Build knowledge import and validation pipeline

## Goal
Make it straightforward to update hotel data without editing chatbot application logic.

**Priority:** P1  
**Suggested owner(s):** Bingran  
**Area:** KNOWLEDGE  
**Dependencies:** Ticket 09

## Scope / Implementation tasks
- [ ] Create a script to load approved JSON/CSV knowledge entries into normalized files or a lightweight index.
- [ ] Reject malformed, conflicting, or duplicate IDs and report them clearly.
- [ ] Support dry-run mode and immutable version or snapshot identifier.
- [ ] Document how Wyatt can submit updated facts for review.

## Acceptance criteria / Definition of done
- [ ] Valid files can be imported with one command.
- [ ] Invalid and contradictory entries are flagged, not silently overwritten.
- [ ] Import produces a repeatable summary of added, updated, and rejected records.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 11 — [BACKEND] Implement searchable knowledge retrieval service

## Goal
Retrieve relevant approved hotel knowledge before generating a guest-facing response.

**Priority:** P0  
**Suggested owner(s):** Bingran  
**Area:** BACKEND  
**Dependencies:** Ticket 09

## Scope / Implementation tasks
- [ ] Implement a deterministic keyword/full-text retrieval baseline over approved records.
- [ ] Return top matching passages with record IDs, source metadata, and relevance scores.
- [ ] Provide a configurable relevance threshold and sensible no-match behavior.
- [ ] Keep retrieval separate from the LLM provider so it can later adopt embeddings if needed.

## Acceptance criteria / Definition of done
- [ ] Queries about known approved facts return the matching records.
- [ ] Unapproved/demo-only content cannot be returned in production mode.
- [ ] Unknown questions return an explicit no-match signal rather than invented facts.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 12 — [BACKEND] Handle missing, conflicting, and outdated hotel information

## Goal
Enforce the course requirement that the AI should not invent missing or ambiguous hotel details.

**Priority:** P0  
**Suggested owner(s):** Wyatt + Bingran  
**Area:** BACKEND  
**Dependencies:** Ticket 09, Ticket 11

## Scope / Implementation tasks
- [ ] Define selection rules for duplicates, contradictory hours, unclear availability, and missing values.
- [ ] If a guest asks about an unsupported fact, respond transparently and offer human confirmation.
- [ ] Flag factual answers whose sources are not approved or are marked stale.
- [ ] Do not make unsupported assertions about restaurant hours, fees, or check-in policies.

## Acceptance criteria / Definition of done
- [ ] Conflict and missing-answer test cases lead to uncertainty or escalation.
- [ ] No selected answer relies on rejected or unapproved entries.
- [ ] Responses avoid phrasing that suggests a fact was verified when it was not.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 13 — [KNOWLEDGE] Create hotel FAQ coverage map and test question set

## Goal
Prepare a realistic set of guest questions aligned with the instructor criteria.

**Priority:** P1  
**Suggested owner(s):** Wyatt  
**Area:** KNOWLEDGE  
**Dependencies:** Ticket 08, Ticket 11

## Scope / Implementation tasks
- [ ] List guest intents covering check-in/out, dining, amenities, transportation, local attractions, and stay support.
- [ ] For each question, mark expected response category: answer, clarify, assist, or human.
- [ ] Add related-question and multi-turn examples, plus deliberately missing knowledge questions.
- [ ] Link every factual expected answer to an approved source ID.

## Acceptance criteria / Definition of done
- [ ] At least 25 varied test prompts are captured in version-controlled JSON/Markdown.
- [ ] Every question has an expected outcome and owner-reviewed fact status.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 14 — [AI] Evaluate LLM provider/model choice and document tradeoffs

## Goal
Meet the technical requirement to identify and justify the selected language model and platform.

**Priority:** P0  
**Suggested owner(s):** Chris + Bingran  
**Area:** AI  
**Dependencies:** Ticket 04

## Scope / Implementation tasks
- [ ] Compare at least two accessible LLM options by cost, setup, conversational quality, latency, and privacy controls.
- [ ] Choose a model available to the team and document its actual version/ID after testing.
- [ ] Describe limitations (hallucinations, outages, cost, lack of hotel-system access) and mitigation.
- [ ] Record measured or observed differences rather than unsupported performance claims.

## Acceptance criteria / Definition of done
- [ ] `docs/model-selection.md` identifies chosen model and at least one considered alternative.
- [ ] Selected provider can be invoked in a minimal backend smoke test.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 15 — [AI] Implement server-side LLM adapter and configurable mock mode

## Goal
Give the concierge natural-language AI responses without sending credentials to the browser.

**Priority:** P0  
**Suggested owner(s):** Chris + Bingran  
**Area:** AI  
**Dependencies:** Ticket 05, Ticket 14

## Scope / Implementation tasks
- [ ] Create a server-side provider client with chat completion interface, timeouts, bounded tokens, and retries.
- [ ] Return a normalized response independent of the model vendor.
- [ ] Log failures safely and return a service-unavailable status when required.
- [ ] Implement an explicit deterministic mock implementation for demos and tests.

## Acceptance criteria / Definition of done
- [ ] Backend `POST /api/chat` can call the selected model with a test prompt.
- [ ] A missing or invalid key produces clear failure and never a fabricated live-AI result.
- [ ] Mock mode is visually distinguishable from real AI mode.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 16 — [AI] Define concierge system prompt, personality, and instruction boundaries

## Goal
Create a consistent, welcoming front-desk concierge that explicitly identifies as an AI.

**Priority:** P0  
**Suggested owner(s):** Wyatt + Chris  
**Area:** AI  
**Dependencies:** Ticket 14, Ticket 15

## Scope / Implementation tasks
- [ ] Write a versioned system prompt covering identity, concise helpful tone, empathy, and professional hospitality style.
- [ ] State absolute limits: no inventing hotel facts, booking confirmations, staff notifications, refunds, or safety guarantees.
- [ ] Specify responses to unknown facts, inappropriate requests, and distress.
- [ ] Define when the assistant must recommend a human and what information may be shared.

## Acceptance criteria / Definition of done
- [ ] Prompt is stored server-side and reviewed by Wyatt and Audrey.
- [ ] Sample greetings clearly state that the concierge is an AI.
- [ ] Prompt tests confirm no claims of actions the software did not perform.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 17 — [AI] Implement session state and multi-turn conversation context

## Goal
Allow natural follow-up questions without losing the guest’s conversational context.

**Priority:** P0  
**Suggested owner(s):** Chris  
**Area:** AI  
**Dependencies:** Ticket 05, Ticket 15, Ticket 16

## Scope / Implementation tasks
- [ ] Assign new opaque session IDs for chats; store short bounded conversation history in memory for MVP.
- [ ] Pass recent context to the model while restricting retained personal information.
- [ ] Handle follow-ups like “What about the spa?” without requiring full restatement.
- [ ] Add reset and expiration behavior plus a configurable history limit.

## Acceptance criteria / Definition of done
- [ ] Two independent sessions cannot see each other’s messages.
- [ ] Follow-up questions resolve based on prior guest context when approved facts exist.
- [ ] Reset starts a clean conversation.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 18 — [AI] Build retrieval-augmented answer generation with source grounding

## Goal
Keep answers tied to the official hotel knowledge rather than relying on the LLM’s general guesses.

**Priority:** P0  
**Suggested owner(s):** Chris + Bingran  
**Area:** AI  
**Dependencies:** Ticket 11, Ticket 12, Ticket 15, Ticket 16, Ticket 17

## Scope / Implementation tasks
- [ ] Retrieve approved knowledge relevant to each guest request.
- [ ] Supply source snippets and clear grounding instructions with the prompt.
- [ ] Return record IDs alongside guest-facing responses for debugging or visible sources.
- [ ] If evidence is absent, instruct model to acknowledge the gap and offer human follow-up.

## Acceptance criteria / Definition of done
- [ ] Known approved policies are explained accurately in natural language.
- [ ] Missing or contradictory data triggers uncertainty/handoff rather than invented specifics.
- [ ] A tracing mode reveals the knowledge records used without exposing secrets.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 19 — [AI] Add AI safety and prompt-injection regression protections

## Goal
Protect core hospitality instructions from malicious guest text and untrusted knowledge entries.

**Priority:** P1  
**Suggested owner(s):** Chris + Bingran  
**Area:** AI  
**Dependencies:** Ticket 16, Ticket 18

## Scope / Implementation tasks
- [ ] Treat user inputs and retrieved knowledge as untrusted data; keep system policies separate.
- [ ] Add tests for attempts to override instructions or extract system prompts and keys.
- [ ] Validate answer length, reject inappropriate action claims, and limit tool/capability access.
- [ ] Add a safe response path for abusive or disallowed requests.

## Acceptance criteria / Definition of done
- [ ] Common instruction-override test inputs do not reveal secrets or change authority rules.
- [ ] No user message can authorize a refund, room key, or staff contact by itself.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 20 — [OPERATIONS] Implement three-level request decision framework (AI / assisted / human)

## Goal
Encode the rubric’s management requirement as a clear classification contract.

**Priority:** P0  
**Suggested owner(s):** Audrey + Chris  
**Area:** OPERATIONS  
**Dependencies:** Ticket 16

## Scope / Implementation tasks
- [ ] Define categories for AI-solvable FAQ, AI-with-human-help tasks, and human-only decisions.
- [ ] Classify routine facts, reservation changes, room problems, compensation, security, medical emergencies, and manager requests.
- [ ] Document the reasoning for each category and its permitted actions.
- [ ] Expose a simple machine-readable decision result to backend/UI.

## Acceptance criteria / Definition of done
- [ ] Request matrix includes every category listed in the instructor PDF.
- [ ] Human-only paths never imply automatic fulfillment.
- [ ] Each classification has tested expected routing behavior.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 21 — [OPERATIONS] Detect explicit human requests, serious complaints, distress, and emergencies

## Goal
Identify when the virtual agent should stop attempting self-service and prioritize a person.

**Priority:** P0  
**Suggested owner(s):** Audrey + Bingran  
**Area:** OPERATIONS  
**Dependencies:** Ticket 20

## Scope / Implementation tasks
- [ ] Detect “I need a manager,” refund/compensation requests, security problems, emergencies, strong emotional distress, and repeated failure.
- [ ] Give immediate safety guidance for urgent situations without pretending the system contacts responders.
- [ ] Route high-risk requests to human-only status rather than continuing general FAQ.
- [ ] Make detection testable independently from the LLM.

## Acceptance criteria / Definition of done
- [ ] All instructor escalation scenarios trigger the intended path.
- [ ] Safety messages distinguish advice from completed action.
- [ ] Serious complaints receive empathetic acknowledgement before handoff.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 22 — [OPERATIONS] Generate transparent staff-handoff summaries and guest consent flow

## Goal
Create a useful handoff while being clear about whether any employee was actually notified.

**Priority:** P0  
**Suggested owner(s):** Audrey + Chris  
**Area:** OPERATIONS  
**Dependencies:** Ticket 20, Ticket 21

## Scope / Implementation tasks
- [ ] Summarize the guest’s issue, relevant context, urgency, and requested next step.
- [ ] Ask before transmitting personal details or conversation content to staff.
- [ ] Show a reviewable summary and whether it is prepared, submitted, or merely simulated.
- [ ] Provide alternate contact instructions from approved hotel information if no staff integration exists.

## Acceptance criteria / Definition of done
- [ ] Guest receives a concise handoff summary in UI.
- [ ] No message says staff was contacted until a real integration confirms success.
- [ ] Sensitive fields are minimized or omitted by default.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 23 — [OPERATIONS] Provide an internal handoff queue or clearly labeled demo dashboard

## Goal
Illustrate how front desk employees would receive and resolve escalated conversations.

**Priority:** P1  
**Suggested owner(s):** Audrey + Bingran  
**Area:** OPERATIONS  
**Dependencies:** Ticket 22, Ticket 27

## Scope / Implementation tasks
- [ ] Create an authenticated staff-only view if a real handoff backend is feasible; otherwise a clearly labeled local demonstration queue.
- [ ] List issue category, urgency, summary, created time, and disposition.
- [ ] Support `open`, `in_review`, and `resolved` statuses for simulated cases.
- [ ] Do not expose the queue on the public guest page.

## Acceptance criteria / Definition of done
- [ ] A simulated or real handoff is visible to a staff operator as labeled.
- [ ] No unprotected public route exposes stored guest details.
- [ ] Handoff workflow can be demonstrated from start to finish.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 24 — [OPERATIONS] Improve sample reservation lookup and simulated check-in/check-out flows

## Goal
Make check-in/check-out assistance realistic without falsely claiming to operate hotel property systems.

**Priority:** P1  
**Suggested owner(s):** Bingran + Chris  
**Area:** OPERATIONS  
**Dependencies:** Ticket 17, Ticket 20, Ticket 27

## Scope / Implementation tasks
- [ ] Retain clearly fictional reservations such as DEMO-2048 only in demo mode.
- [ ] Use a step-by-step state machine to request demo confirmation, last name, and validate locally.
- [ ] Explain identity verification and staff authorization needed for real check-in, check-out, key access, or booking changes.
- [ ] Include a cancellation/late check-out human-review path.

## Acceptance criteria / Definition of done
- [ ] Demo reservation path works end-to-end and can be reset.
- [ ] No real keys, charges, modifications, or room assignments occur.
- [ ] Sensitive information is never requested for a fictional demo.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 25 — [OPERATIONS] Support guest maintenance and housekeeping service-request triage

## Goal
Show how the AI can help with a common during-stay need while respecting employee authority.

**Priority:** P1  
**Suggested owner(s):** Audrey + Chris  
**Area:** OPERATIONS  
**Dependencies:** Ticket 20, Ticket 21, Ticket 22

## Scope / Implementation tasks
- [ ] Capture issue category and short description (e.g. broken AC, dirty room).
- [ ] Provide empathic confirmation and suggest appropriate urgency.
- [ ] Prepare a handoff or task summary, without claiming dispatch unless integrated.
- [ ] Offer alternative ways to reach staff from approved contact details.

## Acceptance criteria / Definition of done
- [ ] Guest can report a dirty-room problem and see an accurate next step.
- [ ] Severe safety problems bypass ordinary maintenance queue.
- [ ] Handoff state is displayed accurately.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 26 — [OPERATIONS] Implement optional local-area and transportation guidance based on verified sources

## Goal
Address realistic guest questions from the project rubric without making up recommendations.

**Priority:** P2  
**Suggested owner(s):** Wyatt + Bingran  
**Area:** OPERATIONS  
**Dependencies:** Ticket 08, Ticket 11, Ticket 18

## Scope / Implementation tasks
- [ ] Add approved nearby attractions, transportation information, and general dining advice only if provided or explicitly sourced.
- [ ] Ask follow-up questions for category/preferences when useful.
- [ ] If no authorized local data exists, admit the limitation and direct guest to staff or an approved source.

## Acceptance criteria / Definition of done
- [ ] No fabricated operating hours, business recommendations, pricing, or travel times.
- [ ] At least three supported sample queries are included if verified records exist.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 27 — [OPERATIONS] Minimize guest data and document safe handling of sensitive requests

## Goal
Protect hypothetical and eventual guest information while building the experience.

**Priority:** P0  
**Suggested owner(s):** Chris + Audrey  
**Area:** OPERATIONS  
**Dependencies:** Ticket 05, Ticket 17, Ticket 20

## Scope / Implementation tasks
- [ ] Restrict logs to request IDs, route decisions, and non-sensitive telemetry; redact personal data from errors.
- [ ] Set rules for retention and session expiration.
- [ ] Avoid collecting payment card, ID, health, or real booking details in demo mode.
- [ ] Document explicit user-facing privacy limitations and who can view handoff content.

## Acceptance criteria / Definition of done
- [ ] Sample reservations contain no real personal records.
- [ ] No credentials or message history appear in public browser storage by default.
- [ ] Privacy statement accurately reflects actual data flow.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 28 — [FRONTEND] Polish the guest concierge interface for a modern resort experience

## Goal
Finish a coherent, attractive guest-facing UI based on the existing resort-themed mockup.

**Priority:** P0  
**Suggested owner(s):** Gabe + Chris  
**Area:** FRONTEND  
**Dependencies:** Ticket 02, Ticket 06

## Scope / Implementation tasks
- [ ] Keep the hotel branding, left presentation panel, chat center, and useful service shortcuts where they improve usability.
- [ ] Refine color, typography, spacing, transitions, and message styles; avoid visual clutter.
- [ ] Create responsive layouts for laptop and phone widths.
- [ ] Clearly label the assistant as AI and indicate demo vs connected AI mode.

## Acceptance criteria / Definition of done
- [ ] UI looks polished at 1440px, 1024px, and 390px viewport widths.
- [ ] No horizontal overflow, overlapping buttons, or unreadable text.
- [ ] Guest can start and complete a chat without explanation.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 29 — [FRONTEND] Design and integrate a recognizable concierge avatar

## Goal
Meet the assignment’s virtual appearance requirement and communicate brand personality.

**Priority:** P0  
**Suggested owner(s):** Gabe  
**Area:** FRONTEND  
**Dependencies:** Ticket 28, Ticket 16

## Scope / Implementation tasks
- [ ] Create an original avatar concept aligned with Gator Go branding and hospitality tone.
- [ ] Provide a stable image/vector/icon presentation in chat header and opening state.
- [ ] Consider subtle idle/typing states without distracting from conversation.
- [ ] Document how the avatar affects perceptions of friendliness and trust.

## Acceptance criteria / Definition of done
- [ ] Avatar is visible in main chat interface and captured in 60-second demo.
- [ ] Asset loads without remote dependencies and has appropriate alt/aria behavior.
- [ ] Avatar never misleadingly claims to be a human employee.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 30 — [FRONTEND] Improve conversation composer, suggested prompts, and loading behavior

## Goal
Create responsive interaction details that feel like a real service application.

**Priority:** P1  
**Suggested owner(s):** Chris  
**Area:** FRONTEND  
**Dependencies:** Ticket 06, Ticket 28

## Scope / Implementation tasks
- [ ] Support Enter to send, accessible buttons, disabled send on empty input, and clear new-conversation action.
- [ ] Show typing/loading states while awaiting API responses, with retry behavior.
- [ ] Provide dynamic suggested prompts for approved hotel topics and a demo complaint scenario.
- [ ] Prevent duplicate submissions and preserve long answers legibly.

## Acceptance criteria / Definition of done
- [ ] No double-submit or permanently stuck loading state.
- [ ] Quick prompts trigger the same API path as typed messages.
- [ ] Guest can distinguish their messages from assistant messages.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 31 — [FRONTEND] Add accessible, mobile-friendly interaction and keyboard support

## Goal
Make the concierge usable by people with different access needs and on smaller screens.

**Priority:** P1  
**Suggested owner(s):** Gabe + Chris  
**Area:** FRONTEND  
**Dependencies:** Ticket 28, Ticket 30

## Scope / Implementation tasks
- [ ] Use semantic headings, labels, focus indicators, and sufficient text contrast.
- [ ] Keep chat history in an accessible live region without excessive screen-reader announcements.
- [ ] Support keyboard-only navigation and reduced-motion preferences.
- [ ] Test at mobile viewport and with browser zoom.

## Acceptance criteria / Definition of done
- [ ] All primary actions can be completed with keyboard only.
- [ ] Core text, labels, and controls remain legible at 200% zoom.
- [ ] No essential meaning depends solely on color.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 32 — [FRONTEND] Display escalation state and action limits directly in the guest UI

## Goal
Make the most important trust boundary visible: a prepared handoff is not a staff notification.

**Priority:** P0  
**Suggested owner(s):** Audrey + Gabe  
**Area:** FRONTEND  
**Dependencies:** Ticket 22, Ticket 28

## Scope / Implementation tasks
- [ ] Design a concise escalation card containing next steps and a status label.
- [ ] Use separate statuses for `recommended`, `prepared`, `submitted`, and `confirmed` only when backend supports each.
- [ ] Show guest-facing emergency guidance prominently but not as a false dispatch alert.
- [ ] Include a discreet disclosure that this is a prototype and may use sample property details.

## Acceptance criteria / Definition of done
- [ ] Screenshots cannot be mistaken for a confirmed staff contact or actual booking.
- [ ] Guest has an obvious next step when the AI cannot help.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 33 — [QA] Create backend unit tests for retrieval, chat schemas, routing, and sessions

## Goal
Prevent regressions in the core guest-service architecture.

**Priority:** P0  
**Suggested owner(s):** Chris + Bingran  
**Area:** QA  
**Dependencies:** Ticket 05, Ticket 11, Ticket 12, Ticket 17, Ticket 20

## Scope / Implementation tasks
- [ ] Use pytest to test input validation, health endpoint, matching/no-match knowledge, and request decision rules.
- [ ] Cover session isolation, reset, unknown-answer behavior, and mock provider errors.
- [ ] Use fixtures and fake providers rather than live API calls for repeatability.
- [ ] Document a single command for test execution.

## Acceptance criteria / Definition of done
- [ ] Tests run locally without network/API keys.
- [ ] Critical failure and no-answer paths have assertions.
- [ ] Test command exits nonzero on failing checks.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 34 — [QA] Build behavior evaluation suite for empathy, accuracy, and escalation

## Goal
Fulfill the plan’s testing-and-evaluation requirement with realistic guest conversations.

**Priority:** P0  
**Suggested owner(s):** Gabe + Chris + Audrey  
**Area:** QA  
**Dependencies:** Ticket 13, Ticket 18, Ticket 21

## Scope / Implementation tasks
- [ ] Create at least 20 single- and multi-turn scripted scenarios.
- [ ] Include the instructor examples: dirty room, worst hotel experience, missed flight, manager request, refund, emergency, and unavailable answer.
- [ ] Score outcomes for factual correctness, empathy, handoff correctness, clarity, and action honesty.
- [ ] Record failures and corrective actions in a repeatable results table.

## Acceptance criteria / Definition of done
- [ ] Run report covers all required scenarios.
- [ ] No dangerous failure or fabricated action is marked as passing.
- [ ] Each failed scenario has an owner or follow-up ticket.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 35 — [QA] Define performance metrics and minimal analytics for the final presentation

## Goal
Provide systematic measures for AI performance and customer experience.

**Priority:** P1  
**Suggested owner(s):** Chris + Gabe  
**Area:** QA  
**Dependencies:** Ticket 34, Ticket 35

## Scope / Implementation tasks
- [ ] Define answer accuracy, grounded-answer rate, unknown-question handling, escalation recall, task completion, and response latency.
- [ ] Separate measured numbers from targets and illustrative examples.
- [ ] Track aggregate counts without storing unnecessary guest details.
- [ ] Provide a one-page measurement methodology and optional simple chart.

## Acceptance criteria / Definition of done
- [ ] At least five explicitly defined metrics are documented.
- [ ] Team can reproduce results from a test run.
- [ ] No fictitious measured performance is presented as real.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 36 — [QA] Create market-examination guest survey and results template

## Goal
Prepare to measure the customer perception criteria from the one-page market-examination handout.

**Priority:** P1  
**Suggested owner(s):** Gabe + Audrey  
**Area:** QA  
**Dependencies:** Ticket 35

## Scope / Implementation tasks
- [ ] Create survey with 1–5 overall satisfaction scale and optional measures of helpfulness, friendliness, competence, and trustworthiness.
- [ ] Add optional questions on anthropomorphism, hotel appropriateness, and willingness to interact again.
- [ ] Prepare a spreadsheet/CSV template for anonymous aggregated scores.
- [ ] Explain average satisfaction calculation and avoid leading questions.

## Acceptance criteria / Definition of done
- [ ] Survey is understandable without developer knowledge.
- [ ] Overall satisfaction score is captured on the prescribed 1–5 scale.
- [ ] Results template calculates or clearly describes average satisfaction.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 37 — [DEMO] Create polished 60-second virtual-concierge demo script and storyboard

## Goal
Produce the exact deliverable described in the market-examination PDF.

**Priority:** P0  
**Suggested owner(s):** Gabe + Chris + Audrey  
**Area:** DEMO  
**Dependencies:** Ticket 28, Ticket 29, Ticket 32, Ticket 35

## Scope / Implementation tasks
- [ ] Storyboard 0–10s avatar/greeting, 10–25s fact-based guest question, 25–45s emotional problem, and 45–60s appropriate handoff.
- [ ] Use approved hotel facts or explicitly indicate demo-only information.
- [ ] Script natural guest messages, helpful concise replies, and realistic typing pace.
- [ ] Avoid requiring the video to assert a booking/refund/staff contact that was not performed.

## Acceptance criteria / Definition of done
- [ ] Script fits approximately 60 seconds when timed.
- [ ] Video concept visibly includes avatar, personality, interaction, guest need, and response.
- [ ] At least one human-intervention scenario is represented.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 38 — [DEMO] Record, review, and export the PowerPoint-ready 60-second video

## Goal
Capture a credible demonstration that can be embedded in the team presentation.

**Priority:** P0  
**Suggested owner(s):** Gabe + Chris  
**Area:** DEMO  
**Dependencies:** Ticket 37

## Scope / Implementation tasks
- [ ] Run the app in a reproducible demo state and record the guest interaction.
- [ ] Use readable resolution, capture the avatar and response cards, and trim to 60 seconds.
- [ ] Export MP4 (H.264) and check playback on a second device.
- [ ] Review against the instructor criteria and ensure no private keys/browser tabs are visible.

## Acceptance criteria / Definition of done
- [ ] Final MP4 is 60 seconds or less and visually readable.
- [ ] A teammate can play it inside the intended PowerPoint.
- [ ] Video clearly labels the system as AI and does not misstate simulated actions.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 39 — [DEMO] Create technical architecture diagram and speaking notes for final presentation

## Goal
Explain implementation decisions without overclaiming capabilities.

**Priority:** P1  
**Suggested owner(s):** Chris + Bingran  
**Area:** DEMO  
**Dependencies:** Ticket 05, Ticket 18, Ticket 20, Ticket 28

## Scope / Implementation tasks
- [ ] Diagram browser -> FastAPI -> retrieval/approved KB -> model -> routing/handoff, distinguishing optional mock flows.
- [ ] Document model choice, platform, prompt strategy, grounding approach, and limitations.
- [ ] Summarize psychological guest experience and three-level management decision framework.
- [ ] Create concise presenter notes and screenshots of implemented features.

## Acceptance criteria / Definition of done
- [ ] Slides distinguish shipped, simulated, and future features.
- [ ] All PDF technical, psychological, and management sections have a clear speaking point.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 40 — [DELIVERY] Add GitHub Actions CI for linting, unit tests, and build validation

## Goal
Catch integration issues when team members push changes.

**Priority:** P2  
**Suggested owner(s):** Bingran  
**Area:** DELIVERY  
**Dependencies:** Ticket 02, Ticket 04, Ticket 33

## Scope / Implementation tasks
- [ ] Set up Python dependency installation and pytest run on pull requests.
- [ ] Add a fast frontend syntax/static check if practical for current vanilla-JS stack.
- [ ] Avoid injecting secrets into pull-request jobs.
- [ ] Document CI status and how to reproduce failures locally.

## Acceptance criteria / Definition of done
- [ ] Pull requests show a passing or failing CI status.
- [ ] No live model API calls are required in CI.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 41 — [DELIVERY] Implement safe model-error fallback and service-status messaging

## Goal
Keep the interface helpful even when the model is unavailable or slow.

**Priority:** P1  
**Suggested owner(s):** Chris  
**Area:** DELIVERY  
**Dependencies:** Ticket 06, Ticket 15, Ticket 28

## Scope / Implementation tasks
- [ ] Set bounded provider timeouts and handle rate limits, network failures, and malformed responses.
- [ ] Offer retry or verified FAQ-only fallback, never silently claim an LLM answered.
- [ ] Display online/offline/demo status and nontechnical guidance.
- [ ] Ensure no API error text leaks internals to guests.

## Acceptance criteria / Definition of done
- [ ] API outage leaves the UI responsive.
- [ ] Guest can retry or reach the documented human support route.
- [ ] Demo-only fallback is clearly identified.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---

## Ticket 42 — [DELIVERY] Prepare optional deployment or offline demo packaging

## Goal
Make the demo reliable for presentation without assuming public deployment is required.

**Priority:** P2  
**Suggested owner(s):** Chris + Bingran  
**Area:** DELIVERY  
**Dependencies:** Ticket 03, Ticket 04, Ticket 06, Ticket 39

## Scope / Implementation tasks
- [ ] Document a local offline/mock presentation mode that works without an external AI key.
- [ ] Optionally package the frontend/backend using Docker Compose or a simple deployment target.
- [ ] Use only environment variables for secrets and disable demo sample data in production.
- [ ] Provide reproducible demo reset and smoke-test steps.

## Acceptance criteria / Definition of done
- [ ] A teammate can demonstrate locally after following the runbook.
- [ ] Any public deployment has explicit security configuration and real/dummy data separation.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.

---
