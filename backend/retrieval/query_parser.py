"""
LLM-based query parser for the university curriculum chatbot.

Uses a local Ollama model (Qwen3) only for understanding the user's
question. Actual facts are still retrieved from structured JSON data.
"""

import json
from typing import Any, Dict

from ollama import chat


class LLMQueryParser:

    MODEL_NAME = "qwen3:1.7b"

    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name

    def parse(self, query: str) -> Dict[str, Any]:

        system_prompt = """You are a strict JSON extraction engine for a university chatbot.
Your ONLY job is to extract intent, programme, and semester from the user's query.

RULES:
1. VALID INTENTS: Choose exactly one: "subjects", "duration", "specializations", "internship", "info".
2. VALID PROGRAMMES: You may ONLY extract a programme if it is explicitly mentioned or clearly referenced in the query. Valid codes: "BCA", "B.Tech", "BBA", "BEMT", "BDTT", "BMLS", "B.Optom", "BPT", "B.Sc. Nursing", "P.B.B.Sc. Nursing", "B.Sc. Biotechnology", "B.Sc. Microbiology", "B.Sc. FST", "B.Sc. Forensic Science", "B.Tech Civil Engineering", "B.Tech Mechanical Engineering", "B.Tech CSE (Data Science & AI)", "BHMCT", "B.Pharm".
   - CRITICAL: If the user asks about a programme NOT in this list, or if no programme is mentioned, set "programme" to null. DO NOT guess or default to "BCA".
3. SEMESTER: An integer from 1 to 8. If the user does not explicitly mention a semester (e.g., "sem 1", "second semester"), set "semester" to null. DO NOT guess.
4. OUTPUT: Return ONLY a valid JSON object. No markdown, no code blocks, no explanations.

EXAMPLES:
User: "what do we study in bca second sem?"
Output: {"intent": "subjects", "programme": "BCA", "semester": 2}

User: "does BPT require internship training?"
Output: {"intent": "internship", "programme": "BPT", "semester": null}

User: "how long is the nursing program?"
Output: {"intent": "duration", "programme": "B.Sc. Nursing", "semester": null}

User: "tell me about fees"
Output: {"intent": "info", "programme": null, "semester": null}
"""

        try:
            response = chat(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": query
                    },
                ],
                format="json",
                think=False,
                options={
                    "temperature": 0
                }
            )

            parsed = json.loads(response.message.content)
            print("DEBUG PARSED:", parsed)

            return {
                "intent": parsed.get("intent", "info"),
                "programme": parsed.get("programme"),
                "semester": parsed.get("semester"),
            }

        except Exception as e:
            print(f"⚠️ LLM query parsing failed: {e}")

            return {
                "intent": "info",
                "programme": None,
                "semester": None,
            }
