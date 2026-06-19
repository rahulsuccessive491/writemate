/* ─── WriteMate content script ─────────────────────────────────────────── */
const DEBOUNCE_MS = 1200;
const MIN_CHARS   = 20;
const CARD_ID     = "wm-suggestion-card";

const TONE_MODES = [
  { id: "analyze",       label: "Analyze"      },
  { id: "professional",  label: "Professional" },
  { id: "casual",        label: "Casual"       },
  { id: "bullet_points", label: "Bullets"      },
  { id: "concise",       label: "Concise"      },
  { id: "grammar",       label: "Grammar"      },
];

let activeRange        = null;
let debounceTimer      = null;
let suggestionCard     = null;
let savedTarget        = null;   // element when card was shown — survives blur
let isFetching         = false;
let inlineSuggest      = true;
let inlineMode         = "professional";
let toastEl            = null;
let lastFetchedText    = null;   // saved to allow tone-switch re-fetch

/* ── Load settings ── */
chrome.storage.local.get(["inlineSuggest", "inlineMode"], (d) => {
  if (d.inlineSuggest !== undefined) inlineSuggest = d.inlineSuggest;
  if (d.inlineMode)                  inlineMode    = d.inlineMode;
});
chrome.storage.onChanged.addListener((c) => {
  if (c.inlineSuggest) inlineSuggest = c.inlineSuggest.newValue;
  if (c.inlineMode)    inlineMode    = c.inlineMode.newValue;
});

/* ═══════════════════════════════════════════════════════════
   DOCUMENT-LEVEL CAPTURE LISTENERS  (Fix #1 & #3)
   These fire for every element on the page, including ones
   already focused when the script loaded (e.g. Gmail compose)
═══════════════════════════════════════════════════════════ */
document.addEventListener("input", onAnyInput, true);
document.addEventListener("keydown", onAnyKeydown, true);
document.addEventListener("mouseup", onMouseUp);

function onAnyInput(e) {
  // composedPath()[0] gives the real target even through Shadow DOM boundaries
  const el = (e.composedPath && e.composedPath()[0]) || e.target;
  if (!isEditable(el)) return;

  clearTimeout(debounceTimer);
  dismissCard();

  if (!inlineSuggest || isFetching) return;

  const text = extractText(el);
  if (!text || text.length < MIN_CHARS) return;

  // Save the element NOW (before any blur can clear it)
  savedTarget = el;

  debounceTimer = setTimeout(() => {
    // isConnected works for Shadow DOM elements; document.body.contains does not
    if (el.isConnected) fetchSuggestion(text, el);
  }, DEBOUNCE_MS);
}

function onAnyKeydown(e) {
  if (!suggestionCard) return;

  if (e.key === "Tab") {
    e.preventDefault();
    e.stopPropagation();
    acceptSuggestion();
  } else if (e.key === "Escape") {
    e.preventDefault();
    dismissCard();
  } else if (!["Shift", "Alt", "Control", "Meta", "CapsLock"].includes(e.key)) {
    dismissCard();
  }
}

function onMouseUp() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && sel.toString().trim()) {
    activeRange = sel.getRangeAt(0).cloneRange();
  }
}

/* ═══════════════════════════════════════════════════════════
   RIGHT-CLICK REPHRASE
═══════════════════════════════════════════════════════════ */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "REPHRASE_START") showToast("Rephrasing…", "loading");
  if (msg.type === "REPHRASE_DONE") {
    replaceSelectedText(msg.result);
    const it = msg.iterations > 1 ? ` (${msg.iterations} passes)` : "";
    showToast(`✓ ${msg.mode}${it}`, "success");
  }
  if (msg.type === "REPHRASE_ERROR") showToast(`Error: ${msg.error}`, "error");
});

function replaceSelectedText(newText) {
  const el = document.activeElement;
  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
    const s = el.selectionStart, e = el.selectionEnd;
    el.value = el.value.slice(0, s) + newText + el.value.slice(e);
    el.selectionStart = el.selectionEnd = s + newText.length;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  if (activeRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(activeRange);
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(newText));
    sel.removeAllRanges();
    return;
  }
  navigator.clipboard.writeText(newText).then(() => showToast("Copied to clipboard", "info"));
}

