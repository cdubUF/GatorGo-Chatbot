import asyncio
import hmac
import json
import logging
import time
from collections import Counter
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import ROOT, load_settings
from .provider import ModelAdapter
from .retrieval import Retriever, read_records, validate_records
from .reservations import SQLiteReservations, Verification, reservation_router
from .schemas import ChatRequest, ChatResponse, ConsentRequest, DispositionRequest
from .service import Concierge
from .sessions import Sessions

logger = logging.getLogger("gatorgo.http")


class BodyLimit:
    """Bound chunked bodies before FastAPI parses them, not just Content-Length."""
    def __init__(self, app, limit=8192):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        chunks, size = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > self.limit:
                response = JSONResponse({"detail": "Request too large"}, status_code=413)
                return await response(scope, receive, send)
            chunks.append(message.get("body", b""))
            if not message.get("more_body"):
                break
        delivered = False

        async def replay():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": b"".join(chunks), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)


def create_app(settings=None, records=None, provider=None):
    settings = settings or load_settings()
    if records is None:
        records = read_records(ROOT / "knowledge/approved.json")
        if settings.demo:
            records += read_records(ROOT / "knowledge/demo.json")
        validate_records(records)
    sessions = Sessions(settings.session_ttl)
    queue, metrics = {}, Counter()
    reservations = json.loads((ROOT / "knowledge/reservations.json").read_text("utf-8")) if settings.demo else []
    service = Concierge(settings, Retriever(records, settings.demo, settings.threshold),
                        provider or ModelAdapter(settings), reservations)

    def prune():
        sessions.prune()
        for key, value in list(queue.items()):
            if time.monotonic() - value["touched"] > settings.session_ttl:
                del queue[key]

    @asynccontextmanager
    async def lifespan(app):
        async def cleanup():
            while True:
                await asyncio.sleep(min(settings.session_ttl, 60))
                prune()
        task = asyncio.create_task(cleanup())
        yield
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        sessions.items.clear()
        queue.clear()

    app = FastAPI(title="Gator Go Concierge", version="1.0.0", lifespan=lifespan)
    app.state.sessions, app.state.queue, app.state.service = sessions, queue, service
    origins = [f"http://localhost:{settings.port}", f"http://127.0.0.1:{settings.port}"]
    app.add_middleware(CORSMiddleware, allow_origins=origins,
                       allow_methods=["GET", "POST", "DELETE", "PATCH"],
                       allow_headers=["Content-Type", "Authorization"])
    app.add_middleware(BodyLimit)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "testserver"])

    @app.middleware("http")
    async def boundary(request: Request, call_next):
        request_id = str(uuid4())
        started = time.monotonic()
        if request.method not in {"GET", "HEAD", "OPTIONS"} and (
            request.headers.get("origin") and request.headers["origin"] not in origins
        ):
            response = JSONResponse({"detail": "Origin not allowed"}, status_code=403)
        else:
            try:
                response = await call_next(request)
            except Exception as error:
                metrics["errors"] += 1
                logger.error("Request failed: type=%s request_id=%s", type(error).__name__, request_id)
                response = JSONResponse({"detail": "Service unavailable. Please retry."}, status_code=503)
        if request.url.path.startswith("/api/"):
            logger.info("%s %s status=%s duration_ms=%s request_id=%s", request.method,
                        request.url.path, response.status_code,
                        round((time.monotonic() - started) * 1000), request_id)
        response.headers["X-Request-ID"] = request_id
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; "
            "connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'"
        )
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid(request, exc):
        # Pydantic's default response may echo the input, including sensitive details.
        return JSONResponse({"detail": "Invalid request. Check fields and message length."}, status_code=422)

    router = APIRouter(prefix="/api")

    def staff(authorization: str = Header(default="")):
        if not settings.demo or not settings.staff_token:
            raise HTTPException(404, "Demo staff queue is disabled")
        if not hmac.compare_digest(authorization, "Bearer " + settings.staff_token):
            raise HTTPException(401, "Staff authorization required")

    def reservation_staff(authorization):
        if not settings.staff_token:
            raise HTTPException(404, "Staff access is not configured")
        if not hmac.compare_digest(authorization, "Bearer " + settings.staff_token):
            raise HTTPException(401, "Staff authorization required")

    @router.get("/health")
    async def health():
        return {"status": "ok", "mode": settings.provider, "demo": settings.demo,
                "staff_notifications": False, "version": "1.0.0"}

    @router.post("/chat", response_model=ChatResponse)
    async def chat(body: ChatRequest):
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
            result = await service.chat(session, body.message)
            session.touched = time.monotonic()
            metrics["requests"] += 1
            metrics[result.decision.level] += 1
            metrics[result.mode] += 1
            metrics["sourced"] += bool(result.sources)
            metrics["latency_ms_total"] += round((time.monotonic() - now) * 1000)
            return result

    @router.delete("/sessions/{session_id}", status_code=204)
    async def reset(session_id: UUID):
        session = sessions.items.get(str(session_id))
        if session:
            async with session.lock:
                sessions.delete(session_id)
        # Submitted summaries are independent from a conversation; expire automatically.

    @router.post("/handoffs")
    async def consent(body: ConsentRequest):
        prune()
        session = sessions.items.get(str(body.session_id))
        if session is None:
            raise HTTPException(404, "Conversation expired")
        async with session.lock:
            pending = session.pending
            if pending is None or pending.id != body.handoff_id:
                raise HTTPException(409, "This summary is no longer current. Prepare a new one.")
            key = str(pending.id)
            if pending.state != "prepared":
                return pending
            if not body.consent:
                pending.state = "declined"
                return pending
            if not settings.demo or not settings.staff_token:
                raise HTTPException(409, "Queue unavailable. Show the summary to a hotel employee directly.")
            if len(queue) >= 500:
                raise HTTPException(503, "Demo queue full. Please contact a hotel employee directly.")
            pending.state = "simulated"
            queue[key] = {**pending.model_dump(mode="json"), "disposition": "open",
                          "created": datetime.now(timezone.utc).isoformat(), "touched": time.monotonic()}
            return pending

    @router.get("/staff/handoffs", dependencies=[Depends(staff)])
    async def handoffs():
        prune()
        return [{k: v for k, v in item.items() if k != "touched"} for item in queue.values()]

    @router.patch("/staff/handoffs/{handoff_id}", dependencies=[Depends(staff)])
    async def disposition(handoff_id: UUID, body: DispositionRequest):
        prune()
        entry = queue.get(str(handoff_id))
        if not entry:
            raise HTTPException(404, "Summary expired or not found")
        entry["disposition"] = body.disposition
        return {"disposition": body.disposition, "simulated": True}

    @router.get("/staff/metrics", dependencies=[Depends(staff)])
    async def analytics():
        return dict(metrics)

    app.include_router(router)
    if settings.reservation_mode == "synthetic":
        reservation_path = ROOT / "data/synthetic-reservations.sqlite3"
        if not reservation_path.is_file():
            raise ValueError("Run scripts/seed_reservations.py before enabling synthetic reservations")
        app.include_router(reservation_router(Verification(SQLiteReservations(reservation_path)), reservation_staff))
    app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
    return app
