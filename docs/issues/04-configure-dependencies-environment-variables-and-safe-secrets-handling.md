# [FOUNDATION] Configure dependencies, environment variables, and safe secrets handling

## Goal
Set up reproducible Python dependencies and model configuration without exposing credentials.

**Priority:** P0
**Suggested owner(s):** Bingran
**Area:** FOUNDATION
**Dependencies:** Ticket 02

## Scope / Implementation tasks
- [ ] Add pinned backend dependencies and supported Python version.
- [ ] Provide `.env.example` for model provider, model ID, API key, port, and explicit demo-mode flag.
- [ ] Load environment variables on the server only; validate required config at startup.
- [ ] Document how to start in offline/mock mode when no provider key exists.

## Acceptance criteria / Definition of done
- [ ] No API keys appear in browser JavaScript, the repo, screenshots, or logs.
- [ ] The app reports whether AI mode or offline demo mode is active.
- [ ] Fresh setup steps work with only README and sample environment file.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
