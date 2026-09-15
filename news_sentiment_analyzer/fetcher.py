"""Load headlines from RSS feeds or local files (CSV / JSON / plain text)."""

from __future__ import annotations

import csv
import json
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Headline:
    title: str
    source: str = "unknown"
    link: str = ""
    published: str = ""


# A handful of well-known, freely available RSS feeds to use out of the box.
DEFAULT_FEEDS = {
    "BBC World": "http://feeds.bbci.co.uk/news/world/rss.xml",
    "NPR News": "https://feeds.npr.org/1001/rss.xml",
    "Al Jazeera": "https://www.aljazeera.com/xml/rss/all.xml",
    "CNBC Top News": "https://www.cnbc.com/id/100003114/device/rss/rss.html",
}


def fetch_feed(url: str, source_name: str | None = None, limit: int | None = None) -> list[Headline]:
    """Fetch and parse a single RSS/Atom feed. Requires network access."""
    import feedparser

    parsed = feedparser.parse(url)
    if parsed.bozo and not parsed.entries:
        raise RuntimeError(f"could not parse feed: {parsed.bozo_exception}")

    name = source_name or parsed.feed.get("title", url)
    entries = parsed.entries[:limit] if limit else parsed.entries

    return [
        Headline(
            title=entry.get("title", "").strip(),
            source=name,
            link=entry.get("link", ""),
            published=entry.get("published", ""),
        )
        for entry in entries
        if entry.get("title")
    ]


def fetch_feeds(feeds: dict[str, str], limit: int | None = None) -> list[Headline]:
    """Fetch multiple feeds, skipping (and warning about) any that fail."""
    headlines: list[Headline] = []
    for name, url in feeds.items():
        try:
            headlines.extend(fetch_feed(url, source_name=name, limit=limit))
        except Exception as exc:  # network errors, malformed feeds, etc.
            print(f"Warning: failed to fetch '{name}' ({url}): {exc}", file=sys.stderr)
    return headlines


def load_from_file(path: str) -> list[Headline]:
    """Load headlines from a local .csv, .json, or plain-text file.

    - CSV: expects a 'title' (or 'headline') column, with optional
      'source', 'link', 'published' columns.
    - JSON: a list of objects with the same fields, or a list of plain strings.
    - Plain text: one headline per line.
    """
    p = Path(path)
    suffix = p.suffix.lower()

    if suffix == ".csv":
        return _load_csv(p)
    if suffix == ".json":
        return _load_json(p)
    return _load_text(p)


def _load_csv(p: Path) -> list[Headline]:
    headlines = []
    with p.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row.get("title") or row.get("headline")
            if not title:
                continue
            headlines.append(
                Headline(
                    title=title.strip(),
                    source=row.get("source", "file") or "file",
                    link=row.get("link", "") or "",
                    published=row.get("published", "") or "",
                )
            )
    return headlines


def _load_json(p: Path) -> list[Headline]:
    data = json.loads(p.read_text(encoding="utf-8"))
    headlines = []
    for item in data:
        if isinstance(item, str):
            headlines.append(Headline(title=item.strip(), source="file"))
        elif isinstance(item, dict) and item.get("title"):
            headlines.append(
                Headline(
                    title=item["title"].strip(),
                    source=item.get("source", "file") or "file",
                    link=item.get("link", "") or "",
                    published=item.get("published", "") or "",
                )
            )
    return headlines


def _load_text(p: Path) -> list[Headline]:
    lines = p.read_text(encoding="utf-8").splitlines()
    return [Headline(title=line.strip(), source="file") for line in lines if line.strip()]
