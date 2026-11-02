# [KNOWLEDGE] Define structured hotel knowledge schema with categories and provenance

## Goal
Use one documented schema for hotel information rather than unstructured strings scattered across code.

**Priority:** P0
**Suggested owner(s):** Bingran + Wyatt
**Area:** KNOWLEDGE
**Dependencies:** Ticket 08

## Scope / Implementation tasks
- [ ] Define records with stable ID, category, question/topic, answer, source, status, updated date, and optional tags.
- [ ] Provide JSON schema or Pydantic models and a sample approved/dummy file.
- [ ] Define semantics for conflicting records and time-sensitive facts.
- [ ] Separate static hotel FAQ from mock reservation records and internal escalation rules.

## Acceptance criteria / Definition of done
- [ ] Schema validation catches missing required fields and invalid status values.
- [ ] Each answerable hotel fact has source/provenance metadata.
- [ ] No policy is considered confirmed solely because it appears in sample JSON.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
