# [OPERATIONS] Detect explicit human requests, serious complaints, distress, and emergencies

## Goal
Identify when the virtual agent should stop attempting self-service and prioritize a person.

**Priority:** P0
**Suggested owner(s):** Audrey + Bingran
**Area:** OPERATIONS
**Dependencies:** Ticket 20

## Scope / Implementation tasks
- [ ] Detect “I need a manager,” refund/compensation requests, security problems, emergencies, strong emotional distress, and repeated failure.
- [ ] Give immediate safety guidance for urgent situations without pretending the system contacts responders.
- [ ] Route high-risk requests to human-only status rather than continuing general FAQ.
- [ ] Make detection testable independently from the LLM.

## Acceptance criteria / Definition of done
- [ ] All instructor escalation scenarios trigger the intended path.
- [ ] Safety messages distinguish advice from completed action.
- [ ] Serious complaints receive empathetic acknowledgement before handoff.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
