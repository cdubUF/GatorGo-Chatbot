import asyncio
import base64
import hmac
import json
import logging
import re
import secrets
import time
from collections import Counter
from contextlib import asynccontextmanager
from datetime import date, datetime, timezone
from dataclasses import replace
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .config import ROOT, load_settings
from .usage import Usage
from .realtime import session_config, negotiate
from .sample_customers import load_customers, customer_records
from .speech import MAX_AUDIO_BYTES, transcribe, synthesize, stream_speech
from .languages import LANGUAGES
from .policy import injection_attempt
from .provider import ModelAdapter
from .retrieval import Retriever, normalize, read_records, validate_records
from .reservations import SQLiteReservations, Verification, reservation_router
from .schemas import ToolCall, VoiceTurn, FeedbackRequest, VoiceRequest, ChatRequest, ChatResponse, ConsentRequest, DispositionRequest
from .service import Concierge
from .conversation import ConversationEngine
from .memory import snapshot
from .tools import ToolExecutor
from .sessions import Sessions
from .venues import local_day, available_venues

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
            limit = MAX_AUDIO_BYTES if scope.get("path") in {"/api/speech", "/api/call"} else (65536 if scope.get("path") == "/api/realtime" else self.limit)
            if size > limit:
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
    aliases = {}
    if records is None:
        records = read_records(ROOT / "knowledge/approved.json")
        validate_records(records)
        if settings.demo or settings.sample_knowledge:
            samples = read_records(ROOT / "knowledge/demo.json")
            validate_records(samples)
            approved_ids = {record.id for record in records}
            approved_topics = {normalize(record.topic) for record in records}
            records += [record for record in samples if record.id not in approved_ids
                        and normalize(record.topic) not in approved_topics]
            general_path = ROOT / "knowledge/general.json"
            if settings.sample_knowledge and general_path.exists():
                general = read_records(general_path)
                validate_records(general)
                records += [record for record in general if record.id not in approved_ids
                            and normalize(record.topic) not in approved_topics]
            if settings.sample_knowledge and (ROOT / "knowledge/venues.json").exists():
                venues = read_records(ROOT / "knowledge/venues.json")
                records += [r for r in venues if r.id not in approved_ids and normalize(r.topic) not in approved_topics]
            if settings.sample_knowledge and (ROOT / "knowledge/expanded.json").exists():
                expanded = read_records(ROOT / "knowledge/expanded.json")
                records += [r for r in expanded if r.id not in approved_ids and normalize(r.topic) not in approved_topics]
                records += customer_records(load_customers(settings))
                validate_records(records)
            aliases_path = ROOT / "knowledge/dataset-phrases.json"
            if settings.sample_knowledge and aliases_path.exists():
                aliases = json.loads(aliases_path.read_text("utf-8"))
    usage = Usage(settings)
    sessions = Sessions(settings.session_ttl)
    queue, metrics = {}, Counter()
    feedback_counts = Counter()
    app_events = json.loads((ROOT / "knowledge/events.json").read_text("utf-8")) if settings.sample_knowledge and (ROOT / "knowledge/events.json").exists() else []
    reservations = json.loads((ROOT / "knowledge/reservations.json").read_text("utf-8")) if settings.demo else []
    service = Concierge(settings, Retriever(records, settings.demo or settings.sample_knowledge,
                                             settings.threshold, aliases=aliases),
                        provider or ModelAdapter(settings, usage=usage), reservations)

    fallback_settings = replace(settings, provider="mock")
    fallback_service = Concierge(fallback_settings, service.retriever, ModelAdapter(fallback_settings), reservations)
    budget_notice = "AI allowance reached. Sourced English text answers, maps and activities remain available. AI voice is paused."

    def fast_voice_question(text, locale):
        # Only complete, narrowly defined English requests skip language/model routing.
        # Negations, compound requests and unfamiliar wording use the full AI path.
        if locale not in {"auto", "en"}:
            return False
        q = normalize(text)
        if re.fullmatch(r"(?:what time is |when is |what are the )?(?:checkin|checkout)(?: time| times| hours)?", q):
            return True
        names = "|".join(r" ?".join(re.escape(part) for part in normalize(r.venue.name).split()) for r in available_venues(service.retriever))
        if names and re.fullmatch(r"(?:where is |where is the |what are the hours for |when does )?(?:" + names + r")(?: hours| location| open| close| today| tomorrow)?", q):
            return True
        return q in {"where is it", "when does it close", "what about the pool"}

    def call_available():
        return usage.available(2 * settings.speech_call_reserve_usd + 2 * settings.text_call_reserve_usd)

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

    verification = None
    if settings.reservation_mode == "synthetic":
        reservation_path = ROOT / "data/synthetic-hotel-reservations.sqlite3"
        if not reservation_path.is_file():
            raise ValueError("Run scripts/seed_reservations.py before enabling synthetic reservations")
        verification = Verification(SQLiteReservations(reservation_path), allowed_hotels={"gatorgo"})

    engine = ConversationEngine(settings, service, fallback_service, sessions, usage, verification, app_events, metrics)
    app = FastAPI(title="Gator Go Concierge", version="1.0.0", lifespan=lifespan)
    app.state.engine = engine
    tool_executor = ToolExecutor(engine)
    app.state.usage = usage
    app.state.sessions, app.state.queue, app.state.service = sessions, queue, service
    origins = list(settings.guest_origins) or [f"http://localhost:{settings.port}", f"http://127.0.0.1:{settings.port}"]
    app.add_middleware(CORSMiddleware, allow_origins=origins,
                       allow_methods=["GET", "POST", "DELETE", "PATCH"],
                       allow_headers=["Content-Type", "Authorization"])
    app.add_middleware(BodyLimit)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(settings.trusted_hosts))

    @app.middleware("http")
    async def boundary(request: Request, call_next):
        request_id = str(uuid4())
        started = time.monotonic()
        restricted = request.url.path.startswith(("/api/staff", "/api/reservations", "/api/handoffs")) or request.url.path in {"/staff.html", "/staff.js"}
        if settings.profile != "local" and restricted:
            response = JSONResponse({"detail": "Not found"}, status_code=404)
        elif request.method not in {"GET", "HEAD", "OPTIONS"} and (
            request.headers.get("origin") and request.headers["origin"] not in origins
        ):
            response = JSONResponse({"detail": "Origin not allowed"}, status_code=403)
        else:
            try:
                if request.url.path in {"/api/chat", "/api/speech", "/api/voice", "/api/call", "/api/feedback"} and request.method == "POST":
                    usage.admit(speech=request.url.path in {"/api/speech", "/api/voice", "/api/call"})
                response = await call_next(request)
            except HTTPException as error:
                response = JSONResponse({"detail": error.detail}, status_code=error.status_code)
            except Exception as error:
                metrics["errors"] += 1
                logger.error("Request failed: type=%s request_id=%s", type(error).__name__, request_id)
                response = JSONResponse({"detail": "Service unavailable. Please retry."}, status_code=503)
        if request.url.path.startswith("/api/"):
            logger.info("%s %s status=%s duration_ms=%s request_id=%s", request.method,
                        getattr(request.scope.get("route"), "path", "/api/unknown"), response.status_code,
                        round((time.monotonic() - started) * 1000), request_id)
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=()"
        if settings.profile != "local":
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        response.headers["X-Request-ID"] = request_id
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; "
            "connect-src 'self'; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'"
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
        return {"status": "ok", "mode": settings.provider if usage.available() else "faq_fallback", "demo": settings.demo,
                "staff_notifications": False, "version": "1.1.0", "profile": settings.profile,
                "reservation_testing": settings.profile == "local" and settings.reservation_mode == "synthetic",
                "sample_knowledge": settings.demo or settings.sample_knowledge,
                "realtime_enabled": settings.realtime_enabled and settings.profile == "local" and not settings.local_budget_cutoff,
                "speech_enabled": settings.speech_enabled and settings.provider == "openai" and call_available(),
                "service_notice": budget_notice if settings.provider == "openai" and not call_available() else "",
                "languages": LANGUAGES if settings.multilingual and settings.provider == "openai" and usage.available() else {"en": "English"}}

    @router.get("/ready")
    async def ready():
        approved = [r for r in records if r.status == "approved" and
                    (r.expires is None or r.expires >= date.today()) and not injection_attempt(r.answer)]
        if settings.profile == "public" and not approved:
            raise HTTPException(503, "Approved property knowledge is missing")
        return {"status": "ready", "sample_knowledge": settings.demo or settings.sample_knowledge}

    @router.post("/realtime")
    async def realtime(request: Request, guide: str = 'desk', locale: str = 'auto', session_id: UUID | None = None):
        if not (settings.realtime_enabled and settings.profile == 'local' and not settings.local_budget_cutoff
                and settings.speech_enabled and settings.provider == 'openai'):
            raise HTTPException(503, 'Realtime calling is not enabled for this profile')
        if request.headers.get('origin') != str(request.base_url).rstrip('/'):
            raise HTTPException(403, 'Unexpected call origin')
        if guide not in {'desk', 'pool', 'trail'} or (locale != 'auto' and locale not in LANGUAGES):
            raise HTTPException(422, 'Invalid call configuration')
        if request.headers.get('content-type', '').split(';')[0] != 'application/sdp':
            raise HTTPException(415, 'Use application/sdp')
        offer = (await request.body()).decode('utf-8', errors='replace')
        if not offer.startswith('v=0'):
            raise HTTPException(422, 'Invalid call offer')
        try:
            session = sessions.get(session_id)
        except OverflowError:
            raise HTTPException(503, 'Conversation capacity reached') from None
        async with session.lock:
            answer = await negotiate(settings, usage, offer, session_config(settings, service.retriever, app_events, guide, locale, session=session))
            session.voice_token = secrets.token_urlsafe(32)
        return Response(answer, media_type='application/sdp', headers={'Cache-Control': 'no-store',
                        'X-Conversation-ID': session.id, 'X-Voice-Token': session.voice_token})

    @router.post('/conversations')
    async def create_conversation():
        usage.admit()
        try:
            return snapshot(sessions.get())
        except OverflowError:
            raise HTTPException(503, 'Conversation capacity reached') from None

    def voice_session(session_id, authorization):
        sessions.prune()
        session = sessions.items.get(str(session_id))
        if (settings.profile != 'local' or session is None or not session.voice_token
                or not hmac.compare_digest(authorization, 'Bearer ' + session.voice_token)):
            raise HTTPException(401, 'Voice session authorization required')
        return session

    @router.post('/conversations/{session_id}/voice-turn')
    async def voice_turn(session_id: UUID, body: VoiceTurn, authorization: str = Header(default='')):
        session = voice_session(session_id, authorization)
        usage.admit()
        async with session.lock:
            now = time.monotonic()
            session.voice_requests[:] = [t for t in session.voice_requests if now - t < 60]
            if len(session.voice_requests) >= 60:
                raise HTTPException(429, 'Too many voice turns')
            session.voice_requests.append(now)
            if body.turn_id not in session.voice_turns:
                # Derive memory from validated application logic, never accept an assistant transcript as facts.
                await fallback_service.chat(session, body.transcript)
                session.history[-1]['content'] = '[Voice turn: spoken wording omitted; do not assume a full reply was heard]'
                session.voice_turns[body.turn_id] = True
                while len(session.voice_turns) > 100:
                    del session.voice_turns[next(iter(session.voice_turns))]
            session.touched = time.monotonic()
            return {'session_id': session.id, 'revision': session.revision}

    @router.post('/conversations/{session_id}/tools')
    async def run_tool(session_id: UUID, body: ToolCall, authorization: str = Header(default='')):
        session = voice_session(session_id, authorization)
        usage.admit()
        return {'ok': True, 'result': await tool_executor.execute(session, body)}

    @router.get('/diagnostics')
    async def diagnostics():
        if settings.profile != 'local':
            raise HTTPException(404, 'Not found')
        return {'metrics': dict(metrics), 'active_sessions': len(sessions.items),
                'contains_guest_text': False, 'live_voice_targets_verified': False}

    @router.post("/call")
    async def call_turn(request: Request, session_id: UUID | None = None, guide: str = 'desk', locale: str = 'auto'):
        if not settings.speech_enabled or settings.provider != 'openai':
            raise HTTPException(503, 'Live calling is not configured')
        if not call_available():
            raise HTTPException(503, budget_notice)
        if guide not in {'desk', 'pool', 'trail'} or (locale != 'auto' and locale not in LANGUAGES):
            raise HTTPException(422, 'Invalid call configuration')
        if request.headers.get('content-type', '').split(';')[0] != 'audio/wav':
            raise HTTPException(415, 'Use audio/wav')
        data = await request.body()
        def event(kind, **values):
            return json.dumps({'type': kind, **values}) + '\n'
        async def stream():
            try:
                text = await transcribe(settings, usage, data, locale)
                result = await execute_chat(ChatRequest(message=text, session_id=session_id, locale=locale, guide=guide), authorization='',
                                            fast_local=fast_voice_question(text, locale))
                yield event('reply', reply=result.model_dump(mode='json'), transcript=text)
                async for chunk in stream_speech(settings, usage, result.reply, guide):
                    yield event('audio', pcm=base64.b64encode(chunk).decode('ascii'), rate=24000)
                yield event('done')
            except asyncio.CancelledError:
                raise
            except HTTPException as error:
                yield event('error', message=budget_notice if not call_available() else str(error.detail))
            except Exception:
                logger.warning('Call turn unavailable')
                yield event('error', message='The call could not finish. Try again or use text chat.')
        return StreamingResponse(stream(), media_type='application/x-ndjson',
                                 headers={'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no'})

    @router.post("/voice")
    async def voice(body: VoiceRequest):
        if not settings.speech_enabled or settings.provider != "openai":
            raise HTTPException(503, "AI voice is not configured.")
        audio = await synthesize(settings, usage, body.text, body.guide)
        return Response(audio, media_type="audio/wav", headers={"Cache-Control": "no-store"})

    @router.post("/speech")
    async def speech(request: Request, locale: str = "auto"):
        if not settings.speech_enabled or settings.provider != "openai":
            raise HTTPException(503, "Speech is not configured. Please type your question.")
        if locale != "auto" and locale not in LANGUAGES:
            raise HTTPException(422, "Unsupported language")
        if request.headers.get("content-type", "").split(";")[0] != "audio/wav":
            raise HTTPException(415, "Use audio/wav")
        data = await request.body()
        try:
            text = await transcribe(settings, usage, data, locale)
            return {"text": text}
        finally:
            del data

    @router.get("/knowledge")
    async def knowledge():
        return [r.model_dump(mode="json")
                for r in service.retriever.records if r.status in {"approved", "demo_only"}
                and (r.expires is None or r.expires >= date.today()) and not injection_attempt(r.answer)]

    @router.get("/activities")
    async def activities():
        venues = {r.id for r in available_venues(service.retriever)}
        return {"timezone": settings.resort_timezone, "today": local_day(settings).isoformat(),
                "events": [e for e in app_events if e['venue_id'] in venues]}

    @router.post("/feedback")
    async def feedback(body: FeedbackRequest):
        session = sessions.items.get(str(body.session_id))
        item = session.feedback.get(str(body.reply_id)) if session else None
        if item is None:
            raise HTTPException(404, "Reply not available in this session")
        if item['flagged']:
            raise HTTPException(409, "Feedback already recorded")
        item['flagged'] = True
        for record_id in item['sources'] or ['unanswered']:
            feedback_counts[(record_id, body.reason)] += 1
        return {"recorded": True}

    @router.get("/feedback/aggregate")
    async def feedback_aggregate():
        if settings.profile != 'local':
            raise HTTPException(404, "Not found")
        return [{"record_id": key[0], "reason": key[1], "count": count}
                for key, count in sorted(feedback_counts.items())]

    @router.post("/chat", response_model=ChatResponse)
    async def chat(body: ChatRequest, authorization: str = Header(default="")):
        return await execute_chat(body, authorization)

    async def execute_chat(body, authorization="", fast_local=False):
        return await engine.reply(body, authorization, fast_local)

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
    if verification is not None:
        app.include_router(reservation_router(verification, reservation_staff))
    app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
    return app
