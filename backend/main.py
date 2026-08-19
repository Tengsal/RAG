"""ADTU evidence RAG pipeline CLI.

Usage (run from backend/):
  python main.py ingest  [--reset] [--only FOLDER] [--limit N] [--dry-run]
  python main.py search  "query" [--top-k N] [--category X]
  python main.py stats

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
        # Extraction + chunking only: no model load, no DB writes.
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
# search
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
# stats
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


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="main.py",
        description="ADTU evidence-based RAG pipeline (ingest / search / stats)",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_ingest = sub.add_parser("ingest", help="extract + chunk + embed + store all PDFs")
    p_ingest.add_argument("--reset", action="store_true",
                          help="drop the collection and re-ingest everything")
    p_ingest.add_argument("--only", metavar="FOLDER",
                          help="only process PDFs in this data/ subfolder")
    p_ingest.add_argument("--limit", type=int, metavar="N",
                          help="only consider the first N PDFs")
    p_ingest.add_argument("--dry-run", action="store_true",
                          help="extract + chunk only (no model, no DB writes)")

    p_search = sub.add_parser("search", help="evidence-only retrieval")
    p_search.add_argument("query")
    p_search.add_argument("--top-k", type=int, default=config.DEFAULT_TOP_K)
    p_search.add_argument("--category", help="restrict to one data/ folder")

    sub.add_parser("stats", help="collection row counts")

    args = parser.parse_args()
    _setup_logging(args.verbose)
    if args.cmd == "ingest":
        return cmd_ingest(args)
    if args.cmd == "search":
        return cmd_search(args)
    if args.cmd == "stats":
        return cmd_stats(args)
    parser.error(f"unknown command {args.cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
