"""Shared constants, env helpers and data shapes for the ADTU RAG pipeline.

Everything that could need tuning lives here so no other module hardcodes
values. Data shapes are TypedDicts imported by all modules so the structures
flowing between them can't drift.
"""

import hashlib
import os
import re
from pathlib import Path
from typing import Dict, List, TypedDict

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"                      # original PDFs — READ-ONLY
DEFAULT_DB_URI = str(BASE_DIR / "adtu_milvus.db") # Milvus Lite file

COLLECTION_NAME = "adtu_chunks"
EMBED_MODEL_NAME = "BAAI/bge-m3"
EMBED_DIM = 1024
EMBED_BATCH_SIZE = 16
INSERT_BATCH_SIZE = 128

CHUNK_TARGET_CHARS = 1100      # soft target; BGE-M3 context is 8192 tokens
CHUNK_HARD_MAX_CHARS = 2200    # only exceeded by atomic tables

OCR_MIN_CHARS = 30             # page below this -> OCR that page
OCR_MARKER = "(ocr needed)"    # filename trigger -> OCR whole file
OCR_DPI = 200
OCR_FULL_PAGE_RATIO = 0.5      # >50% pages OCR-triggered -> OCR whole file

DEFAULT_TOP_K = 5

# -----------------------------
# Phase 2 Step 1: Intent Detection
# -----------------------------
# Number of top intent matches to display/return.
INTENT_TOP_K = int(os.environ.get("INTENT_TOP_K", "3"))

# If the difference between the top-1 and top-2 intent scores is <= this margin,
# the query is treated as ambiguous.
INTENT_AMBIGUITY_MARGIN = float(os.environ.get("INTENT_AMBIGUITY_MARGIN", "0.05"))

# Data folders under data/ — one per category (also used by stats).
CATEGORIES = [
    "admissions",
    "Academic_programs",
    "curriculum",
    "Academic_Regulations",
    "examination_Rules",
    "faculty",
    "Fee_Structure",
    "Notices_and_Circulars",
    "placements",
    "practice_school",
    "University_Documents",
]

# -----------------------------
# Phase 2 Step 3: Adaptive Retrieval Controller
# -----------------------------
# If the best retrieval score inside the searched categories is below this,
# expand the search to the ENTIRE collection (recall safety net).
RETRIEVAL_MIN_SCORE = float(os.environ.get("RETRIEVAL_MIN_SCORE", "0.40"))

# Cross-category peek map: when searching the top intent, ALSO search these
# related categories (e.g. placement notices live in Notices_and_Circulars,
# not in placements).
INTENT_RELATED_CATEGORIES: Dict[str, List[str]] = {
    "placements": ["Notices_and_Circulars"],
    "practice_school": ["placements"],
    "examination_Rules": ["Notices_and_Circulars", "Academic_Regulations"],
    "Academic_Regulations": ["examination_Rules"],
    "admissions": ["Fee_Structure"],
    "Fee_Structure": ["admissions"],
    "curriculum": ["Academic_programs"],
    "Academic_programs": ["curriculum"],
}

# -----------------------------
# Phase 3: Static vs Dynamic Knowledge
# -----------------------------
# STATIC: changes rarely (structure, rules, programs, fees).
STATIC_CATEGORIES = [
    "admissions",
    "Academic_programs",
    "curriculum",
    "Academic_Regulations",
    "examination_Rules",
    "faculty",
    "Fee_Structure",
    "practice_school",
    "University_Documents",
]

# DYNAMIC: changes often (notices, drives, deadlines, announcements).
DYNAMIC_CATEGORIES = [
    "Notices_and_Circulars",
    "placements",
]

# Words that signal the user wants fresh / time-bound info -> lean dynamic.
TEMPORAL_KEYWORDS = [
    "when", "next", "latest", "current", "recent",
    "deadline", "last date", "drive", "notice",
    "circular", "announcement", "event", "today",
    "2024", "2025", "2026", "2027",
]

# -----------------------------
# Phase 4: Cross-Encoder Reranker
# -----------------------------
# Candidate chunks pulled from Milvus BEFORE reranking.
CANDIDATE_TOP_K = int(os.environ.get("CANDIDATE_TOP_K", "20"))

# Chunks kept AFTER cross-encoder reranking.
RERANK_TOP_K = int(os.environ.get("RERANK_TOP_K", "5"))

