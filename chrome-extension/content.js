/* ─── WriteMate content script ─────────────────────────────────────────── */
// TODO: Replace with your Railway URL after deploy (e.g. https://writemate-api.up.railway.app)
const API_BASE    = "https://YOUR_RAILWAY_URL.up.railway.app";
const DEBOUNCE_MS = 1200;
const MIN_CHARS   = 20;
const CARD_ID     = "wm-suggestion-card";

let activeRange        = null;
let debounceTimer      = null;
let suggestionCard     = null;
let savedTarget        = null;   // element when card was shown — survives blur
let isFetching         = false;
let inlineSuggest      = true;
let inlineMode         = "professional";
let toastEl            = null;

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
  const el = e.target;
  if (!isEditable(el)) return;

  clearTimeout(debounceTimer);
  dismissCard();

  if (!inlineSuggest || isFetching) return;

  const text = extractText(el);
  if (!text || text.length < MIN_CHARS) return;

  // Save the element NOW (before any blur can clear it)
  savedTarget = el;

  debounceTimer = setTimeout(() => {
    // Re-check that element is still active / on page
    if (document.body.contains(el)) fetchSuggestion(text, el);
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
  // Walk up to find contenteditable ancestor (handles Gmail's nested divs)
  let node = el;
  while (node && node !== document.body) {
    if (node.isContentEditable) return true;
    node = node.parentElement;
  }
  return false;
}

function getEditableRoot(el) {
  // Walk up to find the actual contenteditable root element
  let node = el;
  while (node && node !== document.body) {
    if (node.isContentEditable) return node;
    node = node.parentElement;
  }
  return el;
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
async function fetchSuggestion(text, el) {
  isFetching = true;
  showToast("WriteMate thinking…", "loading");
  try {
    const res = await fetch(`${API_BASE}/api/rephrase`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text, mode: inlineMode }),
      signal:  AbortSignal.timeout(30000),
    });
    if (toastEl) toastEl.remove();
    if (!res.ok) return;
    const data = await res.json();
    if (data.result && data.result.trim() !== text.trim()) {
      showCard(data.result.trim(), el);
    }
  } catch {
    if (toastEl) toastEl.remove();
  } finally {
    isFetching = false;
  }
}

/* ═══════════════════════════════════════════════════════════
   SUGGESTION CARD
═══════════════════════════════════════════════════════════ */
function showCard(suggestion, el) {
  dismissCard();
  savedTarget = el;  // lock in target for accept

  injectStyles();

  const card = document.createElement("div");
  card.id = CARD_ID;
  card.innerHTML = `
    <div class="wm-header">
      <div class="wm-logo">W</div>
      <span class="wm-title">WriteMate</span>
      <span class="wm-badge">${inlineMode}</span>
      <span class="wm-keys"><kbd>Tab</kbd> accept &nbsp;<kbd>Esc</kbd> dismiss</span>
    </div>
    <div class="wm-body"></div>
    <div class="wm-footer">
      <button class="wm-btn">Accept suggestion</button>
    </div>`;

  card.querySelector(".wm-body").textContent = suggestion;
  card._suggestion = suggestion;

  // Fix #2: preventDefault on mousedown keeps focus in the text field
  // so blur doesn't fire and dismiss the card before the click lands
  card.addEventListener("mousedown", (e) => e.preventDefault());
  card.querySelector(".wm-btn").addEventListener("click", acceptSuggestion);

  // Position near cursor
  const pos = getCaretPosition(el);
  Object.assign(card.style, {
    position: "fixed",
    top:      `${Math.min(pos.bottom + 8, window.innerHeight - 220)}px`,
    left:     `${Math.max(8, Math.min(pos.left, window.innerWidth - 388))}px`,
  });

  document.documentElement.appendChild(card);
  suggestionCard = card;

  setTimeout(dismissCard, 15000);
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

function acceptSuggestion() {
  if (!suggestionCard) return;
  const text = suggestionCard._suggestion;
  const el   = savedTarget;
  dismissCard();
  if (!el || !text) return;

  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    const cursor = el.selectionStart;
    const val    = el.value;
    const before = val.slice(0, cursor);
    const paraStart = Math.max(0, before.lastIndexOf("\n\n") + 2);
    el.value = val.slice(0, paraStart) + text + val.slice(cursor);
    el.selectionStart = el.selectionEnd = paraStart + text.length;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
    return;
  }

  // contenteditable
  el.focus();
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const root  = getEditableRoot(range.startContainer.parentElement || el);

    // Build preRange to find paragraph start
    try {
      const preRange = document.createRange();
      preRange.setStart(root, 0);
      preRange.setEnd(range.startContainer, range.startOffset);
      const textBefore  = preRange.toString();
      const lastBreak   = textBefore.lastIndexOf("\n\n");
      const paraOffset  = lastBreak === -1 ? 0 : lastBreak + 2;

      // Replace from paragraph start to cursor
      const deleteRange = document.createRange();
      deleteRange.setStart(root, 0);
      deleteRange.setEnd(range.startContainer, range.startOffset);

      // Offset deleteRange to start after last paragraph break
      // Simpler: select all and replace is safest for Gmail's structure
      const block = range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer;
      const fullText = block.innerText || block.textContent || "";
      const blockBefore = fullText.slice(0, range.startOffset);
      const pStart = Math.max(0, blockBefore.lastIndexOf("\n\n") + 2);
      block.textContent = fullText.slice(0, pStart) + text + fullText.slice(range.startOffset);

      // Move cursor to end of inserted text
      const newRange = document.createRange();
      const textNode = block.firstChild || block;
      const newPos   = Math.min(pStart + text.length, (textNode.textContent || "").length);
      if (textNode.nodeType === Node.TEXT_NODE) {
        newRange.setStart(textNode, newPos);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    } catch {
      // Last resort fallback
      document.execCommand("insertText", false, text);
    }
  }

  showToast("✓ Suggestion accepted", "success");
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
    #${CARD_ID} .wm-badge {
      font-size:10px; font-weight:600; color:#a5b4fc;
      background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.25);
      border-radius:4px; padding:1px 6px; text-transform:capitalize;
    }
    #${CARD_ID} .wm-keys { font-size:10px; color:rgba(255,255,255,0.25); white-space:nowrap; }
    #${CARD_ID} kbd {
      background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12);
      border-radius:4px; padding:1px 5px; font-family:inherit; font-size:10px; color:rgba(255,255,255,0.5);
    }
    #${CARD_ID} .wm-body {
      padding:11px 13px; line-height:1.65; color:rgba(255,255,255,0.88);
      font-size:12.5px; max-height:130px; overflow-y:auto; white-space:pre-wrap;
    }
    #${CARD_ID} .wm-footer {
      padding:8px 13px; border-top:1px solid rgba(255,255,255,0.05);
      display:flex; justify-content:flex-end;
    }
    #${CARD_ID} .wm-btn {
      padding:6px 14px; background:linear-gradient(135deg,#6366f1,#7c3aed);
      border:none; border-radius:8px; color:#fff;
      font-size:12px; font-weight:600; cursor:pointer; font-family:inherit;
      transition:opacity 0.15s;
    }
    #${CARD_ID} .wm-btn:hover { opacity:0.85; }
  `;
  document.documentElement.appendChild(s);
}

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
function showToast(msg, type = "info") {
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
  });
  document.body.appendChild(toastEl);
  if (type !== "loading") {
    setTimeout(() => {
      if (toastEl) { toastEl.style.opacity = "0"; setTimeout(() => toastEl?.remove(), 300); }
    }, 2800);
  }
}
