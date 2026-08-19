"""PDF -> ordered semantic units (heading / text / table), verbatim.

Evidence-preserving extraction:
- PyMuPDF structured extraction for normal pages (headings via font size /
  bold / numbering patterns, tables via find_tables kept as atomic units).
- PaddleOCR for pages whose filename carries "(ocr needed)", for pages whose
  PyMuPDF text is (near-)empty, and for whole files where most pages are
  scans (catches unflagged image-heavy PDFs like sif-pharmacy.pdf).
- Original PDFs are opened read-only and never modified.
"""

import logging
import os
import re

import pymupdf as fitz  # PyMuPDF (module renamed; fitz alias kept for brevity)
import numpy as np

import config

log = logging.getLogger(__name__)

HEADING_PATTERN = re.compile(r"^\d+(\.\d+)*[\).]?\s+\S")


class ExtractionError(Exception):
    """Raised when a file yields no text from either extraction path."""


def extract_pdf(pdf_path) -> config.DocExtraction:
    """Extract one PDF into ordered PageUnits.

    Raises ExtractionError only when both extraction paths yield nothing
    (e.g. a file with no text layer and unreadable images).
    """
    source = config.rel_source(pdf_path)
    category = pdf_path.parent.name
    file_sha = config.file_sha256(pdf_path)
    force_ocr = config.OCR_MARKER in pdf_path.name

    doc = fitz.open(str(pdf_path))
    try:
        n = doc.page_count

        # Pass 1: decide per-page strategy. Forced files skip this entirely —
        # their PyMuPDF output would be discarded anyway.
        normal_cache = {}
        ocr_flags = [False] * n
        if force_ocr:
            ocr_flags = [True] * n
        else:
            for i, page in enumerate(doc):
                units = _extract_page_normal(page, i + 1)
                normal_cache[i] = units
                if sum(len(u["text"]) for u in units) < config.OCR_MIN_CHARS:
                    ocr_flags[i] = True
            if sum(ocr_flags) / max(n, 1) > config.OCR_FULL_PAGE_RATIO:
                ocr_flags = [True] * n

        # Pass 2: produce units.
        units = []
        ocr_pages = []
        for i, page in enumerate(doc):
            if ocr_flags[i]:
                page_units = _extract_page_ocr(page, i + 1)
                if page_units:
                    ocr_pages.append(i + 1)
            else:
                page_units = normal_cache[i]
            units.extend(page_units)

        total_chars = sum(len(u["text"]) for u in units)
        if total_chars == 0:
            raise ExtractionError("no text from PyMuPDF or OCR")
        return config.DocExtraction(
            source=source,
            category=category,
            file_sha=file_sha,
            units=units,
            ocr_pages=ocr_pages,
            warnings=[],
        )
    finally:
        doc.close()


# --------------------------------------------------------------------------
# PyMuPDF path
# --------------------------------------------------------------------------

def _bbox_intersects(a, b) -> bool:
    return not (a[2] <= b[0] or a[0] >= b[2] or a[3] <= b[1] or a[1] >= b[3])


def _extract_page_normal(page, page_no) -> list:
    """Structure-aware PyMuPDF extraction of one page."""
    d = page.get_text("dict")
    try:
        tables = list(page.find_tables())
    except Exception:
        tables = []
    tboxes = [t.bbox for t in tables]

    sizes = [
        s["size"]
        for b in d["blocks"] if b.get("type") == 0
        for l in b.get("lines", [])
        for s in l.get("spans", [])
    ]
    median_size = float(np.median(sizes)) if sizes else 11.0

    items = []  # (y0, PageUnit) then sorted into reading order
    for block in d["blocks"]:
        if block.get("type") != 0:           # skip image blocks
            continue
        if any(_bbox_intersects(block["bbox"], tb) for tb in tboxes):
            continue                          # table row text replaces these
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            text = "".join(s["text"] for s in spans).strip()
            if not text:
                continue
            size = max((s["size"] for s in spans), default=11.0)
            bold = any((s.get("flags") or 0) & 16 for s in spans)  # bit 4 = bold
            letters = [c for c in text if c.isalpha()]
            all_caps = bool(letters) and all(c.isupper() for c in letters)
            # Real headings are numbered, all-caps, or long enough that a
            # bold/large line is a title rather than a form label fragment
            # ("who are not", "tuition fee", ...).
            is_heading = (
                bool(HEADING_PATTERN.match(text))
                or (5 <= len(text) < 60 and all_caps)
                or ((bold or size >= 1.15 * median_size) and len(text) >= 25)
            )
            items.append((line["bbox"][1], {
                "kind": "heading" if is_heading else "text",
                "text": text,
                "page": page_no,
                "level": 1 if is_heading else 0,
            }))

    for t in tables:
        try:
            rows = t.extract()
        except Exception:
            continue
        text = "\n".join(
            "\t".join("" if c is None else str(c).strip() for c in row)
            for row in rows
        ).strip()
        if text:
            items.append((t.bbox[1], {"kind": "table", "text": text,
                                      "page": page_no, "level": 0}))

    items.sort(key=lambda it: it[0])
    return [u for _, u in items]


