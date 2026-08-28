"""FastAPI Web Server for the ADTU RAG Agent.
Wraps the CLI pipeline into a high-speed HTTP API for the frontend.
"""

import logging
import os
import re
import time as _perf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Import our existing pipeline modules
import config
from parser import extract
from parser import chunk
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

# --- Per-request stage timings (perf_counter) ---
# Printed for every /ask request by default; set RAG_TIMING=0 to disable.
_TIMING_ENABLED = os.environ.get("RAG_TIMING", "1").lower() not in ("0", "false", "off", "no")
_TIMING_ORDER = ["cache", "embedding", "intent", "retrieval", "merge", "reranking",
                 "validation", "llm", "total"]


class _StageTimer:
    """Collects per-stage wall times; each mark() closes the previous segment."""

    def __init__(self, query: str):
        self.query = query
        self.stages = {}
        self._t0 = _perf.perf_counter()
        self._t_prev = self._t0

    def mark(self, name: str):
        now = _perf.perf_counter()
        self.stages[name] = now - self._t_prev
        self._t_prev = now

    def emit(self) -> dict:
        """Print the timing block (if enabled) and return the stages dict."""
        self.stages.setdefault("total", _perf.perf_counter() - self._t0)
        if _TIMING_ENABLED:
            print("===== RAG TIMING /ask =====", flush=True)
            print(f"  query: {self.query!r}", flush=True)
            for name in _TIMING_ORDER:
                if name in self.stages:
                    print(f"  {name:10s} {self.stages[name]:7.3f}s", flush=True)
            print("===== END RAG TIMING =====", flush=True)
        return dict(self.stages)

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
    timings: Optional[Dict[str, float]] = None  # per-stage wall times (perf_counter)

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


# --- Out-of-domain gate ---
# Spec: explicitly refuse medical / legal / political / relationship advice
# (truth over fluency — these topics lie outside the university evidence
# base). Patterns are deliberately conservative: only clear advice-seeking or
# unambiguous off-topic phrasings, so questions about ADTU's own programmes,
# courses and notices still pass through.
_OOD_PATTERNS = [
    r"\b(medical|health|diet|fitness|nutrition)\s+advice\b",
    r"\bshould\s+i\s+take\s+(medicine|medication|tablet|pill|drug)",
    r"\blegal\s+advice\b",
    r"\bcan\s+i\s+sue\b",
    r"\bfile\s+a\s+(case|lawsuit)\b",
    r"\bwho\s+is\s+the\s+prime\s+minister\b",
    r"\bprime\s+minister\s+of\b",
    r"\bchief\s+minister\b",
    r"\bpresident\s+of\s+(india|the\s+united\s+states|usa|america)\b",
    r"\bpolitical\s+party\b",
    r"\brelationship\s+advice\b",
    r"\bmy\s+(boyfriend|girlfriend|husband|wife|partner)\b",
    r"\bbreak\s*up\s+with\b",
    r"\bdating\s+advice\b",
]

_OOD_REFUSAL = (
    "I'm an ADTU academic information assistant, so I can't help with that "
    "topic. Ask me about admissions, programmes, fees, placements, "
    "examinations, regulations, or notices instead."
)


def _is_out_of_domain(query: str) -> bool:
    """True when the query asks for advice outside the university domain."""
    q = " " + query.strip().lower() + " "
    return any(re.search(p, q) for p in _OOD_PATTERNS)


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
    # Resolve Redis reachability now (the pre-flight costs ~1-2 s when Redis
    # is down); otherwise the first /ask request pays it inside its cache stage.
    cache_manager.warmup()
    log.info("✅ Server is warm and ready for requests!")

