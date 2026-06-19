from __future__ import annotations

import json

from openai import OpenAI
from config import GROQ_API_KEY, MODEL

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY,
)

_SYSTEM = """You are a professional writing assistant that identifies specific, high-value issues in text.

Analyze the given text and return up to 3 of the most impactful issues across these categories:
- "grammar": subject-verb agreement, tense errors, punctuation, run-ons
- "vocabulary": overused/weak/vague words that a stronger synonym would improve
- "clarity": awkward phrasing or redundancy that a simpler rewrite would fix

Return a JSON array. Each element must have exactly these fields:
- "type": "grammar" | "vocabulary" | "clarity"
- "original": the exact word or short phrase from the text (copy it verbatim)
- "alternatives": array of 1–3 concise replacement strings
- "explanation": 1–2 sentence explanation; bold the problematic text with **...**

Rules:
- "original" must be a verbatim substring of the input text
- Do NOT suggest changes where the text is already correct
- Return [] if the text has no issues
- Return ONLY the JSON array — no markdown fences, no extra text

Example output:
[
  {"type":"grammar","original":"has","alternatives":["have"],"explanation":"The singular verb **has** does not agree with the plural subject **many opinions**."},
  {"type":"vocabulary","original":"awesome","alternatives":["remarkable","impressive","outstanding"],"explanation":"**Awesome** is overused; a more specific word adds impact."}
]"""


def analyze(text: str) -> list[dict]:
    try:
        response = client.chat.completions.create(
            model=MODEL,
            max_tokens=512,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user",   "content": text},
            ],
        )
        raw = response.choices[0].message.content.strip()
        # Strip accidental ```json ... ``` fences
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(raw)
    except Exception as exc:
        print(f"[analyzer] error: {exc}")
        return []
