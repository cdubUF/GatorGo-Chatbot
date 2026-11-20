"""Read-only, explicitly fictional customers for the local sample experience."""
import json
import re
from .config import ROOT
from .schemas import KnowledgeRecord, Source


def load_customers(settings):
    if settings.profile != 'local' or not settings.sample_knowledge:
        return []
    rows = json.loads((ROOT / 'knowledge/sample-customers.json').read_text('utf-8'))
    if any(row.get('fictional') is not True for row in rows):
        raise ValueError('Sample customers must be explicitly fictional')
    return rows


def describe(customer):
    return (f"{customer['name']} ({customer['id']}) has room {customer['room']}, a {customer['room_type']}, "
            f"from {customer['arrival']} to {customer['departure']} for {customer['party_size']} guests. "
            f"Breakfast is {'included' if customer['breakfast_included'] else 'not included'}. "
            f"Preferences: {', '.join(customer['preferences'])}. "
            f"Sample itinerary: {'; '.join(customer['activities'])}. {customer['notes']}")


def customer_records(customers):
    return [KnowledgeRecord(id=c['id'].lower(), category='Fictional customers',
            topic=f"Fictional guest: {c['name']}", answer='Fictional demo guest. ' + describe(c),
            source='Invented GatorGo customer fixture; not a real booking', status='demo_only',
            updated='2026-11-18', tags=[c['name'].lower(), c['id'].lower()]) for c in customers]


def resolve_customer(customers, session, message, response, allow_trip=True):
    if not customers:
        return False
    q = message.lower().replace('’', "'")
    own_stay = bool(re.search(r'\b(my|our)\b.*\b(room|stay|trip|breakfast|arrival|departure|itinerary|preferences)\b|when (do|can) (i|we) (check|arrive|leave)|\btrip (id|code)\b', q))
    trip_code = bool(re.fullmatch(r'\s*(?:(?:my )?trip (?:id|code) (?:is )?)?demo[.!]?\s*', q))
    if trip_code and allow_trip:
        session.demo_trip = True
        q = session.trip_question or 'my room'
        session.trip_question = ''
        own_stay = True
    if allow_trip and not session.demo_trip and (own_stay or session.trip_question or q.strip(' !.') in ('hello', 'hi')):
        if own_stay:
            session.trip_question = q
        response.mode = 'mock'
        response.decision.category = 'fictional_customer'
        response.reply = 'Welcome! What is your trip ID? For this demo, enter demo to explore your sample stay.'
        response.suggestions = ['demo']
        return True
    guest_view = session.demo_trip and (own_stay or trip_code or bool(re.search(r'breakfast|preferences|itinerary|check.?out|check.?in', q)))
    matches = [c for c in customers if re.search(r'\b'+re.escape(c['name'].lower())+r'\b', q)
               or c['id'].lower() in q]
    if not matches:
        matches = [c for c in customers if re.search(r'\b'+re.escape(c['name'].split()[0].lower())+r'\b', q)]
    if matches:
        guest_view = False
    elif guest_view:
        matches = [c for c in customers if c['id'] == 'GUEST-001']
    explicit = bool(re.search(r'\b(customers?|fictional|profile|guest-\d+)\b|\bguest (details|profile|directory)\b|what room is|which room is', q))
    personal = bool(re.search(r'\b(they|their|them|his|her)\b|breakfast included|preferences|itinerary', q))
    if not matches and personal and not explicit:
        matches = [c for c in customers if c['id'] == session.active_customer]
    if not matches and not explicit:
        return False
    response.mode = 'mock'
    response.decision.category = 'fictional_customer'
    if len(matches) != 1:
        session.active_customer = ''
        if len(matches) > 1:
            response.reply = 'Which fictional guest do you mean? ' + ', '.join(c['name'] for c in matches) + '.'
        else:
            response.reply = ('Choose a fictional guest by name or demo ID, such as Alex Morgan (GUEST-001), '
                              'Jamie Rivera (GUEST-002), or Taylor Chen (GUEST-003). '
                              'I cannot confirm details for a person outside the sample directory.')
        response.suggestions = ['What room is Alex Morgan in?', 'Show me GUEST-003', 'List fictional customers']
        if re.search(r'\b(list|show all|who are|directory)\b', q):
            response.reply = 'Fictional demo customers:\n' + '\n'.join(f"{c['id']} — {c['name']}" for c in customers)
        return True
    c = matches[0]
    session.active_customer = c['id']
    session.active_venue = ''
    session.topic = f"Fictional guest: {c['name']}"
    if re.search(r'\b(change|cancel|book|upgrade|move|refund|update|reserve)\b', q):
        answer = 'These sample profiles are read-only; no booking or customer details were changed.'
    elif re.search(r'check.?out|depart|leav', q):
        answer = f"{c['name']} checks out on {c['departure']} at the standard 11:00 AM checkout time."
    elif re.search(r'check.?in|arriv', q):
        answer = f"{c['name']} arrives on {c['arrival']}; standard check-in begins at 3:00 PM."
    elif 'breakfast' in q:
        answer = f"Breakfast is {'included' if c['breakfast_included'] else 'not included'} for {c['name']}."
    elif re.search(r'prefer|pillow|milk|blanket', q):
        answer = f"{c['name']}'s recorded preferences are {', '.join(c['preferences'])}."
    elif re.search(r'activity|activities|itinerary|plans|scheduled', q):
        answer = f"{c['name']}'s fictional itinerary: {'; '.join(c['activities'])}. This is not a real reservation."
    elif re.search(r'party|how many|people', q):
        answer = f"{c['name']}'s sample party has {c['party_size']} guests."
    elif 'room' in q:
        answer = f"{c['name']} is assigned room {c['room']}, a {c['room_type']}."
    elif re.search(r'email|phone|address|passport|card|birthday|balance', q):
        answer = 'That detail is not included in this fictional profile; I will not invent it.'
    else:
        answer = describe(c)
    response.reply = 'Fictional demo guest: ' + answer
    if guest_view:
        answer = answer.replace(f"{c['name']}'s", 'Your').replace(f"{c['name']} checks", 'You check').replace(f"{c['name']} arrives", 'You arrive').replace(f"{c['name']} is", 'You are').replace(f"for {c['name']}", 'for you')
        response.reply = (f"Welcome, {c['name'].split()[0]}! Your demo trip is ready. " if trip_code else '') + answer
    response.sources = [Source(id=c['id'].lower(), topic=session.topic,
                       source='Invented GatorGo customer fixture; not a real booking', status='demo_only', score=10)]
    response.suggestions = ['When do they check out?', 'Is breakfast included?', 'What are their preferences?']
    if guest_view:
        response.suggestions = ['When do I check out?', 'Is breakfast included in my stay?', 'What is my itinerary?']
    return True
