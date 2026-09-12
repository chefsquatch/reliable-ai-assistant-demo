# DOM Map — for design work

Everything you need to restyle this demo without touching the logic. Two surfaces:
the **landing page** (`static/index.html`) and the **chat widget** (`static/widget.js`).

The widget injects its own `<style>` into `<head>` at runtime, scoped under `.raw`.
Because it's injected first, **any stylesheet you add after it wins** — so you can
override any `.raw-*` rule from your own CSS without editing `widget.js`.

---

## 1. Three ways to restyle (no logic changes)

### a) Theme tokens (fastest — recolor everything at once)
Set a config object **before** the widget `<script>` loads. Only the keys you pass
are overridden; the rest keep their defaults.

```html
<script>
  window.RELIABLE_ASSISTANT = {
    name: "Les",
    upwork: "https://www.upwork.com/freelancers/~0178a832a97394710e",
    title: "Ask Les",
    greeting: "Hi — what are you trying to build or fix?",
    teaser: "Ask me about the work — I won't make things up.",
    autoOpen: true,
    theme: {
      bg:     "#141417",  // panel header/footer + deepest surfaces
      panel:  "#1f1f24",  // main panel background
      panel2: "#2a2a31",  // bot bubbles, hover states
      line:   "#34343c",  // all borders
      red:    "#d4302f",  // primary brand (gradients bottom)
      redHot: "#ff4b3e",  // primary brand (gradients top, accents)
      amber:  "#e0a020",  // the Upwork handoff button
      green:  "#4ec07a",  // the "grounded" trust marker + status dot
      text:   "#e6e6e6",  // body text
      muted:  "#9a9aa2"   // secondary text, labels
    }
  };
</script>
<script src="/widget.js" data-api="" defer></script>
```

### b) Data attributes on the script tag (no JS object needed)
```html
<script src="/widget.js"
        data-api="https://your-api-host"
        data-name="Les"
        data-upwork="https://www.upwork.com/freelancers/~0178a832a97394710e"
        data-title="Ask Les"
        data-greeting="Hi — what are you building?"
        data-teaser="Ask me anything — I won't make things up."
        data-auto-open="true"
        defer></script>
```

### c) Your own CSS (full control — fonts, radius, shadows, layout)
Add a stylesheet **after** the widget script. Target any `.raw-*` class below.
```css
.raw-launch { border-radius: 10px; font-family: "Your Font", sans-serif; }
.raw-panel  { width: 420px; border-radius: 20px; }
.raw-uw     { text-transform: uppercase; letter-spacing: .04em; }
```

---

## 2. Widget DOM tree (`static/widget.js`)

All markup lives inside a single fixed-position root, `div.raw`, at the bottom-right.

```
div.raw                                  ← root, fixed bottom-right (z-index top)
├─ div.raw-launch-wrap                   ← the closed state (button + teaser)
│  ├─ div.raw-teaser        [hidden]     ← "nudge" speech bubble (mobile / first visit)
│  │  └─ button.raw-teaser-x             ← its × dismiss
│  └─ button.raw-launch                  ← the pill launcher ("Ask Les")
│     ├─ svg  (CHAT_ICON)                ← speech-bubble icon
│     └─ span                            ← the TITLE text
│     · gets .raw-pulse on first visit (attention ring)
│
└─ section.raw-panel                     ← the chat window; .raw-open toggles visible
   ├─ header.raw-head
   │  ├─ svg.raw-mark                    ← the little logo mark (square + dot)
   │  ├─ div.raw-htext
   │  │  ├─ span.raw-title               ← panel title
   │  │  └─ span.raw-sub                 ← subtitle line
   │  │     └─ span.raw-dot              ← green "live" status dot
   │  └─ button.raw-close                ← the × close
   │
   ├─ div.raw-log                        ← scrolling message list (items appended here)
   │  ├─ div.raw-msg.raw-user            ← a visitor message bubble (right, brand gradient)
   │  ├─ div.raw-msg.raw-bot             ← an assistant message bubble (left, panel2)
   │  ├─ div.raw-grounded                ← "Grounded in what Les does" trust marker
   │  │  └─ svg + span                       (green check; only under grounded answers)
   │  ├─ div.raw-handoff                 ← the handoff card (appears when qualified)
   │  │  ├─ div.raw-handoff-lbl          ← "SUMMARY TO SEND LES" label
   │  │  ├─ div.raw-handoff-sum          ← the problem summary text (paste-ready)
   │  │  └─ div.raw-handoff-row
   │  │     ├─ a.raw-uw                  ← "Message Les on Upwork" button (amber)
   │  │     └─ button.raw-copy           ← "Copy summary" button
   │  ├─ div.raw-err                     ← an error bubble (red tint) + Upwork link
   │  └─ div.raw-typing                  ← the typing indicator
   │     └─ i × 3                        ← the three bouncing dots
   │
   ├─ div.raw-foot
   │  ├─ textarea.raw-in                 ← the message input (auto-grows)
   │  └─ button.raw-send                 ← send button (brand gradient)
   │     └─ svg  (SEND_ICON)
   │
   └─ div.raw-tag                        ← footer microcopy ("Nothing invented.")
      └─ b
```

### Widget class reference

