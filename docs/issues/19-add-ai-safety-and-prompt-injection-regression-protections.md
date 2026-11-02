# [AI] Add AI safety and prompt-injection regression protections

## Goal
Protect core hospitality instructions from malicious guest text and untrusted knowledge entries.

**Priority:** P1
**Suggested owner(s):** Chris + Bingran
**Area:** AI
**Dependencies:** Ticket 16, Ticket 18

## Scope / Implementation tasks
- [ ] Treat user inputs and retrieved knowledge as untrusted data; keep system policies separate.
- [ ] Add tests for attempts to override instructions or extract system prompts and keys.
- [ ] Validate answer length, reject inappropriate action claims, and limit tool/capability access.
- [ ] Add a safe response path for abusive or disallowed requests.

## Acceptance criteria / Definition of done
- [ ] Common instruction-override test inputs do not reveal secrets or change authority rules.
- [ ] No user message can authorize a refund, room key, or staff contact by itself.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
