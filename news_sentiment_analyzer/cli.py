"""Command-line interface for the news sentiment analyzer.

Examples:
    # Analyze the built-in set of RSS feeds
    python -m news_sentiment_analyzer --use-default-feeds

    # Analyze a custom feed
    python -m news_sentiment_analyzer --feed "https://example.com/rss.xml"

    # Analyze headlines from a local file (no network needed)
    python -m news_sentiment_analyzer --file sample_data/headlines.csv

    # Filter to a keyword, save results, and plot a summary chart
    python -m news_sentiment_analyzer --use-default-feeds --keyword climate \
        --output results.csv --plot summary.png
"""

from __future__ import annotations

import argparse
import sys

from .fetcher import DEFAULT_FEEDS, Headline, fetch_feeds, load_from_file
from .report import ScoredHeadline, plot_summary, print_summary, print_table, save_csv, summarize, top_n
from .sentiment import SentimentAnalyzer


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="news_sentiment_analyzer",
        description="Fetch news headlines and score their sentiment with VADER.",
    )
    source = parser.add_argument_group("headline sources")
    source.add_argument(
        "--use-default-feeds",
        action="store_true",
        help=f"fetch from the built-in feed list ({', '.join(DEFAULT_FEEDS)})",
    )
    source.add_argument(
        "--feed",
        action="append",
        dest="feeds",
        metavar="URL",
        help="an RSS/Atom feed URL to fetch (repeatable)",
    )
    source.add_argument(
        "--file",
        metavar="PATH",
        help="load headlines from a local .csv, .json, or .txt file instead of the network",
    )

    parser.add_argument("--limit", type=int, default=None, help="max headlines to fetch per feed")
    parser.add_argument("--keyword", help="only keep headlines containing this substring (case-insensitive)")
    parser.add_argument("--top", type=int, default=5, help="how many top positive/negative headlines to show (default: 5)")
    parser.add_argument("--output", metavar="PATH", help="write scored results to a CSV file")
    parser.add_argument("--plot", metavar="PATH", help="save a sentiment breakdown bar chart (e.g. summary.png)")
    parser.add_argument("--table-limit", type=int, default=25, help="max rows to print in the results table (default: 25)")
    return parser


def gather_headlines(args: argparse.Namespace) -> list[Headline]:
    headlines: list[Headline] = []

    if args.file:
        headlines.extend(load_from_file(args.file))

    feeds: dict[str, str] = {}
    if args.use_default_feeds:
        feeds.update(DEFAULT_FEEDS)
    if args.feeds:
        for url in args.feeds:
            feeds[url] = url

    if feeds:
        headlines.extend(fetch_feeds(feeds, limit=args.limit))

    if args.keyword:
        needle = args.keyword.lower()
        headlines = [h for h in headlines if needle in h.title.lower()]

    return headlines


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if not args.file and not args.use_default_feeds and not args.feeds:
        parser.error("provide a headline source: --file, --use-default-feeds, or --feed")

    headlines = gather_headlines(args)
    if not headlines:
        print("No headlines found.", file=sys.stderr)
        return 1

    analyzer = SentimentAnalyzer()
    scored = [ScoredHeadline(h, analyzer.analyze(h.title)) for h in headlines]

    print_table(scored, limit=args.table_limit)

    summary = summarize(scored)
    print_summary(summary)

    if args.top:
        for label in ("positive", "negative"):
            picks = top_n(scored, label, args.top)
            if picks:
                print(f"\nTop {len(picks)} most {label} headline(s):")
                for s in picks:
                    print(f"  {s.sentiment.compound:+.3f}  {s.headline.title}")

    if args.output:
        save_csv(scored, args.output)
    if args.plot:
        plot_summary(summary, args.plot)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
