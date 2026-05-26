import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise EnvironmentError("GROQ_API_KEY not set in .env file")

_rules_path = Path(__file__).parent / "rules.json"
with open(_rules_path) as f:
    RULES: dict = json.load(f)

PRESERVE_TERMS: list[str] = RULES["preserve_terms"]
AVOID_PHRASES: list[str] = RULES["avoid_phrases"]
MODE_CONSTRAINTS: dict = RULES["mode_constraints"]
FEW_SHOT_EXAMPLES: list[dict] = RULES["few_shot_examples"]

AVAILABLE_MODES = list(MODE_CONSTRAINTS.keys())
MODEL = "llama-3.1-8b-instant"   # free, very fast on Groq
SKIP_CRITIC = False
MAX_CRITIC_ITERATIONS = 2
