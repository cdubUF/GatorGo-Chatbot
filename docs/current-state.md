# Original prototype audit

The supplied baseline had five files: `index.html`, `styles.css`, `app.js`, `knowledge_base.json`, and `README.md`. Its resort sidebar, chat panel, service shortcuts, and sample reservation card were reusable. Replies were local keyword matches with an artificial delay; there was no API or model call. Hotel facts and two reservations were explicitly fictional.

The reservation state machine advanced from confirmation to surname without validating the code, and then matched on surname alone. Dialogue stages ran before emergency detection, so a safety request during a lookup could be consumed as reservation input. The app called itself AI despite using only demo logic. It mentioned preparing a handoff without a concrete review/consent/queue flow. Unknown questions used a generic staff-referral response.

Implemented baseline improvements: retain the visual branding, move frontend assets to `frontend/`, serve them with FastAPI, validate requests, tag sources, keep sessions isolated and bounded, check routing first, match both fictional reservation fields, and display truthful service/handoff state.

MVP checklist: sourced questions, sample labels, safe unknowns, urgent interruption, consent review, local queue, reset, outage handling, mobile chat, tests, and runbook are implemented. Real hotel data, bookings, payments, notifications, public deployment, and unrestricted generative conversation are not implemented. Team acceptance and remaining evidence are tracked separately in `ticket-status.md`.
