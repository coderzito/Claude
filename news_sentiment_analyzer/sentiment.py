"""VADER-based sentiment scoring for short text such as news headlines."""

from dataclasses import dataclass

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

POSITIVE_THRESHOLD = 0.05
NEGATIVE_THRESHOLD = -0.05


@dataclass
class SentimentResult:
    compound: float
    positive: float
    neutral: float
    negative: float
    label: str


def label_for_compound(compound: float) -> str:
    if compound >= POSITIVE_THRESHOLD:
        return "positive"
    if compound <= NEGATIVE_THRESHOLD:
        return "negative"
    return "neutral"


class SentimentAnalyzer:
    """Thin wrapper around VADER so the rest of the tool doesn't touch it directly."""

    def __init__(self):
        self._vader = SentimentIntensityAnalyzer()

    def analyze(self, text: str) -> SentimentResult:
        scores = self._vader.polarity_scores(text or "")
        compound = scores["compound"]
        return SentimentResult(
            compound=compound,
            positive=scores["pos"],
            neutral=scores["neu"],
            negative=scores["neg"],
            label=label_for_compound(compound),
        )
