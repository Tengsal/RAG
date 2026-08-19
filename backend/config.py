"""Shared constants, env helpers and data shapes for the ADTU RAG pipeline.

Everything that could need tuning lives here so no other module hardcodes
values. Data shapes are TypedDicts imported by all modules so the structures
flowing between them can't drift.
"""

import hashlib
import os
from pathlib import Path
from typing import List, TypedDict

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
