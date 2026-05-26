from pydantic import BaseModel, field_validator
from config import AVAILABLE_MODES


class RephraseRequest(BaseModel):
    text: str
    mode: str = "professional"

    @field_validator("text")
    @classmethod
    def text_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("text cannot be empty")
        if len(v) > 3000:
            raise ValueError("text exceeds maximum length of 3000 characters")
        return v

    @field_validator("mode")
    @classmethod
    def mode_must_be_valid(cls, v: str) -> str:
        if v not in AVAILABLE_MODES:
            raise ValueError(f"mode must be one of: {', '.join(AVAILABLE_MODES)}")
        return v


class CriticEntry(BaseModel):
    iteration: int
    output: str
    verdict: str
    reason: str
    fix: str


class RephraseResponse(BaseModel):
    result: str
    mode: str
    iterations: int
    status: str
    critic_history: list[CriticEntry]


class HealthResponse(BaseModel):
    status: str
    model: str


class ModesResponse(BaseModel):
    modes: list[str]
