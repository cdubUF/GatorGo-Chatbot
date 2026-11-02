# [FRONTEND] Display escalation state and action limits directly in the guest UI

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
