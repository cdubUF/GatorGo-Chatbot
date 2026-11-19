"""Global admission and durable conservative paid-call reservations; no guest data."""
import sqlite3
import threading
import time
from collections import deque
from pathlib import Path

from fastapi import HTTPException


class Usage:
    def __init__(self, settings):
        self.settings = settings
        self.requests, self.speech = deque(), deque()
        self.lock = threading.Lock()
        if settings.budget_path != ':memory:':
            Path(settings.budget_path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(settings.budget_path, check_same_thread=False)
        self.db.execute('CREATE TABLE IF NOT EXISTS budget (id INTEGER PRIMARY KEY, reserved REAL NOT NULL)')
        self.db.execute('INSERT OR IGNORE INTO budget VALUES (1, 0)')
        self.db.commit()

    def admit(self, speech=False):
        now = time.monotonic()
        with self.lock:
            for queue in (self.requests, self.speech):
                while queue and now - queue[0] >= 60:
                    queue.popleft()
            if len(self.requests) >= self.settings.public_requests_per_minute or (speech and len(self.speech) >= self.settings.speech_requests_per_minute):
                raise HTTPException(429, 'Usage limit reached. Please wait a minute.')
            self.requests.append(now)
            if speech:
                self.speech.append(now)

    def reserve(self, speech=False):
        amount = self.settings.speech_call_reserve_usd if speech else self.settings.text_call_reserve_usd
        with self.lock, self.db:
            cursor = self.db.execute('UPDATE budget SET reserved = reserved + ? WHERE id=1 AND reserved + ? <= ?',
                                     (amount, amount, self.settings.provider_budget_usd))
            if cursor.rowcount != 1:
                raise HTTPException(503, 'Paid service budget exhausted. Contact the hotel directly.')
