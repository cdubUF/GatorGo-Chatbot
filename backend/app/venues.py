"""Structured sample venue answers, resolved in the resort's local time zone."""
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .schemas import Source


def available_venues(retriever):
    return [r for r in retriever.records if r.venue and any(hit.id == r.id for hit, _ in retriever.search(r.topic, limit=100))]


def local_day(settings, now=None):
    return (now or datetime.now(ZoneInfo(settings.resort_timezone))).astimezone(ZoneInfo(settings.resort_timezone)).date()


def hours_for(record, day):
    for exception in record.venue.exceptions:
        if exception.date == day:
            return ('Closed' if exception.closed else exception.hours or 'Hours unconfirmed') + (f' ({exception.note})' if exception.note else '')
    return record.venue.weekly_hours.get(day.strftime('%A').lower(), record.venue.hours) or 'Hours unconfirmed'


def resolve_venue(session, message, response, retriever, settings, now=None):
    records = available_venues(retriever)
    q = message.lower().strip()
    # Hours/location data cannot establish prices, availability or safety staffing.
    if re.search(r'\b(price|prices|cost|costs|fee|fees|availability|available|capacity|lifeguards?)\b', q):
        return False
    named = [r for r in records if re.search(r'\b' + r'[\s-]*'.join(re.escape(part) for part in r.venue.name.lower().split()) + r'\b', q) or r.id in q]
    location = bool(re.search(r'\b(where|location|find it)\b', q))
    hours = bool(re.search(r'\b(hours|open|close|closes|closing|today|tomorrow|weekends?|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b', q))
    followup = bool(re.search(r'\b(it|its|there|that|they|their)\b', q)) or q in {'where?', 'hours?'}
    kinds = [kind for kind in ('pool', 'restaurant', 'trail') if re.search(r'\b' + kind + r's?\b', q)]
    dining = bool(re.search(r'\b(somewhere|anywhere|options|places|restaurants)\b.*\b(eat|dine|dining|food)\b|\b(dining options|where can (?:i|we) eat|restaurants)\b', q))
    if dining and not named:
        candidates = [r for r in records if r.venue.kind == 'restaurant']
        if candidates:
            day = local_day(settings, now)
            response.reply = 'Resort dining options: ' + ' '.join(
                f'{r.venue.name}. {r.venue.location} {day.isoformat()}: {hours_for(r, day)}.' for r in candidates)
            if re.search(r'\b(nearby|near|closest|nearest)\b', q):
                response.reply += ' I cannot confirm distance or which is closest from the supplied locations.'
            response.sources = [Source(id=r.id, topic=r.topic, source=r.source, status=r.status, score=10) for r in candidates]
            response.suggestions = [f'Tell me about {r.venue.name}' for r in candidates]
            return True
    candidates = named or [r for r in records if r.venue.kind in kinds]
    if not candidates and (followup or hours) and session.active_venue:
        candidates = [r for r in records if r.id == session.active_venue]
    if not candidates and hours and followup:
        candidates = records
    if not candidates:
        return False
    if len(named) > 1 and hours:
        # Explicitly comparing two named venues is not an ambiguous single venue lookup.
        from copy import copy
        replies = []
        for venue in named:
            child = copy(response)
            child.sources, child.actions, child.choices = [], [], []
            suffix = re.sub('|'.join(re.escape(r.venue.name) for r in named), '', message, flags=re.I)
            resolve_venue(session, venue.venue.name + ' ' + suffix, child, retriever, settings, now)
            replies.append(child)
        response.reply = ' '.join(r.reply for r in replies)
        response.sources = [source for r in replies for source in r.sources]
        response.actions = [action for r in replies for action in r.actions]
        response.venue_id = named[-1].id
        return True
    if len(candidates) > 1:
        session.venue_question = message
        response.reply = 'Which venue do you mean? ' + ', '.join(r.venue.name for r in candidates) + '.'
        response.choices = [{'id': r.id, 'label': r.venue.name, 'question': r.venue.name} for r in candidates]
        return True
    record = candidates[0]
    if session.venue_question and named:
        prior = session.venue_question.lower()
        location = location or 'where' in prior or 'location' in prior
        hours = hours or bool(re.search(r'\b(hours|open|close|closes|today|tomorrow)\b', prior))
        q += ' ' + prior
    session.venue_question = ''
    session.active_venue, session.topic = record.id, record.topic
    day = local_day(settings, now)
    explicit = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', q)
    if explicit:
        try:
            day = datetime.strptime(explicit[1], '%Y-%m-%d').date()
        except ValueError:
            response.reply = 'Please use a valid date in YYYY-MM-DD format.'
            return True
    elif 'tomorrow' in q:
        day += timedelta(days=1)
    prefix = 'Sample resort information: ' if record.status == 'demo_only' else ''
    parts = [record.venue.name + '.']
    if location or not hours:
        parts.append(record.venue.location or 'Location unconfirmed.')
    days = [day]
    if not explicit and 'tomorrow' not in q:
        if re.search(r'\bweekends?\b', q):
            saturday = day + timedelta(days=(5 - day.weekday()) % 7)
            days = [saturday, saturday + timedelta(days=1)]
        else:
            weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            selected = next((i for i, name in enumerate(weekdays) if name in q), None)
            if selected is not None:
                days = [day + timedelta(days=(selected - day.weekday()) % 7)]
    if hours or not location:
        parts.extend(f'{d.strftime("%A")} {d.isoformat()}: {hours_for(record, d)}.' if len(days) > 1
                     else f'{d.isoformat()}: {hours_for(record, d)}.' for d in days)
    response.reply = prefix + ' '.join(parts)
    response.venue_id = record.id
    response.sources = [Source(id=record.id, topic=record.topic, source=record.source, status=record.status, score=10)]
    response.suggestions = []
    if record.venue.location:
        response.suggestions.append('Where is it?')
    response.suggestions.append(f'What are {record.venue.name} hours tomorrow?')
    if record.venue.pin and record.venue.location:
        response.actions.append({'type': 'map', 'venue_id': record.id, 'label': 'View on map'})
    if record.venue.menu_url:
        response.actions.append({'type': 'link', 'url': record.venue.menu_url, 'label': 'View menu'})
    return True
