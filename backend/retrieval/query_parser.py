"""
LLM-based query parser for the university curriculum chatbot.

Uses a local Ollama model (Qwen3) only for understanding the user's
question. Actual facts are still retrieved from structured JSON data.

Resilience: if Ollama is unreachable or slower than PARSE_TIMEOUT_S, the
parser falls back to a deterministic regex parser (programme-list match +
semester regex) so the endpoint never hard-fails.
"""

import json
import os
import re
import threading
from typing import Any, Dict, List, Optional

from ollama import chat

DEFAULT_MODEL = "qwen3:1.7b"
PARSE_TIMEOUT_S = float(os.environ.get("PARSE_TIMEOUT_S", "1.5"))


class LLMQueryParser:

    def __init__(self, model_name: Optional[str] = None, valid_programmes: Optional[List[str]] = None):
        self.model_name = model_name or os.environ.get("OLLAMA_MODEL", DEFAULT_MODEL)
        self.valid_programmes = valid_programmes or []

    def parse(self, query: str) -> Dict[str, Any]:
        try:
            parsed = self._parse_with_timeout(query, PARSE_TIMEOUT_S)
            print(f"[query_parser] used Ollama model '{self.model_name}'")
            return parsed
        except Exception as e:
            print(f"[query_parser] Ollama unavailable/slow ({e}); falling back to regex parser")
            return regex_parse(query, self.valid_programmes)

    def _parse_with_timeout(self, query: str, timeout: float) -> Dict[str, Any]:
        """Run the Ollama parse in a daemon thread and cap it at `timeout`.

        A daemon thread (joined with a timeout, not awaited) means a slow
        Ollama call cannot block the fallback path.
        """
        holder: Dict[str, Any] = {}

        def _run():
            try:
                holder["result"] = self._ollama_parse(query)
            except Exception as e:
                holder["error"] = e

        t = threading.Thread(target=_run, daemon=True)
        t.start()
        t.join(timeout)
        if t.is_alive():
            raise TimeoutError(f"Ollama parse exceeded {timeout:.1f}s")
        if "error" in holder:
            raise holder["error"]
        return holder["result"]

    def _ollama_parse(self, query: str) -> Dict[str, Any]:

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

        response = chat(
            model=self.model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query},
            ],
            format="json",
            think=False,
            options={"temperature": 0},
        )

        parsed = json.loads(response.message.content)

        return {
            "intent": parsed.get("intent", "info"),
            "programme": parsed.get("programme"),
            "semester": parsed.get("semester"),
        }


# ---------------------------------------------------------------------------
# Regex fallback parser
# ---------------------------------------------------------------------------

_ORDINALS = {
    "first": 1, "second": 2, "third": 3, "fourth": 4,
    "fifth": 5, "sixth": 6, "seventh": 7, "eighth": 8,
}

# Shorthand -> canonical token, applied to the query text so that "btech",
# "b.tech", "nursing", etc. all normalize to the same form used by the records.
_ALIASES = {
    "btech": "b tech",
    "b.tech": "b tech",
    "bsc": "b sc",
    "b.sc": "b sc",
    "bpharm": "b pharm",
    "b.pharm": "b pharm",
    "boptom": "b optom",
    "b.optom": "b optom",
    "nursing": "b sc nursing",
    "biotechnology": "b sc biotechnology",
    "microbiology": "b sc microbiology",
    "forensic": "b sc forensic science",
    "optom": "b optom",
    "pharm": "b pharm",
    "civil": "b tech civil engineering",
    "mechanical": "b tech mechanical engineering",
    "cse": "b tech cse",
}


def _normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def _match_programme(query: str, valid_programmes: List[str]) -> Optional[str]:
    if not valid_programmes:
        return None

    q = query.lower()
    for alias, canonical in _ALIASES.items():
        q = re.sub(r"\b" + re.escape(alias) + r"\b", canonical, q)
    q = _normalize(q)

    # Longest first so "B.Tech Civil Engineering" wins over "B.Tech".
    candidates = sorted(
        ((p, _normalize(p)) for p in valid_programmes),
        key=lambda x: -len(x[1]),
    )
    for code, norm in candidates:
        if norm and norm in q:
            return code
    return None


def regex_parse(query: str, valid_programmes: Optional[List[str]] = None) -> Dict[str, Any]:
    """Deterministic fallback: match programme against the known list and
    extract a semester / intent with regex. Never guesses a programme."""
    q = _normalize(query)

    if re.search(r"\b(syllabus|syllabi|subjects?|study|curriculum|courses?)\b", q):
        intent = "subjects"
    elif re.search(r"\b(duration|how long|years?|long)\b", q):
        intent = "duration"
    elif re.search(r"\b(speciali[sz]ations?)\b", q):
        intent = "specializations"
    elif re.search(r"\b(internship|practicum|training|project)\b", q):
        intent = "internship"
    else:
        intent = "info"

    programme = _match_programme(query, valid_programmes or [])

    semester: Optional[int] = None
    m = re.search(r"\b(?:sem|semester)\s*(\d{1,2})\b", q)
    if m:
        semester = int(m.group(1))
    else:
        m = re.search(r"(\d{1,2})(?:st|nd|rd|th)\s*(?:sem|semester)", q)
        if m:
            semester = int(m.group(1))
        else:
            for word, num in _ORDINALS.items():
                if re.search(r"\b" + word + r"\s*(?:sem|semester)\b", q):
                    semester = num
                    break

    if semester is not None and not (1 <= semester <= 8):
        semester = None

    return {"intent": intent, "programme": programme, "semester": semester}
