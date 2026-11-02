# [QA] Create backend unit tests for retrieval, chat schemas, routing, and sessions

## Goal
Prevent regressions in the core guest-service architecture.

**Priority:** P0
**Suggested owner(s):** Chris + Bingran
**Area:** QA
**Dependencies:** Ticket 05, Ticket 11, Ticket 12, Ticket 17, Ticket 20

## Scope / Implementation tasks
- [ ] Use pytest to test input validation, health endpoint, matching/no-match knowledge, and request decision rules.
- [ ] Cover session isolation, reset, unknown-answer behavior, and mock provider errors.
- [ ] Use fixtures and fake providers rather than live API calls for repeatability.
- [ ] Document a single command for test execution.

## Acceptance criteria / Definition of done
- [ ] Tests run locally without network/API keys.
- [ ] Critical failure and no-answer paths have assertions.
- [ ] Test command exits nonzero on failing checks.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
