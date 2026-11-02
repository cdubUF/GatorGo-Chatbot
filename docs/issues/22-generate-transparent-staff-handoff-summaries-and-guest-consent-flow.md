# [OPERATIONS] Generate transparent staff-handoff summaries and guest consent flow

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
