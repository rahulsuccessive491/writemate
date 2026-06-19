from __future__ import annotations

from rephraser import generate
from critic import critique
from config import MAX_CRITIC_ITERATIONS, SKIP_CRITIC


def run(text: str, mode: str) -> dict:
    """
    Orchestrates the Generation → Critic loop.
    When SKIP_CRITIC=true, runs a single generation (faster for local models).
    """
    if SKIP_CRITIC:
        result = generate(text, mode)
        return {
            "result": result,
            "mode": mode,
            "iterations": 1,
            "status": "passed",
            "critic_history": [],
        }

    critique_feedback: str | None = None
    iteration = 0
    critic_history = []

    while iteration < MAX_CRITIC_ITERATIONS:
        iteration += 1

        rephrased = generate(text, mode, critique=critique_feedback)
        review = critique(text, rephrased, mode)
        critic_history.append({
            "iteration": iteration,
            "output": rephrased,
            "verdict": review["verdict"],
            "reason": review["reason"],
            "fix": review["fix"],
        })

        if review["verdict"] == "PASS":
            return {
                "result": rephrased,
                "mode": mode,
                "iterations": iteration,
                "status": "passed",
                "critic_history": critic_history,
            }

        critique_feedback = review["fix"]

    return {
        "result": rephrased,
        "mode": mode,
        "iterations": iteration,
        "status": "max_iterations_reached",
        "critic_history": critic_history,
    }
