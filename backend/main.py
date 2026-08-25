"""ADTU evidence RAG pipeline CLI.

Usage (run from backend/):
  python main.py ingest  [--reset] [--only FOLDER] [--limit N] [--dry-run]
  python main.py search  "query" [--top-k N] [--category X]
  python main.py ask     "query" [--top-k N]  <-- Smart Intent + Search + Validator
  python main.py stats
  python main.py intent  "query"

Milvus Lite is single-writer: run at most one ingest process at a time.
"""

import argparse
import gc
import logging
import sys
import time

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

log = logging.getLogger("adtu")


def _setup_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )


def _discover_files(only: str | None, limit: int | None) -> list:
    files = sorted(config.DATA_DIR.glob("*/*.pdf"))
    if only:
        files = [p for p in files if p.parent.name == only]
    if limit:
        files = files[:limit]
    return files


# --------------------------------------------------------------------------
# ingest
# --------------------------------------------------------------------------

def cmd_ingest(args) -> int:
    files = _discover_files(args.only, args.limit)
    if not files:
        log.error("no PDFs found under data/ (only=%s)", args.only)
        return 1

    if args.dry_run:
        for i, path in enumerate(files, 1):
            src = config.rel_source(path)
            try:
                ext = extract.extract_pdf(path)
                chunks = chunk.chunk_extraction(ext)
                last_page = ext["units"][-1]["page"] if ext["units"] else 0
                chars = sum(len(c["text"]) for c in chunks)
                log.info("DRY [%d/%d] %-60s pages=%d ocr_pages=%d units=%d chunks=%d chars=%d",
                         i, len(files), src, last_page, len(ext["ocr_pages"]),
                         len(ext["units"]), len(chunks), chars)
            except extract.ExtractionError as e:
                log.warning("DRY [%d/%d] %s -> %s", i, len(files), src, e)
            except Exception:
                log.exception("DRY FAIL [%d/%d] %s", i, len(files), src)
        return 0

    client = store.get_client()
    if args.reset:
        store.drop_collection(client)
    store.ensure_collection(client)
    client.load_collection(config.COLLECTION_NAME)

    next_id = store.max_chunk_id(client) + 1
    t0 = time.time()
    ingested = skipped = failed = 0
    total_chunks = 0
    for i, path in enumerate(files, 1):
        src = config.rel_source(path)
        t_file = time.time()
        try:
            sha = config.file_sha256(path)
            if store.has_file(client, sha):
                log.info("SKIP [%d/%d] %s (already ingested, sha=%s...)",
                         i, len(files), src, sha[:10])
                skipped += 1
                continue
            ext = extract.extract_pdf(path)
            chunks = chunk.chunk_extraction(ext)
            if not chunks:
                log.warning("WARN [%d/%d] %s produced no chunks", i, len(files), src)
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
            last_page = ext["units"][-1]["page"] if ext["units"] else 0
            log.info("INGEST [%d/%d] %-60s pages=%d ocr_pages=%d chunks=%d (+%.0fs)",
                     i, len(files), src, last_page, len(ext["ocr_pages"]),
                     len(chunks), time.time() - t_file)
            ingested += 1
            del ext, chunks, vectors, records
            gc.collect()
        except extract.ExtractionError as e:
            log.warning("WARN [%d/%d] %s -> %s", i, len(files), src, e)
            failed += 1
        except Exception:
            log.exception("FAIL [%d/%d] %s", i, len(files), src)
            failed += 1

    log.info("done: ingested=%d skipped=%d failed=%d total_chunks=%d elapsed=%.0fs",
             ingested, skipped, failed, total_chunks, time.time() - t0)
    return 0


# --------------------------------------------------------------------------
# search (Standard manual search)
# --------------------------------------------------------------------------

def cmd_search(args) -> int:
    client = store.get_client()
    if not client.has_collection(config.COLLECTION_NAME):
        log.error("no collection yet — run ingest first")
        return 1
    if store.count_rows(client) == 0:
        log.error("collection is empty — run ingest first")
        return 1
    client.load_collection(config.COLLECTION_NAME)
    evidence = ret_search.search(client, embed, args.query,
                                 top_k=args.top_k, category=args.category)
    if not evidence:
        print("No evidence found.")
        return 0
    print(ret_search.format_evidence(evidence))
    return 0


