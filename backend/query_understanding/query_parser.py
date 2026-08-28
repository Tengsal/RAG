"""Turn a raw user query into a structured representation."""

from query_understanding.entity_extractor import extract_entities
from query_understanding.intent_classifier import classify_intent


def parse_query(query: str) -> dict:
    """Parse a query into {query, intent, entities}."""
    return {
        "query": query,
        "intent": classify_intent(query),
        "entities": extract_entities(query),
    }
