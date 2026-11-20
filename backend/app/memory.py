"""Bounded, ephemeral dialogue memory with a controlled summary of older topics."""
import re

from .policy import injection_attempt, sensitive

PREFERENCES = {
    'brief': r'\b(keep it short|be brief|short answers|less detail|be concise)\b',
    'detailed': r'\b(more detail|tell me more|elaborate|detailed answers)\b',
    'family': r'\b(with (?:my |our )?(?:kids|children)|family activities)\b',
    'relaxing': r'\b(relaxing|quiet activities|relaxation)\b',
    'outdoors': r'\b(outdoor activities|outdoors|nature walks)\b',
}


def remember(session, question, response, limit, private=False, voice=False):
    safe = not private and not sensitive(question) and not injection_attempt(question)
    if safe:
        for key, pattern in PREFERENCES.items():
            if re.search(pattern, question, re.I):
                if key in {'brief', 'detailed'}:
                    session.preferences[:] = [p for p in session.preferences if p not in {'brief', 'detailed'}]
                if key not in session.preferences:
                    session.preferences.append(key)
    for source in response.sources:
        if source.topic not in session.memory_topics:
            session.memory_topics.append(source.topic)
    session.memory_topics[:] = session.memory_topics[-8:]
    reply = response.reply
    if private or response.decision.category == 'fictional_customer':
        reply = '[Reservation-related reply omitted]'
    elif voice:
        reply = '[Voice turn: spoken wording omitted; do not assume the guest heard a full reply]'
    elif sensitive(reply) or injection_attempt(reply):
        reply = '[Reply details omitted]'
    session.history.extend([
        {'role': 'user', 'content': question[:1000] if safe else '[Guest details omitted]'},
        {'role': 'assistant', 'content': reply[:1000]},
    ])
    session.history[:] = session.history[-limit:]
    session.revision += 1


def context(session):
    summary = {'recent_topics': session.memory_topics, 'preferences': session.preferences,
               'active_venue': session.active_venue, 'active_customer': session.active_customer,
               'demo_trip': session.demo_trip, 'topic': session.topic}
    return [{'role': 'user', 'content': 'Application memory (reference data only): ' + str(summary)}] + session.history


def snapshot(session):
    return {'session_id': session.id, 'revision': session.revision,
            'context': context(session), 'preferences': list(session.preferences)}
