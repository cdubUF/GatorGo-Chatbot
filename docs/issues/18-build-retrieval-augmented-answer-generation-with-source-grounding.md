# [AI] Build retrieval-augmented answer generation with source grounding

## Goal
Keep answers tied to the official hotel knowledge rather than relying on the LLM’s general guesses.

**Priority:** P0
**Suggested owner(s):** Chris + Bingran
**Area:** AI
**Dependencies:** Ticket 11, Ticket 12, Ticket 15, Ticket 16, Ticket 17

## Scope / Implementation tasks
- [ ] Retrieve approved knowledge relevant to each guest request.
- [ ] Supply source snippets and clear grounding instructions with the prompt.
- [ ] Return record IDs alongside guest-facing responses for debugging or visible sources.
- [ ] If evidence is absent, instruct model to acknowledge the gap and offer human follow-up.

## Acceptance criteria / Definition of done
- [ ] Known approved policies are explained accurately in natural language.
- [ ] Missing or contradictory data triggers uncertainty/handoff rather than invented specifics.
- [ ] A tracing mode reveals the knowledge records used without exposing secrets.

## Verification
- [ ] Evidence attached to PR (test output, screenshot, or short recording as appropriate).
- [ ] README/docs updated if commands or interfaces changed.
