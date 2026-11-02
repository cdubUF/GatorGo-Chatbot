# [AI] Evaluate LLM provider/model choice and document tradeoffs

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
