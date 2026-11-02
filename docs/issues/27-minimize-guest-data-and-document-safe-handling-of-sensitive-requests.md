# [OPERATIONS] Minimize guest data and document safe handling of sensitive requests

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
