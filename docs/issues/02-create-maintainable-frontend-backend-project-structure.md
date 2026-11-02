# [FOUNDATION] Create maintainable frontend/backend project structure

## Goal
Reorganize the single-folder prototype so frontend, API, verified knowledge, tests, and scripts can evolve separately.

**Priority:** P0
**Suggested owner(s):** Chris + Bingran
**Area:** FOUNDATION
**Dependencies:** Ticket 01

## Scope / Implementation tasks
- [ ] Introduce `frontend/`, `backend/app/`, `knowledge/`, `tests/`, `scripts/`, and `docs/`.
- [ ] Move static web assets without changing visual behavior.
- [ ] Separate API routes, schemas, services, model client, retrieval, and policy rules into clear Python modules.
- [ ] Add `.gitignore` for `.env`, caches, virtual environments, and generated artifacts.

## Acceptance criteria / Definition of done
- [ ] Existing UI still opens after migration.
- [ ] Backend import paths are valid and a sample API starts.
- [ ] README includes a tree of directories and ownership boundaries.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
