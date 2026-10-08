"""Weekly sentiment job: collect -> analyse -> aggregate -> append trend -> save.

Run from anywhere:  python backend/scripts/weekly_sentiment_job.py
"""
import datetime
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from sentiment.collector import fetch_news_articles, fetch_reddit_posts  # noqa: E402
from sentiment.analyzer import analyze_batch, extract_themes  # noqa: E402

REPORT_PATH = BACKEND_DIR / "data" / "sentiment" / "latest_report.json"
MAX_TREND_POINTS = 4

FALLBACK = {
    "overall": {"positive": 62, "neutral": 23, "critical": 15},
    "themes": {
        "positive": ["Faculty Support", "Campus Infrastructure", "Course Variety"],
        "critical": ["Fee Structure", "Hostel Facilities", "Placement Speed"],
    },
    "sources": [],
}


def build_report():
    """Collect + analyse + aggregate. Falls back to the demo shape if empty."""
    items = fetch_reddit_posts() + fetch_news_articles()
    texts = [item["text"] for item in items if item.get("text")]
    labels = analyze_batch(texts)
    print(f"[weekly] collected {len(items)} items, analysed {len(labels)}")

    if not labels:
        report = json.loads(json.dumps(FALLBACK))
        report["generated_at"] = datetime.date.today().isoformat()
        return report

    counts = {"POSITIVE": 0, "NEUTRAL": 0, "NEGATIVE": 0}
    for label in labels:
        counts[label["label"]] = counts.get(label["label"], 0) + 1
    total = len(labels)

    themes = extract_themes(texts, labels)
    return {
        "overall": {
            "positive": round(counts["POSITIVE"] * 100 / total),
            "neutral": round(counts["NEUTRAL"] * 100 / total),
            "critical": round(counts["NEGATIVE"] * 100 / total),
        },
        "themes": {"positive": themes["positive_themes"], "critical": themes["critical_themes"]},
        "sources": [
            {"url": item["url"], "title": item["text"][:90]}
            for item in items if item.get("url")
        ][:20],
        "generated_at": datetime.date.today().isoformat(),
    }


def main():
    report = build_report()

    # Carry the existing trend forward and append this week's snapshot.
    trend = []
    if REPORT_PATH.exists():
        try:
            trend = json.loads(REPORT_PATH.read_text(encoding="utf-8")).get("trend") or []
        except Exception as exc:
            print(f"[weekly] could not read previous trend: {exc}")
    trend.append({
        "week": f"Week {len(trend) + 1}",
        "positive": report["overall"]["positive"],
        "critical": report["overall"]["critical"],
    })
    report["trend"] = trend[-MAX_TREND_POINTS:]

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"[weekly] wrote {REPORT_PATH} | overall={report['overall']}")


if __name__ == "__main__":
    main()
