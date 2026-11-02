# [BACKEND] Implement FastAPI backend foundation and health endpoint

## Goal
Create a stable backend boundary for all AI requests and guest-service routing.

**Priority:** P0
**Suggested owner(s):** Bingran
**Area:** BACKEND
**Dependencies:** Ticket 02, Ticket 04

## Scope / Implementation tasks
- [ ] Implement `GET /api/health` and `POST /api/chat` under a versionable API router.
- [ ] Use Pydantic request/response models with `session_id`, `message`, `reply`, `status`, and optional `sources`.
- [ ] Configure a restricted local CORS origin, validation errors, and safe exception messages.
- [ ] Add request IDs and bounded body sizes.

## Acceptance criteria / Definition of done
- [ ] API starts with the project launcher and returns health information.
- [ ] Valid chat requests return JSON conforming to schema; malformed inputs return 4xx.
- [ ] Unhandled errors do not leak credentials or stack traces to clients.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
