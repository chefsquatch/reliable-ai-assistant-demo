"""Bricks 4-5 — qualification and handoff, on a mock prospect conversation.

Simulates a real prospect describing a problem across several turns, and checks:
  Brick 4: the assistant draws out the problem (what, stack, scale, tried) and, by
           the end, has enough to summarize it.
  Brick 5: it produces a clean problem_summary and routes to Upwork, with NO invented
           commitments (no price, no timeline, no guarantee) in the summary.

Run:  ./.venv/Scripts/python.exe -m scripts.smoke_handoff
"""

from __future__ import annotations

import sys

from app.assistant import respond

# A scripted prospect. Each line is the visitor's next message; the assistant's
# replies are appended to history between them so it's a real multi-turn chat.
PROSPECT_TURNS = [
    "Hi — I need a desktop tool that scores runs at a live timing event, offline.",
    "It has to run on a single Windows laptop in the room, no internet, and it "
    "absolutely cannot crash mid-event. Results feed a scoreboard.",
    "I tried a spreadsheet with macros and a half-finished Python script, but it's "
    "flaky and I don't trust it for the real day.",
    "That sounds right. How do I get this in front of you to build?",
]

# Words that would signal an invented commitment leaking into the summary.
FORBIDDEN_IN_SUMMARY = [
    "$", "guarantee", "guaranteed", "within a week", "in 2 weeks", "by friday",
    "free", "discount", "i will deliver", "i promise", "fixed price",
]


def main() -> int:
    history: list[dict] = []
    last = None
    drew_out = False

    for i, msg in enumerate(PROSPECT_TURNS, 1):
        history.append({"role": "user", "content": msg})
        r = respond(history)
        history.append({"role": "assistant", "content": r.reply})
        last = r
        print(f"VISITOR: {msg}")
        print(f"ASSISTANT: {r.reply}")
        print(f"   [in_corpus={r.in_corpus} handoff_ready={r.handoff_ready}]")
        if i in (1, 2) and "?" in r.reply:
            drew_out = True
        print("-" * 70)

    print("=" * 70)
    summary = (last.problem_summary or "") if last else ""
    reply_l = last.reply.lower() if last else ""
    print("FINAL handoff_ready:", last.handoff_ready if last else None)
    print("FINAL problem_summary:", summary)
    print("FINAL reply mentions upwork:", "upwork" in reply_l)

    has_summary = bool(summary.strip())
    handoff = bool(last and last.handoff_ready)
    captures = any(w in summary.lower() for w in
                   ["desktop", "offline", "event", "timing", "windows", "scoreboard", "crash"])
    routes_upwork = "upwork" in reply_l
    no_commitment = not any(w in summary.lower() for w in FORBIDDEN_IN_SUMMARY)

    print("-" * 70)
    print("Brick 4 — drew out the problem (asked questions):", drew_out)
    print("Brick 4 — usable summary produced:", has_summary and captures)
    print("Brick 5 — handoff_ready set:", handoff)
    print("Brick 5 — routed to Upwork:", routes_upwork)
    print("Brick 5 — NO invented commitment in summary:", no_commitment)

    ok = drew_out and has_summary and captures and handoff and routes_upwork and no_commitment
    print("\nBRICKS 4-5:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
