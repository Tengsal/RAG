"""Structure-aware chunking: semantic units -> verbatim chunks.

Evidence-preservation rules:
- Chunks are contiguous verbatim text — never rewritten or reordered.
- Chunks never span pages (page number stays exact per chunk).
- Tables are never split mid-way: large tables stand alone; small tables
  keep their rows intact but share a chunk with adjacent page content.
- Headings stay glued to the body/table that follows them.
- Splits happen only at paragraph / list-item / sentence boundaries.
"""

import re

import config

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


def _split_oversized(text: str) -> list:
    """Split one oversized paragraph at line, then sentence, boundaries and
    re-merge small pieces back up to the soft target."""
    parts = []
    for line in text.split("\n"):
        if len(line) <= config.CHUNK_HARD_MAX_CHARS:
            parts.append(line)
        else:
            parts.extend(s for s in _SENT_SPLIT.split(line) if s.strip())
    out, cur = [], ""
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if cur and len(cur) + len(p) + 1 > config.CHUNK_TARGET_CHARS:
            out.append(cur)
            cur = p
        else:
            cur = p if not cur else cur + "\n" + p
    if cur:
        out.append(cur)
    return out


def chunk_extraction(ext: config.DocExtraction) -> list:
    """DocExtraction -> list of {text, source, page, category, file_sha}.

    chunk_id is assigned later by the ingest runner so ids stay contiguous
    per run (the DB primary key is the single source of truth for ids).
    """
    chunks = []
    buf = ""                    # accumulating verbatim body text
    buf_page = None
    pending_heading = None      # heading waits to bind to following body
    heading_page = None

    def emit(text: str, page: int) -> None:
        t = text.strip()
        if t:
            chunks.append({
                "text": t,
                "page": page,
                "source": ext["source"],
                "category": ext["category"],
                "file_sha": ext["file_sha"],
            })

    def flush() -> None:
        nonlocal buf, buf_page, pending_heading, heading_page
        if pending_heading is not None:
            emit(pending_heading, heading_page)   # heading alone at boundary
            pending_heading = None
            heading_page = None
        if buf:
            emit(buf, buf_page)
            buf = ""
            buf_page = None

    for unit in ext["units"]:
        # Chunks never span pages — close whatever is open.
        if buf_page is not None and unit["page"] != buf_page:
            flush()
        elif pending_heading is not None and heading_page != unit["page"]:
            flush()

        if unit["kind"] == "heading":
            flush()                     # closes previous semantic unit
            pending_heading = unit["text"]
            heading_page = unit["page"]
            continue

        body = unit["text"]
        if pending_heading is not None:
            body = pending_heading + "\n" + body
            pending_heading = None
            heading_page = None

        if unit["kind"] == "table" and len(body) > config.CHUNK_TARGET_CHARS:
            flush()                     # large tables stand alone (atomic)
            emit(body, unit["page"])
            continue

        # Small tables keep their rows intact but share a chunk with the
        # adjacent content around them, so labels and values stay together.
        sep = "\n\n" if unit["kind"] == "table" else "\n"
        if buf and len(buf) + len(body) + len(sep) > config.CHUNK_TARGET_CHARS:
            flush()
        if len(body) > config.CHUNK_HARD_MAX_CHARS:
            for part in _split_oversized(body):
                flush()
                emit(part, unit["page"])
            continue
        buf = body if not buf else buf + sep + body
        buf_page = unit["page"]

    flush()
    return chunks