# --- THE MAIN ENDPOINT ---
@app.post("/ask", response_model=RAGResponse)
async def ask_question(req: QueryRequest):
    query = req.query
    log.info(f"Received query: {query}")
    T = _StageTimer(query)

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
        T.mark("llm")
        main_answer, follow_ups = _parse_follow_ups(final_answer)
        timings = T.emit()
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
            timings=timings,
        )

    # 0.5 Out-of-domain gate: medical / legal / political / relationship
    # advice is refused explicitly — it can never be grounded in university
    # documents. Runs before the cache so refusals are never served stale.
    if _is_out_of_domain(query):
        timings = T.emit()
        return RAGResponse(
            status="REFUSE",
            query=query,
            intent="out_of_domain",
            entities={"programs": [], "semesters": [], "years": []},
            confidence_score=0.0,
            confidence_label="LOW",
            answer=_OOD_REFUSAL,
            sources=[],
            timings=timings,
        )

    # 0. Cache Check
    cached = cache_manager.get_cached_response(query)
    T.mark("cache")
    if cached:
        log.info("⚡ CACHE HIT!")
        timings = T.emit()
        return RAGResponse(**cached, timings=timings)

    # Use the global client instead of creating a new one every time
    client = MILVUS_CLIENT
    if store.count_rows(client) == 0:
        raise HTTPException(status_code=500, detail="Database empty. Run ingest first.")

    # 1. Embed the query ONCE. Intent detection and every Milvus search reuse
    # this exact vector through embed_query's memo (BGE-M3 is deterministic),
    # so the query is no longer re-encoded per category search.
    embed.embed_query(query)
    T.mark("embedding")

    # 1. Intent & Entities
    intent_res = intent_module.detect_intent(query)
    T.mark("intent")
    extracted = entity_module.extract_entities(query)

    # 2. Controller
    plan = controller.build_search_plan(query, intent_res)

    # 3. Milvus Retrieval
    # Union the intent-routed category searches with an ALWAYS-ON global
    # sweep. The intent router is a weak signal (near-uniform scores for
    # generic queries), so the cross-encoder — not the router — decides what
    # is actually relevant. Previously the global search was a fallback gated
    # on RETRIEVAL_MIN_SCORE, which never fired when the filtered search
    # confidently returned the wrong documents.
    merged = []
    for cat in plan["categories"]:
        merged += ret_search.search(client, embed, query, top_k=config.CANDIDATE_TOP_K, category=cat)
    merged += ret_search.search(client, embed, query, top_k=config.CANDIDATE_TOP_K, category=None)
    T.mark("retrieval")

    best = {}
    for e in merged:
        cid = e["chunk_id"]
        if cid not in best or e["score"] > best[cid]["score"]:
            best[cid] = e
    # Drop exact (source, page, text) duplicates too: identical text scores
    # identically in the reranker and document-level dedupe would keep only
    # one copy anyway, so reranking the copies is pure wasted compute.
    uniq = {}
    for e in best.values():
        k = (e["source"], e["page"], e["text"])
        if k not in uniq or e["score"] > uniq[k]["score"]:
            uniq[k] = e
    candidates = sorted(uniq.values(), key=lambda x: x["score"], reverse=True)
    T.mark("merge")

    if not candidates:
        timings = T.emit()
        return RAGResponse(status="REFUSE", query=query,
                           answer="No evidence found in database.", timings=timings)

    # Bound the rerank pool: the cross-encoder is the per-request cost center
    # (~60 ms/pair on CPU). Union retrieval (category searches + always-on
    # global sweep) already produced a diverse candidate set ranked by
    # cosine; the cross-encoder only needs to pick the best few from the
    # strongest N. RERANK_CANDIDATE_MAX is configurable so recall can be
    # traded back if source verification regresses.
    if len(candidates) > config.RERANK_CANDIDATE_MAX:
        candidates = candidates[: config.RERANK_CANDIDATE_MAX]
    log.info("rerank: %d candidates (cap %d)", len(candidates),
             config.RERANK_CANDIDATE_MAX)

    # 4. Rerank
    evidence = rerank_module.rerank(query, candidates, top_k=config.RERANK_TOP_K)
    log.info("rerank done: %d evidence selected", len(evidence))
    T.mark("reranking")

    # 5. Validate
    decision = validator.validate(intent_res, evidence)
    T.mark("validation")

    # Format sources for frontend. The full chunk text ships here (already in
    # memory server-side, so this adds ~0 ms to /ask) and powers the client-side
    # Evidence Explorer: keyword highlighting is done in the browser, never by
    # an extra model pass.
    sources = [{"source": e['source'].split('/')[-1], "page": e['page'], "score": e['rerank_confidence'], "text": e["text"], "category": e.get("category", "")} for e in evidence]

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
        timings = T.emit()
        return RAGResponse(**resp_data, timings=timings)

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
        timings = T.emit()
        return RAGResponse(**resp_data, timings=timings)

    # 7. LLM Generation (ANSWER)
    final_answer = llm_module.generate_answer(query, evidence, decision, extracted)
    T.mark("llm")

    # Never cache transient LLM failures (quota/network errors) — an error
    # string would otherwise be served from the cache for up to CACHE_TTL_SECONDS.
    if final_answer.startswith("LLM Generation Error"):
        log.warning("not caching LLM failure for query %r", query)

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

    if not final_answer.startswith("LLM Generation Error"):
        cache_manager.save_to_cache(query, resp_data)
    timings = T.emit()
    return RAGResponse(**resp_data, timings=timings)


