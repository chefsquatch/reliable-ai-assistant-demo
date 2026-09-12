"""FastAPI app: the grounded assistant behind the demo widget.

Endpoints:
  GET  /            -> a standalone demo page hosting the widget (static/index.html)
  GET  /widget.js   -> the embeddable widget script (served with permissive CORS)
  GET  /health      -> liveness + how many corpus sections are loaded
  POST /chat        -> {history:[{role,content}]} -> {reply,in_corpus,handoff_ready,
                        problem_summary, sources, upwork_url}

Every expected failure (missing key, API failure, rate limit, empty message) is
caught and returned as a clean JSON message that includes the Upwork fallback —
never a raw stack trace, never a silent hang, never a fabricated answer.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from . import config, corpus
from .assistant import AssistantError, ConfigError, GenerationError, respond

app = FastAPI(title=f"{config.DEVELOPER_NAME} — Reliable AI Assistant (demo)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class Turn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    history: list[Turn]


def _upwork_fallback(message: str) -> dict:
    """Every error the visitor sees carries the honest way forward."""
    return {
        "error": message,
        "upwork_url": config.UPWORK_URL,
        "fallback": (
            "Something went wrong on my end — I'd rather tell you than guess. You can "
            f"reach {config.DEVELOPER_NAME} directly on Upwork."
        ),
    }


# GET and HEAD: uptime monitors (UptimeRobot etc.) ping with HEAD by default;
# answering it 200 keeps the free instance warm without false "down" alerts.
@app.api_route("/health", methods=["GET", "HEAD"])
def health() -> dict:
    sections = corpus.corpus_sections()
    return {
        "status": "ok",
        "corpus_sections": sections,
        "corpus_loaded": len(sections),
        "model": config.ANTHROPIC_MODEL,
        "key_present": bool(config.ANTHROPIC_API_KEY),
    }


@app.post("/chat")
def chat(req: ChatRequest) -> JSONResponse:
    history = [{"role": t.role, "content": t.content} for t in req.history]
    try:
        result = respond(history)
    except ConfigError as exc:
        return JSONResponse(status_code=503, content=_upwork_fallback(str(exc)))
    except GenerationError as exc:
        return JSONResponse(status_code=502, content=_upwork_fallback(str(exc)))
    except AssistantError as exc:  # empty message, etc.
        return JSONResponse(status_code=400, content=_upwork_fallback(str(exc)))

    return JSONResponse(
        content={
            "reply": result.reply,
            "in_corpus": result.in_corpus,
            "handoff_ready": result.handoff_ready,
            "problem_summary": result.problem_summary,
            "sources": result.sources,
            "upwork_url": config.UPWORK_URL,
        }
    )


@app.get("/")
def index() -> FileResponse:
    return FileResponse(str(config.STATIC_DIR / "index.html"))


@app.get("/widget.js")
def widget() -> FileResponse:
    # Served with the same CORS policy; a site could embed it with a <script> tag.
    return FileResponse(
        str(config.STATIC_DIR / "widget.js"),
        media_type="application/javascript",
    )
