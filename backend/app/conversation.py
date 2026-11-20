"""Shared text/legacy-voice orchestration: policy, language, memory and response tracing."""
import asyncio
import logging
import time

from fastapi import HTTPException

from .languages import LANGUAGES, UNKNOWN, route, translate
from .policy import sensitive, injection_attempt
from .provider import ProviderUnavailable
from .reservations import HOTELS
from .venues import available_venues

logger = logging.getLogger('gatorgo.conversation')


class ConversationEngine:
    def __init__(self, settings, service, fallback_service, sessions, usage, verification, events, metrics):
        self.settings, self.service, self.fallback_service = settings, service, fallback_service
        self.sessions, self.usage, self.verification = sessions, usage, verification
        self.events, self.metrics = events, metrics

    async def reply(self, body, authorization="", fast_local=False):
        settings, verification = self.settings, self.verification
        sessions, usage, service = self.sessions, self.usage, self.service
        fallback_service, app_events, metrics = self.fallback_service, self.events, self.metrics
        checkpoints = {}
        trace_started = time.perf_counter()
        if body.locale != "auto" and body.locale not in LANGUAGES:
            raise HTTPException(422, "Unsupported language")
        reservation_context = None
        if authorization:
            if verification is None:
                raise HTTPException(401, "Reservation verification required or expired.")
            hotel, reservation_id = verification.authorized(authorization)
            row = await asyncio.to_thread(verification.providers[hotel].by_id, reservation_id)
            if not row:
                raise HTTPException(401, "Reservation verification required or expired.")
            reservation_context = {"hotel": HOTELS[hotel], "provider": hotel,
                                   **{key: row[key] for key in
                                      ("check_in", "check_out", "room_type", "guests", "status")}}
        try:
            session = sessions.get(body.session_id)
        except OverflowError:
            raise HTTPException(503, "Conversation capacity reached. Please try later.") from None
        async with session.lock:
            now = time.monotonic()
            session.requests[:] = [t for t in session.requests if now - t < 60]
            if len(session.requests) >= 30:
                raise HTTPException(429, "Please wait a minute before sending more messages.")
            session.requests.append(now)
            detected, query = "en", body.message
            paid_available = usage.available()
            active_service = fallback_service if fast_local or (settings.provider == "openai" and not paid_available) else service
            multilingual = settings.multilingual and settings.provider == "openai" and paid_available and not fast_local
            if multilingual and not sensitive(body.message) and not injection_attempt(body.message):
                routing_started = time.perf_counter()
                try:
                    detected, query = await route(service.provider, body.message)
                    checkpoints['language_routing'] = round((time.perf_counter() - routing_started) * 1000, 2)
                except ProviderUnavailable:
                    raise HTTPException(503, "Language service unavailable. Please retry.") from None
            elif body.locale not in {"auto", "en"}:
                raise HTTPException(503, "This local provider supports English only.")
            locale = detected if body.locale == "auto" else body.locale
            answer_started = time.perf_counter()
            event = next((e for e in app_events if e['title'].lower() in query.lower()), None)
            if event and not sensitive(query) and not injection_attempt(query):
                venue = next((r for r in available_venues(service.retriever) if r.id == event['venue_id']), None)
                result = await active_service.chat(session, venue.venue.name if venue else query, reservation_context, guide=body.guide)
                result.reply = (f"Sample event: {event['title']} on {event['date']} at {event['start_time']} "
                                f"({settings.resort_timezone}). {event['description']} " + result.reply)
            else:
                result = await active_service.chat(session, query, reservation_context, guide=body.guide)
            checkpoints['answer'] = round((time.perf_counter() - answer_started) * 1000, 2)
            if active_service is fallback_service:
                result.mode = "mock" if fast_local else "faq_fallback"
            session.feedback[str(result.reply_id)] = {'sources': [s.id for s in result.sources], 'flagged': False}
            while len(session.feedback) > 100:
                del session.feedback[next(iter(session.feedback))]
            result.detected_locale, result.reply_locale = detected, locale
            if locale != "en":
                translation_started = time.perf_counter()
                try:
                    result.reply = UNKNOWN[locale] if result.decision.category in {"unknown", "repeated_failure"} and not result.sources else await translate(service.provider, result.reply, locale)
                    if result.handoff:
                        result.handoff.summary = await translate(service.provider, result.handoff.summary, locale)
                        result.handoff.next_step = await translate(service.provider, result.handoff.next_step, locale)
                    result.suggestions = []
                except ProviderUnavailable:
                    result.reply = UNKNOWN[locale]
                    result.sources, result.handoff, result.suggestions = [], None, []
                    result.status, result.mode = "fallback", "faq_fallback"
                checkpoints['translation'] = round((time.perf_counter() - translation_started) * 1000, 2)
            session.touched = time.monotonic()
            metrics["requests"] += 1
            metrics[result.decision.level] += 1
            metrics[result.mode] += 1
            metrics["sourced"] += bool(result.sources)
            metrics["latency_ms_total"] += round((time.monotonic() - now) * 1000)
            checkpoints['total'] = round((time.perf_counter() - trace_started) * 1000, 2)
            result.timings_ms.update(checkpoints)
            logger.info('Conversation trace=%s mode=%s category=%s sources=%s total_ms=%s',
                        result.trace_id, result.mode, result.decision.category, len(result.sources), checkpoints['total'])
            return result
