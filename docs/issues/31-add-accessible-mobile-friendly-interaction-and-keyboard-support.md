# [FRONTEND] Add accessible, mobile-friendly interaction and keyboard support

## Goal
Make the concierge usable by people with different access needs and on smaller screens.

**Priority:** P1
**Suggested owner(s):** Gabe + Chris
**Area:** FRONTEND
**Dependencies:** Ticket 28, Ticket 30

## Scope / Implementation tasks
- [ ] Use semantic headings, labels, focus indicators, and sufficient text contrast.
- [ ] Keep chat history in an accessible live region without excessive screen-reader announcements.
- [ ] Support keyboard-only navigation and reduced-motion preferences.
- [ ] Test at mobile viewport and with browser zoom.

## Acceptance criteria / Definition of done
- [ ] All primary actions can be completed with keyboard only.
- [ ] Core text, labels, and controls remain legible at 200% zoom.
- [ ] No essential meaning depends solely on color.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
