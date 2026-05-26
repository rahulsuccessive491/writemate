const API_BASE = "http://localhost:8000";

const inputEl        = document.getElementById("inputText");
const charCount      = document.getElementById("charCount");
const rephraseBtn    = document.getElementById("rephraseBtn");
const btnText        = document.getElementById("btnText");
const resultBox      = document.getElementById("resultBox");
const resultText     = document.getElementById("resultText");
const resultMeta     = document.getElementById("resultMeta");
const copyBtn        = document.getElementById("copyBtn");
const copyLabel      = document.getElementById("copyLabel");
const errorBox       = document.getElementById("errorBox");
const errorMsg       = document.getElementById("errorMsg");
const statusDot      = document.getElementById("statusDot");
const statusLabel    = document.getElementById("statusLabel");
const inlineToggle   = document.getElementById("inlineToggle");
const inlineModeRow  = document.getElementById("inlineModeRow");

let selectedMode  = "professional";
let inlineMode    = "professional";

/* ── Load saved prefs ── */
chrome.storage.local.get(["inlineSuggest", "inlineMode"], (data) => {
  const on = data.inlineSuggest !== false; // default ON
  inlineToggle.checked = on;
  inlineModeRow.classList.toggle("hidden", !on);

  if (data.inlineMode) {
    inlineMode = data.inlineMode;
    document.querySelectorAll(".imode-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.imode === inlineMode);
    });
  }
});

/* ── Inline toggle ── */
inlineToggle.addEventListener("change", () => {
  const on = inlineToggle.checked;
  inlineModeRow.classList.toggle("hidden", !on);
  chrome.storage.local.set({ inlineSuggest: on });
});

/* ── Inline mode buttons ── */
document.querySelectorAll(".imode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".imode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    inlineMode = btn.dataset.imode;
    chrome.storage.local.set({ inlineMode });
  });
});

/* ── Health check ── */
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      statusDot.className = "status-dot online";
      statusLabel.textContent = "Ready";
    } else throw new Error();
  } catch {
    statusDot.className = "status-dot offline";
    statusLabel.textContent = "Offline";
  }
}

/* ── Char counter ── */
inputEl.addEventListener("input", () => { charCount.textContent = inputEl.value.length; });

/* ── Mode selection (tone buttons + grammar button) ── */
function clearAllModeActive() {
  document.querySelectorAll(".mode-btn, .grammar-btn").forEach((b) => b.classList.remove("active"));
}

document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    clearAllModeActive();
    btn.classList.add("active");
    selectedMode = btn.dataset.mode;
  });
});

document.querySelectorAll(".grammar-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    clearAllModeActive();
    btn.classList.add("active");
    selectedMode = btn.dataset.mode;
  });
});

/* ── Ctrl/Cmd + Enter shortcut ── */
inputEl.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") rephraseBtn.click();
});

/* ── Rephrase ── */
rephraseBtn.addEventListener("click", async () => {
  const text = inputEl.value.trim();
  if (!text) return;
  setLoading(true);
  hideAll();
  try {
    const res = await fetch(`${API_BASE}/api/rephrase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode: selectedMode }),
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.detail || "Server error"); return; }
    const modeLabel = selectedMode.replace("_", " ");
    const passes    = data.iterations > 1 ? ` · ${data.iterations} passes` : "";
    resultMeta.textContent = `${modeLabel}${passes}`;
    resultText.textContent = data.result;
    resultBox.classList.remove("hidden");
  } catch (err) {
    showError(
      err.name === "TimeoutError"
        ? "Request timed out. Is the backend running?"
        : "Cannot reach backend. Start uvicorn on port 8000."
    );
  } finally {
    setLoading(false);
  }
});

/* ── Copy ── */
copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(resultText.textContent).then(() => {
    copyLabel.textContent = "Copied!";
    setTimeout(() => (copyLabel.textContent = "Copy"), 1800);
  });
});

function setLoading(on) { rephraseBtn.disabled = on; btnText.textContent = on ? "Rephrasing…" : "Rephrase"; }
function hideAll() { resultBox.classList.add("hidden"); errorBox.classList.add("hidden"); }
function showError(msg) { errorMsg.textContent = msg; errorBox.classList.remove("hidden"); }

checkHealth();
