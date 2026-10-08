"""Sentiment analysis + theme extraction for the Public Sentiment Dashboard."""
from typing import Dict, List

MODEL_NAME = "distilbert-base-uncased-finetuned-sst-2-english"

# SST-2 is binary, so low-confidence predictions are reported as NEUTRAL.
NEUTRAL_BELOW = 0.60

THEME_KEYWORDS = {
    "Faculty": ["faculty", "professor", "teacher", "staff", "mentor"],
    "Campus": ["campus", "green", "environment", "location"],
    "Infrastructure": ["infrastructure", "lab", "library", "building", "wifi", "facility"],
    "Courses": ["course", "curriculum", "syllabus", "subject", "programme", "program"],
    "Fees": ["fee", "fees", "tuition", "cost", "expensive", "scholarship"],
    "Administration": ["administration", "admin", "management", "office"],
    "Placements": ["placement", "job", "recruit", "career", "package", "internship"],
    "Hostel": ["hostel", "accommodation", "mess", "dorm"],
}

_pipeline = None


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        from transformers import pipeline
        _pipeline = pipeline("sentiment-analysis", model=MODEL_NAME)
    return _pipeline


def analyze_batch(texts: List[str]) -> List[Dict]:
    """[{label: POSITIVE|NEGATIVE|NEUTRAL, score: float}] — one per input text."""
    if not texts:
        return []
    try:
        raw = _get_pipeline()([t[:512] for t in texts], truncation=True)
        results = []
        for item in raw:
            label = str(item["label"]).upper()
            score = float(item["score"])
            if score < NEUTRAL_BELOW:
                label = "NEUTRAL"
            results.append({"label": label, "score": round(score, 4)})
        return results
    except Exception as exc:
        print(f"[analyzer] model unavailable ({exc}); reporting NEUTRAL")
        return [{"label": "NEUTRAL", "score": 0.0} for _ in texts]


def extract_themes(texts, labels):
    """Bucket keyword-matched feedback into themes by sentiment."""
    positive, critical = set(), set()
    for text, result in zip(texts, labels):
        low = (text or "").lower()
        for theme, keywords in THEME_KEYWORDS.items():
            if not any(keyword in low for keyword in keywords):
                continue
            if result.get("label") == "POSITIVE":
                positive.add(theme)
            elif result.get("label") == "NEGATIVE":
                critical.add(theme)
    return {"positive_themes": sorted(positive), "critical_themes": sorted(critical)}
