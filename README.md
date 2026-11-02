# Gator Go Resort & Spa — AI Concierge Demo

## Run locally
From this folder, run `python -m http.server 8000` and open http://localhost:8000 in your browser. No API key is required.

## What this prototype is
An interactive, **rule-based** front-desk chatbot with a sample JSON knowledge base, simulated reservation lookup, complaint handling, and human-handoff messaging. **It does not use an LLM**, process real bookings, or notify real staff. These limitations should be disclosed in the presentation. Replace the sample knowledge base with the instructor-approved hotel information before asserting actual hotel policies.

## Suggested 60-second screen recording
0–10 seconds: Introduce the concierge and ask "What amenities do you have?"
10–25 seconds: Ask "What are your spa hours?" to show knowledge-base responses.
25–43 seconds: Say "My room is dirty and I'm really frustrated" to show empathy.
43–60 seconds: Say "I want a manager" to demonstrate escalation. Mention that handoff is simulated.

## Instructor criteria
The project asks for a virtual appearance, guest-service conversation, tone/personality, clear unknown-answer handling, and human escalation. Survey metrics include helpfulness, friendliness, competence, trustworthiness, and satisfaction.

## Next iteration
Connect an LLM through a server-side API, use retrieval from the verified knowledge base, implement real staff handoff with permission, and test against a rubric. Never put API secrets in client-side JavaScript.
