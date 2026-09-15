# News Sentiment Analyzer

A small Python CLI that pulls news headlines (from RSS feeds or a local file)
and scores their sentiment with [VADER](https://github.com/cjhutto/vaderSentiment),
a lexicon/rule-based analyzer tuned for short, informal text like headlines.

## Setup

```bash
cd news_sentiment_analyzer
pip install -r requirements.txt
```

## Usage

Analyze the built-in set of RSS feeds (BBC, NPR, Al Jazeera, CNBC):

```bash
python -m news_sentiment_analyzer --use-default-feeds
```

Analyze one or more custom feeds:

```bash
python -m news_sentiment_analyzer --feed "https://example.com/rss.xml" --limit 20
```

Analyze headlines from a local file — no network required (`.csv`, `.json`, or
`.txt`, one headline per line for `.txt`):

```bash
python -m news_sentiment_analyzer --file sample_data/headlines.csv
```

Filter to a keyword, save the scored results, and generate a summary chart:

```bash
python -m news_sentiment_analyzer --use-default-feeds \
    --keyword climate \
    --output results.csv \
    --plot summary.png
```

### Options

| Flag | Description |
| --- | --- |
| `--use-default-feeds` | Fetch from the built-in feed list |
| `--feed URL` | Add a custom RSS/Atom feed (repeatable) |
| `--file PATH` | Load headlines from a local `.csv`/`.json`/`.txt` file |
| `--limit N` | Max headlines to fetch per feed |
| `--keyword TEXT` | Only keep headlines containing this substring |
| `--top N` | How many top positive/negative headlines to print (default 5) |
| `--table-limit N` | Max rows shown in the results table (default 25) |
| `--output PATH` | Write all scored headlines to a CSV file |
| `--plot PATH` | Save a positive/neutral/negative bar chart (PNG) |

## How scoring works

Each headline gets a VADER **compound score** from -1 (most negative) to +1
(most positive):

- `compound >= 0.05` → **positive**
- `compound <= -0.05` → **negative**
- otherwise → **neutral**

The tool reports the overall distribution, a per-source breakdown, the
strongest positive/negative headlines, and optional CSV/chart output.

## Running tests

```bash
python -m unittest discover -s news_sentiment_analyzer/tests
```

(Run from the repo root, with dependencies installed.)
