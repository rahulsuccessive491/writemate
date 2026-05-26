from openai import OpenAI
from config import (
    GROQ_API_KEY, MODEL, PRESERVE_TERMS,
    AVOID_PHRASES, MODE_CONSTRAINTS
)

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY,
)

_CRITIC_SYSTEM = """You are a strict quality-control agent reviewing rephrased text.
Your job is to check if the output meets all rules and return a structured verdict.

Respond in this exact format:
PASS or FAIL
REASON: <one sentence explaining the verdict>
FIX: <specific instruction to fix — leave blank if PASS>"""


def _check_rules(output: str, mode: str) -> list[str]:
    issues = []
    constraints = MODE_CONSTRAINTS[mode]

    for term in PRESERVE_TERMS:
        if term.lower() in output.lower() and term not in output:
            issues.append(f"Term '{term}' was altered (must stay as-is).")

    for phrase in AVOID_PHRASES:
        if phrase.lower() in output.lower():
            issues.append(f"Filler phrase '{phrase}' found — must be removed.")

    max_len = constraints.get("max_length")
    if max_len and len(output) > max_len:
        issues.append(f"Output is {len(output)} chars, exceeds limit of {max_len}.")

    if mode == "bullet_points":
        bullet_count = sum(1 for line in output.splitlines() if line.strip().startswith("-"))
        min_b = constraints.get("min_bullets", 2)
        max_b = constraints.get("max_bullets", 6)
        if not (min_b <= bullet_count <= max_b):
            issues.append(f"Expected {min_b}–{max_b} bullets, found {bullet_count}.")

    return issues


def critique(original_text: str, rephrased_text: str, mode: str) -> dict:
    rule_issues = _check_rules(rephrased_text, mode)

    user_message = f"""Original text:
{original_text}

Rephrased ({mode} mode):
{rephrased_text}

Rule violations already detected:
{chr(10).join(rule_issues) if rule_issues else 'None'}

Does this output preserve the core meaning, match the '{mode}' tone, and follow all rules?"""

    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=256,
        messages=[
            {"role": "system", "content": _CRITIC_SYSTEM},
            {"role": "user", "content": user_message},
        ],
    )

    raw = response.choices[0].message.content.strip()
    lines = raw.splitlines()

    verdict = "PASS" if lines and "PASS" in lines[0].upper() else "FAIL"
    reason = next((l.replace("REASON:", "").strip() for l in lines if l.startswith("REASON:")), "")
    fix = next((l.replace("FIX:", "").strip() for l in lines if l.startswith("FIX:")), "")

    if rule_issues:
        verdict = "FAIL"
        reason = reason or "; ".join(rule_issues)
        fix = fix or "Fix the rule violations listed above."

    return {
        "verdict": verdict,
        "reason": reason,
        "fix": fix,
        "rule_violations": rule_issues,
    }
