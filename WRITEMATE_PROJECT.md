# WriteMate — Project Documentation

## Overview

WriteMate is an AI-powered Chrome extension that rephrases selected text instantly in any tone — professional, casual, bullet points, concise, or grammar-corrected — directly inside any webpage without switching tabs or copy-pasting.

---

## Live URLs

| Service | URL |
|---------|-----|
| Landing Page | https://write-mate-ai.vercel.app |
| Install Guide | https://write-mate-ai.vercel.app/install |
| Backend API | https://writemate-production.up.railway.app |
| API Health | https://writemate-production.up.railway.app/api/health |
| GitHub | https://github.com/rahulsuccessive491/writemate |

---

## Problem Statement

Writing professionals, developers, and knowledge workers constantly switch context to rewrite text — copying into ChatGPT, switching to Grammarly, or manually rewording emails, Slack messages, and documents. This costs 30–60 seconds per edit and breaks focus.

There is no native in-browser tool that rewrites text in-place with tone control.

---

## Solution

WriteMate sits invisibly in Chrome. Select any text → right-click → pick a tone. The AI rewrites it and replaces your selection instantly — no tab switch, no copy-paste. Optionally, an inline suggestion appears as you type, accepted with a single Tab key press.

---

## Features Implemented

### Chrome Extension (MV3)
| Feature | Description |
|---------|-------------|
| Right-click rephrase | Select text anywhere → right-click → 5 tone options → in-place replacement |
| Inline suggestions | Auto-suggests a rephrased version as you type (debounced 1.2s) |
| Tab to accept | Press Tab to accept inline suggestion, Esc to dismiss |
| Popup UI | Toolbar popup with manual input, mode selector, copy button |
| Inline toggle | Enable/disable inline suggestions per session, stored in chrome.storage |
| Mode memory | Remembers your last selected mode across browser sessions |
| Health indicator | Live API status dot in popup (green = ready, red = offline) |
| Works everywhere | Gmail, Notion, Google Docs, Slack, GitHub, any editable field |

### Rephrasing Modes
| Mode | Purpose |
|------|---------|
| Professional | Executive/client-ready formal writing |
| Casual | Friendly, conversational (Slack, team chat) |
| Bullet Points | Extracts ideas into 2–6 scannable bullets |
| Concise | Strips to minimum words without losing meaning |
| Fix Grammar | Grammar/spelling only — preserves original voice |

### Backend (Python / FastAPI)
| Component | Description |
|-----------|-------------|
| Generator | Builds mode-specific system prompt with few-shot examples and calls Groq API |
| Critic agent | Reviews output for tone, rule violations, meaning preservation |
| Gen→Critic loop | Up to 2 iterations — if Critic FAILs, Generator retries with feedback |
| Rules engine | Enforces preserve_terms (SLA, KPI, ROI…), blocks filler phrases, per-mode constraints |
| Validation | Pydantic models — text max 3000 chars, mode must be valid |

### Frontend (Next.js / Vercel)
| Page | Content |
|------|---------|
| `/` | Landing page — Hero, Features, How It Works, Demo mockup, CTA, Feedback widget |
| `/install` | Step-by-step guide to install the extension in developer mode |
| `/api/feedback` | Feedback form submissions → email via Resend |

---

## Architecture

```
User (Chrome)
    │
    ├─ Right-click / Inline suggest
    │
    ▼
Chrome Extension (MV3)
    ├── manifest.json    — permissions, host_permissions
    ├── background.js    — service worker, context menu, API calls
    ├── content.js       — inline suggestion engine, in-place replacement
    └── popup/           — toolbar UI (html + css + js)
    │
    ▼ POST /api/rephrase
Railway (Backend — Python FastAPI)
    ├── main.py          — FastAPI app, CORS, routes
    ├── agent.py         — Generator → Critic orchestration loop
    ├── rephraser.py     — Groq API call, prompt building, few-shot examples
    ├── critic.py        — Quality-control agent, rule checker
    ├── models.py        — Pydantic request/response schemas
    ├── config.py        — Env vars, rules.json loader
    └── rules.json       — Business rules (preserve terms, avoid phrases, constraints)
    │
    ▼ OpenAI-compatible API
Groq Cloud
    └── LLaMA 3.1 8B Instant (free tier, ~200ms response)

Vercel (Frontend — Next.js 16)
    ├── app/page.tsx     — Landing page
    ├── app/install/     — Installation guide
    └── app/api/feedback — Feedback form → Resend email
```

