from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ChatRequest(StrictModel):
    session_id: UUID | None = None
    message: str = Field(min_length=1, max_length=1000)


class KnowledgeRecord(StrictModel):
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
