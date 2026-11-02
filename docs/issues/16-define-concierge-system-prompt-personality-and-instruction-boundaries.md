# [AI] Define concierge system prompt, personality, and instruction boundaries

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
