import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from news_sentiment_analyzer.fetcher import Headline, load_from_file
from news_sentiment_analyzer.report import ScoredHeadline, save_csv, summarize, top_n
from news_sentiment_analyzer.sentiment import SentimentAnalyzer, label_for_compound

SAMPLE_CSV = Path(__file__).resolve().parent.parent / "sample_data" / "headlines.csv"


class SentimentAnalyzerTests(unittest.TestCase):
    def setUp(self):
        self.analyzer = SentimentAnalyzer()

    def test_positive_headline(self):
        result = self.analyzer.analyze("Scientists celebrate a wonderful and inspiring breakthrough")
        self.assertEqual(result.label, "positive")
        self.assertGreater(result.compound, 0.05)

    def test_negative_headline(self):
        result = self.analyzer.analyze("Disaster and tragedy devastate the region after brutal attack")
        self.assertEqual(result.label, "negative")
        self.assertLess(result.compound, -0.05)

    def test_neutral_headline(self):
        result = self.analyzer.analyze("City council meets on Tuesday to review the quarterly budget report")
        self.assertEqual(result.label, "neutral")

    def test_empty_text_is_neutral(self):
        result = self.analyzer.analyze("")
        self.assertEqual(result.compound, 0.0)
        self.assertEqual(result.label, "neutral")

    def test_label_for_compound_boundaries(self):
        self.assertEqual(label_for_compound(0.05), "positive")
        self.assertEqual(label_for_compound(-0.05), "negative")
        self.assertEqual(label_for_compound(0.0), "neutral")


class FetcherTests(unittest.TestCase):
    def test_load_csv_sample_data(self):
        headlines = load_from_file(str(SAMPLE_CSV))
        self.assertEqual(len(headlines), 10)
        self.assertTrue(all(isinstance(h, Headline) for h in headlines))
        self.assertEqual(headlines[0].source, "Sample Sports")

    def test_load_json_list_of_strings(self):
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "headlines.json"
            path.write_text('["Good news happens", "Bad news happens"]', encoding="utf-8")
            headlines = load_from_file(str(path))
            self.assertEqual(len(headlines), 2)
            self.assertEqual(headlines[0].title, "Good news happens")

    def test_load_plain_text(self):
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "headlines.txt"
            path.write_text("First headline\nSecond headline\n\n", encoding="utf-8")
            headlines = load_from_file(str(path))
            self.assertEqual(len(headlines), 2)


class ReportTests(unittest.TestCase):
    def setUp(self):
        analyzer = SentimentAnalyzer()
        headlines = load_from_file(str(SAMPLE_CSV))
        self.scored = [ScoredHeadline(h, analyzer.analyze(h.title)) for h in headlines]

    def test_summarize_counts_all_headlines(self):
        summary = summarize(self.scored)
        self.assertEqual(summary["total"], len(self.scored))
        total_labeled = sum(summary["label_counts"].values())
        self.assertEqual(total_labeled, len(self.scored))

    def test_summarize_empty_input(self):
        summary = summarize([])
        self.assertEqual(summary["total"], 0)
        self.assertEqual(summary["avg_compound"], 0.0)

    def test_top_n_positive_sorted_descending(self):
        picks = top_n(self.scored, "positive", n=3)
        compounds = [p.sentiment.compound for p in picks]
        self.assertEqual(compounds, sorted(compounds, reverse=True))
        self.assertTrue(all(p.sentiment.label == "positive" for p in picks))

    def test_save_csv_writes_all_rows(self):
        with TemporaryDirectory() as tmp:
            out_path = Path(tmp) / "out.csv"
            save_csv(self.scored, str(out_path))
            lines = out_path.read_text(encoding="utf-8").splitlines()
            # header + one row per headline
            self.assertEqual(len(lines), len(self.scored) + 1)


if __name__ == "__main__":
    unittest.main()
