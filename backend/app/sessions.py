import asyncio
import time
from dataclasses import dataclass, field
from uuid import uuid4

from .schemas import Handoff


@dataclass
class Session:
    id: str = field(default_factory=lambda: str(uuid4()))
    touched: float = field(default_factory=time.monotonic)
    history: list = field(default_factory=list)
    topic: str = ""
    concern: str = ""
    stage: str = ""
    confirmation: str = ""
    failures: int = 0
    pending: Handoff | None = None
    requests: list = field(default_factory=list)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class Sessions:
    def __init__(self, ttl=1800, limit=500):
        self.ttl, self.limit = ttl, limit
        self.items = {}

    def prune(self):
        now = time.monotonic()
        for key, session in list(self.items.items()):
            if now - session.touched > self.ttl and not session.lock.locked():
                del self.items[key]

    def get(self, session_id=None):
        self.prune()
        session = self.items.get(str(session_id)) if session_id else None
        if session is None:
            if len(self.items) >= self.limit:
                raise OverflowError("Session capacity reached")
            session = Session()
            self.items[session.id] = session
        session.touched = time.monotonic()
        return session

    def delete(self, session_id):
        self.items.pop(str(session_id), None)
