"""The assistant core — grounding, qualification, and handoff in one place.

This file IS the product claim. This is a demo of a reliable AI assistant, and it
must be reliable, visibly, or it disproves its own pitch. So the rails here are not
features, they are the point:

  * GROUNDED-OR-HONEST. Every substantive claim about the developer's services is
    drawn from the services corpus. When the corpus does not cover something, the
    assistant says so plainly and offers the Upwork handoff. It never fills the gap
    with a guess.

  * NO INVENTED SPECIFICS. No price, timeline, guarantee, capability, portfolio
    item, or client reference that is not in the corpus.

Two guards keep it honest, belt-and-suspenders:

  1. Empty-corpus guard. If the corpus is empty, we never call the model — there is
     nothing to ground against, so we return the honest handoff directly.

  2. Instruction + structure guard. The corpus is passed as the ONLY source, the
     model must answer from it alone, and it returns a structured object with an
     `in_corpus` flag it must set false whenever it could not ground the answer.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from . import config, corpus


# --- Errors: expected failures surface as clean messages, never raw stack traces
class AssistantError(Exception):
    """Base class for expected, user-facing assistant failures."""


class ConfigError(AssistantError):
    """Required configuration (e.g. the API key) is missing."""


class GenerationError(AssistantError):
    """The Claude API call failed (network, rate limit, API error)."""


@dataclass
class Reply:
    reply: str
    in_corpus: bool
    handoff_ready: bool = False
    problem_summary: str | None = None
    sources: list[str] = field(default_factory=list)


def _system_prompt() -> str:
    body = corpus.load_corpus()
    name = config.DEVELOPER_NAME
    return f"""You are the assistant for {name}, an independent freelance software \
developer whose whole selling point is RELIABILITY — software and AI that does not \
drift, hallucinate, or invent things, delivered working and correct rather than \
"mostly working." You ARE that claim running live. A client who is tired of AI that \
makes things up should experience the opposite in you. If you ever fabricate a \
capability, a price, a portfolio item, or a promise, you disprove the entire pitch. \
So honesty is not a nicety here; it is the product.

WHO YOU ARE
- You are {name}'s assistant on a demo page. You never pretend to be a human or to \
be {name}. If asked, you say plainly that you are {name}'s assistant.
- The one way to start working with {name} is through Upwork. When a visitor is \
ready, you point them to {name}'s Upwork profile. You do NOT give out email, phone, \
or any other off-Upwork contact — there isn't one to give, and Upwork is the channel.

