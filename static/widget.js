/*
 * Reliable AI Assistant — embeddable widget (single file, no build, no deps).
 *
 * Embed on any page with one line:
 *   <script src="https://YOUR-API-HOST/widget.js"
 *           data-api="https://YOUR-API-HOST" defer></script>
 *
 * It reads its API base from (in order): window.RELIABLE_ASSISTANT.api, the script
 * tag's data-api attribute, or the origin the script itself was served from.
 *
 * The assistant IS the reliability claim, running. This widget renders only what the
 * backend grounds: grounded answers carry a quiet integrity marker, and the handoff
 * is a clean "message on Upwork" with the visitor's problem summarized to paste —
 * never an invented commitment. Every error falls back to the Upwork profile.
 */
(function () {
  "use strict";
  if (window.__RELIABLE_ASSISTANT_MOUNTED__) return;
  window.__RELIABLE_ASSISTANT_MOUNTED__ = true;

  // --- Resolve config -------------------------------------------------------
  var cfg = window.RELIABLE_ASSISTANT || {};
  var self =
    document.currentScript ||
    (function () {
      var s = document.querySelectorAll('script[src*="widget.js"]');
      return s.length ? s[s.length - 1] : null;
    })();
  function attr(name, fallback) {
    return (self && self.getAttribute(name)) || fallback;
  }
  var API = (cfg.api || attr("data-api", "") || (self ? new URL(self.src).origin : "")).replace(/\/$/, "");
  var NAME = cfg.name || attr("data-name", "Les");
  // The Upwork profile: from config/data attr, else learned from /chat responses.
  var upworkUrl = cfg.upwork || attr("data-upwork", "") || "";
  var TITLE = cfg.title || attr("data-title", "Ask " + NAME);
  var GREETING =
    cfg.greeting ||
    attr(
      "data-greeting",
      "Hi — I'm " + NAME + "'s assistant. I answer from what " + NAME + " actually " +
        "does, and I'll tell you straight when something's outside that. What are you " +
        "trying to build or fix?"
    );
  var TEASER =
    cfg.teaser ||
    attr("data-teaser", "Ask me about " + NAME + "'s work — I won't make things up.");
  // Auto-open the panel once for a brand-new visitor (desktop only, so it never
  // takes over a phone screen). Set window.RELIABLE_ASSISTANT.autoOpen=false to disable.
  var AUTO_OPEN = cfg.autoOpen !== false && attr("data-auto-open", "true") !== "false";

  // --- Theme (override via window.RELIABLE_ASSISTANT.theme) ------------------
  var t = Object.assign(
    {
      bg: "#141417",
      panel: "#1f1f24",
      panel2: "#2a2a31",
      line: "#34343c",
      red: "#d4302f",
      redHot: "#ff4b3e",
      amber: "#e0a020",
      green: "#4ec07a",
      text: "#e6e6e6",
      muted: "#9a9aa2",
    },
    cfg.theme || {}
  );

  var history = []; // [{role, content}]
  var busy = false;

  // Wake the service on page load (fire-and-forget). On a spun-down free-tier
  // instance this starts the ~cold start early, so by the time a visitor opens
  // the chat and types, it's already warm and the first reply feels instant.
  try { fetch(API + "/health", { method: "GET", mode: "cors" }).catch(function () {}); } catch (e) {}

  // --- Styles (scoped under .raw; won't touch the host site) ----------------
  var css =
    "" +
    ".raw{position:fixed;right:20px;bottom:20px;z-index:2147483000;" +
    "font-family:-apple-system,'Segoe UI',Roboto,system-ui,sans-serif;font-size:15px;line-height:1.55}" +
    ".raw *{box-sizing:border-box}" +
    ".raw [hidden]{display:none!important}" +
    ".raw-launch{display:inline-flex;align-items:center;gap:10px;cursor:pointer;border:none;" +
    "color:#fff;font-weight:700;font-size:15px;padding:0 18px;height:52px;border-radius:26px;" +
    "background:linear-gradient(180deg," + t.redHot + "," + t.red + ");" +
    "box-shadow:0 6px 20px rgba(212,48,47,.38),0 1px 0 rgba(255,255,255,.18) inset;" +
    "transition:transform .15s ease,box-shadow .15s ease;position:relative}" +
    ".raw-launch:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(212,48,47,.5)}" +
    ".raw-launch svg{width:22px;height:22px;flex:none}" +
    ".raw-launch-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:10px}" +
    ".raw-launch.raw-pulse::after{content:'';position:absolute;inset:0;border-radius:26px;pointer-events:none;" +
    "box-shadow:0 0 0 0 rgba(255,75,62,.5);animation:raw-pulse 2.2s ease-out infinite}" +
    "@keyframes raw-pulse{0%{box-shadow:0 0 0 0 rgba(255,75,62,.5)}70%{box-shadow:0 0 0 18px rgba(255,75,62,0)}" +
    "100%{box-shadow:0 0 0 0 rgba(255,75,62,0)}}" +
    ".raw-teaser{position:relative;max-width:236px;background:" + t.panel + ";color:" + t.text + ";" +
    "border:1px solid " + t.line + ";border-radius:14px;border-bottom-right-radius:4px;padding:12px 30px 12px 14px;" +
    "font-size:13.5px;line-height:1.45;box-shadow:0 12px 32px rgba(0,0,0,.45);cursor:pointer;" +
    "animation:raw-teaser-in .25s ease-out}" +
    ".raw-teaser b{color:" + t.redHot + "}" +
    ".raw-teaser-x{position:absolute;top:5px;right:7px;background:transparent;border:none;color:" + t.muted + ";" +
    "font-size:15px;line-height:1;cursor:pointer;padding:2px 5px;border-radius:6px}" +
    ".raw-teaser-x:hover{color:" + t.text + "}" +
    "@keyframes raw-teaser-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
    ".raw-dot{width:8px;height:8px;border-radius:50%;background:" + t.green + ";" +
    "box-shadow:0 0 0 3px rgba(78,192,122,.25)}" +
    ".raw-panel{position:fixed;right:20px;bottom:20px;width:388px;max-width:calc(100vw - 32px);" +
    "height:600px;max-height:calc(100vh - 40px);background:" + t.panel + ";color:" + t.text + ";" +
    "border:1px solid " + t.line + ";border-radius:16px;display:none;flex-direction:column;overflow:hidden;" +
    "box-shadow:0 24px 60px rgba(0,0,0,.55);opacity:0;transform:translateY(12px) scale(.98);" +
    "transition:opacity .18s ease,transform .18s ease}" +
    ".raw-panel.raw-open{display:flex;opacity:1;transform:none}" +
    ".raw-head{display:flex;align-items:center;gap:11px;padding:14px 15px;background:" + t.bg + ";" +
    "border-bottom:1px solid " + t.line + "}" +
    ".raw-mark{width:30px;height:30px;flex:none}" +
    ".raw-htext{display:flex;flex-direction:column;line-height:1.15;min-width:0}" +
    ".raw-title{font-family:Oswald,'Arial Narrow',sans-serif;text-transform:uppercase;" +
    "letter-spacing:.04em;font-weight:700;font-size:15px}" +
    ".raw-sub{font-size:11px;color:" + t.muted + ";display:flex;align-items:center;gap:6px}" +
    ".raw-close{margin-left:auto;background:transparent;border:none;color:" + t.muted + ";" +
    "cursor:pointer;font-size:20px;line-height:1;padding:6px;border-radius:8px}" +
    ".raw-close:hover{color:" + t.text + ";background:" + t.panel2 + "}" +
    ".raw-log{flex:1;overflow-y:auto;padding:16px 15px;display:flex;flex-direction:column;gap:12px;" +
    "scroll-behavior:smooth}" +
    ".raw-msg{max-width:86%;padding:10px 13px;border-radius:13px;white-space:pre-wrap;word-wrap:break-word}" +
    ".raw-user{align-self:flex-end;background:linear-gradient(180deg," + t.redHot + "," + t.red + ");color:#fff;" +
    "border-bottom-right-radius:4px}" +
    ".raw-bot{align-self:flex-start;background:" + t.panel2 + ";border:1px solid " + t.line + ";" +
    "border-bottom-left-radius:4px}" +
    ".raw-grounded{align-self:flex-start;display:inline-flex;align-items:center;gap:5px;margin:-4px 0 0 2px;" +
    "font-size:10.5px;letter-spacing:.02em;color:" + t.green + "}" +
    ".raw-grounded svg{width:12px;height:12px}" +
    // handoff card: a summary to paste + the Upwork button
    ".raw-handoff{align-self:stretch;background:" + t.bg + ";border:1px solid " + t.line + ";" +
    "border-radius:12px;padding:12px 13px;display:flex;flex-direction:column;gap:9px}" +
    ".raw-handoff-lbl{font-size:11px;letter-spacing:.02em;color:" + t.muted + ";text-transform:uppercase;font-weight:700}" +
    ".raw-handoff-sum{font-size:13px;line-height:1.5;color:" + t.text + ";white-space:pre-wrap}" +
    ".raw-handoff-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}" +
    ".raw-uw{display:inline-flex;align-items:center;gap:8px;text-decoration:none;" +
    "background:" + t.amber + ";color:" + t.bg + ";font-weight:700;font-size:13.5px;padding:9px 15px;" +
    "border-radius:10px;border:none;cursor:pointer;font-family:inherit}" +
    ".raw-uw:hover{filter:brightness(1.08)}" +
    ".raw-copy{background:" + t.panel2 + ";color:" + t.text + ";border:1px solid " + t.line + ";" +
    "font:inherit;font-size:12.5px;padding:8px 12px;border-radius:9px;cursor:pointer}" +
    ".raw-copy:hover{border-color:" + t.muted + "}" +
    ".raw-err{align-self:stretch;font-size:13px;color:#ffb4ab;background:rgba(212,48,47,.12);" +
    "border:1px solid rgba(212,48,47,.35);border-radius:10px;padding:10px 12px}" +
    ".raw-err a{color:" + t.redHot + ";font-weight:600}" +
    ".raw-typing{align-self:flex-start;display:inline-flex;gap:4px;padding:12px 14px;background:" + t.panel2 + ";" +
    "border:1px solid " + t.line + ";border-radius:13px}" +
    ".raw-typing i{width:6px;height:6px;border-radius:50%;background:" + t.muted + ";animation:raw-b 1s infinite}" +
    ".raw-typing i:nth-child(2){animation-delay:.15s}.raw-typing i:nth-child(3){animation-delay:.3s}" +
    "@keyframes raw-b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}" +
    ".raw-foot{border-top:1px solid " + t.line + ";padding:11px;display:flex;gap:9px;align-items:flex-end;" +
    "background:" + t.bg + "}" +
    ".raw-in{flex:1;resize:none;max-height:120px;background:" + t.panel + ";color:" + t.text + ";" +
    "border:1px solid " + t.line + ";border-radius:11px;padding:10px 12px;font:inherit;outline:none}" +
    ".raw-in:focus{border-color:" + t.red + "}" +
    ".raw-send{flex:none;width:42px;height:42px;border:none;border-radius:11px;cursor:pointer;color:#fff;" +
    "background:linear-gradient(180deg," + t.redHot + "," + t.red + ");display:flex;align-items:center;justify-content:center}" +
    ".raw-send:disabled{opacity:.45;cursor:default}" +
    ".raw-send svg{width:19px;height:19px}" +
    ".raw-tag{padding:6px 15px 12px;font-size:10.5px;color:" + t.muted + ";text-align:center;background:" + t.bg + "}" +
    ".raw-tag b{color:" + t.muted + ";font-weight:700}" +
    "@media (max-width:480px){.raw-panel{right:8px;bottom:8px;width:calc(100vw - 16px);height:calc(100vh - 16px)}" +
    ".raw{right:12px;bottom:12px}}" +
    "@media (prefers-reduced-motion:reduce){.raw *{transition:none!important;animation:none!important}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // --- SVG bits -------------------------------------------------------------
  var MARK =
    '<svg class="raw-mark" viewBox="0 0 40 40" aria-hidden="true">' +
    '<rect x="2" y="2" width="36" height="36" rx="8" fill="none" stroke="' + t.red + '" stroke-width="3"/>' +
    '<circle cx="23" cy="17" r="5" fill="' + t.redHot + '"/></svg>';
  var CHAT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-5.5A8 8 0 1 1 21 12Z" ' +
    'stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
  var SEND_ICON =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12l16-8-6 16-3-6-7-2Z" ' +
    'stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  var CHECK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12l5 5L20 6" stroke="' + t.green +
    '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var UW_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">' +
    '<path d="M5 13l4 4L19 7" stroke="' + t.bg + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // --- Build DOM ------------------------------------------------------------
  var root = document.createElement("div");
  root.className = "raw";
  root.innerHTML =
    '<div class="raw-launch-wrap">' +
    '<div class="raw-teaser" hidden role="button" tabindex="0" aria-label="Open assistant">' +
    esc(TEASER) +
    '<button class="raw-teaser-x" aria-label="Dismiss">×</button></div>' +
    '<button class="raw-launch" aria-label="Open assistant">' +
    CHAT_ICON +
    "<span>" + esc(TITLE) + "</span></button></div>" +
    '<section class="raw-panel" role="dialog" aria-label="Assistant" aria-modal="false">' +
    '<header class="raw-head">' + MARK +
    '<div class="raw-htext"><span class="raw-title">' + esc(TITLE) + "</span>" +
    '<span class="raw-sub"><span class="raw-dot"></span>Grounded answers · no guessing</span></div>' +
    '<button class="raw-close" aria-label="Close">×</button></header>' +
    '<div class="raw-log" role="log" aria-live="polite"></div>' +
    '<div class="raw-foot"><textarea class="raw-in" rows="1" placeholder="Ask about the work, or describe your project…" ' +
    'aria-label="Message"></textarea>' +
    '<button class="raw-send" aria-label="Send" disabled>' + SEND_ICON + "</button></div>" +
    '<div class="raw-tag">Answers from <b>what ' + esc(NAME) + ' actually does</b>. Nothing invented.</div>' +
    "</section>";
  document.body.appendChild(root);

  var wrap = root.querySelector(".raw-launch-wrap");
  var launch = root.querySelector(".raw-launch");
  var teaser = root.querySelector(".raw-teaser");
  var teaserX = root.querySelector(".raw-teaser-x");
  var panel = root.querySelector(".raw-panel");
  var log = root.querySelector(".raw-log");
  var input = root.querySelector(".raw-in");
  var send = root.querySelector(".raw-send");
  var closeBtn = root.querySelector(".raw-close");

  // Remember, per browser, whether this visitor has engaged — so the pulse,
  // teaser, and first-visit auto-open only pester brand-new visitors, never
  // returning ones. Wrapped in try/catch: storage can throw in private mode.
  function seen() {
    try { return localStorage.getItem("reliable_assistant_seen") === "1"; } catch (e) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem("reliable_assistant_seen", "1"); } catch (e) {}
  }
  function hideTeaser() {
    if (teaser) teaser.hidden = true;
  }
  function stopPulse() {
    launch.classList.remove("raw-pulse");
  }

  // --- Helpers --------------------------------------------------------------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function scrollDown() {
    requestAnimationFrame(function () {
      log.scrollTop = log.scrollHeight;
    });
  }
  function addBubble(role, text) {
    var d = document.createElement("div");
    d.className = "raw-msg " + (role === "user" ? "raw-user" : "raw-bot");
    d.textContent = text;
    log.appendChild(d);
    scrollDown();
    return d;
  }
  function addGrounded() {
    var g = document.createElement("div");
    g.className = "raw-grounded";
    g.innerHTML = CHECK_ICON + "<span>Grounded in what " + esc(NAME) + " does</span>";
    log.appendChild(g);
    scrollDown();
  }
  function addHandoff(summary) {
    // A card: the visitor's problem, summarized to paste into their first Upwork
    // message, plus a button that opens the Upwork profile. No off-platform contact.
    var url = upworkUrl;
    var card = document.createElement("div");
    card.className = "raw-handoff";

    var lbl = document.createElement("div");
    lbl.className = "raw-handoff-lbl";
    lbl.textContent = "Summary to send " + NAME;
    card.appendChild(lbl);

    var sum = document.createElement("div");
    sum.className = "raw-handoff-sum";
    sum.textContent = summary;
    card.appendChild(sum);

    var row = document.createElement("div");
    row.className = "raw-handoff-row";

    if (url) {
      var a = document.createElement("a");
      a.className = "raw-uw";
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = UW_ICON + "<span>Message " + esc(NAME) + " on Upwork</span>";
      row.appendChild(a);
    }

    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "raw-copy";
    copy.textContent = "Copy summary";
    copy.addEventListener("click", function () {
      var done = function () {
        copy.textContent = "Copied ✓";
        setTimeout(function () { copy.textContent = "Copy summary"; }, 1600);
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(summary).then(done, done);
        } else {
          done();
        }
      } catch (e) { done(); }
    });
    row.appendChild(copy);

    card.appendChild(row);
    log.appendChild(card);
    scrollDown();
  }
  function addError(fallback) {
    var d = document.createElement("div");
    d.className = "raw-err";
    var msg = esc(fallback || "Something went wrong on my end — I'd rather tell you than guess.");
    if (upworkUrl) {
      d.innerHTML = msg + ' <a href="' + esc(upworkUrl) + '" target="_blank" rel="noopener noreferrer">Reach ' +
        esc(NAME) + " on Upwork →</a>";
    } else {
      d.innerHTML = msg;
    }
    log.appendChild(d);
    scrollDown();
  }
  var typingEl = null;
  function showTyping() {
    typingEl = document.createElement("div");
    typingEl.className = "raw-typing";
    typingEl.innerHTML = "<i></i><i></i><i></i>";
    log.appendChild(typingEl);
    scrollDown();
  }
  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  var greeted = false;
  function openPanel() {
    markSeen();
    hideTeaser();
    stopPulse();
    panel.classList.add("raw-open");
    wrap.style.display = "none";
    if (!greeted) {
      greeted = true;
      addBubble("bot", GREETING);
    }
    setTimeout(function () { input.focus(); }, 60);
  }
  function closePanel() {
    panel.classList.remove("raw-open");
    wrap.style.display = "flex";
  }

  // --- Networking -----------------------------------------------------------
  function sendMessage() {
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    input.style.height = "auto";
    send.disabled = true;
    addBubble("user", text);
    history.push({ role: "user", content: text });

    busy = true;
    showTyping();

    fetch(API + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: history }),
    })
      .then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, data: d }; });
      })
      .then(function (res) {
        hideTyping();
        if (res.data && res.data.upwork_url) upworkUrl = res.data.upwork_url;
        if (!res.ok || !res.data || typeof res.data.reply !== "string") {
          addError((res.data && (res.data.fallback || res.data.error)) || null);
          return;
        }
        var d = res.data;
        addBubble("bot", d.reply);
        history.push({ role: "assistant", content: d.reply });
        if (d.in_corpus) addGrounded();
        if (d.handoff_ready && d.problem_summary) addHandoff(d.problem_summary);
      })
      .catch(function () {
        hideTyping();
        addError(null);
      })
      .finally(function () {
        busy = false;
        send.disabled = input.value.trim() === "";
      });
  }

  // --- Wire up --------------------------------------------------------------
  launch.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  send.addEventListener("click", sendMessage);
  input.addEventListener("input", function () {
    send.disabled = input.value.trim() === "" || busy;
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (panel.classList.contains("raw-open")) closePanel();
  });

  // Teaser bubble: click it (or its text) to open; the × just dismisses it.
  teaser.addEventListener("click", openPanel);
  teaser.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPanel(); }
  });
  teaserX.addEventListener("click", function (e) {
    e.stopPropagation();
    hideTeaser();
    stopPulse();
    markSeen(); // an explicit dismiss counts as "seen" — don't re-pester
  });

  // Let the host page open/close the assistant (e.g. a hero CTA button):
  //   <button onclick="window.reliableAssistant.open()">Ask the assistant</button>
  var _stub = window.reliableAssistant;
  window.reliableAssistant = { open: openPanel, close: closePanel };
  if (_stub && _stub._pendingOpen) openPanel();

  // --- First-load attention ---------------------------------------------------
  if (!seen()) {
    launch.classList.add("raw-pulse");
    var isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (AUTO_OPEN && isDesktop) {
      setTimeout(function () {
        if (!seen() && !panel.classList.contains("raw-open")) openPanel();
      }, 1600);
    } else {
      setTimeout(function () {
        if (!seen() && !panel.classList.contains("raw-open")) teaser.hidden = false;
      }, 1400);
    }
  }
})();
