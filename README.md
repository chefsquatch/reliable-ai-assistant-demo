# Reliable AI Assistant — live demo

A grounded chat assistant that answers **only** from a services corpus, refuses to
fabricate, and hands qualified leads off to an Upwork profile. It's a portfolio
piece: the assistant *is* the pitch — reliable AI that won't invent a price, a
client, or a promise, shown working live.

Built to be **re-skinned in minutes**: swap the two files in `corpus/` and set two
env vars, and the same machine represents any developer or business.

## What it demonstrates

- **Grounded-or-honest.** Every substantive claim is drawn from `corpus/*.md`. When
  the corpus doesn't cover something, it says so and points to Upwork — it never
  guesses. Grounded answers carry a quiet "grounded" marker in the UI.
- **No invented specifics.** No price beyond the stated rate, no timeline, no
  guarantee, no client, no portfolio item that isn't in the corpus.
- **Honest about a thin record.** Asked for reviews or past clients it doesn't have,
  it says so plainly and pivots to what's real — the exact honesty being sold.
- **Qualify → hand off.** It draws out the visitor's problem conversationally, then
  produces a clean summary and a "Message on Upwork" button. No off-platform contact.
- **Fails safe.** Missing key, API outage, empty message, empty corpus — every
  failure returns a clean message plus the Upwork fallback, never a stack trace,
  never a fabricated answer.

## Layout

```
app/
  config.py      env config (API key, DEVELOPER_NAME, UPWORK_URL, CORS)
  corpus.py      loads corpus/*.md into one grounding block
  assistant.py   the grounding + qualification + handoff system prompt and parse
  main.py        FastAPI app: /chat, /health, /, /widget.js
corpus/
  00-services-corpus.md   THE ground truth — edit this to re-skin
  01-links.md             the Upwork handoff link
static/
  index.html     standalone demo landing page
  widget.js      the embeddable chat widget (no build, no deps)
scripts/         smoke tests (see below)
DOM_MAP.md       every element, class hook, and theme token — for design work
```

## Run locally

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Windows
cp .env.example .env                             # then add your ANTHROPIC_API_KEY
.venv/Scripts/uvicorn app.main:app --reload
# open http://localhost:8000
```

## Smoke tests

```bash
.venv/Scripts/python -m scripts.smoke_errors     # error handling — NO API spend
.venv/Scripts/python -m scripts.smoke_brick0     # grounding mechanism (spends a little)
.venv/Scripts/python -m scripts.smoke_grounding  # grounding + refusals on the real corpus
.venv/Scripts/python -m scripts.smoke_handoff    # qualify → Upwork handoff
```

`smoke_errors` forces every failure path and needs no API key. The other three make
real model calls (small spend).

## Deploy (Render, free tier)

1. Push this repo to GitHub.
2. Render → **New + → Blueprint**, point at this repo (`render.yaml` configures it).
3. Set `ANTHROPIC_API_KEY` in the dashboard (Environment tab). **Paste carefully —
   a trailing newline makes the SDK throw a bare "Connection error."** The code
   `.strip()`s it defensively, but paste clean.
4. `DEVELOPER_NAME` and `UPWORK_URL` are set in `render.yaml`; override in the
   dashboard if needed.
5. After the first deploy, update the URL in `.github/workflows/keepalive.yml` and
   (optionally) point UptimeRobot at `/health` to keep the free instance warm.

## Re-skin for a different client

1. Rewrite `corpus/00-services-corpus.md` with their services (keep the "must not"
   rails at the bottom).
2. Put their handoff link in `corpus/01-links.md` and set `UPWORK_URL`.
3. Set `DEVELOPER_NAME`. Optionally restyle via `DOM_MAP.md`. Redeploy.

## License

All rights reserved. This repository is public for **evaluation and demonstration
only** — it is not open source. See [LICENSE](LICENSE). Please don't reuse the code
or template without permission.
