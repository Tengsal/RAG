# ADTU Evidence-Based RAG — Backend

Evidence-preserving ingestion + retrieval pipeline for the Assam down town
University corpus. **No summarization, no FAQ generation, no rewriting** —
documents are extracted verbatim, chunked structurally, embedded with
[BGE-M3](https://huggingface.co/BAAI/bge-m3), and stored in a **single**
Milvus collection. Retrieval returns exact citations: original filename +
physical page number + verbatim passage.

## Layout

```
backend/
├── data/                    # ADTU PDFs (11 category folders) — READ-ONLY, never modified
├── parser/extract.py        # PDF -> semantic units (PyMuPDF structured + PaddleOCR)
├── parser/chunk.py          # units -> verbatim chunks (headings glued, tables intact)
├── embeddings/embed.py      # BGE-M3 (1024-dim, L2-normalized, CPU)
├── vectordb/store.py        # Milvus Lite: one collection `adtu_chunks`
├── retrieval/search.py      # cosine search -> evidence dicts (no generation)
├── main.py                  # CLI: ingest / search / stats
└── adtu_milvus.db           # Milvus Lite database file (created on first ingest)
```

## Usage (run from `backend/`)

```powershell
.\.venv\Scripts\python.exe main.py ingest                 # full corpus (resumable)
.\.venv\Scripts\python.exe main.py ingest --dry-run       # extract+chunk only, no DB/model
.\.venv\Scripts\python.exe main.py ingest --only Fee_Structure --limit 2
.\.venv\Scripts\python.exe main.py search "NIRF placement ratio" --top-k 3
.\.venv\Scripts\python.exe main.py search "exam form" --category examination_Rules
.\.venv\Scripts\python.exe main.py stats
```

- **Resume/dedupe**: every file is hashed (sha256); already-ingested files log
  `SKIP`. Safe to interrupt and re-run — nothing is re-processed.
- **`--reset`**: drops the collection and starts over. Combine with `--only`
  to re-ingest one category (e.g. after changing chunking or OCR settings).
- **One ingest process at a time** — Milvus Lite is single-writer.

## Extraction rules

- Filename contains `(ocr needed)` → whole file through PaddleOCR.
- Otherwise PyMuPDF structured extraction (headings via font/pattern, tables
  via `find_tables`, page numbers kept per unit).
- Pages with < 30 chars of text → OCR for that page; if > 50% of pages
  trigger, the whole file goes through OCR (catches unflagged scans).
- Both paths empty → file skipped with a WARN. Original PDFs are opened
  read-only and never modified.

## Chunking rules

- Chunks never span pages; headings glue to the body that follows them.
- Tables are never split mid-way: large tables stand alone, small tables keep
  their rows intact but share a chunk with adjacent page content (so form
  labels and their values stay together).
- Soft target 1100 chars, hard max 2200 (exceeded only by large tables);
  splits happen only at line/sentence boundaries.

## Environment variables

| Var | Default | Meaning |
|---|---|---|
| `ADTU_MILVUS_DB` | `backend/adtu_milvus.db` | Milvus Lite database file path |
| `MILVUS_URI` | *(unset)* | Set to `http://host:19530` to use a full Milvus server instead of Lite. Do **not** point it at a file path — pymilvus reserves this var for server addresses. |
| `ADTU_OCR_DPI` | `200` | Render DPI for PaddleOCR |
| `ADTU_OCR_MODELS` | `tiny` | PP-OCRv6 variant: `tiny` (~8 s/page CPU) / `small` / `medium` (~76 s/page) |

## Retrieval output contract

Each evidence item maps 1:1 onto the frontend `Message.sources[]` type:

```
{score: retrievalScore, chunk_id, text: snippet,
 source: documentName, page: pageNumber, category}
```

`score` is cosine similarity in [-1, 1] (BGE-M3 embeddings are L2-normalized,
index metric is COSINE). Retrieval returns evidence only — the answer layer
lives in the frontend/app and must cite these sources.

## Setup notes (Windows, Python 3.13)

```powershell
python -m venv --system-site-packages .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

- **Milvus Lite on Windows**: pymilvus's `[milvus_lite]` extra excludes
  `win32`, but `milvus-lite>=3.2` is pure-Python (faiss-backed) and works —
  install it directly (requirements.txt already does).
- **PaddleOCR oneDNN crash**: `PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT=0` is set in
  `parser/extract.py` before the paddle import (Windows + PIR + MKLDNN crashes
  otherwise).
- **BGE-M3** (~2.2 GB) downloads from HuggingFace on first use. If HF is
  unreachable, set `HF_ENDPOINT=https://hf-mirror.com`.
- PaddleOCR models cache under `C:\Users\<you>\.paddlex\official_models\`.