# --------------------------------------------------------------------------
# ask (Phases 2, 3, 4, 5, 7, 8: Full Smart Pipeline)
# --------------------------------------------------------------------------

def cmd_ask(args) -> int:
    client = store.get_client()
    if not client.has_collection(config.COLLECTION_NAME):
        log.error("no collection yet — run ingest first")
        return 1
    if store.count_rows(client) == 0:
        log.error("collection is empty — run ingest first")
        return 1

    query = args.query
    print(f"\nQUERY: {query}\n")

    # ---- 0. Cache Check (Phase 9) ----
    cached = cache_manager.get_cached_response(query)
    if cached:
        print("⚡ CACHE HIT! Returning instantly (skipping Milvus & LLM)...")
        print("\n" + "=" * 60)
        print(
            f"✅ FINAL VERIFIED RESPONSE | 🛡️ CONFIDENCE: "
            f"{cached['confidence_label']} ({cached['confidence_score']:.2f}) [CACHED]"
        )
        print("=" * 60)
        print(cached["final_answer"])
        print("=" * 60)
        return 0

    # ---- 1. Intent Detection (Phase 2) ----
    print("⏳ Detecting intent...")
    result = intent_module.detect_intent(query)
    print(f"🎯 Detected Intent: {result['intent']} (Confidence: {result['confidence']:.4f})")
    if result["ambiguous"]:
        print(f"⚠️  Ambiguous query (alternative: {result['alternative_intent']})")

    # ---- 1.5 Entity Extraction (Phase 2 Part 2) ----
    extracted = entity_module.extract_entities(query)
    has_entities = any(extracted[k] for k in extracted)
    if has_entities:
        print("🏷️  Extracted Entities:")
        for k, v in extracted.items():
            if v:
                print(f"   - {k.capitalize()}: {v}")

    # ---- 2. Adaptive Retrieval Controller (Phase 3) ----
    plan = controller.build_search_plan(query, result)
    print(f"🧭 Knowledge type: {plan['knowledge_type'].upper()}")
    print(f"📂 Filtered search in: {plan['categories']}")
    print("-" * 60)

    # ---- 3. Filtered Milvus search + merge (CANDIDATE stage) ----
    client.load_collection(config.COLLECTION_NAME)
    merged = []
    for cat in plan["categories"]:
        merged += ret_search.search(client, embed, query,
                                    top_k=config.CANDIDATE_TOP_K, category=cat)

    # Deduplicate by chunk_id, keep best score
    best = {}
    for e in merged:
        cid = e["chunk_id"]
        if cid not in best or e["score"] > best[cid]["score"]:
            best[cid] = e
    candidates = sorted(best.values(), key=lambda x: x["score"], reverse=True)

    # ---- 4. Weak evidence -> full-database fallback ----
    if not candidates or candidates[0]["score"] < config.RETRIEVAL_MIN_SCORE:
        print("⚠️  Weak evidence in filtered categories — expanding to FULL search...")
        candidates = ret_search.search(client, embed, query,
                                       top_k=config.CANDIDATE_TOP_K, category=None)

    if not candidates:
        print("❌ No evidence found.")
        return 0

    print(f"🎲 Candidates from Milvus: {len(candidates)}")
    print("🎯 Reranking with cross-encoder...")

    # ---- 5. Cross-Encoder Reranker (Phase 4) ----
    evidence = rerank_module.rerank(query, candidates, top_k=args.top_k)

    # ---- 6. Epistemic Validator (Phase 5) ----
    decision = validator.validate(result, evidence)
    
    print(f"\n🧠 EPISTEMIC DECISION: {decision['action']}")
    print(f"📊 Composite Confidence: {decision['confidence']:.4f} | Uncertainty: {decision['uncertainty']:.4f}")
    for reason in decision['reasons']:
        print(f"   - {reason}")
    print("-" * 60)

    if decision["action"] == config.ACTION_REFUSE:
        print("\n🛑 RESPONSE:")
        print("I couldn't find this information in the available university documents.")
        return 0

    if decision["action"] == config.ACTION_CLARIFY:
        print("\n❓ CLARIFICATION NEEDED:")
        # Pass the intent, the entities we extracted, and the retrieved evidence
        question = clarify_module.generate_clarification(result, extracted, evidence)
        print(question)
        return 0

    # If ANSWER, proceed to LLM Generation (Phase 7 & 8)
    print("\n🤖 GENERATING GROUNDED ANSWER...\n")
    
    final_answer = llm_module.generate_answer(
        query=query, 
        evidence=evidence, 
        decision=decision, 
        entities=extracted
    )
    
    # Calculate Confidence Badge for the UI (High/Medium/Low) based on Phase 5 Math
    conf_score = decision['confidence']
    if conf_score >= config.THRESHOLD_HIGH:
        conf_label = "HIGH 🟢"
    elif conf_score >= config.THRESHOLD_LOW:
        conf_label = "MEDIUM 🟡"
    else:
        conf_label = "LOW 🔴"

    # Print the final verified response matching Section 3 of the research notes
    print("\n" + "="*60)
    print(f"✅ FINAL VERIFIED RESPONSE | 🛡️ CONFIDENCE: {conf_label} ({conf_score:.2f})")
    print("="*60)
    print(final_answer)
    print("="*60)
    
    # Optional: Still print the raw evidence below for debugging
    print("\n📚 RAW EVIDENCE USED:\n")
    print(ret_search.format_evidence(evidence))

    # Save to Cache (Phase 9)
    cache_manager.save_to_cache(query, {
        "final_answer": final_answer,
        "confidence_score": conf_score,
        "confidence_label": conf_label,
    })

    return 0


