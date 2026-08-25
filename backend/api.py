"""FastAPI Web Server for the ADTU RAG Agent.
Wraps the CLI pipeline into a high-speed HTTP API for the frontend.
"""

import logging
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
    follow_ups = []
    if "Follow-up Questions:" in final_answer:
        parts = final_answer.split("Follow-up Questions:")
        main_answer = parts[0].strip()
        lines = parts[1].strip().split("\n")
        for line in lines:
            if line.strip().startswith("1.") or line.strip().startswith("2."):
                follow_ups.append(line.strip().lstrip("12."))
    else:
        main_answer = final_answer

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
