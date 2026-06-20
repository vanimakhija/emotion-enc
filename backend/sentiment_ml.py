"""
ML-based sentiment analysis using a trained TF-IDF + Logistic Regression
classifier, as an alternative to the rule-based VADER approach in sentiment.py.

This module loads the pre-trained model artifact (sentiment_model.pkl)
produced by train_classifier.py and exposes the same interface shape as
sentiment.analyze_sentiment() so it can be swapped in or compared side by
side in the API.

To regenerate the model: run train_classifier.py with Sentiment140 data,
then copy outputs/sentiment_model.pkl into backend/ml_models/.
"""

import os
import pickle
from schemas import SentimentResult

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "ml_models", "sentiment_model.pkl")

_model_cache = None


def _load_model():
    global _model_cache
    if _model_cache is None:
        if not os.path.exists(_MODEL_PATH):
            raise FileNotFoundError(
                f"Trained model not found at {_MODEL_PATH}. "
                f"Run train_classifier.py and copy sentiment_model.pkl into backend/ml_models/."
            )
        with open(_MODEL_PATH, "rb") as f:
            _model_cache = pickle.load(f)
    return _model_cache


def analyze_sentiment_ml(text: str) -> SentimentResult:
    """
    Predict sentiment using the trained TF-IDF + Logistic Regression model.

    Returns a SentimentResult with the same shape as VADER's output so it's
    a drop-in alternative: polarity is the model's confidence (mapped to a
    -1..1 range using predict_proba), emotion is Positive/Negative.

    Note: this binary classifier does not produce a "Neutral" class — if you
    want three-way classification, you would need a 3-class labeled dataset
    (most public sentiment datasets, including Sentiment140, are binary).
    For the demo, scores near 0.5 probability are treated as Neutral so the
    existing three-tier encryption policy still applies sensibly.
    """
    model = _load_model()
    vectorizer = model["vectorizer"]
    classifier = model["classifier"]

    X = vectorizer.transform([text])
    proba = classifier.predict_proba(X)[0]  # [P(negative), P(positive)]
    positive_proba = proba[1]

    # Map probability to a -1..1 "polarity" scale, consistent with VADER's output range
    polarity = (positive_proba - 0.5) * 2

    if positive_proba >= 0.6:
        emotion = "Positive"
    elif positive_proba <= 0.4:
        emotion = "Negative"
    else:
        emotion = "Neutral"

    return SentimentResult(polarity=round(float(polarity), 4), emotion=emotion)