# [KNOWLEDGE] Collect and distinguish instructor-approved hotel information from prototype samples

## Goal
Create the authoritative hotel information inventory, avoiding fabricated policies.

**Priority:** P0
**Suggested owner(s):** Wyatt + Bingran
**Area:** KNOWLEDGE
**Dependencies:** Ticket 01

## Scope / Implementation tasks
- [ ] Request/import the instructor-provided Gator Go hotel knowledge base.
- [ ] Inventory confirmed facts: policies, amenities, restaurants, opening hours, contact/handoff guidance, and location.
- [ ] Tag each record as `approved`, `unverified`, or `demo_only` and capture source details.
- [ ] Identify missing fields that the concierge must escalate instead of guessing.

## Acceptance criteria / Definition of done
- [ ] All demo-generated details (e.g. times and sample booking IDs) are explicitly tagged or replaced.
- [ ] Approved knowledge is stored separately from illustrative content.
- [ ] A gap list identifies questions the approved source cannot answer.

## Important note
Instructor-approved hotel data was not included in the supplied PDFs; do not treat the demo JSON as verified.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