/* ═══════════════════════════════════════════════════════════
   TEXT EXTRACTION
═══════════════════════════════════════════════════════════ */
function isEditable(el) {
  if (!el) return false;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName === "INPUT" && ["text","search","email","url"].includes(el.type)) return true;
  // Walk up to find contenteditable ancestor (handles Gmail's nested divs and Shadow DOM)
  // Use parentNode (not parentElement) so we can cross shadow root boundaries
  let node = el;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    if (node.isContentEditable) return true;
    if (node.getAttribute && (node.getAttribute("role") === "textbox" || node.getAttribute("contenteditable") === "true")) return true;
    // Cross Shadow DOM: if we hit a shadow root, jump to its host
    node = node.parentElement || (node.getRootNode && node.getRootNode().host) || null;
    if (node === document.body || node === document.documentElement) break;
  }
  return false;
}

function getEditableRoot(el) {
  // Walk up to find the outermost contenteditable element, crossing Shadow DOM boundaries
  let node = el;
  let last = el;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    if (node.isContentEditable || node.getAttribute("contenteditable") === "true") last = node;
    const next = node.parentElement || (node.getRootNode && node.getRootNode().host) || null;
    if (!next || next === document.body || next === document.documentElement) break;
    node = next;
  }
  return last;
}

function extractText(el) {
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    const before = el.value.slice(0, el.selectionStart);
    const parts  = before.split(/\n\s*\n/);
    return parts[parts.length - 1].trim();
  }

  // contenteditable — get text before cursor using Selection API
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    // Fallback: just return innerText of the editable root
    return getEditableRoot(el).innerText.trim().slice(-500);
  }

  const range = sel.getRangeAt(0);
  const root  = getEditableRoot(range.startContainer.parentElement || el);

  try {
    const preRange = document.createRange();
    preRange.setStart(root, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const textBefore = preRange.toString();
    const parts = textBefore.split(/\n\s*\n/);
    return parts[parts.length - 1].trim();
  } catch {
    return root.innerText.trim().slice(-500);
  }
}

/* ═══════════════════════════════════════════════════════════
   API CALL
═══════════════════════════════════════════════════════════ */

// Pings the service worker every 20s while a request is in-flight so Chrome
// doesn't kill it mid-fetch (MV3 service workers idle-terminate after ~30s).
let _keepaliveInterval = null;
let _safetyTimer       = null;

function _clearFetchGuards() {
  clearInterval(_keepaliveInterval); _keepaliveInterval = null;
  clearTimeout(_safetyTimer);        _safetyTimer       = null;
}

function _startFetchGuards(onTimeout) {
  _clearFetchGuards();
  _keepaliveInterval = setInterval(() => {
    // Suppress "Could not establish connection" if service worker happens to be
    // sleeping exactly when the ping fires — that's fine, it'll wake on the next
    // real message. The empty callback is required to consume lastError.
    chrome.runtime.sendMessage({ type: "KEEPALIVE" }, () => {
      void chrome.runtime.lastError;
    });
  }, 20000);
  // If callback never fires (service worker killed), recover after 35s
  _safetyTimer = setTimeout(() => {
    _clearFetchGuards();
    if (isFetching) {
      isFetching = false;
      if (toastEl) { toastEl.remove(); toastEl = null; }
      onTimeout();
    }
  }, 35000);
}