# --- Ingest endpoint (Stage 1: Knowledge Base & Ingestion) ---
class IngestRequest(BaseModel):
    only: Optional[str] = None   # limit to one category folder, e.g. "faculty"
    limit: Optional[int] = None  # cap the number of PDFs (testing)
    reset: bool = False          # drop the collection before ingesting


class IngestResponse(BaseModel):
    ingested: int
    skipped: int        # already in the DB (sha256 match)
    failed: int
    total_chunks: int


@app.post("/ingest", response_model=IngestResponse)
async def ingest_documents(req: IngestRequest):
    """Ingest PDFs from data/ into Milvus.

    Mirrors the CLI ingest flow (main.py cmd_ingest): extract -> chunk ->
    embed -> insert, with sha256 dedupe so re-ingesting a file is a no-op.
    Runs synchronously — Milvus Lite is single-writer, so ingestion must not
    overlap with another write to the same DB.
    """
    files = sorted(config.DATA_DIR.glob("*/*.pdf"))
    if req.only:
        files = [p for p in files if p.parent.name == req.only]
    if req.limit:
        files = files[: req.limit]
    if not files:
        raise HTTPException(status_code=404, detail="No PDFs found under data/.")

    client = MILVUS_CLIENT
    if req.reset:
        store.drop_collection(client)
    store.ensure_collection(client)
    client.load_collection(config.COLLECTION_NAME)

    next_id = store.max_chunk_id(client) + 1
    ingested = skipped = failed = 0
    total_chunks = 0

    for path in files:
        src = config.rel_source(path)
        try:
            sha = config.file_sha256(path)
            if store.has_file(client, sha):
                skipped += 1
                continue
            ext = extract.extract_pdf(path)
            chunks = chunk.chunk_extraction(ext)
            if not chunks:
                log.warning("ingest: no chunks for %s", src)
                failed += 1
                continue
            vectors = embed.embed_texts([c["text"] for c in chunks])
            records = [
                {"chunk_id": next_id + j, **c, "vector": vectors[j].tolist()}
                for j, c in enumerate(chunks)
            ]
            store.insert_records(client, records)
            next_id += len(chunks)
            total_chunks += len(chunks)
            ingested += 1
            log.info("ingested %s (%d chunks)", src, len(chunks))
        except extract.ExtractionError:
            log.warning("ingest: extraction failed for %s", src)
            failed += 1
        except Exception:
            log.exception("ingest failed for %s", src)
            failed += 1

    return IngestResponse(
        ingested=ingested, skipped=skipped, failed=failed, total_chunks=total_chunks
    )
