"""Phase 5: Epistemic / Evidence Validator.

Combines multiple evidence signals into a single Composite Confidence score
and decides the next action (Section 6, 8 & 14 of the research notes):

    composite >= THRESHOLD_HIGH          -> ANSWER
    THRESHOLD_LOW <= composite < HIGH    -> CLARIFY
    composite <  THRESHOLD_LOW           -> REFUSE

Signals used (all four weighted in the composite via config.W_*):
    intent    - intent detection confidence (does the question belong to ADTU?)
    retriever - top Milvus cosine similarity (broad semantic match)
    reranker  - top cross-encoder confidence (deep, exact match)
    coverage  - agreement across the top-3 chunks (citation-agreement proxy)

A fifth signal — exact-token grounding — is a SUPPORT path only: if the
user's distinctive tokens literally appear in the top-3 evidence, a moderate
composite can answer. It never overrides the hard guard, the THRESHOLD_HIGH
path, or the rerank floor (RERANK_GROUND_FLOOR).
"""

import re

import config

STOPWORDS = {'the', 'is', 'of', 'in', 'what', 'who', 'are', 'was', 'for',
             'and', 'to', 'a', 'an', 'how', 'when', 'where', 'why', 'does',
             'do', 'did', 'can', 'could', 'will', 'would', 'should', 'my',
             'please', 'tell', 'about', 'which'}

# Bounded, CLOSED extended-stopword set of domain-generic nouns.
# This is NOT an entity list; it never grows with new programs/departments.
GENERIC_TERMS = {'fee', 'fees', 'structure', 'syllabus', 'syllabi', 'subject',
    'subjects', 'semester', 'semesters', 'course', 'courses', 'curriculum',
    'admission', 'admissions', 'eligibility', 'rule', 'rules', 'exam', 'exams',
    'examination', 'placement', 'placements', 'hostel', 'scholarship',
    'scholarships', 'year', 'years'}


def _tokens(text: str) -> set:
    """Lowercase alphanumeric tokens of length > 2 — exact, never substrings."""
    return {t for t in re.findall(r'[a-z0-9]+', text.lower()) if len(t) > 2}


def _grounding_signal(query: str, evidence: list):
    """Returns (has_distinctive, grounded) using EXACT token membership.

    Distinctive tokens = query tokens minus stopwords minus the closed set of
    domain-generic nouns. Grounded when at least half of them appear verbatim
    in the concatenated top-3 evidence chunks (set intersection, no substring
    matching). A query with no distinctive tokens ("what is the fee
    structure") gets no boost at all.
    """
    distinctive = _tokens(query) - STOPWORDS - GENERIC_TERMS
    if not distinctive or not evidence:
        return False, False
    top3 = _tokens(" ".join(e.get("text", "") for e in evidence[:3]))
    found = distinctive & top3          # set intersection, never substring
    return True, len(found) >= max(1, len(distinctive) // 2)


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


def validate(intent_result: dict, evidence: list, query: str = "") -> dict:
    """Run the epistemic validation gate.

    Args:
        intent_result: output of query_understanding.intent.detect_intent().
        evidence: reranked evidence list from retrieval.rerank.rerank().
        query: the raw user question, for the exact-token grounding support
            path (empty string disables it — CLI callers stay unchanged).

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
        + config.W_COVERAGE * s_coverage
    )

    reasons = [
        f"signals: intent={s_intent:.2f} retriever={s_retriever:.2f} "
        f"reranker={s_reranker:.2f} coverage={s_coverage:.2f}"
    ]
    if s_coverage >= 0.66:
        reasons.append("evidence agreement: multiple top chunks match the query")

    has_dist, grounded = _grounding_signal(query, evidence)

    # Hard guard: even if composite looks okay, a very weak top chunk means the
    # answer would not be grounded -> refuse (truth over fluency).
    # Lowered from 0.10 to 0.05 to allow borderline entity-specific queries to pass to the LLM.
    if s_reranker < 0.05:
        action = config.ACTION_REFUSE
        reasons.append("top rerank confidence too low -> evidence not grounded")
    elif composite >= config.THRESHOLD_HIGH:
        action = config.ACTION_ANSWER
        reasons.append("composite confidence high -> answer directly")
    elif grounded and s_reranker >= config.RERANK_GROUND_FLOOR \
            and composite >= config.GROUNDED_ANSWER_THRESHOLD:
        action = config.ACTION_ANSWER
        reasons.append("grounded support: distinctive query tokens found in top evidence")
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