function fetchSuggestion(text, el) {
  isFetching = true;
  lastFetchedText = text;
  showToast("WriteMate thinking…  (click to cancel)", "loading", true);

  _startFetchGuards(() => showToast("WriteMate: timed out — try again", "error"));

  if (inlineMode === "analyze") {
    chrome.runtime.sendMessage({ type: "ANALYZE_TEXT", text }, (response) => {
      _clearFetchGuards();
      if (toastEl) toastEl.remove();
      isFetching = false;

      if (chrome.runtime.lastError || !response) {
        showToast("WriteMate: connection error", "error");
        return;
      }
      if (response.error) {
        showToast(`WriteMate: ${response.error}`, "error");
        return;
      }
      if (response.suggestions && response.suggestions.length > 0) {
        showCard(response.suggestions, el, "analyze");
      } else {
        showToast("✓ No issues found", "success");
      }
    });
    return;
  }

  // Route through background.js to avoid CORS restrictions in iframe contexts
  chrome.runtime.sendMessage({ type: "INLINE_REPHRASE", text, mode: inlineMode }, (response) => {
    _clearFetchGuards();
    if (toastEl) toastEl.remove();
    isFetching = false;

    if (chrome.runtime.lastError || !response) {
      showToast("WriteMate: connection error", "error");
      return;
    }
    if (response.error) {
      showToast(`WriteMate: ${response.error}`, "error");
      return;
    }
    if (response.result && response.result.trim() !== text.trim()) {
      showCard(response.result.trim(), el, inlineMode);
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   TONE SWITCH (re-fetch with new mode, update existing card)
═══════════════════════════════════════════════════════════ */
function refreshCardTone(mode) {
  if (!suggestionCard || !lastFetchedText || isFetching) return;
  isFetching = true;

  suggestionCard.querySelectorAll(".wm-tone").forEach(btn => {
    btn.classList.toggle("wm-tone-active", btn.dataset.mode === mode);
  });

  const body   = suggestionCard.querySelector(".wm-body");
  const counts = suggestionCard.querySelector(".wm-counts");
  if (body) { body.textContent = "Thinking…"; body.className = "wm-body"; }
  if (counts) counts.textContent = "";

  if (mode === "analyze") {
    _startFetchGuards(() => { if (body) body.textContent = "Timed out — try again."; });
    chrome.runtime.sendMessage({ type: "ANALYZE_TEXT", text: lastFetchedText }, (response) => {
      _clearFetchGuards();
      isFetching = false;
      if (!suggestionCard || !body) return;

      if (chrome.runtime.lastError || !response || response.error) {
        body.textContent = "Error fetching suggestions.";
        return;
      }

      const issues = response.suggestions || [];
      if (issues.length === 0) {
        body.textContent = "✓ No issues found";
      } else {
        body.innerHTML = "";
        body.className = "wm-body wm-body-analyze";
        renderIssues(body, issues, savedTarget);
      }
      suggestionCard._suggestion = null;
      if (counts) counts.textContent = issues.length > 0 ? `${issues.length} suggestion${issues.length > 1 ? "s" : ""}` : "";
    });
    return;
  }

  _startFetchGuards(() => { if (body) body.textContent = "Timed out — try again."; });

  chrome.runtime.sendMessage({ type: "INLINE_REPHRASE", text: lastFetchedText, mode }, (response) => {
    _clearFetchGuards();
    isFetching = false;
    if (!suggestionCard) return;

    if (chrome.runtime.lastError || !response || response.error) {
      if (body) body.textContent = "Error fetching suggestion.";
      return;
    }

    const suggestion = response.result.trim();
    if (body) { body.textContent = suggestion; body.className = "wm-body"; }
    suggestionCard._suggestion = suggestion;

    if (counts) counts.textContent = getSuggestionStats(suggestion);
  });
}

/* ═══════════════════════════════════════════════════════════
   SUGGESTION CARD
═══════════════════════════════════════════════════════════ */
function getSuggestionStats(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const letters = text.replace(/\s/g, "").length;
  return `${words} words · ${letters} letters`;
}

function renderIssues(container, issues, el) {
  const TYPE_LABEL = { grammar: "Grammar", vocabulary: "Vocabulary", clarity: "Clarity" };
  issues.forEach((issue, idx) => {
    const div = document.createElement("div");
    div.className = "wm-issue";

    const altsHtml = (issue.alternatives || []).map(a =>
      `<button class="wm-alt-btn" data-alt="${a.replace(/"/g, "&quot;")}">${a}</button>`
    ).join("");

    const label = TYPE_LABEL[issue.type] || issue.type;
    div.innerHTML = `
      <div class="wm-issue-top">
        <span class="wm-badge wm-badge-${issue.type}">${label}</span>
        <button class="wm-issue-dismiss" title="Dismiss">✕</button>
      </div>
      <div class="wm-issue-row">
        <span class="wm-strikethrough">${issue.original}</span>
        <span class="wm-arrow">→</span>
        <div class="wm-alts">${altsHtml}</div>
      </div>
      <p class="wm-issue-explanation"></p>`;

    div.querySelector(".wm-issue-explanation").innerHTML = (issue.explanation || "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    div.querySelector(".wm-issue-dismiss").addEventListener("click", () => div.remove());

    div.querySelectorAll(".wm-alt-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const alt = btn.dataset.alt;
        const accepted = replaceTextInEditable(el, issue.original, alt);
        if (!accepted && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
          const val = el.value;
          const srcIdx = val.lastIndexOf(issue.original);
          if (srcIdx !== -1) {
            el.value = val.slice(0, srcIdx) + alt + val.slice(srcIdx + issue.original.length);
            el.selectionStart = el.selectionEnd = srcIdx + alt.length;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.focus();
          }
        }
        div.remove();
        showToast(`✓ "${issue.original}" → "${alt}"`, "success");
        if (!container.querySelector(".wm-issue")) dismissCard();
      });
    });

    container.appendChild(div);
  });
}

function showCard(suggestion, el, mode) {
  dismissCard();
  savedTarget = el;

  injectStyles();

  const toneButtons = TONE_MODES.map(t =>
    `<button class="wm-tone${t.id === mode ? " wm-tone-active" : ""}" data-mode="${t.id}">${t.label}</button>`
  ).join("");

  const isAnalyze = Array.isArray(suggestion);
  const footerHint = isAnalyze
    ? `<span class="wm-counts">${suggestion.length} suggestion${suggestion.length !== 1 ? "s" : ""}</span><span></span>`
    : `<span class="wm-counts">${getSuggestionStats(suggestion)}</span><button class="wm-btn">Accept suggestion</button>`;

  const card = document.createElement("div");
  card.id = CARD_ID;
  card.innerHTML = `
    <div class="wm-header">
      <div class="wm-logo">W</div>
      <span class="wm-title">WriteMate</span>
      <span class="wm-keys"><kbd>Tab</kbd> accept &nbsp;<kbd>Esc</kbd> dismiss</span>
    </div>
    <div class="wm-tones">${toneButtons}</div>
    <div class="wm-body${isAnalyze ? " wm-body-analyze" : ""}"></div>
    <div class="wm-footer">${footerHint}</div>`;

  const body = card.querySelector(".wm-body");
  if (isAnalyze) {
    renderIssues(body, suggestion, el);
    card._suggestion = null;
  } else {
    body.textContent = suggestion;
    card._suggestion = suggestion;
  }

  card.addEventListener("mousedown", (e) => e.preventDefault());
  const acceptBtn = card.querySelector(".wm-btn");
  if (acceptBtn) acceptBtn.addEventListener("click", acceptSuggestion);

  card.querySelectorAll(".wm-tone").forEach(btn => {
    btn.addEventListener("click", () => {
      const newMode = btn.dataset.mode;
      if (newMode === inlineMode || isFetching) return;
      inlineMode = newMode;
      chrome.storage.local.set({ inlineMode: newMode });
      refreshCardTone(newMode);
    });
  });

  const pos = getCaretPosition(el);
  Object.assign(card.style, {
    position: "fixed",
    top:      `${Math.min(pos.bottom + 8, window.innerHeight - 320)}px`,
    left:     `${Math.max(8, Math.min(pos.left, window.innerWidth - 388))}px`,
  });

  document.documentElement.appendChild(card);
  suggestionCard = card;

  setTimeout(dismissCard, 20000);
}

function getCaretPosition(el) {
  // Try selection range rect first (accurate for contenteditable)
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0).getBoundingClientRect();
    if (r.width > 0 || r.height > 0) return r;
  }
  // Fallback: element bounding rect
  const r = el.getBoundingClientRect();
  return { left: r.left, bottom: r.bottom };
}

