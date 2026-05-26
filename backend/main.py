from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import agent
from models import RephraseRequest, RephraseResponse, HealthResponse, ModesResponse, CriticEntry
from config import AVAILABLE_MODES, MODEL

app = FastAPI(title="AI Rephraser Agent", version="1.0.0")

ALLOWED_ORIGINS = [
    "https://writemate.vercel.app",
    "https://write-mate.vercel.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    # Chrome extensions send chrome-extension:// origins which don't match patterns;
    # allow_origin_regex covers them alongside known web origins.
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"chrome-extension://.*",
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health():
    return {"status": "ok", "model": MODEL}


@app.get("/api/modes", response_model=ModesResponse)
def get_modes():
    return {"modes": AVAILABLE_MODES}


@app.post("/api/rephrase", response_model=RephraseResponse)
def rephrase(payload: RephraseRequest):
    try:
        result = agent.run(payload.text, payload.mode)
        return RephraseResponse(
            result=result["result"],
            mode=result["mode"],
            iterations=result["iterations"],
            status=result["status"],
            critic_history=[CriticEntry(**entry) for entry in result["critic_history"]],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
