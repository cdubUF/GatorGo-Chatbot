# [FRONTEND] Improve conversation composer, suggested prompts, and loading behavior

## Goal
Create responsive interaction details that feel like a real service application.

**Priority:** P1
**Suggested owner(s):** Chris
**Area:** FRONTEND
**Dependencies:** Ticket 06, Ticket 28

## Scope / Implementation tasks
- [ ] Support Enter to send, accessible buttons, disabled send on empty input, and clear new-conversation action.
- [ ] Show typing/loading states while awaiting API responses, with retry behavior.
- [ ] Provide dynamic suggested prompts for approved hotel topics and a demo complaint scenario.
- [ ] Prevent duplicate submissions and preserve long answers legibly.

## Acceptance criteria / Definition of done
- [ ] No double-submit or permanently stuck loading state.
- [ ] Quick prompts trigger the same API path as typed messages.
- [ ] Guest can distinguish their messages from assistant messages.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
