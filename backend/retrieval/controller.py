"""Adaptive Retrieval Controller (Phase 3).

Decides whether a query should search STATIC knowledge, DYNAMIC knowledge,
or BOTH, and builds the final list of Milvus categories to search.

Pure routing layer: it does NOT embed, search, or touch Milvus.
It only combines the intent result + temporal signals + config mappings.
"""

import re
from typing import Dict, List

import config


def has_temporal_signal(query: str) -> bool:
    """True if the question contains time-bound / freshness words."""
    q = query.lower()
    for kw in config.TEMPORAL_KEYWORDS:
        # word-boundary match so e.g. "date" never matches inside "candidate"
        if re.search(r"\b" + re.escape(kw) + r"\b", q):
            return True
    return False


def _type_of(category: str) -> str:
    """Map a category to its knowledge type."""
    if category in config.DYNAMIC_CATEGORIES:
        return "dynamic"
    return "static"


def build_search_plan(query: str, intent_result: Dict) -> Dict:
    """Build the adaptive search plan for a query.

    Args:
        query: the raw user question.
        intent_result: output of query_understanding.intent.detect_intent().

    Returns:
        {
            "knowledge_type": "static" | "dynamic" | "both",
            "categories":     [final Milvus category filter list],
            "temporal":       True/False,
            "reasons":        [human-readable routing decisions],
        }
    """
    top_intent = intent_result["intent"]
    categories = [top_intent]
    reasons = [f"top intent -> {top_intent}"]

    # Rule 1 (Phase 2): ambiguous -> include the alternative intent.
    if intent_result.get("ambiguous") and intent_result.get("alternative_intent"):
        alt = intent_result["alternative_intent"]
        if alt not in categories:
            categories.append(alt)
            reasons.append(f"ambiguous -> +{alt}")

    # Rule 2 (Phase 2): related-category peek.
    for rel in config.INTENT_RELATED_CATEGORIES.get(top_intent, []):
        if rel not in categories:
            categories.append(rel)
            reasons.append(f"related peek -> +{rel}")

    # Rule 3 (Phase 3): temporal signal -> make sure dynamic knowledge is covered.
    temporal = has_temporal_signal(query)
    if temporal and not any(_type_of(c) == "dynamic" for c in categories):
        categories.append("Notices_and_Circulars")
        reasons.append("temporal signal -> +Notices_and_Circulars (dynamic)")

    # Final knowledge-type decision.
    types = {_type_of(c) for c in categories}
    knowledge_type = "both" if len(types) == 2 else types.pop()

    return {
        "knowledge_type": knowledge_type,
        "categories": categories,
        "temporal": temporal,
        "reasons": reasons,
    }