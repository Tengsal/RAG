"""BGE-M3 embeddings via sentence-transformers (corpus and queries).

BGE-M3 is instruction-free: the same encode() path serves corpus chunks and
queries (no query prefix). Output is L2-normalized 1024-dim float32, so the
COSINE metric in Milvus is a true cosine similarity in [-1, 1].
"""

import logging
import os

import numpy as np
from sentence_transformers import SentenceTransformer

import config

log = logging.getLogger(__name__)

_model = None


def get_model() -> SentenceTransformer:
    """Lazy singleton. First call downloads ~2.2 GB from HuggingFace."""
    global _model
    if _model is None:
        import torch
        torch.set_num_threads(os.cpu_count() or 4)
        log.info("loading %s on CPU (first load may download the model) ...",
                 config.EMBED_MODEL_NAME)
        _model = SentenceTransformer(config.EMBED_MODEL_NAME, device="cpu")
        dim = _model.get_embedding_dimension()
        assert dim == config.EMBED_DIM, f"unexpected embedding dim {dim}"
        log.info("BGE-M3 loaded (dim=%d)", dim)
    return _model


def embed_texts(texts: list) -> np.ndarray:
    """(N, 1024) float32, L2-normalized."""
    if not texts:
        return np.zeros((0, config.EMBED_DIM), dtype=np.float32)
    out = get_model().encode(
        texts,
        batch_size=config.EMBED_BATCH_SIZE,
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    return np.asarray(out, dtype=np.float32)


def embed_query(query: str) -> np.ndarray:
    """(1024,) float32, L2-normalized."""
    return embed_texts([query])[0]
