# [KNOWLEDGE] Build knowledge import and validation pipeline

## Goal
Make it straightforward to update hotel data without editing chatbot application logic.

**Priority:** P1
**Suggested owner(s):** Bingran
**Area:** KNOWLEDGE
**Dependencies:** Ticket 09

## Scope / Implementation tasks
- [ ] Create a script to load approved JSON/CSV knowledge entries into normalized files or a lightweight index.
- [ ] Reject malformed, conflicting, or duplicate IDs and report them clearly.
- [ ] Support dry-run mode and immutable version or snapshot identifier.
- [ ] Document how Wyatt can submit updated facts for review.

## Acceptance criteria / Definition of done
- [ ] Valid files can be imported with one command.
- [ ] Invalid and contradictory entries are flagged, not silently overwritten.
- [ ] Import produces a repeatable summary of added, updated, and rejected records.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