# --------------------------------------------------------------------------
# PaddleOCR path
# --------------------------------------------------------------------------

_paddle_ocr = None


def _get_paddle_ocr():
    """Lazy singleton — paddle is a heavy import, so only touch it when OCR
    is actually needed (keeps text-only extraction fast)."""
    global _paddle_ocr
    if _paddle_ocr is None:
        # PaddlePaddle's oneDNN (MKLDNN) CPU backend crashes on Windows under
        # PIR ("ConvertPirAttribute2RuntimeAttribute not support"). PaddleX
        # defaults run_mode to "mkldnn" on CPU (PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT),
        # so force the plain paddle kernel path before paddle initializes.
        os.environ.setdefault("PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT", "0")
        os.environ.setdefault("FLAGS_use_mkldnn", "0")
        from paddleocr import PaddleOCR  # noqa: PLC0415 (deliberately lazy)
        # PP-OCRv6_tiny is ~10x faster than medium on CPU with comparable
        # accuracy on clean printed scans (measured: 7.6s vs 76s per page).
        # Set ADTU_OCR_MODELS=small|medium to trade speed for accuracy.
        variant = config.env_str("ADTU_OCR_MODELS", "tiny")
        log.info("initializing PaddleOCR variant=%s (first use downloads models) ...",
                 variant)
        _paddle_ocr = PaddleOCR(
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            text_detection_model_name=f"PP-OCRv6_{variant}_det",
            text_recognition_model_name=f"PP-OCRv6_{variant}_rec",
        )
    return _paddle_ocr


def _render_page_bgr(page) -> np.ndarray:
    """Render a page to a contiguous BGR numpy array (no PIL/poppler)."""
    dpi = config.env_int("ADTU_OCR_DPI", config.OCR_DPI)
    pix = page.get_pixmap(dpi=dpi, colorspace=fitz.csRGB)
    arr = np.frombuffer(pix.samples, dtype=np.uint8)
    arr = arr.reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        arr = arr[:, :, :3]
    return np.ascontiguousarray(arr[:, :, ::-1])  # RGB -> BGR


def _lines_from_paddle(res) -> list:
    """Adapter over PaddleOCR 3.x result shapes (keys vary slightly across
    3.0/3.1/3.2 — try the documented shapes, return [] if none match)."""
    if not res:
        return []
    r = res[0]
    if isinstance(r, dict):
        data = r.get("res", r)
    else:
        data = getattr(r, "res", None)
    if not data:
        return []
    texts = data.get("rec_texts") or data.get("text") or []
    scores = data.get("rec_scores") or data.get("score")
    polys = data.get("rec_polys") or data.get("dt_polys")
    lines = []
    for i, t in enumerate(texts):
        t = (t or "").strip()
        if not t:
            continue
        conf = float(scores[i]) if scores is not None and i < len(scores) else 1.0
        y0, h = 0.0, 0.0
        if polys is not None and i < len(polys):
            pts = np.asarray(polys[i], dtype=float).reshape(-1, 2)
            y0 = float(pts[:, 1].min())
            h = float(pts[:, 1].max() - y0)
        lines.append({"text": t, "conf": conf, "y0": y0, "h": h})
    return lines


def _looks_like_heading(text: str) -> bool:
    if not (5 <= len(text) < 60):
        return False
    if text[-1] in ".!?:;,->—–":
        return False
    if HEADING_PATTERN.match(text):
        return True
    letters = [c for c in text if c.isalpha()]
    return bool(letters) and len(text) >= 3 and all(c.isupper() for c in letters)


def _group_lines_to_units(lines, page_no) -> list:
    """Group OCR lines into paragraphs (y-gap), classify headings."""
    lines = sorted(lines, key=lambda l: l["y0"])
    hs = [l["h"] for l in lines if l["h"] > 0]
    med_h = float(np.median(hs)) if hs else 12.0
    gap_thresh = max(0.35 * med_h, 8.0)

    paragraphs = []
    cur = None
    for ln in lines:
        if cur is None:
            cur = [ln]
        elif ln["y0"] - cur[-1]["y0"] - cur[-1]["h"] > gap_thresh:
            paragraphs.append(cur)
            cur = [ln]
        else:
            cur.append(ln)
    if cur is not None:
        paragraphs.append(cur)

    units = []
    for p in paragraphs:
        text = "\n".join(l["text"] for l in p).strip()
        if not text:
            continue
        kind = "heading" if _looks_like_heading(text) else "text"
        units.append({"kind": kind, "text": text, "page": page_no,
                      "level": 1 if kind == "heading" else 0})
    return units


def _extract_page_ocr(page, page_no) -> list:
    img = _render_page_bgr(page)
    try:
        res = _get_paddle_ocr().predict(img)
    except Exception:
        log.exception("OCR failed on page %d", page_no)
        return []
    lines = _lines_from_paddle(res)
    if not lines:
        return []
    return _group_lines_to_units(lines, page_no)
