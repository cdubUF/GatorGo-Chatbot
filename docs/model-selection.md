# Model decision and verification status

**November 2 update:** Live OpenAI mode is now the application default. A live smoke test and a check-in question using labeled sample evidence succeeded. The comparison of model candidates remains future work. The earlier selection notes below are historical and describe the original source-selection-only design, not the current conversational adapter.

The delivered default is **mock**, which selects the strongest deterministic retrieval hit and makes no external model call. Optional OpenAI mode uses `gpt-5.4-mini-2026-03-17` as a configurable initial candidate. This is a provisional implementation choice, not a measured winner. A team API key and live smoke test are still required before closing planning tickets 14 and 15.

| Option | Cost/setup | Quality and latency evidence | Privacy/data flow |
|---|---|---|---|
| GPT-5.4 Mini candidate | Hosted API key; published standard rates $0.75 input / $4.50 output per million tokens | No live measurements in this project | Current question and bounded topic context sent to provider; `store=false` |
| GPT-5.4 alternative | Same adapter/configuration; published standard rates $2.50 input / $15 output per million tokens | No live measurements; do not claim a quality advantage without testing | Same request boundary |
| Deterministic mock | No key or inference bill; initial dependency installation only | Automated local contract results in evaluation report; no model-quality claim | No external model requests |

The official [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini) and [GPT-5.4](https://developers.openai.com/api/docs/models/gpt-5.4) pages document the considered model families. Confirm snapshot availability in the team's account. The implementation follows the official [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) using `text.format` in the Responses API. Structured output ensures response shape; the server separately checks selected IDs against the retrieved evidence.

The model chooses source IDs instead of unrestricted prose. The server renders original source answers verbatim, preserving sample labels and avoiding invented bookings, fees, or dispatch claims. This deliberately limits conversational flexibility. It does not guarantee retrieval relevance or source truth; approved content and review are still required. Routing and consent do not depend on the model.

Rates above were checked against the linked official model pages during implementation, November 1, 2026, and are published prices, not measured project spend. The selected candidate snapshot is `gpt-5.4-mini-2026-03-17`; the alternative snapshot is `gpt-5.4-2026-03-05`. Both pages document Responses API and structured-output support. Confirm account access before a live trial. Run `python scripts/model-smoke.py` intentionally to make a small paid synthetic test once credentials are configured.

The adapter has a total configurable deadline (8 seconds by default), at most one short retry for rate-limit/transient server failures, a 200-token output cap, `store=false`, and no raw provider error output. Failures return clearly labeled FAQ fallback when evidence exists. No-match questions do not call the model. Provider retention policies are separate from local memory retention and must be reviewed before using real guest data.

Live comparison procedure: use the same approved test questions on each candidate; record exact model snapshot, request count, input/output tokens, billed cost, p50/p95 latency, selected-source accuracy, unknown handling, and human-rated tone. Record a failed result honestly. Do not put credentials in results. Team reviewers: Chris/Bingran for technical evidence; Wyatt/Audrey for prompt, empathy, and grounding. Reviews are pending.
