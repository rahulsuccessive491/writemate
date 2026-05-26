from openai import OpenAI
from config import (
    GROQ_API_KEY, MODEL, PRESERVE_TERMS,
    AVOID_PHRASES, MODE_CONSTRAINTS, FEW_SHOT_EXAMPLES
)

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY,
)

_MODE_INSTRUCTIONS = {
    "professional": (
        "You are an elite corporate communications expert. "
        "Rewrite the text to be polished, formal, and direct — suitable for executive briefings or client emails. "
        "Fix all grammar, remove redundancy, and eliminate passive voice where possible."
    ),
    "casual": (
        "You are a clear, friendly communicator. "
        "Rewrite the text to sound natural and conversational — ideal for Slack messages or team chats. "
        "Fix grammar and spelling but keep the tone warm and relaxed."
    ),
    "bullet_points": (
        "You are a structured content editor. "
        "Extract the core ideas from the text and rewrite them as clean, scannable bullet points. "
        "Each bullet should be actionable and start with a strong verb or noun phrase."
    ),
    "concise": (
        "You are a precision editor. "
        "Rewrite the text using as few words as possible without losing meaning. "
        "Cut all filler, redundancy, and weak phrasing. Every word must earn its place."
    ),
    "grammar": (
        "You are a precise grammar and spelling editor. "
        "Fix ONLY grammar mistakes, spelling errors, punctuation issues, and subject-verb agreement. "
        "Do NOT change the tone, style, vocabulary choice, or meaning of the text. "
        "Keep the author's original voice completely intact. "
        "If the text is already correct, return it unchanged."
    ),
}


def _build_system_prompt(mode: str, critique: str | None = None) -> str:
    base = _MODE_INSTRUCTIONS[mode]
    constraints = MODE_CONSTRAINTS[mode]

    preserve_block = ", ".join(PRESERVE_TERMS)
    avoid_block = ", ".join(AVOID_PHRASES)

    few_shot_block = ""
    for ex in FEW_SHOT_EXAMPLES[:2]:
        few_shot_block += f"\nExample:\nRaw: {ex['raw']}\n{mode.title()}: {ex[mode]}\n"

    system = f"""{base}

STRICT RULES:
- Never alter or expand these terms: {preserve_block}
- Never use these filler phrases: {avoid_block}
- Maximum output length: {constraints.get('max_length', 500)} characters
{f'- Bullet count: {constraints.get("min_bullets", 2)}–{constraints.get("max_bullets", 6)} bullets' if mode == 'bullet_points' else ''}

STYLE EXAMPLES:{few_shot_block}

Return ONLY the rephrased text. No explanations, no preamble."""

    if critique:
        system += f"\n\nPREVIOUS ATTEMPT WAS REJECTED. Critic feedback to fix:\n{critique}"

    return system


def generate(text: str, mode: str, critique: str | None = None) -> str:
    system_prompt = _build_system_prompt(mode, critique)

    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
    )

    return response.choices[0].message.content.strip()
