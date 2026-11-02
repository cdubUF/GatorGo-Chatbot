# [DELIVERY] Implement safe model-error fallback and service-status messaging

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