# Small + fast on CPU. For higher accuracy (slower), switch to
# "BAAI/bge-reranker-v2-m3" — same family as BGE-M3.
# Benchmarked 2026-08-27: L-2-v2 is ~40% faster than L-6-v2 but its
# rerank confidences collapse to near-zero on ~3/5 benchmark queries,
# flipping ANSWER -> REFUSE/CLARIFY and dropping the answer-bearing
# chunk (e.g. fees.pdf for the BCA fee query). Kept L-6-v2 for recall.
RERANKER_MODEL_NAME = os.environ.get(
    "RERANKER_MODEL_NAME", "cross-encoder/ms-marco-MiniLM-L-6-v2"
)

# Rerank pool bound: keep only the top-N unique chunks by retrieval (cosine)
# score before cross-encoder reranking. The cross-encoder is the per-request
# cost center (~60 ms/pair on CPU for MiniLM-L6), and the union retrieval
# (category searches + always-on global sweep) already ranks candidates by
# cosine, so reranking the best N preserves recall for the answer-bearing
# chunks while cutting the dominant stage ~3x. Raise this if source
# verification shows regressions.
RERANK_CANDIDATE_MAX = int(os.environ.get("RERANK_CANDIDATE_MAX", "20"))

# -----------------------------
# Phase 5: Epistemic / Evidence Validator & Uncertainty Score
# -----------------------------
# Weights for combining the 4 signals into a single Composite Confidence score.
# They must sum to 1.0. (Section 6 & 14 of research notes)
# Reranker stays dominant but cedes 0.10 to the new coverage signal so a
# single lucky chunk can no longer carry the whole score on its own.
W_INTENT = 0.20     # How well the query matches the university domain.
W_RETRIEVER = 0.25  # Milvus cosine similarity (broad match).
W_RERANKER = 0.40   # Cross-encoder confidence (deep, exact match).
W_COVERAGE = 0.15   # Citation/chunk agreement across the top-3 chunks.

# Thresholds for the Decision Gate (Section 8 & 14 of research notes).
THRESHOLD_HIGH = 0.45   # Lowered so it answers more readily
THRESHOLD_LOW = 0.20    # Lowered so it only refuses truly irrelevant queries
                        # Between LOW and HIGH -> CLARIFY (ask user to specify).

# The 3 possible actions the validator can return.
ACTION_ANSWER = "ANSWER"
ACTION_CLARIFY = "CLARIFY"
ACTION_REFUSE = "REFUSE"

# -----------------------------
# Phase 9: Caching (Redis / In-Memory Fallback)
# -----------------------------

# Enable or disable the cache entirely.
CACHE_ENABLED = os.environ.get("CACHE_ENABLED", "true").lower() == "true"

# Time-to-live for cached answers (in seconds). 1 hour = 3600s.
CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "3600"))

# Redis connection settings (if running locally).
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))

# Fail-fast Redis timeouts (seconds). If Redis is unreachable, the cache layer
# must fall back to the in-memory cache in milliseconds — not after an OS TCP
# SYN timeout of 20-50 s on the first request.
REDIS_CONNECT_TIMEOUT = float(os.environ.get("REDIS_CONNECT_TIMEOUT", "1.0"))
REDIS_SOCKET_TIMEOUT = float(os.environ.get("REDIS_SOCKET_TIMEOUT", "1.0"))

# -----------------------------
# Phase 7/8: Grounded LLM Generation
# -----------------------------
# Gemini model for grounded generation. Benchmark candidates on this setup:
#   gemini-2.5-flash      - default, strong + fast
#   gemini-2.5-flash-lite - smaller/faster, benchmarked for this workload
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# Hard cap on generated tokens: bounds generation latency and keeps answers
# concise. Citations are mandatory, so the cap stays generous enough for a
# 2-4 sentence cited answer.
LLM_MAX_OUTPUT_TOKENS = int(os.environ.get("LLM_MAX_OUTPUT_TOKENS", "400"))

