"""Deterministic source filtering and matching; no provider dependencies."""
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path

from .schemas import KnowledgeRecord, Source
from .policy import injection_attempt

STOP = set("what when where how is are the a an i my your you do does it about can at of to and have time hours times open close opens closes".split())


def normalize(text):
    text = text.lower().replace("check-in", "checkin").replace("check in", "checkin")
    text = text.replace("check-out", "checkout").replace("check out", "checkout")
    text = text.replace("wi-fi", "wifi").replace("wi fi", "wifi")
    return " ".join(re.findall(r"[a-z0-9]+", text))


def tokens(text):
    return set(normalize(text).split()) - STOP


def read_records(path: Path):
    return [KnowledgeRecord.model_validate(row) for row in json.loads(path.read_text("utf-8"))]


def validate_records(records):
    ids = Counter(r.id for r in records)
    if any(n > 1 for n in ids.values()):
        raise ValueError("Duplicate record IDs")
    topics = {}
    for r in records:
        key = normalize(r.topic)
        if key in topics and topics[key] != r.answer:
            raise ValueError(f"Conflicting topic: {r.topic}")
        topics[key] = r.answer


class Retriever:
    def __init__(self, records, demo=False, threshold=1.5):
        self.records = records
        self.demo = demo
        self.threshold = threshold

    def search(self, query, limit=3):
        eligible = [r for r in self.records if r.status == "approved" or
                    (self.demo and r.status == "demo_only")]
        # Fail closed for contradictory topics or duplicate IDs, including stale peers.
        counts = Counter(r.id for r in eligible)
        answers = {}
        for r in eligible:
            answers.setdefault(normalize(r.topic), set()).add(r.answer)
        q, words = normalize(query), tokens(query)
        ranked = []
        for r in eligible:
            if injection_attempt(r.answer):
                continue
            if counts[r.id] > 1 or len(answers[normalize(r.topic)]) > 1:
                continue
            if r.expires is not None and r.expires < date.today():
                continue
            # A topic match alone cannot answer unsupported prices, locations, or availability.
            attributes = [
                ({"price", "cost", "costs", "fee", "fees", "much"}, {"price", "cost", "fee", "fees", "included", "complimentary"}),
                ({"where", "location", "address"}, {"located", "location", "address", "floor"}),
                ({"available", "availability", "vacancy"}, {"available", "availability", "confirm"}),
                ({"owner", "birthday", "built"}, {"owner", "birthday", "built"}),
            ]
            query_words = set(q.split())
            answer_words = set(normalize(r.answer).split())
            if any(query_words & asked and not answer_words & needed for asked, needed in attributes):
                continue
            terms = tokens(r.topic + " " + " ".join(r.tags))
            overlap = words & terms
            score = len(overlap) * 2.0
            if any(" " + normalize(t) + " " in " " + q + " " for t in r.tags):
                score += 2
            if overlap and score >= self.threshold:
                ranked.append((score, r))
        ranked.sort(key=lambda pair: (-pair[0], pair[1].id))
        return [(r, Source(id=r.id, topic=r.topic, source=r.source, status=r.status, score=s))
                for s, r in ranked[:limit]]
