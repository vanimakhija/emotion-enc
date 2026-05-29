"""Sentiment analysis module using VADER (replaces TextBlob)."""

import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from schemas import SentimentResult

# Download lexicon once at import time (no-op if already present)
nltk.download("vader_lexicon", quiet=True)

_sia = SentimentIntensityAnalyzer()


def analyze_sentiment(text: str) -> SentimentResult:
    """
    Analyse sentiment using VADER compound score.

    Compound score ranges from -1.0 (most negative) to +1.0 (most positive).
    Standard thresholds: >= 0.05 → Positive, <= -0.05 → Negative, else Neutral.
    These are the same boundaries as the original code but now applied to a
    model that actually works on informal / email-style text.
    """
    scores = _sia.polarity_scores(text)
    compound = scores["compound"]

    if compound >= 0.05:
        emotion = "Positive"
    elif compound <= -0.05:
        emotion = "Negative"
    else:
        emotion = "Neutral"

    return SentimentResult(polarity=compound, emotion=emotion)