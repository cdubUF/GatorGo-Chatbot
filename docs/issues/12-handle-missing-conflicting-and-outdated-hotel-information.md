# [BACKEND] Handle missing, conflicting, and outdated hotel information

## Goal
Enforce the course requirement that the AI should not invent missing or ambiguous hotel details.

**Priority:** P0
**Suggested owner(s):** Wyatt + Bingran
**Area:** BACKEND
**Dependencies:** Ticket 09, Ticket 11

## Scope / Implementation tasks
- [ ] Define selection rules for duplicates, contradictory hours, unclear availability, and missing values.
- [ ] If a guest asks about an unsupported fact, respond transparently and offer human confirmation.
- [ ] Flag factual answers whose sources are not approved or are marked stale.
- [ ] Do not make unsupported assertions about restaurant hours, fees, or check-in policies.

## Acceptance criteria / Definition of done
- [ ] Conflict and missing-answer test cases lead to uncertainty or escalation.
- [ ] No selected answer relies on rejected or unapproved entries.
- [ ] Responses avoid phrasing that suggests a fact was verified when it was not.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
