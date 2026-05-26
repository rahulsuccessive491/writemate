const API_BASE = "http://localhost:8000";

const inputEl = document.getElementById("inputText");
const rephraseBtn = document.getElementById("rephraseBtn");
const resultBox = document.getElementById("resultBox");
const resultText = document.getElementById("resultText");
const resultMeta = document.getElementById("resultMeta");
const copyBtn = document.getElementById("copyBtn");
const errorBox = document.getElementById("errorBox");
const statusDot = document.getElementById("statusDot");

let selectedMode = "professional";

// Check backend health on open
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.ok) {
      statusDot.classList.add("online");
      statusDot.title = "Backend online";
    } else {
      throw new Error();
    }
  } catch {
    statusDot.classList.add("offline");
    statusDot.title = "Backend offline — run uvicorn";
  }
}

// Mode button selection
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedMode = btn.dataset.mode;
  });
});

// Rephrase button click
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
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.detail || "Unknown server error");
      return;
    }

    const modeLabel = selectedMode.replace("_", " ");
    const iterLabel = data.iterations > 1 ? ` · ${data.iterations} passes` : "";
    const statusLabel = data.status === "max_iterations_reached" ? " · best attempt" : "";

    resultMeta.textContent = `${modeLabel}${iterLabel}${statusLabel}`;
    resultText.textContent = data.result;
    resultBox.classList.remove("hidden");
  } catch (err) {
    showError("Could not reach backend. Is uvicorn running on port 8000?");
  } finally {
    setLoading(false);
  }
});

// Copy button
copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(resultText.textContent).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
  });
});

function setLoading(state) {
  rephraseBtn.disabled = state;
  rephraseBtn.textContent = state ? "Rephrasing..." : "Rephrase";
}

function hideAll() {
  resultBox.classList.add("hidden");
  errorBox.classList.add("hidden");
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

checkHealth();
