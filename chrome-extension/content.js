/* ─── WriteMate content script ─────────────────────────────────────────── */
const API_BASE      = "http://localhost:8000";
const DEBOUNCE_MS   = 1200;   // pause before suggesting
const MIN_CHARS     = 20;     // minimum chars before triggering
const GHOST_ID      = "wm-suggestion-card";

let activeRange     = null;   // saved selection for right-click rephrase
let debounceTimer   = null;
let suggestionCard  = null;
let currentTarget   = null;
let inlineSuggest   = true;   // default — overridden from storage
let inlineMode      = "professional";
let toastEl         = null;
let isFetching      = false;

/* ── Load saved settings ── */
chrome.storage.local.get(["inlineSuggest", "inlineMode"], (data) => {
  if (data.inlineSuggest !== undefined) inlineSuggest = data.inlineSuggest;
  if (data.inlineMode)                  inlineMode    = data.inlineMode;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.inlineSuggest) inlineSuggest = changes.inlineSuggest.newValue;
  if (changes.inlineMode)    inlineMode    = changes.inlineMode.newValue;
});

/* ═══════════════════════════════════════════════════════════════════════════
   RIGHT-CLICK REPHRASE (existing)
═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener("mouseup", () => {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && sel.toString().trim()) {
    activeRange = sel.getRangeAt(0).cloneRange();
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "REPHRASE_START") showToast("Rephrasing…", "loading");
  if (msg.type === "REPHRASE_DONE")  { replaceSelectedText(msg.result); const it = msg.iterations > 1 ? ` (${msg.iterations} passes)` : ""; showToast(`✓ ${msg.mode}${it}`, "success"); }
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
  if (el && el.isContentEditable && activeRange) {
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

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE SUGGESTION ENGINE
═══════════════════════════════════════════════════════════════════════════ */

/* Attach listeners when any editable gets focus */
document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (!isEditable(el)) return;
  currentTarget = el;

  el.addEventListener("input",   onInput,   { passive: true });
  el.addEventListener("keydown", onKeydown);
  el.addEventListener("blur",    dismissCard);
});

document.addEventListener("focusout", (e) => {
  if (!isEditable(e.target)) return;
  e.target.removeEventListener("input",   onInput);
  e.target.removeEventListener("keydown", onKeydown);
});

function isEditable(el) {
  return el && (
    el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && ["text", "search", "email", "url"].includes(el.type)) ||
    el.isContentEditable
  );
}

function onInput() {
  clearTimeout(debounceTimer);
  dismissCard();
  if (!inlineSuggest || isFetching) return;

  const text = getCurrentText();
  if (!text || text.length < MIN_CHARS) return;

  debounceTimer = setTimeout(() => fetchSuggestion(text), DEBOUNCE_MS);
}

function onKeydown(e) {
  if (!suggestionCard) return;

  if (e.key === "Tab") {
    e.preventDefault();
    acceptSuggestion();
  } else if (e.key === "Escape") {
    e.preventDefault();
    dismissCard();
  } else {
    // Any other key dismisses the suggestion
    dismissCard();
  }
}

/* Get the current paragraph / sentence the user is working on */
function getCurrentText() {
  const el = currentTarget;
  if (!el) return "";

  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    const val    = el.value;
    const cursor = el.selectionStart;
    // Take text from last double-newline or beginning up to cursor
    const segment = val.slice(0, cursor);
    const parts   = segment.split(/\n\n+/);
    return parts[parts.length - 1].trim();
  }

  if (el.isContentEditable) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return el.innerText.trim();
    const range = sel.getRangeAt(0);
    // Grab text from the current block element
    const block = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : range.startContainer;
    return (block.innerText || block.textContent || "").trim();
  }

  return "";
}

/* Fetch suggestion from backend */
async function fetchSuggestion(text) {
  isFetching = true;
  try {
    const res = await fetch(`${API_BASE}/api/rephrase`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text, mode: inlineMode }),
      signal:  AbortSignal.timeout(30000),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.result && data.result.trim() !== text.trim()) {
      showSuggestionCard(data.result.trim());
    }
  } catch {
    // Silently fail — inline suggestions are non-blocking
  } finally {
    isFetching = false;
  }
}

