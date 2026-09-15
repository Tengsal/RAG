"""LLM-based query parser for the university curriculum chatbot.

Uses a local Ollama model (Qwen3) only for understanding the user's
question. Actual facts are still retrieved from structured JSON data.

Resilience: if Ollama is unreachable or slower than PARSE_TIMEOUT_S, the
parser falls back to a deterministic regex parser so the endpoint never
hard-fails.

Parse contract (additive — old keys unchanged, old consumers unaffected):
  intent           : str   factual/university intents + 4 counselling intents
  programme        : Optional[str]   primary programme
  programmes       : List[str]       all programmes mentioned (comparison)
  semester         : Optional[int]   1..8
  percentage       : Optional[float] 0..100
  stream           : Optional[str]   science|commerce|arts
  interests        : List[str]       normalized interest tags
  maths_confidence : Optional[str]   low|ok|high
"""

import json
import os
import re
import threading
from typing import Any, Dict, List, Optional

from ollama import chat

DEFAULT_MODEL = "qwen3:1.7b"
PARSE_TIMEOUT_S = float(os.environ.get("PARSE_TIMEOUT_S", "2.5"))

# The four counselling intents added on top of the factual/university set.
COUNSELLING_INTENTS = {"eligibility", "comparison", "recommendation", "admission_support"}

INTEREST_TAGS = {
    "computers": ["computer", "computers", "coding", "programming", "software",
                  "artificial intelligence", "machine learning", "technology", "game"],
    "business": ["business", "management", "marketing", "finance", "account",
                 "entrepreneur", "startup", "commerce"],
    "healthcare": ["health", "medical", "medicine", "nursing", "nurse", "patient",
                   "hospital", "doctor", "physio", "pharma"],
    "science_research": ["science", "research", "biology", "biotech", "lab",
                         "laboratory", "genetic", "environment"],
    "hospitality": ["hotel", "hospitality", "tourism", "travel", "food",
                    "cooking", "chef", "event"],
    "forensic": ["forensic", "crime", "criminal", "investigation", "law", "police"],
}
_VALID_INTEREST_TAGS = set(INTEREST_TAGS.keys())

_MATHS_LOW = ["weak in maths", "weak in math", "weak at maths", "weak at math",
              "not good at maths", "not good at math", "bad at maths", "bad at math",
              "hate maths", "hate math", "maths phobia", "without maths", "no maths",
              "struggle with maths", "struggle with math", "not strong in maths"]
_MATHS_OK = ["maths is fine", "math is fine", "maths is okay", "math is okay",
             "okay at maths", "ok at maths", "average in maths"]
_MATHS_HIGH = ["good at maths", "good at math", "strong in maths", "strong in math",
               "love maths", "love math", "excellent in maths", "maths is my strength",
               "enjoy maths"]

# A negated positive ("not very good at maths") must not read as "high": the
# _MATHS_HIGH phrases are substrings of their own negations.
_MATHS_NEGATED = re.compile(
    r"\b(?:not|n't|never|hardly|barely|cannot|can't|no)\b[\w\s,'-]{0,20}?"
    r"\b(?:good|great|strong|excellent|confident|comfortable|fine|okay|ok)\b"
    r"[\w\s,'-]{0,12}?\b(?:maths|math)\b"
)

# 1..3 digits so "100%" works; value validated to 0..100 afterwards.
_PERCENT_RE = re.compile(r"\b(\d{1,3}(?:\.\d+)?)\s*(?:%|percent\b)")


def extract_percentage(q: str) -> Optional[float]:
    m = _PERCENT_RE.search(q)
    if not m:
        return None
    try:
        v = float(m.group(1))
    except ValueError:
        return None
    return v if 0.0 <= v <= 100.0 else None


def extract_stream(q: str) -> Optional[str]:
    if re.search(r"\b(pcm|pcb|pcmb|science)\b", q):
        return "science"
    if re.search(r"\bcommerce\b", q):
        return "commerce"
    if re.search(r"\b(arts|humanities)\b", q):
        return "arts"
    return None


def extract_interests(q: str) -> List[str]:
    tags: List[str] = []
    for tag, words in INTEREST_TAGS.items():
        for w in words:
            if re.search(r"\b" + re.escape(w) + r"\b", q):
                tags.append(tag)
                break
    return tags[:3]


def extract_maths_confidence(q: str) -> Optional[str]:
    for ph in _MATHS_LOW:
        if ph in q:
            return "low"
    if _MATHS_NEGATED.search(q):
        return "low"
    for ph in _MATHS_HIGH:
        if ph in q:
            return "high"
    for ph in _MATHS_OK:
        if ph in q:
            return "ok"
    return None


