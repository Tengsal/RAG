"""FastAPI Web Server for the ADTU RAG Agent.
Wraps the CLI pipeline into a high-speed HTTP API for the frontend.
"""

import logging
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Import our existing pipeline modules
import config
from embeddings import embed
from vectordb import store
from retrieval import search as ret_search
from retrieval import controller
from retrieval import rerank as rerank_module
from retrieval import validator
from query_understanding import intent as intent_module
from query_understanding import entities as entity_module
from query_understanding import clarify as clarify_module
from generation import llm as llm_module
from caching import cache_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("adtu.api")

# Initialize Milvus client ONCE at startup to prevent "Too many pings" crash
log.info("Connecting to Milvus Lite...")
MILVUS_CLIENT = store.get_client()
if MILVUS_CLIENT.has_collection(config.COLLECTION_NAME):
    MILVUS_CLIENT.load_collection(config.COLLECTION_NAME)

app = FastAPI(title="ADTU Uncertainty-Aware RAG API")

# Allow frontend (React/Next.js) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for strict JSON typing ---
class QueryRequest(BaseModel):
    query: str

class RAGResponse(BaseModel):
    status: str  # "ANSWER", "REFUSE", "CLARIFY"
    query: str
    intent: Optional[str] = None
    entities: Optional[Dict[str, List[str]]] = None
    confidence_score: Optional[float] = None
    confidence_label: Optional[str] = None
    answer: Optional[str] = None
    clarification_question: Optional[str] = None
    follow_ups: Optional[List[str]] = None
    sources: Optional[List[Dict[str, Any]]] = None

# --- Casual conversation pre-check ---
# Greetings / thanks / small talk contain no university-specific factual
# content, so they skip retrieval -> rerank -> validator and go straight to
# the LLM with empty evidence. Only whole-query matches trigger this — a
# factual question with a "hi" prefix still goes through the full pipeline.
_CASUAL_PHRASES = {
    "hello", "hi", "hey", "hey there", "hello there", "good morning",
    "good afternoon", "good evening", "namaste",
    "how are you", "how r u", "hows it going", "how is it going",
    "whats up", "what is up",
    "thank you", "thanks", "thanks a lot", "thank you so much", "thx",
    "who are you", "what are you", "what can you do",
    "what can you help me with", "what can you help with",
    "what can i ask", "can you help me", "help",
}


def _is_casual(query: str) -> bool:
    """True when the entire query is small talk with no factual content."""
    normalized = re.sub(r"[^a-z0-9 ]", " ", query.strip().lower())
    return " ".join(normalized.split()) in _CASUAL_PHRASES


def _parse_follow_ups(answer_text: str):
    """Split the LLM output into (main answer, follow-up questions)."""
    if "Follow-up Questions:" not in answer_text:
        return answer_text, []
    main = answer_text.split("Follow-up Questions:")[0].strip()
    follow_ups = [
        line.strip().lstrip("12.")
        for line in answer_text.split("Follow-up Questions:", 1)[1].strip().split("\n")
        if line.strip().startswith("1.") or line.strip().startswith("2.")
    ]
    return main, follow_ups


# --- PRE-LOAD MODELS ON STARTUP (The Speed Hack) ---
@app.on_event("startup")
async def load_models():
    log.info("🔥 Warming up AI models and Milvus...")
    # Trigger lazy loaders so the first user doesn't wait
    intent_module.detect_intent("warmup") 
    rerank_module.get_reranker()
    log.info("✅ Server is warm and ready for requests!")

