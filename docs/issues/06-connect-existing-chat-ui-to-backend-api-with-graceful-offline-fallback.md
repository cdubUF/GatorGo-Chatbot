# [FRONTEND] Connect existing chat UI to backend API with graceful offline fallback

## Goal
Replace local keyword-only replies with backend-driven answers while preserving a clearly labeled demo fallback.

**Priority:** P0
**Suggested owner(s):** Chris
**Area:** FRONTEND
**Dependencies:** Ticket 05, Ticket 15

## Scope / Implementation tasks
- [ ] Create a small API client with configurable relative backend URL.
- [ ] Send text plus session ID; render assistant message, optional sourced answer, and handoff state.
- [ ] Show loading, timeout, retry, and human-readable error messages.
- [ ] Only allow offline fallback if demo mode is explicitly enabled; label it as rule-based.

## Acceptance criteria / Definition of done
- [ ] A real backend response appears in the existing chat panel.
- [ ] API failure cannot silently masquerade as a live AI response.
- [ ] New conversation clears chat state and requests a fresh session.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
