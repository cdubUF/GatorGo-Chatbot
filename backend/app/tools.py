"""Explicit, validated read-only tools. No property mutations or arbitrary network access."""
import hashlib
import json
import time
from datetime import date
from copy import copy
from typing import Literal

from fastapi import HTTPException
from pydantic import Field, ValidationError

from .schemas import StrictModel, Decision
from .venues import available_venues, local_day


class Lookup(StrictModel):
    query: str = Field(min_length=1, max_length=1000)


class Activities(StrictModel):
    day: date | None = None


class Prepare(StrictModel):
    category: Literal['housekeeping', 'maintenance', 'staff', 'billing', 'reservation_change']


REGISTRY = {
    'lookup_resort': (Lookup, 'Look up sourced resort information. Translate the query to English, include all parts of the question, and preserve named venues and dates. This tool cannot make bookings or verify identity.'),
    'list_activities': (Activities, 'Read scheduled resort activities for an ISO date, or today when day is null. This does not reserve places.'),
    'prepare_handoff': (Prepare, 'Prepare a summary for the guest to review. Does not submit a ticket, notify staff, or dispatch help. Never ask for room, booking, payment or identity details.'),
}


def definitions():
    result = []
    for name, (model, description) in REGISTRY.items():
        schema = model.model_json_schema()
        schema['required'] = list(schema['properties'])
        result.append({'type': 'function', 'name': name, 'description': description,
                       'parameters': schema})
    return result


class ToolExecutor:
    def __init__(self, engine):
        self.engine = engine

    async def execute(self, session, call):
        model, _ = REGISTRY[call.name]
        try:
            args = model.model_validate(call.arguments)
        except ValidationError:
            raise HTTPException(422, 'Invalid tool arguments') from None
        fingerprint = hashlib.sha256(json.dumps(call.model_dump(mode='json'), sort_keys=True).encode()).hexdigest()
        async with session.tool_lock:
            cached = session.tool_results.get(call.call_id)
            if cached:
                if cached[0] != fingerprint:
                    raise HTTPException(409, 'Tool call ID already used')
                return cached[1]
            now = time.monotonic()
            session.tool_requests[:] = [t for t in session.tool_requests if now - t < 60]
            if len(session.tool_requests) >= 30:
                raise HTTPException(429, 'Too many tool requests')
            session.tool_requests.append(now)
            started = time.perf_counter()
            if call.name == 'lookup_resort':
                # A delayed/cancelled lookup must not replace newer guest memory.
                async with session.lock:
                    shadow = copy(session)
                    shadow.history = list(session.history)
                    shadow.preferences = list(session.preferences)
                    shadow.memory_topics = list(session.memory_topics)
                    reply = await self.engine.fallback_service.chat(shadow, args.query)
                    session.feedback[str(reply.reply_id)] = {'sources':[s.id for s in reply.sources], 'flagged':False}
                    while len(session.feedback) > 100:
                        del session.feedback[next(iter(session.feedback))]
                reply.timings_ms['total'] = round((time.perf_counter() - started) * 1000, 2)
                result = reply.model_dump(mode='json')
            elif call.name == 'list_activities':
                allowed = {r.id for r in available_venues(self.engine.service.retriever)}
                day = args.day or local_day(self.engine.settings)
                result = {'date': day.isoformat(), 'timezone': self.engine.settings.resort_timezone,
                          'events': [e for e in self.engine.events if e['venue_id'] in allowed and e['date'] == day.isoformat()],
                          'sample_knowledge': self.engine.settings.sample_knowledge}
            else:
                async with session.lock:
                    decision = Decision(level='assisted', category=args.category)
                    result = self.engine.service.handoff(session, decision).model_dump(mode='json')
                    result.update(submitted=False, staff_notified=False, requires_guest_review=True)
            self.engine.metrics['tool_calls'] += 1
            self.engine.metrics['tool_duration_ms_total'] += round((time.perf_counter() - started) * 1000)
            session.tool_results[call.call_id] = (fingerprint, result)
            while len(session.tool_results) > 100:
                del session.tool_results[next(iter(session.tool_results))]
            session.touched = time.monotonic()
            return result
