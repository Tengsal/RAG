"""Classify a user query into one of the supported intents."""

INTENTS = [
    "curriculum_lookup",  # answer directly from structured curriculum data
    "rag_question",       # needs retrieval-augmented generation
    "unknown",
]


def classify_intent(query: str) -> str:
    """Return the intent label for the given query.

    TODO: implement rule-based or model-based classification.
    """
    query = query.strip().lower()
    # TODO: keyword/pattern rules or an LLM classifier go here
    return "unknown"
