"""HTTP API for the ADTU structured-curriculum QA backend.

Run from the backend/ directory:
    uvicorn api:app --reload --port 8000

Contract: POST /ask accepts {"query"} (also tolerates {"message"}) and returns
the EXACT RAGResponse shape the frontend already consumes, so the frontend
needs zero changes.
"""

import logging
import re
import sys
import time
from typing import Optional

# Windows consoles default to cp1252, which cannot encode the emoji in the
# retriever/parser log lines. Reconfigure stdout to UTF-8 so those prints can
# never crash a request.
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:  # Supports both `uvicorn api:app` from backend/ and `backend.api` from root.
    from retrieval.structured_retriever import CurriculumQA, UNIVERSITY_INTENTS
except ModuleNotFoundError:
    from backend.retrieval.structured_retriever import CurriculumQA, UNIVERSITY_INTENTS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("adtu.api")

app = FastAPI(title="ADTU Curriculum QA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared singleton: the JSON data + parser load once, not per request.
_qa: Optional[CurriculumQA] = None


def get_qa() -> CurriculumQA:
    global _qa
    if _qa is None:
        _qa = CurriculumQA()
    return _qa


_CASUAL_GREETINGS = {
    "hi", "hello", "hey", "hey there", "hello there", "good morning",
    "good afternoon", "good evening", "namaste",
    "who are you", "what are you", "what can you do", "what can you help me with",
}

_CASUAL_INTRO = (
    "👋 Hi! I'm the ADTU curriculum assistant. I can tell you about programmes — "
    "syllabus, semester subjects, duration, specializations, and internship/practical training. "
    "Try asking: \"what is the syllabus of BCA semester 1?\""
)


def _normalise_casual(query: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", query.strip().lower()).split())


def _is_casual(query: str) -> bool:
    return _normalise_casual(query) in _CASUAL_GREETINGS


def _zero_timings() -> dict:
    return {
        "cache": 0.0, "embedding": 0.0, "intent": 0.0, "retrieval": 0.0,
        "merge": 0.0, "reranking": 0.0, "validation": 0.0, "llm": 0.0, "total": 0.0,
    }


def _response(*, query: str, status: str, intent: str, entities: dict,
              confidence_score: float, confidence_label: str, answer: Optional[str],
              clarification_question: Optional[str], sources: list, timings: dict) -> dict:
    """Build the stable RAGResponse contract in one place."""
    return {
        "status": status, "query": query, "intent": intent, "entities": entities,
        "confidence_score": confidence_score, "confidence_label": confidence_label,
        "answer": answer, "clarification_question": clarification_question,
        "follow_ups": None, "sources": sources, "timings": timings,
    }


class QueryRequest(BaseModel):
    query: Optional[str] = None
    message: Optional[str] = None


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/ask")
def ask(req: QueryRequest) -> dict:
    text = (req.query or req.message or "").strip()
    wall_start = time.perf_counter()

    # Casual greeting -> friendly ANSWER with no sources.
    if _is_casual(text):
        timings = _zero_timings()
        timings["total"] = round(time.perf_counter() - wall_start, 4)
        return _response(query=text, status="ANSWER", intent="casual",
                         entities={"programs": [], "semesters": [], "years": []},
                         confidence_score=1.0, confidence_label="HIGH", answer=_CASUAL_INTRO,
                         clarification_question=None, sources=[], timings=timings)

    try:
        qa = get_qa()
    except Exception as e:
        log.exception("backend initialization error: %s", e)
        timings = _zero_timings()
        timings["total"] = round(time.perf_counter() - wall_start, 4)
        return _response(query=text, status="REFUSE", intent="error",
                         entities={"programs": [], "semesters": [], "years": []},
                         confidence_score=0.0, confidence_label="LOW",
                         answer="I couldn't access the curriculum knowledge base right now.",
                         clarification_question=None, sources=[], timings=timings)

    # Parse (Ollama or regex fallback). This is the "intent" stage.
    parse_start = time.perf_counter()
    try:
        parsed = qa.parser.parse(text)
    except Exception as e:  # never hard-fail on a parse error
        log.exception("parse error: %s", e)
        parsed = {"intent": "info", "programme": None, "semester": None}
    parse_time = time.perf_counter() - parse_start

    # Retrieve the matching record, then use the shared CLI/API formatter.
    retrieve_start = time.perf_counter()
    try:
        record = qa.retriever.find_programme(parsed.get("programme")) if parsed.get("programme") else None
    except Exception as e:  # never hard-fail on a retrieval error
        log.exception("retrieval error: %s", e)
        record = None
    retrieve_time = time.perf_counter() - retrieve_start

    format_start = time.perf_counter()
    try:
        result = qa.answer_from_parsed(text, parsed)
    except Exception as e:  # never hard-fail on a formatting error
        log.exception("format error: %s", e)
        result = {"answer": "I couldn't answer that right now.", "success": False}
    format_time = time.perf_counter() - format_start

    wall_time = time.perf_counter() - wall_start
    timings = _zero_timings()
    timings["intent"] = round(parse_time, 4)
    timings["retrieval"] = round(retrieve_time, 4)
    timings["llm"] = round(format_time, 4)
    timings["total"] = round(wall_time, 4)

    programme = parsed.get("programme")
    semester = parsed.get("semester")
    intent = parsed.get("intent")

    entities = {
        "programs": [programme] if programme else [],
        "semesters": [str(semester)] if semester else [],
        "years": [],
    }

    if not programme and intent not in UNIVERSITY_INTENTS:
        # Programme-specific question with no programme identified -> clarify.
        return _response(query=text, status="CLARIFY", intent=intent, entities=entities,
                         confidence_score=0.2, confidence_label="LOW", answer=None,
                         clarification_question=f"Which programme do you mean? Available: {', '.join(qa.retriever.valid_programme_codes)}",
                         sources=[], timings=timings)

    if result["success"]:
        # Programme and university-level answers both carry shared evidence.
        return _response(query=text, status="ANSWER", intent=intent, entities=entities,
                         confidence_score=0.95, confidence_label="HIGH", answer=result["answer"],
                         clarification_question=None, sources=result.get("sources", []), timings=timings)

    # Programme identified but no data for it -> honest REFUSE.
    return _response(query=text, status="REFUSE", intent=intent, entities=entities,
                     confidence_score=0.1, confidence_label="LOW", answer=result["answer"],
                     clarification_question=None, sources=[], timings=timings)
