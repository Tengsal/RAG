"""Phase 7 & 8: Ultra-Fast Grounded LLM Generation using Groq."""
import os
from groq import Groq
import config
import logging

log = logging.getLogger(__name__)

# Configure Groq API
api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    log.warning("GROQ_API_KEY not set. LLM generation will fail.")

_client = None

def get_client():
    global _client
    if _client is None and api_key:
        _client = Groq(api_key=api_key)
    return _client

# Simplified, high-impact prompt optimized for Llama-3 8B speed
SYSTEM_PROMPT = """You are an AI academic counsellor for Assam down town University (ADTU).
Answer the student's question using ONLY the provided evidence.

STRICT RULES:
1. If the evidence does not contain the answer, reply EXACTLY: "I couldn't find this information in the available university documents."
2. Every factual claim MUST be cited inline like this: [Source: filename | Page X].
3. If a DYNAMIC document (notice) contradicts a STATIC document (regulation), trust the DYNAMIC document as it is newer.
4. Be concise (2-6 sentences or a short bullet list). For structured evidence such as fee tables or syllabus lists, a short bullet list or compact table is preferred. No reasoning, no follow-up questions for factual queries.
5. For casual greetings, just be polite and helpful without citations.
6. OCR-extracted text and meeting minutes are valid evidence sources — quote them normally when they contain the answer.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Answer: [Your concise, cited answer]
"""

def generate_answer(query: str, evidence: list, decision: dict, entities: dict) -> str:
    """Generate a grounded, cited answer using Groq (Llama 3)."""
    if not api_key:
        return "Error: GROQ_API_KEY is missing."

    # 1. Format evidence into text (per-chunk budget from config; wide enough
    #    for table rows and OCR pages, still tiny next to the context limit)
    context_text = ""
    for i, e in enumerate(evidence[:5], 1): # Only send top 5 chunks max
        filename = e['source'].split('/')[-1]
        kind = "DYNAMIC" if e.get("category", "") in config.DYNAMIC_CATEGORIES else "STATIC"
        text_preview = e['text'][:config.EVIDENCE_MAX_CHARS]
        context_text += f"[Chunk {i}] {filename} | Page {e['page']} | {kind}\n{text_preview}\n\n"
        
    # 2. Build messages for Groq chat API
    user_content = f"""ENTITIES: {entities}

RETRIEVED EVIDENCE:
{context_text}

STUDENT QUESTION: {query}"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content}
    ]
    
    # 3. Call Groq (llama-3.1-8b-instant is the absolute fastest model available)
    try:
        response = get_client().chat.completions.create(
            model="groq/compound-mini",
            messages=messages,
            temperature=0.1,
            max_tokens=250, # Hard cap output for speed
            top_p=0.9,
        )
        return response.choices[0].message.content
    except Exception as e:
        log.error(f"Groq LLM Error: {e}")
        return f"LLM Generation Error: {str(e)}"