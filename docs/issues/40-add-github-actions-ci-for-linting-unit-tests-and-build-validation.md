# [DELIVERY] Add GitHub Actions CI for linting, unit tests, and build validation

## Goal
Catch integration issues when team members push changes.

**Priority:** P2
**Suggested owner(s):** Bingran
**Area:** DELIVERY
**Dependencies:** Ticket 02, Ticket 04, Ticket 33

## Scope / Implementation tasks
- [ ] Set up Python dependency installation and pytest run on pull requests.
- [ ] Add a fast frontend syntax/static check if practical for current vanilla-JS stack.
- [ ] Avoid injecting secrets into pull-request jobs.
- [ ] Document CI status and how to reproduce failures locally.

## Acceptance criteria / Definition of done
- [ ] Pull requests show a passing or failing CI status.
- [ ] No live model API calls are required in CI.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
