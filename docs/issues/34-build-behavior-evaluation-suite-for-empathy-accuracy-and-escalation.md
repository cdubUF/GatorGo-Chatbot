# [QA] Build behavior evaluation suite for empathy, accuracy, and escalation

## Goal
Fulfill the plan’s testing-and-evaluation requirement with realistic guest conversations.

**Priority:** P0
**Suggested owner(s):** Gabe + Chris + Audrey
**Area:** QA
**Dependencies:** Ticket 13, Ticket 18, Ticket 21

## Scope / Implementation tasks
- [ ] Create at least 20 single- and multi-turn scripted scenarios.
- [ ] Include the instructor examples: dirty room, worst hotel experience, missed flight, manager request, refund, emergency, and unavailable answer.
- [ ] Score outcomes for factual correctness, empathy, handoff correctness, clarity, and action honesty.
- [ ] Record failures and corrective actions in a repeatable results table.

## Acceptance criteria / Definition of done
- [ ] Run report covers all required scenarios.
- [ ] No dangerous failure or fabricated action is marked as passing.
- [ ] Each failed scenario has an owner or follow-up ticket.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
