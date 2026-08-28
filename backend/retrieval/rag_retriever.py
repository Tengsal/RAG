"""Retrieve answers via retrieval-augmented generation (RAG).

Used for queries the structured curriculum data cannot answer directly.
"""


def retrieve(query: str, entities: dict, intent: str) -> str:
    """Return a RAG-generated answer for the query.

    TODO: embed the query, search the vector store, generate an answer.
    """
    # TODO: vector search + LLM answer generation go here
    return ""
