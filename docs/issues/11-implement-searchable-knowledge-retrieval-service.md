# [BACKEND] Implement searchable knowledge retrieval service

## Goal
Retrieve relevant approved hotel knowledge before generating a guest-facing response.

**Priority:** P0
**Suggested owner(s):** Bingran
**Area:** BACKEND
**Dependencies:** Ticket 09

## Scope / Implementation tasks
- [ ] Implement a deterministic keyword/full-text retrieval baseline over approved records.
- [ ] Return top matching passages with record IDs, source metadata, and relevance scores.
- [ ] Provide a configurable relevance threshold and sensible no-match behavior.
- [ ] Keep retrieval separate from the LLM provider so it can later adopt embeddings if needed.

## Acceptance criteria / Definition of done
- [ ] Queries about known approved facts return the matching records.
- [ ] Unapproved/demo-only content cannot be returned in production mode.
- [ ] Unknown questions return an explicit no-match signal rather than invented facts.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
