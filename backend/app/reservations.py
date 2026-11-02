"""Opt-in synthetic reservation lookup. Never connects to a real hotel system."""
import hashlib
import hmac
import logging
import secrets
import sqlite3
import time
from contextlib import closing
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import Field

from .schemas import StrictModel

logger = logging.getLogger("gatorgo.reservations")


def normalize(value):
    return " ".join(value.casefold().split())


class ReservationProvider(Protocol):
    def find(self, confirmation: str, name: str) -> dict | None: ...
    def by_id(self, reservation_id: int) -> dict | None: ...
    def request_change(self, reservation_id: int, details: str) -> None: ...
    def requests(self) -> list[dict]: ...


class SQLiteReservations:
    def __init__(self, path: Path):
        self.path = path

    def connect(self):
        connection = sqlite3.connect(f"file:{self.path.as_posix()}?mode=rw", uri=True)
        connection.row_factory = sqlite3.Row
        return connection

    def find(self, confirmation, name):
        with closing(self.connect()) as db:
            # Data in this provider is synthetic and small; normalize consistently in Python.
            for row in db.execute("SELECT * FROM reservations"):
                if (normalize(row["confirmation"]) == normalize(confirmation)
                    and normalize(row["first_name"] + " " + row["last_name"]) == normalize(name)):
                    return dict(row)
        return None

    def by_id(self, reservation_id):
        with closing(self.connect()) as db:
            row = db.execute("SELECT * FROM reservations WHERE id = ?", (reservation_id,)).fetchone()
            return dict(row) if row else None

    def request_change(self, reservation_id, details):
        with closing(self.connect()) as db, db:
            db.execute("INSERT INTO change_requests (reservation_id, details) VALUES (?, ?)",
                       (reservation_id, details))

    def requests(self):
        with closing(self.connect()) as db:
            return [dict(row) for row in db.execute(
                "SELECT c.id, c.reservation_id, c.details, c.created_at, c.status, "
                "r.confirmation, r.first_name, r.last_name FROM change_requests c "
                "JOIN reservations r ON r.id = c.reservation_id ORDER BY c.id DESC")]


class Lookup(StrictModel):
    confirmation: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=120)


class Verify(StrictModel):
    challenge_id: str = Field(min_length=20, max_length=100)
    code: str = Field(pattern=r"^\d{6}$")


class Change(StrictModel):
    details: str = Field(min_length=3, max_length=500)


@dataclass
class Challenge:
    reservation_id: int | None
    digest: bytes
    expires: float
    attempts: int = 0


class Verification:
    """Short-lived process-local challenges and grants; restart revokes both."""
    def __init__(self, provider: ReservationProvider, clock=time.monotonic):
        self.provider, self.clock = provider, clock
        self.secret = secrets.token_bytes(32)
        self.challenges, self.grants, self.limits = {}, {}, {}

    def digest(self, value):
        return hmac.digest(self.secret, value.encode(), hashlib.sha256)

    def prune(self):
        now = self.clock()
        self.challenges = {k: v for k, v in self.challenges.items() if v.expires > now}
        self.grants = {k: v for k, v in self.grants.items() if v[1] > now}
        self.limits = {k: [t for t in times if now - t < 600] for k, times in self.limits.items()
                       if any(now - t < 600 for t in times)}

    def limit(self, address, operation, maximum):
        self.prune()
        if len(self.limits) >= 5000 and (address, operation) not in self.limits:
            raise HTTPException(429, "Please wait before trying again.")
        bucket = self.limits.setdefault((address, operation), [])
        if len(bucket) >= maximum:
            raise HTTPException(429, "Please wait before trying again.")
        bucket.append(self.clock())

    def lookup(self, confirmation, name):
        if len(self.challenges) >= 5000:
            raise HTTPException(503, "Reservation service is busy. Please try later.")
        row = self.provider.find(confirmation, name)
        code = f"{secrets.randbelow(1_000_000):06d}"
        challenge_id = secrets.token_urlsafe(32)
        self.challenges[challenge_id] = Challenge(row["id"] if row else None,
                                                   self.digest(challenge_id + code), self.clock() + 300)
        # The only delivery mechanism is a local, explicitly enabled synthetic-data simulator.
        if row:
            logger.warning("SYNTHETIC RESERVATION CODE (local development only): %s", code)
        return challenge_id

    def verify(self, challenge_id, code):
        challenge = self.challenges.get(challenge_id)
        valid = bool(challenge and challenge.expires > self.clock()
                     and challenge.attempts < 5 and challenge.reservation_id is not None
                     and hmac.compare_digest(challenge.digest, self.digest(challenge_id + code)))
        if challenge:
            challenge.attempts += 1
            if valid or challenge.attempts >= 5:
                self.challenges.pop(challenge_id, None)
        if not valid:
            raise HTTPException(401, "Verification failed or expired. Please start again or try another code.")
        token = secrets.token_urlsafe(32)
        self.grants[self.digest(token)] = (challenge.reservation_id, self.clock() + 600)
        return token

    def authorized(self, authorization):
        token = authorization.removeprefix("Bearer ") if authorization.startswith("Bearer ") else ""
        self.prune()
        grant = self.grants.get(self.digest(token)) if token else None
        if not grant:
            raise HTTPException(401, "Verification required or expired.")
        return grant[0]


def reservation_router(verification: Verification, staff_dependency):
    router = APIRouter(prefix="/api/reservations", tags=["reservations"])

    def limit(request, action, maximum):
        verification.limit(request.client.host if request.client else "unknown", action, maximum)

    @router.post("/lookup")
    async def lookup(body: Lookup, request: Request):
        limit(request, "lookup", 10)
        challenge_id = verification.lookup(body.confirmation, body.name)
        return {"challenge_id": challenge_id, "message": "If the details match, a verification code is available through the configured delivery method."}

    @router.post("/verify")
    async def verify(body: Verify, request: Request):
        limit(request, "verify", 30)
        return {"access_token": verification.verify(body.challenge_id, body.code), "expires_in": 600}

    @router.get("/me")
    async def me(authorization: str = Header(default="")):
        row = verification.provider.by_id(verification.authorized(authorization))
        if not row:
            raise HTTPException(404, "Reservation unavailable.")
        return {key: row[key] for key in ("confirmation", "first_name", "last_name", "room_type",
                                          "check_in", "check_out", "guests", "status")}

    @router.post("/request-change", status_code=201)
    async def change(body: Change, authorization: str = Header(default="")):
        reservation_id = verification.authorized(authorization)
        row = verification.provider.by_id(reservation_id)
        if not row or normalize(row["status"]) == "canceled":
            raise HTTPException(409, "Contact the hotel directly about this reservation.")
        verification.provider.request_change(reservation_id, body.details)
        return {"status": "submitted", "message": "Request saved for review. Your reservation has not been changed."}

    @router.get("/staff/requests")
    async def staff_requests(authorization: str = Header(default="")):
        staff_dependency(authorization)
        return verification.provider.requests()

    return router
