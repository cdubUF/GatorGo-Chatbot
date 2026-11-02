# [OPERATIONS] Improve sample reservation lookup and simulated check-in/check-out flows

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
