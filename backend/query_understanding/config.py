"""Phase 6: Clarification Engine.

Generates dynamic clarification questions when the Evidence Validator
returns ACTION_CLARIFY. Instead of using rigid hardcoded rules, it 
inspects the retrieved evidence to see what entities are conflicting.
(Section 9: Adaptive Retrieval & Clarification Loop).
"""

import re
from typing import List, Dict

# Re-use the known programs from the entity extractor
KNOWN_PROGRAMS = {
    "BCA", "MCA", "B.TECH", "M.TECH", "BBA", "MBA",
    "B.COM", "M.COM", "B.SC", "M.SC", "B.A", "M.A",
    "B.PHARM", "M.PHARM", "PHARM.D", "BPT", "MPT",
    "GNM", "ANM", "BSC NURSING", "MSC NURSING", "LLB", "LLM"
}

def generate_clarification(
    intent_result: dict, 
    extracted_entities: dict, 
    evidence: list
) -> str:
    """Analyze retrieved evidence to ask a smart clarification question."""
    
    # 1. Scan the top 3 retrieved chunks to see what programs they mention
    programs_in_evidence = set()
    for e in evidence[:3]:
        text_upper = e.get("text", "").upper()
        for prog in KNOWN_PROGRAMS:
            if re.search(r"\b" + re.escape(prog) + r"\b", text_upper):
                programs_in_evidence.add(prog)
                
    # 2. If the user didn't specify a program, but the evidence contains MULTIPLE programs,
    # we know exactly why the confidence was low: the system doesn't know which one they want.
    user_programs = extracted_entities.get("programs", [])
    
    if not user_programs and len(programs_in_evidence) > 1:
        prog_list = ", ".join(sorted(list(programs_in_evidence)[:3])) # Show top 3
        return (
            f"I found information for multiple programs ({prog_list}, etc.). "
            f"Which specific program are you asking about?"
        )
        
    # 3. If the user specified a program, but no semester, and the intent is curriculum/exam
    if user_programs and not extracted_entities.get("semesters"):
        if intent_result["intent"] in ["curriculum", "examination_Rules"]:
            return (
                f"I can help with {user_programs[0]}. "
                f"Could you specify which semester you are looking for (e.g., Semester 1, Semester 6)?"
            )

    # 4. Fallback: Generic polite clarification based on the detected intent
    intent = intent_result["intent"].replace("_", " ")
    return (
        f"I want to make sure I give you the exact information about {intent}. "
        f"Could you please provide a few more details, such as the specific program, "
        f"year, or semester you are asking about?"
    )