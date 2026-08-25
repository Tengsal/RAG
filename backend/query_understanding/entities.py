"""Phase 2 Part 2: Entity Extraction.

Extracts specific academic entities from the user query to improve
retrieval precision and context selection (Section 10 of research notes).
Uses lightweight regex/dictionary matching for near-zero latency.
"""

import re
from typing import List, Dict

# Dictionary of known ADTU programs (normalized to uppercase for matching)
KNOWN_PROGRAMS = {
    "BCA", "MCA", "B.TECH", "M.TECH", "BBA", "MBA",
    "B.COM", "M.COM", "B.SC", "M.SC", "B.A", "M.A",
    "B.PHARM", "M.PHARM", "PHARM.D", "BPT", "MPT",
    "GNM", "ANM", "BSC NURSING", "MSC NURSING", "LLB", "LLM"
}

def extract_entities(query: str) -> Dict[str, List[str]]:
    """Extract academic entities from a query.
    
    Returns:
        Dictionary with keys: 'programs', 'semesters', 'years'
    """
    q_upper = query.upper()
    entities = {
        "programs": [],
        "semesters": [],
        "years": []
    }
    
    # 1. Extract Programs
    for prog in KNOWN_PROGRAMS:
        # Use word boundaries to avoid matching "BSC" inside "ABSC"
        if re.search(r"\b" + re.escape(prog) + r"\b", q_upper):
            entities["programs"].append(prog)
            
    # 2. Extract Semesters (e.g., "Semester 6", "Sem 4", "6th semester")
    sem_patterns = [
        r"\bSEMESTER\s+(\d)\b",
        r"\bSEM\s+(\d)\b",
        r"\b(\d)(?:ST|ND|RD|TH)\s+SEMESTER\b",
        r"\b(\d)(?:ST|ND|RD|TH)\s+SEM\b"
    ]
    for pattern in sem_patterns:
        matches = re.findall(pattern, q_upper)
        for m in matches:
            sem_num = m if isinstance(m, str) else m[0]
            sem_str = f"Semester {sem_num}"
            if sem_str not in entities["semesters"]:
                entities["semesters"].append(sem_str)
                
    # 3. Extract Years (e.g., 2024, 2025, 2026)
    year_matches = re.findall(r"\b(20[2-9]\d)\b", query)
    for y in year_matches:
        if y not in entities["years"]:
            entities["years"].append(y)
            
    return entities