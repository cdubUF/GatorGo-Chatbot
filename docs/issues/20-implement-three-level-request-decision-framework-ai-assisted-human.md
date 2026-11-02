# [OPERATIONS] Implement three-level request decision framework (AI / assisted / human)

## Goal
Encode the rubric’s management requirement as a clear classification contract.

**Priority:** P0
**Suggested owner(s):** Audrey + Chris
**Area:** OPERATIONS
**Dependencies:** Ticket 16

## Scope / Implementation tasks
- [ ] Define categories for AI-solvable FAQ, AI-with-human-help tasks, and human-only decisions.
- [ ] Classify routine facts, reservation changes, room problems, compensation, security, medical emergencies, and manager requests.
- [ ] Document the reasoning for each category and its permitted actions.
- [ ] Expose a simple machine-readable decision result to backend/UI.

## Acceptance criteria / Definition of done
- [ ] Request matrix includes every category listed in the instructor PDF.
- [ ] Human-only paths never imply automatic fulfillment.
- [ ] Each classification has tested expected routing behavior.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