| Class | What it is | Key styling |
|---|---|---|
| `.raw` | Root container | `position:fixed; right/bottom:20px; z-index:2147483000` |
| `.raw-launch` | Closed-state launcher pill | brand gradient, `height:52px`, `border-radius:26px` |
| `.raw-launch.raw-pulse` | First-visit attention ring | `::after` pulsing box-shadow |
| `.raw-launch-wrap` | Column holding teaser + launcher | right-aligned flex column |
| `.raw-teaser` | Nudge speech bubble | `panel` bg, `line` border, tail corner |
| `.raw-teaser-x` | Teaser dismiss × | `muted` → `text` on hover |
| `.raw-panel` | The chat window | `388×600`, `panel` bg, `border-radius:16px`; `.raw-open` reveals |
| `.raw-head` | Panel top bar | `bg` surface, bottom `line` border |
| `.raw-mark` | Logo mark (SVG) | `30×30`; `red` stroke + `redHot` dot |
| `.raw-title` | Title text | Oswald, uppercase, `.04em` tracking |
| `.raw-sub` | Subtitle | `muted`, 11px |
| `.raw-dot` | Live status dot | `green` with soft ring |
| `.raw-close` | Close × | `muted`; hover `panel2` bg |
| `.raw-log` | Message scroll area | `flex:1; overflow-y:auto; gap:12px` |
| `.raw-msg` | Any message bubble | `max-width:86%; border-radius:13px` |
| `.raw-user` | Visitor bubble | brand gradient, right-aligned |
| `.raw-bot` | Assistant bubble | `panel2` bg, `line` border, left-aligned |
| `.raw-grounded` | Trust marker | `green`, 10.5px, under grounded replies only |
| `.raw-handoff` | Handoff card | `bg` surface, `line` border, `radius:12px`, full-width |
| `.raw-handoff-lbl` | Card label | `muted`, uppercase, 11px, bold |
| `.raw-handoff-sum` | Problem summary | `text`, 13px, `pre-wrap` |
| `.raw-handoff-row` | Button row | flex, wraps |
| `.raw-uw` | **Upwork handoff button** | `amber` bg, `bg`-color text, bold |
| `.raw-copy` | Copy-summary button | `panel2` bg, `line` border |
| `.raw-err` | Error bubble | red-tint bg + border; link is `redHot` |
| `.raw-typing` | Typing indicator | `panel2` pill |
| `.raw-typing i` | Bouncing dot | `muted`, staggered `raw-b` animation |
| `.raw-foot` | Input row | `bg` surface, top `line` border |
| `.raw-in` | Textarea | `panel` bg; focus border `red` |
| `.raw-send` | Send button | brand gradient, `42×42` |
| `.raw-tag` | Footer microcopy | `muted`, centered, 10.5px |

### State classes to know
- `.raw-panel.raw-open` — panel is visible (added on open, removed on close).
- `.raw-launch.raw-pulse` — attention ring; removed once the visitor engages.
- `[hidden]` on `.raw-teaser` — hidden by default, shown on mobile/first visit.

### Injected SVGs (edit in `widget.js`, the `--- SVG bits ---` block)
`MARK` (logo), `CHAT_ICON` (launcher), `SEND_ICON`, `CHECK_ICON` (grounded marker),
`UW_ICON` (Upwork button check).

### Animations (keyframes in the injected CSS)
`raw-pulse` (launcher ring) · `raw-teaser-in` (bubble/card entrance) · `raw-b`
(typing dots). All are disabled under `@media (prefers-reduced-motion:reduce)`.

---

## 3. Landing page DOM tree (`static/index.html`)

The page has its own `<style>` in the `<head>` using CSS variables on `:root`
(these are **separate** from the widget's JS theme object — set both if you recolor).

```
body                              ← radial-gradient background over --bg
└─ main.wrap                      ← max-width:820px centered column
   ├─ div.kicker                  ← amber uppercase eyebrow ("— Live demo —")
   ├─ h1.display                  ← the headline (Oswald, uppercase)
   │  └─ span.hot                 ← the red-hot highlighted words
   ├─ p.lead                      ← the intro paragraph (muted)
   │  └─ em
   ├─ div.card                    ← the "Try to catch it fabricating" box
   │  ├─ h2                       ← card heading
   │  └─ ol > li                  ← the try-it steps
   │     └─ code                  ← the example prompts (monospace chips)
   ├─ p.note                      ← the "most AI will invent…" explainer
   └─ p.hint                      ← "Open the assistant ↘"
      └─ span.arrow               ← the red-hot arrow
```

### Landing page `:root` tokens (`static/index.html` `<style>`)

| Variable | Role |
|---|---|
| `--bg` | Page background base |
| `--bg-deep` | `code` chip background |
| `--panel` | `.card` background |
| `--line` | Borders |
| `--red` / `--red-hot` | Brand accents (`.hot`, `.arrow`, focus) |
| `--amber` | `.kicker` eyebrow |
| `--green` | (reserved; matches widget) |
| `--text` | Body text |
| `--muted` | Secondary text |

> **Recolor tip:** to rebrand, change the `:root` variables in `index.html` **and**
> the matching keys in the widget's `theme` object (or pass a `theme` in
> `window.RELIABLE_ASSISTANT`). Keep the two palettes in sync so the page and the
> chat window read as one design.

---

## 4. What NOT to rename

The JavaScript selects elements by these class names and the `.raw-open` /
`.raw-pulse` / `[hidden]` state hooks. **Restyle them freely, but don't rename them**
in `widget.js` unless you also update the `querySelector` calls and the `classList`
toggles. Everything visual (color, font, radius, spacing, shadow, size) is safe to
change; only the *names* are load-bearing.
