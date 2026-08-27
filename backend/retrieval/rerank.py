"""Phase 4: Cross-Encoder Reranker.

Milvus (BGE-M3 bi-encoder) is fast but approximate: it returns ~20 "okay"
candidates. The cross-encoder reads the query and each candidate TOGETHER
and scores true relevance, reordering so the best evidence is on top.

Raw scores are logits; we also store a sigmoid-normalized confidence in
[0, 1] so the Phase 5 Evidence Validator can combine signals.
"""

import logging

import numpy as np
from sentence_transformers import CrossEncoder

import config

log = logging.getLogger(__name__)

_reranker = None


def get_reranker() -> CrossEncoder:
    """Lazy singleton. Downloads the model on first use, then cached."""
    global _reranker
    if _reranker is None:
        log.info("loading cross-encoder %s ...", config.RERANKER_MODEL_NAME)
        _reranker = CrossEncoder(config.RERANKER_MODEL_NAME)
        log.info("cross-encoder loaded")
    return _reranker


def _sigmoid(x: float) -> float:
    """Map a raw logit into [0, 1]."""
    return float(1.0 / (1.0 + np.exp(-x)))


def rerank(query: str, evidence: list, top_k: int = config.RERANK_TOP_K) -> list:
    """Rerank retrieved evidence with a cross-encoder.

    Args:
        query: the user's question.
        evidence: list of evidence dicts from retrieval.search().
        top_k: how many chunks to keep after reranking.

    Returns:
        The same evidence dicts, reordered and truncated to top_k, each with
        two new fields:
            rerank_score      (raw cross-encoder logit)
            rerank_confidence (sigmoid-normalized, 0..1)
    """
    if not evidence:
        return []

    # Score every (query, chunk) pair together — this is what makes a
    # cross-encoder more accurate than the bi-encoder used by Milvus.
    pairs = [(query, e["text"]) for e in evidence]
    scores = get_reranker().predict(pairs)

    for e, s in zip(evidence, scores):
        e["rerank_score"] = float(s)
        e["rerank_confidence"] = _sigmoid(float(s))

    # Reorder by true relevance, then keep only the best chunk per document
    # so a single PDF cannot flood the final top-K with near-duplicate chunks
    # (e.g. two chunks of the same page occupying two slots).
    evidence.sort(key=lambda e: e["rerank_score"], reverse=True)
    deduped = []
    seen_docs = set()
    for e in evidence:
        doc = e.get("source", "")
        if doc in seen_docs:
            continue
        seen_docs.add(doc)
        deduped.append(e)
    return deduped[:top_k]