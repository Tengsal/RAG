"""Phase 7 & 8: Grounded LLM Generation + Citations & Follow-ups.

Sends only validated evidence to the LLM with a strict system prompt
to prevent hallucination, force exact citations, and generate follow-ups 
(Section 3 & 10 of research notes).
"""

import os
import google.generativeai as genai
import config
# Configure Gemini API (reads from environment variable)
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("Warning: GOOGLE_API_KEY not set. LLM generation will fail.")
else:
    genai.configure(api_key=api_key)

# Use the fastest, most cost-effective Flash model
_model = None
def get_model():
    global _model
    if _model is None:
        _model = genai.GenerativeModel('models/gemini-2.5-flash') 
    return _model

SYSTEM_PROMPT = """You are an AI academic counsellor for Assam down town University (ADTU).
You must answer the student's question using ONLY the provided evidence chunks.

STRICT RULES:
1. Do NOT use outside knowledge.
2. If the evidence does not contain the exact answer, reply exactly with: "I couldn't find this information in the available university documents." and provide no follow-up questions.
3. Every factual claim MUST end with a citation like [Source: filename | Page X].
4. Keep the answer concise, polite, and directly address the student's question.
5. At the end of your response, suggest exactly 2 relevant follow-up questions the student might want to ask next based on the context.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Answer: [Your grounded answer here with citations]
Reasoning: [1 short sentence explaining which documents you used]
Follow-up Questions:
1. [Question 1]
2. [Question 2]
"""

def generate_answer(query: str, evidence: list, decision: dict, entities: dict) -> str:
    """Generate a grounded, cited answer using Gemini."""
    if not api_key:
        return "Error: GOOGLE_API_KEY is missing."

    # 1. Format evidence into text
    context_text = ""
    for i, e in enumerate(evidence, 1):
        # Extract just the filename from the path for cleaner citations
        filename = e['source'].split('/')[-1]
        context_text += f"[Chunk {i}] Source: {filename} | Page: {e['page']}\n"
        context_text += f"Text: {e['text']}\n\n"
        
    # 2. Map composite score to High/Medium/Low label
    conf_score = decision['confidence']
    if conf_score >= config.THRESHOLD_HIGH:
        conf_label = "High"
    elif conf_score >= config.THRESHOLD_LOW:
        conf_label = "Medium"
    else:
        conf_label = "Low"
        
    # 3. Build final prompt
    final_prompt = f"""
{SYSTEM_PROMPT}

EXTRACTED ENTITIES (Student Context): {entities}
COMPOSITE CONFIDENCE: {conf_label}

RETRIEVED EVIDENCE:
{context_text}

STUDENT QUESTION: {query}
"""
    
    # 4. Call Gemini
    try:
        response = get_model().generate_content(final_prompt)
        return response.text
    except Exception as e:
        return f"LLM Generation Error: {str(e)}"
