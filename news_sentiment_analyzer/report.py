"""Aggregate scored headlines into summaries, tables, CSV output, and charts."""

from __future__ import annotations

import csv
from collections import Counter, defaultdict
from dataclasses import dataclass

from .fetcher import Headline
from .sentiment import SentimentResult


@dataclass
class ScoredHeadline:
    headline: Headline
    sentiment: SentimentResult


def summarize(scored: list[ScoredHeadline]) -> dict:
    """Overall counts/averages plus a per-source breakdown."""
    label_counts = Counter(s.sentiment.label for s in scored)
    total = len(scored)
    avg_compound = sum(s.sentiment.compound for s in scored) / total if total else 0.0

    by_source: dict[str, Counter] = defaultdict(Counter)
    for s in scored:
        by_source[s.headline.source][s.sentiment.label] += 1

    return {
        "total": total,
        "label_counts": dict(label_counts),
        "avg_compound": avg_compound,
        "by_source": {src: dict(counts) for src, counts in by_source.items()},
    }


def print_summary(summary: dict) -> None:
    total = summary["total"]
    print(f"\nAnalyzed {total} headline(s)")
    if total == 0:
        return

    counts = summary["label_counts"]
    for label in ("positive", "neutral", "negative"):
        n = counts.get(label, 0)
        pct = (n / total) * 100
        print(f"  {label:<9} {n:>4}  ({pct:5.1f}%)")
    print(f"  average compound score: {summary['avg_compound']:+.3f}")

    if len(summary["by_source"]) > 1:
        print("\nBy source:")
        for source, counts in summary["by_source"].items():
            parts = ", ".join(f"{label}={counts.get(label, 0)}" for label in ("positive", "neutral", "negative"))
            print(f"  {source:<20} {parts}")


def print_table(scored: list[ScoredHeadline], limit: int | None = None) -> None:
    rows = scored[:limit] if limit else scored
    if not rows:
        print("No headlines to display.")
        return

    title_width = min(max((len(r.headline.title) for r in rows), default=10), 80)
    print(f"\n{'SENTIMENT':<10} {'SCORE':>7}  {'SOURCE':<18} TITLE")
    print("-" * (10 + 1 + 7 + 2 + 18 + 1 + title_width))
    for r in rows:
        title = r.headline.title
        if len(title) > title_width:
            title = title[: title_width - 1] + "…"
        print(f"{r.sentiment.label:<10} {r.sentiment.compound:>+7.3f}  {r.headline.source:<18} {title}")


def top_n(scored: list[ScoredHeadline], label: str, n: int = 5) -> list[ScoredHeadline]:
    """The n most strongly positive or negative headlines (by |compound|)."""
    candidates = [s for s in scored if s.sentiment.label == label]
    reverse = label == "positive"
    return sorted(candidates, key=lambda s: s.sentiment.compound, reverse=reverse)[:n]


def save_csv(scored: list[ScoredHeadline], path: str) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["title", "source", "label", "compound", "positive", "neutral", "negative", "link", "published"])
        for s in scored:
            writer.writerow(
                [
                    s.headline.title,
                    s.headline.source,
                    s.sentiment.label,
                    f"{s.sentiment.compound:.4f}",
                    f"{s.sentiment.positive:.4f}",
                    f"{s.sentiment.neutral:.4f}",
                    f"{s.sentiment.negative:.4f}",
                    s.headline.link,
                    s.headline.published,
                ]
            )
    print(f"Saved {len(scored)} row(s) to {path}")


def plot_summary(summary: dict, path: str) -> None:
    """Bar chart of positive/neutral/negative counts. Requires matplotlib."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    labels = ["positive", "neutral", "negative"]
    counts = [summary["label_counts"].get(label, 0) for label in labels]
    colors = ["#2e7d32", "#9e9e9e", "#c62828"]

    fig, ax = plt.subplots(figsize=(6, 4))
    ax.bar(labels, counts, color=colors)
    ax.set_title("News Sentiment Breakdown")
    ax.set_ylabel("Number of headlines")
    for i, count in enumerate(counts):
        ax.text(i, count, str(count), ha="center", va="bottom")
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)
    print(f"Saved chart to {path}")
