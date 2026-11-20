import re
import logging
import time
from dataclasses import replace
from uuid import uuid4

from .policy import classify, injection_attempt, safe_history, sensitive
from .provider import ModelAdapter, ProviderUnavailable
from .memory import context, remember
from .intents import questions
from .schemas import ChatResponse, Decision, Handoff
from .venues import resolve_venue
from .sample_customers import load_customers, resolve_customer

logger = logging.getLogger("gatorgo.chat")

DESCRIPTIONS = {
    "safety": "Guest reports a possible safety emergency. Urgent direct human assistance needed.",
    "staff": "Guest requests a conversation with a human employee or manager.",
    "billing": "Guest requests staff review of a billing, refund, or compensation concern.",
    "distress": "Guest reports serious dissatisfaction or distress and requests support.",
    "housekeeping": "Guest reports a room cleanliness or housekeeping concern.",
    "maintenance": "Guest reports a room equipment or maintenance problem.",
    "reservation_change": "Guest requests staff review of a reservation or stay change.",
    "unknown": "Guest needs hotel information that the available knowledge cannot confirm.",
    "repeated_failure": "Guest has encountered repeated unanswered questions and needs human help.",
}


class Concierge:
    def __init__(self, settings, retriever, provider, reservations):
        self.settings, self.retriever, self.provider = settings, retriever, provider
        self.reservations = reservations if settings.demo else []
        self.customers = load_customers(settings)

    def handoff(self, session, decision):
        summary = DESCRIPTIONS[decision.category]
        # Retain only controlled topic context, never arbitrary names or guest messages.
        if session.concern:
            summary += f" Reported concern: {session.concern}."
        if session.topic and decision.category in {"unknown", "repeated_failure"}:
            summary += f" Recent topic: {session.topic}."
        session.pending = Handoff(id=uuid4(), category=decision.category,
                                  urgency=decision.urgency, summary=summary)
        return session.pending

    async def chat(self, session, message, reservation_context=None, *, guide='desk'):
        started = time.perf_counter()
        clauses = questions(message)
        # Safety, sensitive details and in-progress stay flows cannot be bypassed by splitting.
        guarded = (classify(message).level != 'ai' or sensitive(message) or injection_attempt(message)
                   or session.stage or session.trip_question or reservation_context)
        if len(clauses) == 1 or guarded:
            response = await self._chat(session, message, reservation_context, guide=guide)
        else:
            local_settings = replace(self.settings, provider='mock')
            local = Concierge(local_settings, self.retriever, ModelAdapter(local_settings), self.reservations)
            replies = [await local._chat(session, clause, guide=guide) for clause in clauses]
            response = replies[0]
            response.reply = '\n\n'.join(r.reply for r in replies)
            response.sources = list({s.id: s for r in replies for s in r.sources}.values())
            response.actions = list({str(a): a for r in replies for a in r.actions}.values())
            response.choices = [c for r in replies for c in r.choices]
            routed = next((r for r in replies if r.decision.level == 'human'), None) or next((r for r in replies if r.decision.level == 'assisted'), None)
            if routed:
                response.decision, response.status, response.handoff = routed.decision, routed.status, routed.handoff
            # Synthesize once from the resolved evidence, rather than serial model calls per intent.
            if self.settings.provider == 'openai' and response.sources and not response.choices:
                grounded = [record.model_copy(update={'answer': '\n'.join(r.reply for r in replies
                            if any(s.id == record.id for s in r.sources))})
                            for record in self.retriever.records if any(s.id == record.id for s in response.sources)]
                try:
                    answer, selected = await self.provider.answer(safe_history(message), context(session), grounded, guide=guide)
                    if {s.id for s in response.sources} <= set(selected):
                        response.reply, response.mode = answer, 'ai'
                except ProviderUnavailable:
                    response.mode, response.status = 'faq_fallback', 'fallback'
        remember(session, message, response, self.settings.history_limit, private=bool(reservation_context))
        response.timings_ms['answer'] = round((time.perf_counter() - started) * 1000, 2)
        return response

    async def _chat(self, session, message, reservation_context=None, *, guide='desk'):
        decision = classify(message)
        # Mark deterministic routing truthfully even when an AI provider is configured.
        mode = "ai" if self.settings.provider == "openai" else "mock"
        response = ChatResponse(session_id=session.id, reply="", mode=mode,
                                demo=self.settings.demo, decision=decision)
        q = message.lower().strip().replace("’", "'")
        for pattern, concern in [
            (r"\b(dirty|filthy|housekeeping|disgusting)\b", "room cleanliness / housekeeping"),
            (r"\b(air conditioning|ac)\b", "air conditioning"),
            (r"\b(no hot water)\b", "hot water unavailable"),
            (r"\b(towels?)\b", "towel request"),
            (r"\b(broken|maintenance|leak)\b", "room maintenance"),
        ]:
            if re.search(pattern, q):
                session.concern = concern
                break
        if decision.level != "ai":
            session.stage, session.confirmation = "", ""
            response.status = "needs_human"
            if decision.category == "safety":
                response.reply = ("Your safety comes first. If there is immediate danger, contact "
                    "local emergency services now and contact a hotel employee as soon as it is safe. "
                    "I cannot dispatch responders or notify security. Do not wait for this chat.")
            else:
                response.reply = ("I'm sorry this has been difficult. A hotel employee needs to help "
                    "with this request. I can prepare a brief summary for you to review. "
                    "No staff has been contacted, and no booking, charge, or service has been changed.")
            response.handoff = self.handoff(session, decision)
        elif injection_attempt(message):
            response.reply = ("I'm a virtual AI concierge. I can help with sourced hotel information, "
                "but cannot reveal private instructions, invent facts, or claim actions I haven't taken.")
        elif not reservation_context and resolve_customer(self.customers, session, message, response, allow_trip=self.settings.reservation_mode == 'disabled'):
            return response
        elif sensitive(message):
            response.reply = ("Please don't share payment, identity, health, or booking details "
                "here. Contact hotel staff directly for sensitive requests.")
        elif self.settings.demo and q in {"stop", "cancel demo", "exit demo"}:
            session.stage, session.confirmation = "", ""
            response.reply = "The simulated lookup is cleared. No reservation was changed."
        elif session.stage:
            response.reply = self.reservation_step(session, message)
        elif self.settings.demo and re.search(r"\bdemo\b.*\b(check.?in|check.?out|reservation)\b", q):
            session.stage = "confirmation"
            response.reply = ("Let's try a simulated reservation lookup. Enter DEMO-2048 or DEMO-3012. "
                "Use fictional details only. Type 'stop' to exit. Staff must complete any real check-in or check-out.")
        elif self.settings.provider == "mock" and re.fullmatch(r"(hi|hello|hey|thanks|thank you)[!. ]*", q):
            response.reply = ("Hello! I'm Gator Go's virtual AI concierge. I can help with hotel "
                              "information and prepare a human-handoff summary. How can I help?")
        elif resolve_venue(session, message, response, self.retriever, self.settings):
            # Keep resolved dates, closures, cards and ambiguity authoritative.
            if self.settings.provider == 'openai' and response.sources and not response.choices:
                grounded = [record.model_copy(update={'answer': record.answer + '\nResolved answer for this question (takes precedence over general hours): ' + response.reply})
                            for record in self.retriever.records if any(source.id == record.id for source in response.sources)]
                try:
                    reply, selected = await self.provider.answer(safe_history(message), context(session),
                                                                 grounded, guide=guide)
                    if {source.id for source in response.sources} <= set(selected):
                        response.reply = reply
                except ProviderUnavailable:
                    response.mode, response.status = 'faq_fallback', 'fallback'
            return response
        else:
            query = message
            if session.topic and re.fullmatch(r'(?:and )?(?:costs?|fees?|prices?|availability)[?. ]*', q):
                query += ' ' + session.topic
            if session.topic and re.fullmatch(r"(and )?(what (are|about) (the |its )?)?(hours|times|when|it|that)[?. ]*", q):
                query += " " + session.topic
            hits = self.retriever.search(query)
            if not hits and session.topic and re.search(r"\b(it|its|there|they|their|that|this|those)\b", q):
                hits = self.retriever.search(query + " " + session.topic)
            if (not hits and re.search(r"\b(recommend|suggest|things to do|what should i do)\b", q)
                and not re.search(r"\b(nearby|local|attraction|attractions|offsite|off-site)\b", q)):
                hits = self.retriever.search("resort amenities spa dining")
            strict_unknown = (not hits and not self.settings.demo and not self.settings.sample_knowledge
                              and (self.settings.profile != "local" or re.search(
                                  r"\b(hotel|resort|shuttle|airport|pool|spa|breakfast|dining|check.?in|check.?out|parking|restaurant|transport)\b", q)))
            if strict_unknown:
                response.reply = ("I don't have verified information to answer that. Please contact the hotel directly. "
                                  "No booking was made and no staff was notified.")
                response.decision = Decision(level="assisted", category="unknown")
                response.status = "needs_human"
                contacts = self.retriever.search("front desk contact")
                contacts = [(r, source) for r, source in contacts if r.status == "approved" and "contact" in r.tags]
                if contacts:
                    response.reply += " " + contacts[0][0].answer
                    response.sources = [contacts[0][1]]
                return response
            if self.settings.provider == "openai":
                try:
                    args = (safe_history(query), context(session), [r for r, _ in hits])
                    if reservation_context:
                        response.reply, selected = await self.provider.answer(*args, reservation_context, guide=guide)
                    else:
                        response.reply, selected = await self.provider.answer(*args, guide=guide)
                    response.sources = [source for record, source in hits if record.id in selected]
                    if response.sources:
                        session.topic = response.sources[0].topic
                    session.failures = 0
                except ProviderUnavailable:
                    logger.warning("Live answer unavailable; returning safe fallback")
                    response.mode, response.status = "faq_fallback", "fallback"
                    if hits:
                        record, source = hits[0]
                        response.sources = [source]
                        response.reply = "The AI service is temporarily unavailable. " + record.answer
                        session.topic = source.topic
                    else:
                        response.reply = ("The AI service is temporarily unavailable. Please try again "
                                          "or contact the hotel directly for assistance.")
                response.suggestions = ["What time is check-in?", "What are the spa hours?", "I want a manager"]
                return response
            if hits:
                try:
                    selected = await self.provider.select(safe_history(query), context(session),
                                                          [r for r, _ in hits])
                    response.mode = "ai" if self.settings.provider == "openai" else "mock"
                except ProviderUnavailable:
                    selected = [hits[0][0].id]
                    response.mode, response.status = "faq_fallback", "fallback"
                hits = [(r, s) for r, s in hits if r.id in selected]
            if hits:
                response.sources = [s for _, s in hits]
                response.reply = "\n\n".join(r.answer for r, _ in hits)
                if any(r.status == "demo_only" for r, _ in hits):
                    response.reply = "Project test information:\n\n" + response.reply
                if response.mode == "faq_fallback":
                    response.reply = "The AI service is unavailable. Here is a sourced FAQ answer:\n\n" + response.reply
                session.topic = hits[0][0].topic
                session.failures = 0
            else:
                session.failures += 1
                decision = Decision(level="human" if session.failures >= 2 else "assisted",
                    category="repeated_failure" if session.failures >= 2 else "unknown")
                response.decision, response.status = decision, "needs_human"
                response.reply = ("I don't have reliable information to answer that. A hotel employee "
                    "would need to confirm it. I can prepare a summary; no staff has been contacted.")
                response.handoff = self.handoff(session, decision)
        response.suggestions = (["DEMO-2048", "DEMO-3012", "stop"] if session.stage == "confirmation"
            else ["Parker", "Lee", "stop"] if session.stage == "surname"
            else ["What time is check-in?", "What are the spa hours?", "I want a manager"])
        return response

    def reservation_step(self, session, message):
        if session.stage == "confirmation":
            code = message.strip().upper()
            if not any(r["confirmation"] == code for r in self.reservations):
                return "That demo code wasn't found. Try DEMO-2048 or DEMO-3012, or type 'stop'."
            session.confirmation, session.stage = code, "surname"
            return "Enter the fictional last name (Parker for DEMO-2048, Lee for DEMO-3012)."
        record = next((r for r in self.reservations if r["confirmation"] == session.confirmation
                       and r["last_name"].lower() == message.strip().lower()), None)
        if not record:
            return "The demo code and surname don't match. Try the matching fictional surname, or type 'stop'."
        session.stage, session.confirmation = "", ""
        return (f"Sample reservation found: {record['first_name']} {record['last_name']}, "
                f"{record['room_type']}, {record['arrival']} to {record['departure']}. "
                "This is simulated only. Staff must verify identity and complete check-in/check-out. "
                "No room, key, payment, or reservation was changed.")
