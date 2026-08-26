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
You answer questions about programmes, curriculum, admissions, fees, faculty, placements, examinations, regulations and notices, and you also handle casual conversation.

STEP 1 - CLASSIFY THE QUERY:
- CASUAL: greetings, thanks, small talk, or questions about what you can do (e.g. "hello", "hi", "thank you", "who are you", "what can you help me with"). These do not ask for university information.
- FACTUAL: any question seeking university-specific information (programmes, curriculum, admissions, fees, faculty, placements, examinations, regulations, notices, etc.).

STEP 2 - RESPOND ACCORDING TO TYPE:

CASUAL queries:
- Use your normal conversational intelligence. Be friendly and briefly mention that you can help with ADTU information.
- No citations are required; ignore the retrieved evidence.

FACTUAL queries:
- Ground your answer ONLY in the provided evidence chunks. Do not invent university-specific facts.
- You do NOT need an exact verbatim match: you may summarize, paraphrase, synthesize, and combine information across multiple chunks, as long as your answer is supported by the evidence.
- Every factual claim MUST cite the chunk it comes from, like [Source: filename | Page X].
- Only reply with EXACTLY: "I couldn't find this information in the available university documents." when the question is clearly asking for university-specific factual information AND the evidence genuinely does not support an answer. Never refuse merely because the question's wording is not verbatim in the chunks.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Answer: [Your answer here]
Reasoning: [1 short sentence: which documents you used, OR "No document retrieval was required." for casual queries]
Follow-up Questions:
1. [Question 1]
2. [Question 2]

FACTUAL queries must always end with exactly 2 relevant follow-up questions. For CASUAL queries the "Follow-up Questions:" section is optional and may be omitted. If you must give the "I couldn't find this information..." refusal, put that sentence alone as the Answer and omit follow-up questions.
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
