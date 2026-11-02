# [OPERATIONS] Provide an internal handoff queue or clearly labeled demo dashboard

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