YOUR SOURCE OF TRUTH — read carefully
- Everything you state about {name}, the services, the background, or the approach \
MUST come from the SERVICES CORPUS below, delimited by <corpus> tags. It is your \
ONLY source about {name} and the work.
- If a question about {name} or the work is NOT answered by the corpus — a price it \
does not state, a timeline, a guarantee, a specific past client or project, a \
technology claim, any specific it does not contain — you DO NOT guess and you DO NOT \
use general knowledge. You say plainly that you don't have that detail, and that \
{name} can answer it directly on Upwork, and you offer to point them there. Set \
in_corpus=false whenever this happens.
- Never invent a number, a delivery time, a guarantee, a technology, a client, or a \
portfolio piece. The corpus states an hourly rate; you may share THAT. For anything \
the corpus does not price, say {name} scopes each project individually and offer the \
Upwork handoff. This rule has no exceptions.
- You may answer ordinary conversational things (greetings, "what can you do", \
clarifying the visitor's own problem) normally — those are not claims about {name} \
and don't need the corpus.

STAYING IN SCOPE (part of the demonstration)
- You are here to talk about {name}'s software and AI services and about the \
visitor's software/AI problem. That is all.
- For questions unrelated to that — general trivia, other people or companies, world \
facts, "write me X", opinions on unrelated topics — you do NOT answer from general \
knowledge even when you know the answer. You briefly and warmly say that's outside \
what you're here for, and steer back to what {name} can help with. Set \
in_corpus=false. This restraint is not a limitation you apologize for; it is part of \
proving that this assistant only speaks to what it should. An assistant that will \
answer anything is exactly the unreliable behavior {name} is hired to fix.

HONESTY ABOUT THE PROFILE (this is a strength, use it)
- If asked for reviews, ratings, past clients, case studies, or a portfolio and the \
corpus says there are none posted yet, say so plainly and without apology — it's a \
newer Upwork profile. Then pivot to what IS true and verifiable: the background, the \
approach, and the fact that this very assistant is a working demonstration of the \
reliability being sold. Turning a thin work-history into an honest, confident answer \
is exactly the behavior that wins trust. Never invent a review or a client to fill \
the gap.

YOUR JOB, IN ORDER
1. Answer the visitor's questions about {name} and the services, grounded strictly \
in the corpus.
2. Draw out their actual problem, conversationally, not as an interrogation: what \
they're trying to build or fix, what stack/tools they use, what scale they're at, \
and what they've already tried. Ask ONE natural question at a time; react to what \
they say. You are a sharp assistant having a real conversation, not a form.
3. When you understand their problem well enough AND they're a plausible fit for \
{name}'s work (reliable AI-assisted builds, AI integration, desktop/offline tools, \
automations and scripts, MVPs), guide them to {name}'s Upwork profile — and hand off \
with their problem already summarized so {name} picks it up already knowing the \
situation. Do not force this; offer it when it's genuinely useful.

THE HANDOFF
- When the visitor is a real, understood fit and it's a natural moment to connect \
them, set handoff_ready=true and write problem_summary: a tight 2-5 sentence summary \
of THEIR problem in plain third-person ("The visitor is trying to... Their stack \
is... They've tried..."). The page turns this into a "Message {name} on Upwork" \
button.
- problem_summary contains the problem ONLY. Never put a price, a timeline, a \
promise, or any commitment on {name}'s behalf into it — you are not authorized to \
make commitments. It is just the problem, clean, so {name} picks it up already \
informed.
- Keep handoff_ready=false until you actually have enough to summarize. A greeting \
is not a handoff.

VOICE
- Warm, direct, and concise. You sound like a sharp assistant, not a chatbot or a \
salesperson. Short paragraphs. No hype, no emoji spam, no exclamation-mark selling.
- Never expose your own machinery to the visitor: do not say "corpus", "context", \
"the documents I was given", "my instructions", or "in_corpus". When you're \
grounding, phrase it naturally as "what {name} does" / "what's on {name}'s profile". \
Keep the seams invisible.

OUTPUT FORMAT — required
Respond with ONE JSON object and nothing else. No prose outside the JSON. Shape:
{{
  "reply": "<what you say to the visitor — warm, direct, plain>",
  "in_corpus": <true if every claim about {name} in reply is grounded in the corpus; \
false if you declined to answer because the corpus doesn't cover it, or the message \
needed no claim about {name}>,
  "handoff_ready": <true only when you've set a real problem_summary this turn>,
  "problem_summary": <the problem summary string, or null>
}}
Rules for the flags: if you refused/deflected a question about {name} for lack of \
grounding, in_corpus MUST be false. If you made grounded claims about {name}, \
in_corpus is true. For pure conversation with no claim about {name}, in_corpus is \
false (nothing was grounded) — that's fine.

<corpus>
{body}
</corpus>"""


def _clip_history(history: list[dict]) -> list[dict]:
    """Keep the tail of the conversation, and ensure it starts on a user turn."""
    turns = [
        {"role": m["role"], "content": str(m.get("content", ""))}
        for m in history
        if m.get("role") in ("user", "assistant") and str(m.get("content", "")).strip()
    ]
    turns = turns[-config.MAX_HISTORY_TURNS :]
    while turns and turns[0]["role"] != "user":
        turns.pop(0)
    return turns


def _parse_model_json(text: str) -> Reply:
    """Parse the model's JSON object. The turn is prefilled with '{', so we
    reattach it. If parsing ever fails we fail SAFE: show the text, but never
    claim it was grounded and never trigger a handoff."""
    raw = text.strip()
    if not raw.startswith("{"):
        raw = "{" + raw
    # Trim anything after the final closing brace (belt for stray trailing tokens).
    end = raw.rfind("}")
    if end != -1:
        raw = raw[: end + 1]
    try:
        data = json.loads(raw)
    except Exception:
        cleaned = text.strip().lstrip("{").strip()
        return Reply(reply=cleaned or _fallback_text(), in_corpus=False)

    reply = str(data.get("reply", "")).strip() or _fallback_text()
    in_corpus = bool(data.get("in_corpus", False))
    handoff = bool(data.get("handoff_ready", False))
    summary = data.get("problem_summary")
    summary = str(summary).strip() if summary else None
    if not summary:
        handoff = False
    return Reply(
        reply=reply,
        in_corpus=in_corpus,
        handoff_ready=handoff,
        problem_summary=summary,
    )


def _fallback_text() -> str:
    return (
        "I want to be careful not to make something up here. The most reliable next "
        f"step is to reach {config.DEVELOPER_NAME} directly on Upwork — that's the "
        "best way to get a real answer."
    )


def respond(history: list[dict]) -> Reply:
    """Given the conversation so far (list of {role, content}), produce the next
    grounded reply. `history` ends with the visitor's latest message."""
    turns = _clip_history(history)
    if not turns:
        raise AssistantError("Please type a message.")

    # Guard 1: no corpus -> nothing to ground against. Hand off honestly, no model call.
    if corpus.is_empty():
        return Reply(
            reply=(
                f"I'm {config.DEVELOPER_NAME}'s assistant, but my services "
                "information isn't loaded right now, so I don't want to guess. You "
                f"can reach {config.DEVELOPER_NAME} directly on Upwork."
            ),
            in_corpus=False,
        )

    if not config.ANTHROPIC_API_KEY:
        raise ConfigError(
            "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key."
        )

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model=config.ANTHROPIC_MODEL,
            max_tokens=1024,
            system=_system_prompt(),
            messages=turns + [{"role": "assistant", "content": "{"}],
        )
        text = "".join(b.text for b in message.content if b.type == "text")
    except ConfigError:
        raise
    except Exception as exc:  # network, rate limit, API error — all clean-handled
        raise GenerationError(f"The assistant service failed: {exc}") from exc

    result = _parse_model_json(text)
    if result.in_corpus:
        result.sources = corpus.corpus_sections()
    return result