def _clean_parsed(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize/validate whatever the LLM (or fallback) produced."""
    intent = str(raw.get("intent") or "info")
    programme = raw.get("programme") or None

    programmes = raw.get("programmes") or []
    if not isinstance(programmes, list):
        programmes = [programmes] if programmes else []
    programmes = [str(p) for p in programmes if p][:3]
    if programme and programme not in programmes:
        programmes.insert(0, programme)

    semester = raw.get("semester")
    try:
        semester = int(semester)
        if not (1 <= semester <= 8):
            semester = None
    except (TypeError, ValueError):
        semester = None

    percentage = raw.get("percentage")
    try:
        percentage = float(percentage)
        if not (0.0 <= percentage <= 100.0):
            percentage = None
    except (TypeError, ValueError):
        percentage = None

    stream = raw.get("stream")
    stream = stream if stream in ("science", "commerce", "arts") else None
    interests = [t for t in (raw.get("interests") or []) if t in _VALID_INTEREST_TAGS][:3]
    maths = raw.get("maths_confidence")
    maths = maths if maths in ("low", "ok", "high") else None

    return {
        "intent": intent,
        "programme": programme,
        "programmes": programmes,
        "semester": semester,
        "percentage": percentage,
        "stream": stream,
        "interests": interests,
        "maths_confidence": maths,
    }


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
Your ONLY job is to extract intent, programmes, semester and student signals.

RULES:
1. VALID INTENTS: Choose exactly one:
   "subjects", "duration", "specializations", "internship", "administration",
   "scholarships", "fees", "attendance", "academic_calendar", "admissions",
   "student_services", "info",
   "eligibility", "comparison", "recommendation", "admission_support".
   - "eligibility": student asks whether THEY qualify, or what they can get with their marks/percentage/stream.
   - "comparison": student compares two or more programmes (vs, versus, compare, difference, which is better between X and Y).
   - "recommendation": student asks which programme SUITS them / should choose / fits their interests or strengths.
   - "admission_support": student asks how THEY apply / application steps / deadlines / guidance for their own situation.
   - "admissions": generic factual admission process/documents questions with no personal situation.
   MULTI-INTENT RULE: if the query combines several needs (e.g. percentage + choosing between two programmes), pick the PRIMARY intent = the student's end goal, in this priority: recommendation > comparison > eligibility > admission_support > factual. Still fill percentage, programmes, stream and interests so downstream logic can enrich the answer.
2. VALID PROGRAMMES: Only extract if explicitly mentioned. Valid codes: "BCA", "BBA", "BEMT", "BDTT", "BMLS", "B.Optom", "BPT", "B.Sc. Nursing", "P.B.B.Sc. Nursing", "B.Sc. Biotechnology", "B.Sc. Microbiology", "B.Sc. FST", "B.Sc. Forensic Science", "B.Tech Civil Engineering", "B.Tech Mechanical Engineering", "B.Tech CSE (Data Science & AI)", "BHMCT", "B.Pharm".
   - "programme" = the primary/single programme, or null.
   - "programmes" = ALL programmes mentioned (max 3), for comparison; empty list if none.
   - DO NOT guess or default to "BCA".
3. SEMESTER: integer 1-8, else null. DO NOT guess.
4. PERCENTAGE: number 0-100 from the query (e.g. "65%"), else null.
5. STREAM: one of "science", "commerce", "arts", else null.
6. INTERESTS: subset of ["computers","business","healthcare","science_research","hospitality","forensic"], else [].
7. MATHS_CONFIDENCE: "low" if weak/not good/hate maths, "high" if good/strong/loves maths, "ok" if merely fine, else null.
8. OUTPUT: Return ONLY a valid JSON object. No markdown, no explanations.

EXAMPLES:
User: "what do we study in bca second sem?"
Output: {"intent": "subjects", "programme": "BCA", "programmes": ["BCA"], "semester": 2, "percentage": null, "stream": null, "interests": [], "maths_confidence": null}

User: "who is the vice chancellor?"
Output: {"intent": "administration", "programme": null, "programmes": [], "semester": null, "percentage": null, "stream": null, "interests": [], "maths_confidence": null}

User: "what is the fee for BCA?"
Output: {"intent": "fees", "programme": "BCA", "programmes": ["BCA"], "semester": null, "percentage": null, "stream": null, "interests": [], "maths_confidence": null}

User: "I got 65% in class 12. What programmes am I eligible for?"
Output: {"intent": "eligibility", "programme": null, "programmes": [], "semester": null, "percentage": 65, "stream": null, "interests": [], "maths_confidence": null}

User: "BCA vs B.Tech CSE which is better?"
Output: {"intent": "comparison", "programme": "BCA", "programmes": ["BCA", "B.Tech CSE (Data Science & AI)"], "semester": null, "percentage": null, "stream": null, "interests": [], "maths_confidence": null}

User: "I like computers but I'm not very good at maths. Which course should I choose?"
Output: {"intent": "recommendation", "programme": null, "programmes": [], "semester": null, "percentage": null, "stream": null, "interests": ["computers"], "maths_confidence": "low"}

User: "I got 65%, should I choose BCA or B.Tech Civil?"
Output: {"intent": "recommendation", "programme": "BCA", "programmes": ["BCA", "B.Tech Civil Engineering"], "semester": null, "percentage": 65, "stream": null, "interests": [], "maths_confidence": null}

User: "I got 65% in commerce, how do I apply?"
Output: {"intent": "admission_support", "programme": null, "programmes": [], "semester": null, "percentage": 65, "stream": "commerce", "interests": [], "maths_confidence": null}
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
        return _clean_parsed(parsed)


# ---------------------------------------------------------------------------
# Regex fallback parser
# ---------------------------------------------------------------------------

_ORDINALS = {
    "first": 1, "second": 2, "third": 3, "fourth": 4,
    "fifth": 5, "sixth": 6, "seventh": 7, "eighth": 8,
}

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

    candidates = sorted(
        ((p, _normalize(p)) for p in valid_programmes),
        key=lambda x: -len(x[1]),
    )
    for code, norm in candidates:
        if norm and norm in q:
            return code
    return None


def _match_all_programmes(query: str, valid_programmes: List[str]) -> List[str]:
    """All programmes mentioned (max 3), longest-code-first."""
    if not valid_programmes:
        return []

    q = query.lower()
    for alias, canonical in _ALIASES.items():
        q = re.sub(r"\b" + re.escape(alias) + r"\b", canonical, q)
    q = _normalize(q)

    candidates = sorted(
        ((p, _normalize(p)) for p in valid_programmes),
        key=lambda x: -len(x[1]),
    )
    found: List[str] = []
    for code, norm in candidates:
        if norm and norm in q and code not in found:
            found.append(code)
    return found[:3]


def regex_parse(query: str, valid_programmes: Optional[List[str]] = None) -> Dict[str, Any]:
    """Deterministic fallback. Never guesses a programme."""
    q = _normalize(query)
    raw = query.lower()

    programmes = _match_all_programmes(query, valid_programmes or [])
    programme = programmes[0] if programmes else None
    percentage = extract_percentage(raw)
    stream = extract_stream(q)
    interests = extract_interests(raw)
    maths_confidence = extract_maths_confidence(raw)

    # Counselling intents first, each gated on the signals it needs so old
    # factual queries keep their previous intent labels.
    if len(programmes) >= 2 or re.search(r"\b(vs|versus|compare|comparison|difference between)\b", q):
        intent = "comparison"
    elif (percentage is not None or stream) and re.search(
            r"\b(eligible|eligibility|qualify|can i get|can i study|what can i)\b", q):
        intent = "eligibility"
    elif re.search(r"\b(should i|which (course|programme|program)|recommend|suggest|best for me|choose|pick)\b", q):
        intent = "recommendation"
    elif (percentage is not None or stream or re.search(r"\b(i|my|me)\b", q)) and re.search(
            r"\b(apply|application|admission process|steps|deadline|how do i join)\b", q):
        intent = "admission_support"
    # University-level factual intents (unchanged order/behaviour).
    elif re.search(r"\b(vice\s+chancellor|chancellor|vc|president|registrar|dean|director|faculty|staff|administration|governing\s+body|leadership|committee|committees|anti.?ragging|ragging|bullying|grievance|harassment|contact|email|phone|office\s+hours?)\b", q):
        intent = "administration"
    elif re.search(r"\b(scholarship|scholarships|waiver|concession|financial\s+aid|xopun)\b", q):
        intent = "scholarships"
    elif re.search(r"\battendance\b", q):
        intent = "attendance"
    elif re.search(r"\b(academic\s+calendar|semester\s+(start|begin|commence|dates?)|when\s+(does|do|will)\s+(the\s+)?(semester|classes?)\s+(start|begin|commence|resume)|classes\s+(start|begin))\b", q):
        intent = "academic_calendar"
    elif re.search(r"\b(admission|admissions|documents?\s+(required|needed)|required\s+documents?|apply|application|eligibility)\b", q):
        intent = "admissions"
    elif re.search(r"\b(hostel|library|transport|canteen|medical|sports|clubs?|student\s+services?)\b", q):
        intent = "student_services"
    elif re.search(r"\b(syllabus|syllabi|subjects?|study|curriculum|courses?)\b", q):
        intent = "subjects"
    elif re.search(r"\b(duration|how long|years?|long)\b", q):
        intent = "duration"
    elif re.search(r"\b(speciali[sz]ations?)\b", q):
        intent = "specializations"
    elif re.search(r"\b(internship|practicum|training|project)\b", q):
        intent = "internship"
    elif re.search(r"\b(fee|fees|tuition|cost|costs|charge|charges)\b", q):
        intent = "fees"
    else:
        intent = "info"

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

    return _clean_parsed({
        "intent": intent,
        "programme": programme,
        "programmes": programmes,
        "semester": semester,
        "percentage": percentage,
        "stream": stream,
        "interests": interests,
        "maths_confidence": maths_confidence,
    })
