"""Routing runs before dialogue state and providers. Conservative English MVP rules."""
import re

from .schemas import Decision

RULES = [
    ("human", "safety", "urgent", r"\b(emergency|fire|smoke|medical|injur\w*|unconscious|bleeding|ambulance|unsafe|threat\w*|violence|weapon|assault|gas leak|can't breathe|cannot breathe|chest pain|suicid\w*|kill myself)\b"),
    ("human", "staff", "priority", r"\b(manager|human|real person|supervisor|staff member|representative|speak to someone|talk to someone|front desk|security)\b"),
    ("human", "billing", "priority", r"\b(refund\w*|compensation|money back|discount|charge\w*|billing|payment)\b"),
    ("human", "distress", "priority", r"\b(worst|terrible|furious|frustrated|upset|unacceptable|panic\w*|distress\w*|crying|missed.{0,12}flight|stranded|harass\w*|discriminat\w*)\b"),
    ("assisted", "housekeeping", "routine", r"\b(dirty|filthy|housekeeping|towels?|clean.{0,12}room|disgusting)\b"),
    ("assisted", "maintenance", "routine", r"\b(broken|air conditioning|ac|no hot water|leak\w*|maintenance|not working)\b"),
    ("human", "reservation_change", "routine", r"\b(cancel\w*|late checkout|late check.out|change.{0,15}(booking|reservation|room)|room key|key access|check me out)\b"),
]


def classify(message):
    text = message.lower().replace("’", "'")
    for level, category, urgency, pattern in RULES:
        if re.search(pattern, text):
            return Decision(level=level, category=category, urgency=urgency)
    return Decision()


def injection_attempt(text):
    return bool(re.search(r"ignore.{0,40}(instruction|rule|previous)|system prompt|api.?key|"
                          r"developer message|pretend.{0,35}(book|refund|staff|confirm)|"
                          r"reveal.{0,30}(secret|prompt)|<\|", text, re.I))


def sensitive(text):
    return bool(re.search(r"(?:\d[ -]?){9,}|[\w.+-]+@[\w.-]+\.\w+|"
                          r"\b(passport|social security|credit card|my address|my name is|"
                          r"my room is \d|room number|diagnos\w*)\b", text, re.I))


def safe_history(text):
    return "[Guest details omitted]" if sensitive(text) else text[:1000]
