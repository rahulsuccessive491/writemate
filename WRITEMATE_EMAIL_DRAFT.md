# WriteMate — Team Email Draft

---

**Subject:** WriteMate — AI Writing Assistant Chrome Extension (Built & Live)

---

Hi Team,

I wanted to share something I've been building over the past few weeks — **WriteMate**, an AI-powered Chrome extension that rewrites text in any tone, directly inside your browser.

---

## The Problem

Every time we need to rewrite an email, clean up a Slack message, or turn rough notes into bullets — we switch tabs, open ChatGPT, paste, copy back. That's 30–60 seconds of context-switching per edit, dozens of times a day.

There's no native in-browser tool that rewrites text in-place with tone control.

---

## What We Built

WriteMate is a Chrome extension that sits silently in your browser. Here's how it works:

1. **Select any text** — on Gmail, Notion, Docs, Slack, GitHub, anywhere
2. **Right-click → WriteMate: Rephrase** → pick a tone
3. The AI rewrites it and **replaces your selection instantly** — no tab switch, no copy-paste

There's also an **inline suggestion mode**: as you type, WriteMate auto-suggests a polished version of what you're writing. Press **Tab** to accept, **Esc** to dismiss.

---

## Rephrasing Modes

| Mode | Use Case |
|------|---------|
| **Professional** | Executive emails, client communication |
| **Casual** | Slack messages, team chat |
| **Bullet Points** | Meeting notes, summaries |
| **Concise** | Cut the fluff, keep the meaning |
| **Fix Grammar** | Spelling/grammar only, preserves your voice |

---

## How It Works — Technical Overview

### Agentic Architecture

WriteMate uses a self-correcting two-agent loop:

- **Generator Agent** — Calls the LLM with a mode-specific prompt, few-shot examples, and business rules (e.g. "never alter SLA, ROI, KPI", "never say Going forward")
- **Critic Agent** — Reviews the output for tone, meaning, and rule compliance. Returns PASS or FAIL with specific fix instructions
- **Orchestrator** — If the Critic FAILs, the Generator retries with the critic's feedback injected. Up to 2 iterations

This means the output is not just a raw LLM response — it's a quality-controlled, rule-validated rewrite.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **LLM** | LLaMA 3.1 8B Instant via **Groq API** |
| **Backend** | Python + FastAPI |
| **Backend Hosting** | **Railway** (auto-deploy, always-on) |
| **Chrome Extension** | Manifest V3 (MV3) |
| **Landing Page** | Next.js 16 + Tailwind CSS |
| **Frontend Hosting** | **Vercel** (auto-deploy from GitHub) |
| **Email** | Resend |

### Why Groq?
Groq provides hardware-accelerated LLM inference — response times of ~200ms vs 1–3s on standard OpenAI APIs. This makes the in-browser experience feel near-instant.

### Why Agentic?
A plain LLM call occasionally violates tone rules, uses cliché phrases, or alters acronyms it shouldn't. The Critic agent catches these automatically and triggers a corrected retry — without the user ever seeing the bad output.

---

## Live Links

- **Landing Page:** https://write-mate-ai.vercel.app
- **Install Guide:** https://write-mate-ai.vercel.app/install
- **Backend API:** https://writemate-production.up.railway.app/api/health
- **GitHub:** https://github.com/rahulsuccessive491/writemate

---

## How to Test It (Team)

The extension is not on the Chrome Web Store yet — install takes ~2 minutes:

1. Download the repo ZIP from GitHub (or ask me to share the `chrome-extension/` folder)
2. Open `chrome://extensions` in Chrome
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked** → select the `chrome-extension/` folder
5. Pin WriteMate from the puzzle-piece icon in the toolbar

Full step-by-step guide: https://write-mate-ai.vercel.app/install

---

## Cost & Infrastructure

### Current State — Running at $0/month

Everything WriteMate runs on today is free:

| Service | Plan | Cost |
|---------|------|------|
| Groq API (LLaMA 3.1 8B) | Free tier | $0 |
| Railway (backend hosting) | Free tier | $0 |
| Vercel (frontend hosting) | Hobby tier | $0 |
| **Total** | | **$0/month** |

---

### LLM Provider Comparison

WriteMate makes **2 API calls per rephrase** (Generator + Critic). Here's what that costs across providers at scale:

| Provider | Model | Price / 1M input | Price / 1M output | Cost per 1K rephrases | Speed |
|----------|-------|-----------------|------------------|-----------------------|-------|
| **Groq** *(current)* | LLaMA 3.1 8B Instant | $0.05 | $0.08 | **~$0.09** | ~750 tok/s — fastest |
| **Mistral AI** | Mistral Nemo | $0.02 | $0.06 | **~$0.04** | Fast |
| **Together AI** | LLaMA 3.1 8B | $0.18 | $0.10 | **~$0.25** | Fast |
| **OpenAI** | GPT-4o mini | $0.15 | $0.60 | **~$0.33** | Standard |
| **OpenAI** | GPT-4o | $2.50 | $10.00 | **~$5.50** | Standard |
| **Anthropic** | Claude Haiku 4.5 | $1.00 | $5.00 | **~$2.40** | Fast |
| **Anthropic** | Claude Sonnet 4.6 | $3.00 | $15.00 | **~$7.20** | Standard |

> Cost estimate based on ~1,200 input tokens + ~200 output tokens per rephrase (system prompt + user text + Gen + Critic combined).

**Takeaway:** Groq is the right choice — fastest response (in-browser UX needs <300ms) and near-zero cost. Even at 100,000 rephrases/month, the bill is ~$9. Mistral Nemo is cheaper but slower and lower quality for structured rewrites.

---

### One-Time & Scaling Costs

| Item | Cost | Notes |
|------|------|-------|
| Chrome Web Store registration | **$5 one-time** | Covers unlimited extensions forever |
| Chrome Web Store (unlisted, team testing) | **$5 one-time** | Same fee, install with one click |
| Railway (when free tier runs out) | **$5/month** | Hobby plan, includes $5 usage credit |
| Vercel Pro (if needed) | **$20/month** | Only needed for team/commercial use |
| Groq paid (at 10K rephrases/month) | **~$0.90/month** | Essentially negligible |
| Groq paid (at 100K rephrases/month) | **~$9/month** | Still extremely cheap at scale |

### Total Estimated Monthly Cost (Scaled)

| Scale | LLM (Groq) | Railway | Vercel | Total |
|-------|-----------|---------|--------|-------|
| Today (team testing) | $0 | $0 | $0 | **$0** |
| 10K rephrases/month | ~$0.90 | $5 | $0 | **~$6** |
| 100K rephrases/month | ~$9 | $5 | $0 | **~$14** |
| 1M rephrases/month | ~$90 | $5–20 | $20 | **~$115–135** |

---

## What's Coming Next

- Keyboard shortcut (Cmd+Shift+R) to trigger rephrase on selection
- Rephrase history panel
- More modes: Academic, Marketing, Tweet-sized
- Multi-language support
- Chrome Web Store listing (unlisted for team testing → public, $5 one-time)

---

Happy to demo this live or answer any questions. The full technical documentation is in the GitHub repo.

Rahul

---

*Built with: Groq API · LLaMA 3.1 · FastAPI · Railway · Next.js · Vercel · Chrome MV3*
