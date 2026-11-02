# [DELIVERY] Prepare optional deployment or offline demo packaging

## Goal
Make the demo reliable for presentation without assuming public deployment is required.

**Priority:** P2
**Suggested owner(s):** Chris + Bingran
**Area:** DELIVERY
**Dependencies:** Ticket 03, Ticket 04, Ticket 06, Ticket 39

## Scope / Implementation tasks
- [ ] Document a local offline/mock presentation mode that works without an external AI key.
- [ ] Optionally package the frontend/backend using Docker Compose or a simple deployment target.
- [ ] Use only environment variables for secrets and disable demo sample data in production.
- [ ] Provide reproducible demo reset and smoke-test steps.

## Acceptance criteria / Definition of done
- [ ] A teammate can demonstrate locally after following the runbook.
- [ ] Any public deployment has explicit security configuration and real/dummy data separation.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
