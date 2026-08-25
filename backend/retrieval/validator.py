"""Phase 5: Epistemic / Evidence Validator.

Combines multiple evidence signals into a single Composite Confidence score
and decides the next action (Section 6, 8 & 14 of the research notes):

    composite >= THRESHOLD_HIGH          -> ANSWER
    THRESHOLD_LOW <= composite < HIGH    -> CLARIFY
    composite <  THRESHOLD_LOW           -> REFUSE

Signals used:
    intent    - intent detection confidence (does the question belong to ADTU?)
    retriever - top Milvus cosine similarity (broad semantic match)
    reranker  - top cross-encoder confidence (deep, exact match)
    coverage  - agreement across the top-3 chunks (citation-agreement proxy)
"""

import config


def _coverage_signal(evidence: list) -> float:
    """Fraction of top-3 chunks whose rerank confidence is strong.

    Cheap proxy for 'citation agreement across chunks' (Section 6):
    if several independent chunks all match the query, the evidence
    agrees with itself.
    """
    top = evidence[:3]
    if not top:
        return 0.0
    strong = sum(1 for e in top if e.get("rerank_confidence", 0.0) >= 0.5)
    return strong / len(top)


def validate(intent_result: dict, evidence: list) -> dict:
    """Run the epistemic validation gate.

    Args:
        intent_result: output of query_understanding.intent.detect_intent().
        evidence: reranked evidence list from retrieval.rerank.rerank().

    Returns:
        Decision dict:
            action      - ANSWER / CLARIFY / REFUSE
            confidence  - composite confidence in [0, 1]
            uncertainty - 1 - confidence
            signals     - the individual signal values
            reasons     - human-readable explanation of the decision
    """
    # No evidence at all -> immediate refusal (Section 7).
    if not evidence:
        return {
            "action": config.ACTION_REFUSE,
            "confidence": 0.0,
            "uncertainty": 1.0,
            "signals": {"intent": intent_result["confidence"], "retriever": 0.0,
                        "reranker": 0.0, "coverage": 0.0},
            "reasons": ["no evidence retrieved"],
        }

    s_intent = float(intent_result["confidence"])
    s_retriever = float(evidence[0]["score"])
    s_reranker = float(evidence[0].get("rerank_confidence", 0.0))
    s_coverage = _coverage_signal(evidence)

    # The exact formula from config (weights sum to 1.0).
    composite = (
        config.W_INTENT * s_intent
        + config.W_RETRIEVER * s_retriever
        + config.W_RERANKER * s_reranker
    )

    reasons = [
        f"signals: intent={s_intent:.2f} retriever={s_retriever:.2f} "
        f"reranker={s_reranker:.2f} coverage={s_coverage:.2f}"
    ]
    if s_coverage >= 0.66:
        reasons.append("evidence agreement: multiple top chunks match the query")

    # Hard guard: even if composite looks okay, a very weak top chunk means the
    # answer would not be grounded -> refuse (truth over fluency).
    # Lowered from 0.10 to 0.05 to allow borderline entity-specific queries to pass to the LLM.
    if s_reranker < 0.05:
        action = config.ACTION_REFUSE
        reasons.append("top rerank confidence too low -> evidence not grounded")
    elif composite >= config.THRESHOLD_HIGH:
        action = config.ACTION_ANSWER
        reasons.append("composite confidence high -> answer directly")
    elif composite >= config.THRESHOLD_LOW:
        action = config.ACTION_CLARIFY
        reasons.append("moderate confidence -> ask clarifying question")
        if intent_result.get("ambiguous") and intent_result.get("alternative_intent"):
            reasons.append(
                f"ambiguous intent: {intent_result['intent']} vs "
                f"{intent_result['alternative_intent']}"
            )
    else:
        action = config.ACTION_REFUSE
        reasons.append("composite confidence low -> information unavailable")

    return {
        "action": action,
        "confidence": composite,
        "uncertainty": 1.0 - composite,
        "signals": {
            "intent": s_intent,
            "retriever": s_retriever,
            "reranker": s_reranker,
            "coverage": s_coverage,
        },
        "reasons": reasons,
    }