# --- THE MAIN ENDPOINT ---
@app.post("/ask", response_model=RAGResponse)
async def ask_question(req: QueryRequest):
    query = req.query
    log.info(f"Received query: {query}")

    # 0. Casual pre-check: greetings/thanks/small talk bypass the
    # retrieval -> rerank -> validator pipeline and go straight to the LLM
    # with empty evidence. Factual queries continue through the pipeline.
    if _is_casual(query):
        final_answer = llm_module.generate_answer(
            query,
            evidence=[],
            decision={"action": config.ACTION_ANSWER, "confidence": 1.0, "uncertainty": 0.0},
            entities={"programs": [], "semesters": [], "years": []},
        )
        main_answer, follow_ups = _parse_follow_ups(final_answer)
        return RAGResponse(
            status="ANSWER",
            query=query,
            intent="casual",
            entities={"programs": [], "semesters": [], "years": []},
            confidence_score=1.0,
            confidence_label="HIGH",
            answer=main_answer,
            follow_ups=follow_ups,
            sources=[],
        )

    # 0. Cache Check
    cached = cache_manager.get_cached_response(query)
    if cached:
        log.info("⚡ CACHE HIT!")
        return RAGResponse(**cached)

    # Use the global client instead of creating a new one every time
    client = MILVUS_CLIENT
    if store.count_rows(client) == 0:
        raise HTTPException(status_code=500, detail="Database empty. Run ingest first.")

    # 1. Intent & Entities
    intent_res = intent_module.detect_intent(query)
    extracted = entity_module.extract_entities(query)

    # 2. Controller
    plan = controller.build_search_plan(query, intent_res)

    # 3. Milvus Retrieval
    merged = []
    for cat in plan["categories"]:
        merged += ret_search.search(client, embed, query, top_k=config.CANDIDATE_TOP_K, category=cat)
    
    best = {}
    for e in merged:
        cid = e["chunk_id"]
        if cid not in best or e["score"] > best[cid]["score"]:
            best[cid] = e
    candidates = sorted(best.values(), key=lambda x: x["score"], reverse=True)

    if not candidates or candidates[0]["score"] < config.RETRIEVAL_MIN_SCORE:
        candidates = ret_search.search(client, embed, query, top_k=config.CANDIDATE_TOP_K, category=None)

    if not candidates:
        return RAGResponse(status="REFUSE", query=query, answer="No evidence found in database.")

    # 4. Rerank
    evidence = rerank_module.rerank(query, candidates, top_k=config.RERANK_TOP_K)

    # 5. Validate
    decision = validator.validate(intent_res, evidence)

    # Format sources for frontend
    sources = [{"source": e['source'].split('/')[-1], "page": e['page'], "score": e['rerank_confidence']} for e in evidence]

    # Map confidence label
    conf_score = decision['confidence']
    if conf_score >= config.THRESHOLD_HIGH: conf_label = "HIGH"
    elif conf_score >= config.THRESHOLD_LOW: conf_label = "MEDIUM"
    else: conf_label = "LOW"

    # 6. Handle Decisions
    if decision["action"] == config.ACTION_REFUSE:
        resp_data = {
            "status": "REFUSE",
            "query": query,
            "intent": intent_res["intent"],
            "entities": extracted,
            "confidence_score": conf_score,
            "confidence_label": conf_label,
            "answer": "I couldn't find this information in the available university documents.",
            "sources": sources
        }
        cache_manager.save_to_cache(query, resp_data)
        return RAGResponse(**resp_data)

    if decision["action"] == config.ACTION_CLARIFY:
        clarify_q = clarify_module.generate_clarification(intent_res, extracted, evidence)
        resp_data = {
            "status": "CLARIFY",
            "query": query,
            "intent": intent_res["intent"],
            "entities": extracted,
            "confidence_score": conf_score,
            "confidence_label": conf_label,
            "clarification_question": clarify_q,
            "sources": sources
        }
        # Don't cache clarifications usually, or cache if you want
        return RAGResponse(**resp_data)

    # 7. LLM Generation (ANSWER)
    final_answer = llm_module.generate_answer(query, evidence, decision, extracted)
    
    # Parse follow-ups if the LLM generated them
    main_answer, follow_ups = _parse_follow_ups(final_answer)

    resp_data = {
        "status": "ANSWER",
        "query": query,
        "intent": intent_res["intent"],
        "entities": extracted,
        "confidence_score": conf_score,
        "confidence_label": conf_label,
        "answer": main_answer,
        "follow_ups": follow_ups,
        "sources": sources
    }
    
    cache_manager.save_to_cache(query, resp_data)
    return RAGResponse(**resp_data)