# --------------------------------------------------------------------------
# stats & intent
# --------------------------------------------------------------------------

def cmd_stats(args) -> int:
    client = store.get_client()
    if not client.has_collection(config.COLLECTION_NAME):
        print("No collection yet — run ingest first.")
        return 0
    client.load_collection(config.COLLECTION_NAME)
    s = store.stats(client)
    print(f"row_count: {s['row_count']}")
    print("per_category:")
    for c, n in sorted(s["per_category"].items(), key=lambda kv: -kv[1]):
        print(f"  {c:24s} {n}")
    return 0

def cmd_intent(args) -> int:
    query = args.query
    print(f"\nQUERY: {query}\n")
    result = intent_module.detect_intent(query)
    print("INTENT ANALYSIS\n")
    top_k = config.INTENT_TOP_K
    ranking = result['ranking'][:top_k]
    for i, (intent_name, score) in enumerate(ranking, 1):
        print(f"{i}. {intent_name:<22} {score:.4f}")
    print(f"\nFINAL INTENT: {result['intent']}")
    print(f"CONFIDENCE: {result['confidence']:.4f}")
    print(f"AMBIGUOUS: {result['ambiguous']}")
    if result['ambiguous'] and result['alternative_intent']:
        print(f"ALTERNATIVE INTENT: {result['alternative_intent']}")
    print("")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="main.py",
        description="ADTU evidence-based RAG pipeline",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_ingest = sub.add_parser("ingest", help="extract + chunk + embed + store all PDFs")
    p_ingest.add_argument("--reset", action="store_true")
    p_ingest.add_argument("--only", metavar="FOLDER")
    p_ingest.add_argument("--limit", type=int, metavar="N")
    p_ingest.add_argument("--dry-run", action="store_true")

    p_search = sub.add_parser("search", help="manual evidence-only retrieval")
    p_search.add_argument("query")
    p_search.add_argument("--top-k", type=int, default=config.DEFAULT_TOP_K)
    p_search.add_argument("--category", help="restrict to one data/ folder")

    p_ask = sub.add_parser("ask", help="smart search: intent + retrieval + rerank + validate")
    p_ask.add_argument("query")
    p_ask.add_argument("--top-k", type=int, default=config.DEFAULT_TOP_K)

    sub.add_parser("stats", help="collection row counts")

    p_intent = sub.add_parser("intent", help="detect query intent and confidence")
    p_intent.add_argument("query")

    args = parser.parse_args()
    _setup_logging(args.verbose)
    
    if args.cmd == "ingest": return cmd_ingest(args)
    if args.cmd == "search": return cmd_search(args)
    if args.cmd == "ask": return cmd_ask(args)
    if args.cmd == "stats": return cmd_stats(args)
    if args.cmd == "intent": return cmd_intent(args)
    
    parser.error(f"unknown command {args.cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