# Semantic intent descriptions used for Phase 2 Step 1 intent detection.
#
# These are intentionally richer than folder names. Each description represents
# the meaning of that intent, so a user question can be embedded and compared
# against these intent embeddings using cosine similarity.
INTENT_DESCRIPTIONS: Dict[str, str] = {
    "admissions": (
        "Questions about admission eligibility, admission process, application forms, "
        "how to apply, entry requirements, selection criteria, entrance requirements, "
        "documents required for admission, admission deadlines, joining the university, "
        "new student enrollment, admission rules, admission procedure, and admission-related queries."
    ),

    "Academic_programs": (
        "Questions about academic programs, courses offered, degree programs, departments, "
        "schools, undergraduate programs, postgraduate programs, diploma programs, BTech, BCA, MCA, "
        "MBA, BSc, MSc, program duration, available branches, specializations, course choices, "
        "and what programs are available at the university."
    ),

    "curriculum": (
        "Questions about curriculum, syllabus, subjects, semester-wise course structure, "
        "course contents, modules, credits, learning outcomes, subject lists, academic scheme, "
        "program structure, semester plans, electives, course units, and what students study in a program."
    ),

    "Academic_Regulations": (
        "Questions about academic regulations, university academic rules, attendance rules, "
        "promotion rules, grading rules, credit requirements, academic policies, semester regulations, "
        "student academic responsibilities, eligibility to progress, backlogs, academic discipline, "
        "degree requirements, and official academic procedures."
    ),

    "examination_Rules": (
        "Questions about examination rules, exam eligibility, exam form fill-up, exam schedule, "
        "internal assessment, external exams, marks, grading, revaluation, supplementary exams, "
        "back paper exams, exam procedures, passing criteria, admit cards, results, and examination policies."
    ),

    "faculty": (
        "Questions about faculty members, teachers, professors, departments, staff profiles, "
        "faculty qualifications, contact details, teaching staff, academic mentors, department faculty, "
        "faculty expertise, and information about university instructors or academic staff."
    ),

    "Fee_Structure": (
        "Questions about course fees, tuition fees, admission fees, semester fees, hostel fees, "
        "payment details, fee structure, fee amount, charges, installments, scholarships related to fees, "
        "refunds, fee deadlines, program-wise fees, and total cost of studying at the university."
    ),

    "Notices_and_Circulars": (
        "Questions about notices, circulars, announcements, official updates, deadlines, events, "
        "recent notifications, university news, important dates, student announcements, office orders, "
        "academic notices, administrative circulars, and newly published information."
    ),

    "placements": (
        "Questions about student placements, campus recruitment, recruiters, companies visiting campus, "
        "placement percentage, placement statistics, salary packages, highest package, average package, "
        "job offers, career opportunities, internships related to employment, training and placement cell, "
        "placement records, and employment outcomes."
    ),

    "practice_school": (
        "Questions about Practice School, practical training, industry training, field work, "
        "practice-based learning, internships as part of curriculum, industry exposure, experiential learning, "
        "student projects, practical assignments, workplace training, and practice school rules or requirements."
    ),

    "University_Documents": (
        "Questions about official university documents, policies, institutional information, accreditation, "
        "statutory documents, university reports, approvals, governance documents, official records, "
        "general university information, administrative documents, and broad institutional details."
    ),
}


class PageUnit(TypedDict):
    kind: str       # "heading" | "text" | "table"
    text: str       # verbatim content
    page: int       # 1-based physical PDF page
    level: int      # 0 = not heading (kept for future use)


class DocExtraction(TypedDict):
    source: str     # relative posix path, e.g. "admissions/brochure-2026(ocr needed).pdf"
    category: str   # top-level data folder name
    file_sha: str   # sha256 hex of the file bytes (resume/dedupe)
    units: List[PageUnit]
    ocr_pages: List[int]   # pages processed by OCR (1-based)
    warnings: List[str]


class Chunk(TypedDict):
    text: str
    source: str
    page: int
    chunk_id: int
    category: str
    file_sha: str


def env_str(key: str, default: str) -> str:
    v = os.environ.get(key)
    return v if v else default


def env_int(key: str, default: int) -> int:
    v = os.environ.get(key)
    return int(v) if v else default


def normalize_query(query: str) -> str:
    """Canonical key form: lowercase, punctuation collapsed to single spaces.

    Used by both the cache layer and the embedding memo so "Who is the VC?"
    and "who is the vc" hit the same cached answer and vector.
    """
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", query.strip().lower()).split())


def file_sha256(path: Path) -> str:
    """sha256 hex of file bytes, streamed in 1 MB blocks."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            block = f.read(1 << 20)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def rel_source(path: Path) -> str:
    """Path relative to DATA_DIR in posix form, e.g. 'placements/Overall-NIRF2024.pdf'."""
    return path.relative_to(DATA_DIR).as_posix()
