"""Phase 2 Step 1: Query Understanding -> Intent Detection.

Compares a user query against precomputed semantic intent embeddings
to determine the most likely high-level category.
"""

import logging
import numpy as np
from typing import List, Tuple, TypedDict, Optional

import config
from embeddings import embed

log = logging.getLogger(__name__)

# Cache for intent embeddings so they are only computed once per session.
_intent_cache = None


class IntentResult(TypedDict):
    intent: str
    confidence: float
    ranking: List[Tuple[str, float]]
    ambiguous: bool
    alternative_intent: Optional[str]


def _get_intent_embeddings() -> Tuple[List[str], np.ndarray]:
    """Returns (list_of_intent_names, matrix_of_intent_vectors).
    Computes and caches them on first call.
    """
    global _intent_cache
    if _intent_cache is not None:
        return _intent_cache

    log.info("Computing intent embeddings (one-time setup)...")
    intents = []
    descriptions = []
    
    # Ensure we only use intents that have descriptions and are in CATEGORIES
    for cat in config.CATEGORIES:
        if cat in config.INTENT_DESCRIPTIONS:
            intents.append(cat)
            descriptions.append(config.INTENT_DESCRIPTIONS[cat])
        else:
            log.warning(f"Category '{cat}' missing in INTENT_DESCRIPTIONS. Skipping.")

    # Use the existing BGE-M3 embedder from embeddings/embed.py
    vectors = embed.embed_texts(descriptions)
    
    _intent_cache = (intents, vectors)
    log.info(f"Cached {len(intents)} intent embeddings.")
    return _intent_cache


def detect_intent(query: str) -> IntentResult:
    """Detects the intent of a user query.
    
    Args:
        query: The user's natural language question.
        
    Returns:
        IntentResult dictionary containing top intent, confidence, ranking, etc.
    """
    intent_names, intent_vectors = _get_intent_embeddings()
    
    # 1. Embed the user query
    query_vector = embed.embed_query(query)
    
    # 2. Calculate cosine similarity. 
    # Since BGE-M3 vectors are L2-normalized, cosine similarity == dot product.
    # query_vector is (1024,), intent_vectors is (N, 1024)
    similarities = np.dot(intent_vectors, query_vector)
    
    # 3. Rank the intents (descending order)
    ranked_indices = np.argsort(similarities)[::-1]
    
    ranking = []
    for idx in ranked_indices:
        ranking.append((intent_names[idx], float(similarities[idx])))
        
    # 4. Extract top intent and confidence
    top_intent, top_score = ranking[0]
    confidence = float(top_score)
    
    # 5. Ambiguity detection
    ambiguous = False
    alternative_intent = None
    
    if len(ranking) > 1:
        second_intent, second_score = ranking[1]
        score_diff = top_score - second_score
        
        if score_diff <= config.INTENT_AMBIGUITY_MARGIN:
            ambiguous = True
            alternative_intent = second_intent
            
    return IntentResult(
        intent=top_intent,
        confidence=confidence,
        ranking=ranking,
        ambiguous=ambiguous,
        alternative_intent=alternative_intent
    )