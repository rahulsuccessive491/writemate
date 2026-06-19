const API_BASE = "https://writemate-production-eed1.up.railway.app";
const MODES = ["professional", "casual", "bullet_points", "concise", "grammar"];
const MODE_LABELS = {
  professional: "Professional",
  casual: "Casual",
  bullet_points: "Bullet Points",
  concise: "Concise",
  grammar: "Fix Grammar & Spelling",
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "rephrase-root",
    title: "WriteMate: Rephrase",
    contexts: ["selection"],
  });

  MODES.forEach((mode) => {
    chrome.contextMenus.create({
      id: `rephrase-${mode}`,
      parentId: "rephrase-root",
      title: MODE_LABELS[mode],
      contexts: ["selection"],
    });
  });
});

async function safeSendMessage(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Content script not injected yet — inject then retry once
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      await chrome.tabs.sendMessage(tabId, message);
    } catch {
      // Page doesn't support content scripts (e.g. chrome:// pages) — silently ignore
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Keepalive ping sent every 20s by content.js while a fetch is in-flight
  // to prevent Chrome from terminating the service worker mid-request (MV3).
  if (msg.type === "KEEPALIVE") { sendResponse({ ok: true }); return false; }

  if (msg.type === "INLINE_REPHRASE") {
    fetch(`${API_BASE}/api/rephrase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: msg.text, mode: msg.mode }),
      signal: AbortSignal.timeout(30000),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then((data) => sendResponse({ result: data.result }))
      .catch((err) => sendResponse({ error: err.message || "network error" }));
    return true;
  }

  if (msg.type === "ANALYZE_TEXT") {
    fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: msg.text }),
      signal: AbortSignal.timeout(30000),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then((data) => sendResponse({ suggestions: data.suggestions || [] }))
      .catch((err) => sendResponse({ error: err.message || "network error" }));
    return true;
  }

  return false;
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const modeMatch = info.menuItemId.match(/^rephrase-(.+)$/);
  if (!modeMatch) return;

  const mode = modeMatch[1];
  const selectedText = info.selectionText;
  if (!selectedText || !selectedText.trim()) return;

  safeSendMessage(tab.id, { type: "REPHRASE_START" });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(`${API_BASE}/api/rephrase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: selectedText, mode }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    safeSendMessage(tab.id, {
      type: "REPHRASE_DONE",
      result: data.result,
      mode: data.mode,
      iterations: data.iterations,
      status: data.status,
    });
  } catch (err) {
    safeSendMessage(tab.id, {
      type: "REPHRASE_ERROR",
      error: err.message,
    });
  }
});
