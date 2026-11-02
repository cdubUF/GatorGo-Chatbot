# [AI] Implement session state and multi-turn conversation context

## Goal
Allow natural follow-up questions without losing the guest’s conversational context.

**Priority:** P0
**Suggested owner(s):** Chris
**Area:** AI
**Dependencies:** Ticket 05, Ticket 15, Ticket 16

## Scope / Implementation tasks
- [ ] Assign new opaque session IDs for chats; store short bounded conversation history in memory for MVP.
- [ ] Pass recent context to the model while restricting retained personal information.
- [ ] Handle follow-ups like “What about the spa?” without requiring full restatement.
- [ ] Add reset and expiration behavior plus a configurable history limit.

## Acceptance criteria / Definition of done
- [ ] Two independent sessions cannot see each other’s messages.
- [ ] Follow-up questions resolve based on prior guest context when approved facts exist.
- [ ] Reset starts a clean conversation.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
