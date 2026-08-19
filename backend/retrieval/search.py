"""Evidence-only retrieval: cosine search over the single Milvus collection.

Returns verbatim passages with exact citations (source file, physical page
number, retrieval score). Never generates, summarizes or rewrites content.

The returned fields map 1:1 onto the frontend Message sources contract:
    source -> documentName, page -> pageNumber, text -> snippet,
    score  -> retrievalScore
"""

import config


def search(client, embedder, query: str, top_k: int = config.DEFAULT_TOP_K,
           category: str | None = None) -> list:
    # Milvus Lite restarts leave the collection 'released'; load it first
    # (idempotent when already loaded).
    client.load_collection(config.COLLECTION_NAME)
    qv = embedder.embed_query(query).tolist()
    filt = f'category == "{category}"' if category else None
    hits = client.search(
        collection_name=config.COLLECTION_NAME,
        data=[qv],
        limit=top_k,
        filter=filt,
        output_fields=["text", "source", "page", "category", "chunk_id"],
        search_params={"metric_type": "COSINE"},
    )[0]
    evidence = []
    for h in hits:
        entity = h.get("entity", {})
        evidence.append({
            "score": round(float(h.get("distance", 0.0)), 4),
            "chunk_id": int(h.get("id", entity.get("chunk_id", 0))),
            "text": entity.get("text", ""),
            "source": entity.get("source", ""),
            "page": int(entity.get("page", 0)),
            "category": entity.get("category", ""),
        })
    return evidence


def format_evidence(evidence: list) -> str:
    """Citation block: filename + exact page + verbatim passage + score."""
    out = []
    for i, e in enumerate(evidence, 1):
        out.append(f"[{i}] score={e['score']:.4f} | {e['source']} | "
                   f"page {e['page']} | chunk {e['chunk_id']}")
        out.append(e["text"])
        out.append("-" * 72)
    return "\n".join(out)
