# [AI] Implement server-side LLM adapter and configurable mock mode

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
