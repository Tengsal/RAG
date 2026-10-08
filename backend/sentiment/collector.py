"""Data collection for the Public Sentiment Dashboard (Reddit + News)."""
import datetime
import os
import xml.etree.ElementTree as ET

import requests

UNIVERSITY_QUERY = "Assam Down Town University"
NEWS_RSS = "https://news.google.com/rss/search?q={q}"


def fetch_reddit_posts(query=UNIVERSITY_QUERY, limit=50):
    """Posts + top comments. Returns [] when praw or the credentials are absent."""
    try:
        import praw
    except ImportError:
        print("[collector] praw not installed; skipping Reddit")
        return []

    client_id = os.environ.get("REDDIT_CLIENT_ID")
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET")
    if not (client_id and client_secret):
        print("[collector] REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET not set; skipping Reddit")
        return []

    try:
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=os.environ.get("REDDIT_USER_AGENT", "adtu-sentiment/1.0"),
        )
        items = []
        for post in reddit.subreddit("all").search(query, limit=limit, sort="new"):
            comments = []
            try:
                post.comments.replace_more(limit=0)
                comments = [c.body for c in post.comments.list()[:5]]
            except Exception:
                pass
            text = "\n".join([f"{post.title}\n{getattr(post, 'selftext', '') or ''}".strip()] + comments)
            items.append({
                "source": "reddit",
                "text": text[:2000],
                "date": datetime.datetime.utcfromtimestamp(post.created_utc).isoformat(),
                "url": f"https://reddit.com{post.permalink}",
            })
        return items
    except Exception as exc:
        print(f"[collector] reddit error: {exc}")
        return []


def fetch_news_articles(query=UNIVERSITY_QUERY):
    """NewsAPI when NEWS_API_KEY is set, otherwise a public RSS feed."""
    key = os.environ.get("NEWS_API_KEY")
    if key:
        try:
            res = requests.get(
                "https://newsapi.org/v2/everything",
                params={"q": query, "pageSize": 50, "sortBy": "publishedAt", "apiKey": key},
                timeout=20,
            )
            res.raise_for_status()
            return [
                {
                    "source": "news",
                    "text": f"{a.get('title', '')}. {a.get('description') or ''}".strip(),
                    "date": a.get("publishedAt", ""),
                    "url": a.get("url", ""),
                }
                for a in res.json().get("articles", [])
            ]
        except Exception as exc:
            print(f"[collector] newsapi error: {exc}; falling back to RSS")

    try:
        res = requests.get(NEWS_RSS.format(q=requests.utils.quote(query)), timeout=20)
        res.raise_for_status()
        items = []
        for item in ET.fromstring(res.content).iter("item"):
            title = (item.findtext("title") or "").strip()
            description = (item.findtext("description") or "").strip()
            items.append({
                "source": "news",
                "text": f"{title}. {description}".strip(),
                "date": (item.findtext("pubDate") or "").strip(),
                "url": (item.findtext("link") or "").strip(),
            })
        return items
    except Exception as exc:
        print(f"[collector] rss error: {exc}")
        return []
