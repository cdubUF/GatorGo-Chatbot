from datetime import date
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ChatRequest(StrictModel):
    guide: Literal["desk", "pool", "trail"] = "desk"
    locale: str = Field(default="auto", max_length=10)
    session_id: UUID | None = None
    message: str = Field(min_length=1, max_length=1000)


class HoursException(StrictModel):
    date: date
    closed: bool = False
    hours: str = Field(default="", max_length=200)
    note: str = Field(default="", max_length=300)


class Venue(StrictModel):
    name: str = Field(min_length=1, max_length=120)
    kind: str = Field(max_length=40)
    location: str = Field(default="", max_length=300)
    hours: str = Field(default="", max_length=200)
    weekly_hours: dict[Literal['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], str] = Field(default_factory=dict)
    menu_url: str | None = None
    pin: tuple[float, float] | None = None
    exceptions: list[HoursException] = Field(default_factory=list)

    @field_validator("menu_url")
    @classmethod
    def safe_menu(cls, value):
        if value and not value.startswith("https://"):
            raise ValueError("Menu must use HTTPS")
        return value

    @field_validator("pin")
    @classmethod
    def safe_pin(cls, value):
        if value and not all(0 <= coordinate <= 100 for coordinate in value):
            raise ValueError("Map coordinates must be percentages")
        return value


class KnowledgeRecord(StrictModel):
    venue: Venue | None = None
    id: str = Field(pattern=r"^[a-z0-9_-]{1,64}$")
    category: str = Field(min_length=1, max_length=80)
    topic: str = Field(min_length=1, max_length=120)
    answer: str = Field(min_length=1, max_length=2000)
    source: str = Field(min_length=1, max_length=300)
    status: Literal["approved", "unverified", "demo_only", "general"]
    updated: date
    expires: date | None = None
    tags: list[str] = Field(default_factory=list, max_length=40)

    @field_validator("updated")
    @classmethod
    def no_future_review(cls, value):
        if value > date.today():
            raise ValueError("Review date cannot be in the future")
        return value


class Source(StrictModel):
    id: str
    topic: str
    source: str
    status: str
    score: float


class Decision(StrictModel):
    level: Literal["ai", "assisted", "human"] = "ai"
    category: str = "faq"
    urgency: Literal["routine", "priority", "urgent"] = "routine"


class Handoff(StrictModel):
    id: UUID
    state: Literal["prepared", "simulated", "declined"] = "prepared"
    category: str
    urgency: str
    summary: str
    next_step: str = "Contact a hotel employee directly. No staff has been notified."


class ChatResponse(StrictModel):
    trace_id: UUID = Field(default_factory=uuid4)
    timings_ms: dict[str, float] = Field(default_factory=dict)
    reply_id: UUID = Field(default_factory=uuid4)
    venue_id: str | None = None
    choices: list[dict[str, str]] = Field(default_factory=list)
    actions: list[dict[str, str]] = Field(default_factory=list)
    detected_locale: str = "en"
    reply_locale: str = "en"
    session_id: UUID
    reply: str
    status: Literal["ok", "needs_human", "fallback"] = "ok"
    mode: Literal["mock", "ai", "faq_fallback"] = "mock"
    demo: bool
    decision: Decision = Field(default_factory=Decision)
    sources: list[Source] = Field(default_factory=list)
    handoff: Handoff | None = None
    suggestions: list[str] = Field(default_factory=list)


class ConsentRequest(StrictModel):
    session_id: UUID
    handoff_id: UUID
    consent: bool


class DispositionRequest(StrictModel):
    disposition: Literal["open", "in_review", "resolved"]


class VoiceRequest(StrictModel):
    text: str = Field(min_length=1, max_length=4000)
    guide: Literal["desk", "pool", "trail"] = "desk"


class FeedbackRequest(StrictModel):
    session_id: UUID
    reply_id: UUID
    reason: Literal['wrong_venue', 'outdated_hours', 'unclear_answer']


class VoiceTurn(StrictModel):
    turn_id: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,80}$')
    transcript: str = Field(min_length=1, max_length=1000)
    interrupted: bool = False


class ToolCall(StrictModel):
    call_id: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,80}$')
    name: Literal['lookup_resort', 'list_activities', 'prepare_handoff']
    arguments: dict = Field(max_length=5)
