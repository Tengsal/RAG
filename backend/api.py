"""HTTP API for the curriculum QA backend.

Run from the backend/ directory:
    pip install fastapi uvicorn
    uvicorn api:app --reload
"""

from fastapi import FastAPI

from query_understanding.query_parser import parse_query
from retrieval.rag_retriever import retrieve as rag_retrieve
from retrieval.structured_retriever import retrieve as structured_retrieve

app = FastAPI(title="Curriculum QA API")


@app.get("/health")
def health() -> dict:
    """Liveness check."""
    return {"status": "ok"}


@app.post("/query")
def query(payload: dict) -> dict:
    """Run the full pipeline: parse the query, retrieve, and answer."""
    text = payload.get("query", "")
    parsed = parse_query(text)

    if parsed["intent"] == "curriculum_lookup":
        answer = structured_retrieve(text, parsed["entities"], parsed["intent"])
    else:
        answer = rag_retrieve(text, parsed["entities"], parsed["intent"])

    return {"query": text, "parsed": parsed, "answer": answer}
