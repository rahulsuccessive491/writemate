let activeRange = null;
let toastEl = null;

// Track the user's selection before the context menu replaces it
document.addEventListener("mouseup", () => {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && sel.toString().trim()) {
    activeRange = sel.getRangeAt(0).cloneRange();
  }
});

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "REPHRASE_START") {
    showToast("Rephrasing...", "loading");
  }

  if (msg.type === "REPHRASE_DONE") {
    replaceSelectedText(msg.result);
    const iterLabel = msg.iterations > 1 ? ` (${msg.iterations} passes)` : "";
    showToast(`Rephrased: ${msg.mode}${iterLabel}`, "success");
  }

  if (msg.type === "REPHRASE_ERROR") {
    showToast(`Error: ${msg.error}`, "error");
  }
});

function replaceSelectedText(newText) {
  // Try active editable element first (input, textarea, contenteditable)
  const el = document.activeElement;

  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const original = el.value;
    el.value = original.slice(0, start) + newText + original.slice(end);
    el.selectionStart = start;
    el.selectionEnd = start + newText.length;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (el && el.isContentEditable) {
    const sel = window.getSelection();
    if (activeRange) {
      sel.removeAllRanges();
      sel.addRange(activeRange);
    }
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(newText));
      sel.removeAllRanges();
    }
    return;
  }

  // Fallback: copy to clipboard and show notification
  navigator.clipboard.writeText(newText).then(() => {
    showToast("Copied to clipboard (could not inject into this field)", "info");
  });
}

function showToast(message, type = "info") {
  if (toastEl) toastEl.remove();

  toastEl = document.createElement("div");
  toastEl.textContent = message;

  const colors = {
    loading: "#1a73e8",
    success: "#1e7e34",
    error: "#c62828",
    info: "#555",
  };

  Object.assign(toastEl.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    padding: "10px 18px",
    borderRadius: "8px",
    background: colors[type] || colors.info,
    color: "#fff",
    fontSize: "13px",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    transition: "opacity 0.3s ease",
    opacity: "1",
    maxWidth: "320px",
    wordBreak: "break-word",
  });

  document.body.appendChild(toastEl);

  if (type !== "loading") {
    setTimeout(() => {
      toastEl.style.opacity = "0";
      setTimeout(() => toastEl?.remove(), 300);
    }, 3500);
  }
}
