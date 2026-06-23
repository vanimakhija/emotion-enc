"""
Train a TF-IDF + Logistic Regression sentiment classifier and benchmark it
against VADER on the same held-out test set.

DATASET NOTE:
This script is written to work with the Sentiment140 dataset (1.6M tweets,
labeled 0=negative, 4=positive). Download it from:
https://www.kaggle.com/datasets/kazanova/sentiment140

Place the CSV at: data/sentiment140.csv
Expected columns (no header): target, id, date, flag, user, text

If you don't have that file yet, this script falls back to NLTK's built-in
movie_reviews corpus (2000 labeled documents) so you can test the pipeline
end-to-end immediately, then swap in the real dataset for your final run.
"""

import os
import pickle
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)

import nltk
from nltk.corpus import movie_reviews
from nltk.sentiment.vader import SentimentIntensityAnalyzer

nltk.download("movie_reviews", quiet=True)
nltk.download("vader_lexicon", quiet=True)

RANDOM_STATE = 42
OUTPUT_DIR = "outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def load_sentiment140(path="data/sentiment140.csv", sample_size=50000):
    """Load and prep Sentiment140. Returns (texts, labels) with labels in {0, 1}."""
    cols = ["target", "id", "date", "flag", "user", "text"]
    df = pd.read_csv(path, encoding="latin-1", names=cols)
    # Original labels: 0=negative, 4=positive. Map to 0/1.
    df["label"] = df["target"].map({0: 0, 4: 1})
    df = df.dropna(subset=["label"])

    # Balanced random sample — avoids groupby().apply() column-flattening
    # issues across different pandas versions.
    half = sample_size // 2
    df_neg = df[df["label"] == 0].sample(n=min(half, (df["label"] == 0).sum()), random_state=RANDOM_STATE)
    df_pos = df[df["label"] == 1].sample(n=min(half, (df["label"] == 1).sum()), random_state=RANDOM_STATE)
    df_balanced = pd.concat([df_neg, df_pos]).sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)

    return df_balanced["text"].tolist(), df_balanced["label"].tolist()


def load_movie_reviews_fallback():
    """Fallback dataset (NLTK movie_reviews) — use this only to validate
    the pipeline runs end-to-end before you have Sentiment140 downloaded."""
    texts, labels = [], []
    for fileid in movie_reviews.fileids("pos"):
        texts.append(movie_reviews.raw(fileid))
        labels.append(1)
    for fileid in movie_reviews.fileids("neg"):
        texts.append(movie_reviews.raw(fileid))
        labels.append(0)
    return texts, labels


def get_vader_predictions(texts):
    """Run VADER on raw texts, return binary predictions (0=neg, 1=pos).
    Messages VADER scores as compound >= 0.05 are labeled positive,
    everything else (neutral + negative) is labeled negative for this
    binary comparison, matching the two-class setup of the trained model."""
    sia = SentimentIntensityAnalyzer()
    preds = []
    for text in texts:
        score = sia.polarity_scores(text)["compound"]
        preds.append(1 if score >= 0.05 else 0)
    return preds


def plot_confusion_matrix(y_true, y_pred, title, filename):
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(5, 4))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=["Negative", "Positive"],
        yticklabels=["Negative", "Positive"],
    )
    plt.title(title)
    plt.ylabel("True Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, filename), dpi=150)
    plt.close()


def main():
    # ── Load data ──────────────────────────────────────────────────────────
    data_path = "data/sentiment140.csv"
    if os.path.exists(data_path):
        print(f"Loading Sentiment140 from {data_path} ...")
        texts, labels = load_sentiment140(data_path)
    else:
        print(f"'{data_path}' not found — using NLTK movie_reviews fallback "
              f"dataset (2000 docs) to validate the pipeline.")
        print("Download Sentiment140 from Kaggle and place it at "
              "'data/sentiment140.csv' for the real benchmark.")
        texts, labels = load_movie_reviews_fallback()

    print(f"Loaded {len(texts)} labeled examples "
          f"({sum(labels)} positive, {len(labels) - sum(labels)} negative)")

    # ── Train/test split ──────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=RANDOM_STATE, stratify=labels
    )
    print(f"Train size: {len(X_train)} | Test size: {len(X_test)}")

    # ── Train TF-IDF + Logistic Regression ────────────────────────────────
    print("\nTraining TF-IDF + Logistic Regression...")
    vectorizer = TfidfVectorizer(
        max_features=10000, ngram_range=(1, 2), stop_words="english"
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    clf = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)
    clf.fit(X_train_vec, y_train)

    ml_preds = clf.predict(X_test_vec)

    # ── Get VADER predictions on the same test set ────────────────────────
    print("Running VADER on the same test set for comparison...")
    vader_preds = get_vader_predictions(X_test)

    # ── Evaluate both ──────────────────────────────────────────────────────
    def evaluate(y_true, y_pred, name):
        acc = accuracy_score(y_true, y_pred)
        prec = precision_score(y_true, y_pred)
        rec = recall_score(y_true, y_pred)
        f1 = f1_score(y_true, y_pred)
        print(f"\n=== {name} ===")
        print(f"Accuracy:  {acc:.4f}")
        print(f"Precision: {prec:.4f}")
        print(f"Recall:    {rec:.4f}")
        print(f"F1 Score:  {f1:.4f}")
        print(classification_report(y_true, y_pred, target_names=["Negative", "Positive"]))
        return {"accuracy": acc, "precision": prec, "recall": rec, "f1": f1}

    ml_metrics = evaluate(y_test, ml_preds, "TF-IDF + Logistic Regression (Trained Model)")
    vader_metrics = evaluate(y_test, vader_preds, "VADER (Rule-Based Baseline)")

    # ── Confusion matrices ──────────────────────────────────────────────────
    plot_confusion_matrix(y_test, ml_preds, "Confusion Matrix — ML Model", "confusion_ml.png")
    plot_confusion_matrix(y_test, vader_preds, "Confusion Matrix — VADER", "confusion_vader.png")

    # ── Comparison bar chart ────────────────────────────────────────────────
    metrics_df = pd.DataFrame({
        "ML Model": ml_metrics,
        "VADER": vader_metrics,
    }).T
    metrics_df.plot(kind="bar", figsize=(8, 5), rot=0)
    plt.title("Model Comparison: Trained Classifier vs VADER")
    plt.ylabel("Score")
    plt.ylim(0, 1)
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "model_comparison.png"), dpi=150)
    plt.close()

    # ── Save the trained model + vectorizer ─────────────────────────────────
    with open(os.path.join(OUTPUT_DIR, "sentiment_model.pkl"), "wb") as f:
        pickle.dump({"vectorizer": vectorizer, "classifier": clf}, f)

    # ── Save metrics summary ────────────────────────────────────────────────
    metrics_df.to_csv(os.path.join(OUTPUT_DIR, "metrics_comparison.csv"))

    print(f"\nAll outputs saved to '{OUTPUT_DIR}/':")
    print("  - sentiment_model.pkl       (trained model, ready to load)")
    print("  - confusion_ml.png          (confusion matrix, ML model)")
    print("  - confusion_vader.png       (confusion matrix, VADER)")
    print("  - model_comparison.png      (bar chart comparing both)")
    print("  - metrics_comparison.csv    (raw numbers)")


if __name__ == "__main__":
    main()