# [FOUNDATION] Create one-command startup scripts for Windows and macOS/Linux

## Goal
Allow any teammate to launch both services without memorizing multiple commands.

**Priority:** P0
**Suggested owner(s):** Chris
**Area:** FOUNDATION
**Dependencies:** Ticket 02, Ticket 04, Ticket 05

## Scope / Implementation tasks
- [ ] Create `scripts/dev.ps1` for Windows and `scripts/dev.sh` for macOS/Linux, plus optional root `run.bat`.
- [ ] Check Python installation, create or reuse `.venv`, install pinned dependencies when needed, and launch backend plus frontend.
- [ ] Set predictable local URLs and detect port conflicts with readable error messages.
- [ ] Stop child processes cleanly when launcher exits.

## Acceptance criteria / Definition of done
- [ ] A fresh clone starts from one documented command on Windows and one on Unix-like systems.
- [ ] Missing configuration prints actionable guidance, never a secret.
- [ ] Startup and shutdown tested locally; actual URLs are displayed.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