/* ─── Tree-walker replace: finds sourceText in any contenteditable and swaps it ─── */
function replaceTextInEditable(el, sourceText, newText) {
  if (!sourceText) return false;
  const root = getEditableRoot(el);

  // Walk all text nodes, building a flat combined string + an offset map
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let combined = "";
  let node;
  while ((node = walker.nextNode())) {
    nodes.push({ node, start: combined.length });
    combined += node.textContent;
  }

  // Find the LAST occurrence of sourceText (most-recently-typed paragraph)
  const matchStart = combined.lastIndexOf(sourceText.trim());
  if (matchStart === -1) return false;
  const matchEnd = matchStart + sourceText.trim().length;

  let startNode, startOff, endNode, endOff;
  for (const entry of nodes) {
    const nodeEnd = entry.start + entry.node.textContent.length;
    if (!startNode && nodeEnd > matchStart) {
      startNode = entry.node;
      startOff  = matchStart - entry.start;
    }
    if (!endNode && nodeEnd >= matchEnd) {
      endNode = entry.node;
      endOff  = matchEnd - entry.start;
      break;
    }
  }
  if (!startNode || !endNode) return false;

  try {
    const range = document.createRange();
    range.setStart(startNode, startOff);
    range.setEnd(endNode, Math.min(endOff, endNode.textContent.length));
    range.deleteContents();

    const inserted = document.createTextNode(newText);
    range.insertNode(inserted);

    const sel = window.getSelection();
    const cur = document.createRange();
    cur.setStartAfter(inserted);
    cur.collapse(true);
    sel.removeAllRanges();
    sel.addRange(cur);

    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

function acceptSuggestion() {
  if (!suggestionCard) return;
  const text = suggestionCard._suggestion;
  const el   = savedTarget;
  dismissCard();
  if (!el || !text) return;

  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    const val    = el.value;
    // Use the saved source text to find the exact span to replace
    const srcIdx = lastFetchedText ? val.lastIndexOf(lastFetchedText) : -1;
    if (srcIdx !== -1) {
      el.value = val.slice(0, srcIdx) + text + val.slice(srcIdx + lastFetchedText.length);
      el.selectionStart = el.selectionEnd = srcIdx + text.length;
    } else {
      // Fallback: cursor-based replacement
      const cursor    = el.selectionStart;
      const before    = val.slice(0, cursor);
      const paraStart = Math.max(0, before.lastIndexOf("\n\n") + 2);
      el.value = val.slice(0, paraStart) + text + val.slice(cursor);
      el.selectionStart = el.selectionEnd = paraStart + text.length;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
    showToast("✓ Suggestion accepted", "success");
    return;
  }

  // contenteditable — use tree-walker replace first, then fall back
  el.focus();
  if (lastFetchedText && replaceTextInEditable(el, lastFetchedText, text)) {
    showToast("✓ Suggestion accepted", "success");
    return;
  }

  // Last-resort: execCommand (no selection tracking needed)
  try {
    document.execCommand("insertText", false, text);
    showToast("✓ Suggestion accepted", "success");
  } catch {
    navigator.clipboard.writeText(text).then(() =>
      showToast("Copied to clipboard (paste manually)", "info")
    );
  }
}

function dismissCard() {
  clearTimeout(debounceTimer);
  if (suggestionCard) { suggestionCard.remove(); suggestionCard = null; }
}

/* ═══════════════════════════════════════════════════════════
   STYLES  (injected once)
═══════════════════════════════════════════════════════════ */
function injectStyles() {
  if (document.getElementById("wm-styles")) return;
  const s = document.createElement("style");
  s.id = "wm-styles";
  s.textContent = `
    @keyframes wmIn { from { opacity:0; transform:translateY(-8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
    #${CARD_ID} {
      z-index:2147483647; width:380px; max-width:calc(100vw - 16px);
      background:#13131f; border:1px solid rgba(99,102,241,0.4);
      border-radius:14px; box-shadow:0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      font-size:13px; color:#e8e8f0; overflow:hidden;
      animation:wmIn 0.2s cubic-bezier(0.34,1.56,0.64,1);
    }
    #${CARD_ID} .wm-header {
      display:flex; align-items:center; gap:7px;
      padding:9px 13px; border-bottom:1px solid rgba(255,255,255,0.06);
      background:rgba(99,102,241,0.1);
    }
    #${CARD_ID} .wm-logo {
      width:20px; height:20px; border-radius:6px; flex-shrink:0;
      background:linear-gradient(135deg,#6366f1,#8b5cf6);
      display:flex; align-items:center; justify-content:center;
      font-size:11px; font-weight:800; color:#fff;
    }
    #${CARD_ID} .wm-title { font-size:12px; font-weight:700; color:#fff; flex:1; }
    #${CARD_ID} .wm-keys { font-size:10px; color:rgba(255,255,255,0.25); white-space:nowrap; }
    #${CARD_ID} kbd {
      background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12);
      border-radius:4px; padding:1px 5px; font-family:inherit; font-size:10px; color:rgba(255,255,255,0.5);
    }
    #${CARD_ID} .wm-tones {
      display:flex; gap:5px; padding:8px 12px; flex-wrap:wrap;
      border-bottom:1px solid rgba(255,255,255,0.06);
      background:rgba(255,255,255,0.02);
    }
    #${CARD_ID} .wm-tone {
      padding:3px 10px; border-radius:6px;
      border:1px solid rgba(255,255,255,0.1);
      background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.5);
      font-size:11px; font-weight:500; cursor:pointer; font-family:inherit;
      transition:all 0.15s;
    }
    #${CARD_ID} .wm-tone:hover { background:rgba(99,102,241,0.18); color:#a5b4fc; border-color:rgba(99,102,241,0.4); }
    #${CARD_ID} .wm-tone.wm-tone-active {
      background:rgba(99,102,241,0.25); color:#a5b4fc;
      border-color:rgba(99,102,241,0.55); font-weight:600;
    }
    #${CARD_ID} .wm-body {
      padding:11px 13px; line-height:1.65; color:rgba(255,255,255,0.88);
      font-size:12.5px; max-height:130px; overflow-y:auto; white-space:pre-wrap;
    }
    #${CARD_ID} .wm-footer {
      padding:8px 13px; border-top:1px solid rgba(255,255,255,0.05);
      display:flex; align-items:center; justify-content:space-between;
    }
    #${CARD_ID} .wm-counts {
      font-size:10.5px; color:rgba(255,255,255,0.3); letter-spacing:0.01em;
    }
    #${CARD_ID} .wm-btn {
      padding:6px 14px; background:linear-gradient(135deg,#6366f1,#7c3aed);
      border:none; border-radius:8px; color:#fff;
      font-size:12px; font-weight:600; cursor:pointer; font-family:inherit;
      transition:opacity 0.15s;
    }
    #${CARD_ID} .wm-btn:hover { opacity:0.85; }

    /* Analyze mode — issue list */
    #${CARD_ID} .wm-body-analyze { padding:4px 0; max-height:260px; }
    #${CARD_ID} .wm-issue {
      padding:10px 13px; border-bottom:1px solid rgba(255,255,255,0.05);
    }
    #${CARD_ID} .wm-issue:last-child { border-bottom:none; }
    #${CARD_ID} .wm-issue-top {
      display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;
    }
    #${CARD_ID} .wm-badge {
      font-size:9.5px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;
      padding:2px 7px; border-radius:4px;
    }
    #${CARD_ID} .wm-badge-grammar    { background:rgba(220,38,38,0.15);  color:#f87171; }
    #${CARD_ID} .wm-badge-vocabulary { background:rgba(99,102,241,0.15); color:#a5b4fc; }
    #${CARD_ID} .wm-badge-clarity    { background:rgba(234,179,8,0.15);  color:#fbbf24; }
    #${CARD_ID} .wm-issue-dismiss {
      background:none; border:none; color:rgba(255,255,255,0.25); cursor:pointer;
      font-size:11px; padding:0 2px; line-height:1;
    }
    #${CARD_ID} .wm-issue-dismiss:hover { color:rgba(255,255,255,0.6); }
    #${CARD_ID} .wm-issue-row {
      display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:6px;
    }
    #${CARD_ID} .wm-strikethrough {
      text-decoration:line-through; color:rgba(248,113,113,0.8); font-size:13px; font-weight:600;
    }
    #${CARD_ID} .wm-arrow { color:rgba(255,255,255,0.3); font-size:12px; }
    #${CARD_ID} .wm-alts { display:flex; gap:5px; flex-wrap:wrap; }
    #${CARD_ID} .wm-alt-btn {
      padding:3px 11px; border-radius:6px;
      background:linear-gradient(135deg,#6366f1,#7c3aed);
      border:none; color:#fff; font-size:12px; font-weight:600;
      cursor:pointer; font-family:inherit; transition:opacity 0.15s;
    }
    #${CARD_ID} .wm-alt-btn:hover { opacity:0.82; }
    #${CARD_ID} .wm-issue-explanation {
      margin:0; font-size:11.5px; color:rgba(255,255,255,0.5); line-height:1.55;
    }
    #${CARD_ID} .wm-issue-explanation strong { color:rgba(255,255,255,0.75); font-style:italic; }
  `;
  document.documentElement.appendChild(s);
}

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
function showToast(msg, type = "info", clickToCancel = false) {
  if (toastEl) toastEl.remove();
  toastEl = document.createElement("div");
  toastEl.textContent = msg;
  const bg = { loading:"#4f46e5", success:"#16a34a", error:"#dc2626", info:"#1f2937" };
  Object.assign(toastEl.style, {
    position:"fixed", bottom:"20px", right:"20px", zIndex:"2147483647",
    padding:"8px 15px", borderRadius:"9px", background:bg[type]||bg.info,
    color:"#fff", fontSize:"12.5px", fontFamily:"system-ui,sans-serif",
    boxShadow:"0 4px 20px rgba(0,0,0,0.35)", opacity:"1",
    transition:"opacity 0.3s", maxWidth:"280px", lineHeight:"1.4",
    cursor: clickToCancel ? "pointer" : "default",
  });
  if (clickToCancel) {
    toastEl.addEventListener("click", () => {
      _clearFetchGuards();
      isFetching = false;
      if (toastEl) { toastEl.remove(); toastEl = null; }
    });
  }
  document.body.appendChild(toastEl);
  if (type !== "loading") {
    setTimeout(() => {
      if (toastEl) { toastEl.style.opacity = "0"; setTimeout(() => toastEl?.remove(), 300); }
    }, 2800);
  }
}