/* ── Suggestion card UI ── */
function showSuggestionCard(suggestion) {
  dismissCard();

  const rect = getTargetRect();
  if (!rect) return;

  const card = document.createElement("div");
  card.id = GHOST_ID;
  card.innerHTML = `
    <div class="wm-card-header">
      <span class="wm-logo">W</span>
      <span class="wm-label">WriteMate suggestion</span>
      <span class="wm-keys"><kbd>Tab</kbd> accept &nbsp; <kbd>Esc</kbd> dismiss</span>
    </div>
    <div class="wm-card-body">${escapeHtml(suggestion)}</div>
    <div class="wm-card-footer">
      <button class="wm-accept-btn">Accept suggestion</button>
    </div>
  `;

  Object.assign(card.style, {
    position:    "fixed",
    left:        `${Math.min(rect.left, window.innerWidth - 380)}px`,
    top:         `${rect.bottom + 8}px`,
    zIndex:      "2147483647",
    width:       "360px",
    maxWidth:    "calc(100vw - 24px)",
    background:  "#13131f",
    border:      "1px solid rgba(99,102,241,0.35)",
    borderRadius:"12px",
    boxShadow:   "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)",
    fontFamily:  "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize:    "13px",
    color:       "#e8e8f0",
    overflow:    "hidden",
    animation:   "wmSlideIn 0.18s ease",
  });

  // Inject styles once
  if (!document.getElementById("wm-styles")) {
    const style = document.createElement("style");
    style.id = "wm-styles";
    style.textContent = `
      @keyframes wmSlideIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
      #${GHOST_ID} .wm-card-header { display:flex; align-items:center; gap:7px; padding:9px 12px 8px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(99,102,241,0.08); }
      #${GHOST_ID} .wm-logo { width:18px; height:18px; background:linear-gradient(135deg,#6366f1,#8b5cf6); border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:#fff; flex-shrink:0; }
      #${GHOST_ID} .wm-label { font-size:11px; font-weight:600; color:rgba(165,163,240,0.9); flex:1; }
      #${GHOST_ID} .wm-keys { font-size:10px; color:rgba(255,255,255,0.3); white-space:nowrap; }
      #${GHOST_ID} kbd { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:4px; padding:1px 5px; font-family:inherit; font-size:10px; }
      #${GHOST_ID} .wm-card-body { padding:10px 12px; line-height:1.6; color:rgba(255,255,255,0.85); max-height:120px; overflow-y:auto; font-size:12.5px; }
      #${GHOST_ID} .wm-card-footer { padding:8px 12px; border-top:1px solid rgba(255,255,255,0.06); display:flex; justify-content:flex-end; }
      #${GHOST_ID} .wm-accept-btn { padding:5px 14px; background:linear-gradient(135deg,#6366f1,#7c3aed); border:none; border-radius:7px; color:#fff; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; }
      #${GHOST_ID} .wm-accept-btn:hover { background:linear-gradient(135deg,#4f46e5,#6d28d9); }
    `;
    document.documentElement.appendChild(style);
  }

  card._suggestion = suggestion;
  card.querySelector(".wm-accept-btn").addEventListener("click", acceptSuggestion);

  document.documentElement.appendChild(card);
  suggestionCard = card;

  // Auto-dismiss after 12 seconds
  setTimeout(dismissCard, 12000);
}

function getTargetRect() {
  const el = currentTarget;
  if (!el) return null;

  if (el.isContentEditable) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (r.width > 0 || r.height > 0) return r;
    }
  }
  return el.getBoundingClientRect();
}

function acceptSuggestion() {
  if (!suggestionCard || !currentTarget) return;
  const text = suggestionCard._suggestion;
  dismissCard();

  const el = currentTarget;
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    const cursor = el.selectionStart;
    const val    = el.value;
    const before = val.slice(0, cursor);
    const after  = val.slice(cursor);
    // Find start of current paragraph
    const lastBreak = before.lastIndexOf("\n\n");
    const paraStart  = lastBreak === -1 ? 0 : lastBreak + 2;
    el.value = val.slice(0, paraStart) + text + after;
    el.selectionStart = el.selectionEnd = paraStart + text.length;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (el.isContentEditable) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const block = range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer;
      block.innerText = text;
      // Move cursor to end
      const newRange = document.createRange();
      newRange.selectNodeContents(block);
      newRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }

  showToast("✓ Suggestion accepted", "success");
}

function dismissCard() {
  if (suggestionCard) {
    suggestionCard.remove();
    suggestionCard = null;
  }
}

/* ── Toast ── */
function showToast(message, type = "info") {
  if (toastEl) toastEl.remove();
  toastEl = document.createElement("div");
  toastEl.textContent = message;
  const colors = { loading:"#4f46e5", success:"#16a34a", error:"#dc2626", info:"#374151" };
  Object.assign(toastEl.style, {
    position:"fixed", bottom:"24px", right:"24px", zIndex:"2147483647",
    padding:"9px 16px", borderRadius:"9px", background: colors[type] || colors.info,
    color:"#fff", fontSize:"12.5px", fontFamily:"system-ui,sans-serif",
    boxShadow:"0 4px 16px rgba(0,0,0,0.3)", opacity:"1",
    transition:"opacity 0.3s ease", maxWidth:"300px",
  });
  document.body.appendChild(toastEl);
  if (type !== "loading") {
    setTimeout(() => { if (toastEl) { toastEl.style.opacity="0"; setTimeout(() => toastEl?.remove(), 300); } }, 3000);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