---

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| LLM | LLaMA 3.1 8B Instant via Groq | Free, extremely fast (~200ms), OpenAI-compatible API |
| Backend framework | FastAPI (Python) | Async, auto-docs, Pydantic validation |
| Backend hosting | Railway | Zero-config Python deploy, always-on free tier |
| Extension standard | Chrome MV3 | Required for all new Chrome extensions |
| Frontend framework | Next.js 16 | App router, static generation, API routes |
| Frontend hosting | Vercel | Auto-deploy from GitHub, global CDN |
| UI styling | Tailwind CSS v4 | Utility-first, no build step |
| Animations | Framer Motion | Scroll-triggered entry animations |
| Icons | Lucide React | Consistent icon set |
| Email | Resend | Feedback form submissions |
| Agentic pattern | Custom Gen→Critic loop | Self-correcting output quality |

---

## Agentic Design

WriteMate uses a two-agent architecture for quality control:

1. **Generator Agent** — Takes user text + mode, builds a structured system prompt with:
   - Mode-specific persona and rules
   - Preserve terms (SLA, KPI, ROI, API, etc. must not be altered)
   - Avoid phrases (clichés like "In conclusion", "Going forward")
   - Per-mode constraints (character limits, bullet count)
   - Two few-shot examples for in-context learning
   - Previous critic feedback (on retry)

2. **Critic Agent** — Reviews the generated output against:
   - Meaning preservation (does it say the same thing?)
   - Tone match (does it fit the requested mode?)
   - Rule violations (preserve terms, avoid phrases, length limits)
   - Returns: `PASS` or `FAIL` with reason and fix instruction

3. **Orchestrator** (`agent.py`) — Runs up to 2 iterations. If Critic FAILs, Generator retries with the fix instruction injected into the prompt.

---

## What Can Be Added (Upcoming Updates)

### High Priority
- [ ] Chrome Web Store listing (unlisted for team, public later)
- [ ] Keyboard shortcut (e.g. Cmd+Shift+R) to trigger rephrase on selection
- [ ] Rate limiting on backend (prevent abuse)
- [ ] Environment variable for Groq API key in extension (user-provided key)

### Medium Priority
- [ ] Rephrase history panel in popup (last 10 rewrites)
- [ ] More modes: Academic, Marketing copy, Tweet/short-form
- [ ] Multi-language support (detect input language, rephrase in same language)
- [ ] "Rephrase all variations" — show all 5 tones at once and pick
- [ ] Context-aware mode detection (auto-select mode based on active site)

### Nice to Have
- [ ] User accounts + usage dashboard
- [ ] Custom rules per user (personal preserve terms, style preferences)
- [ ] Google Docs / Notion API direct integration
- [ ] Analytics (which modes are used most, average text length)
- [ ] Dark/light theme toggle in popup

---

## Project Structure

```
AI Repharaser/
├── backend/
│   ├── main.py
│   ├── agent.py
│   ├── rephraser.py
│   ├── critic.py
│   ├── models.py
│   ├── config.py
│   ├── rules.json
│   └── requirements.txt
├── chrome-extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── icons/
│   └── popup/
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
├── frontend/
│   ├── app/
│   │   ├── page.tsx          ← Landing page
│   │   ├── install/page.tsx  ← Install guide
│   │   └── api/feedback/     ← Feedback API
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Demo.tsx
│   │   ├── CTA.tsx
│   │   ├── Footer.tsx
│   │   └── FeedbackWidget.tsx
│   └── vercel.json
└── WRITEMATE_PROJECT.md      ← This file
```

---

## Git Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — auto-deploys to Vercel |
| `dev` | Integration branch — PRs merge here first |
| `feat/*` | Feature branches — PR to dev, then dev to main |

---

*Last updated: May 2026*
