# Sentiment Model Comparison: VADER vs. Trained Classifier

## Motivation

The original EAAE system used VADER — a lexicon-based, rule-driven sentiment
model — to decide encryption strength. VADER requires no training data and
runs instantly, but it has a known weakness: it relies on fixed word-polarity
lookups rather than learned patterns, so it struggles with implicit sentiment,
sarcasm, and domain-specific phrasing it wasn't designed for.

This experiment asks a concrete question: **does a model trained on labeled
data outperform VADER on the same task**, and if so, by how much?

## Method

| Step | Detail |
|---|---|
| Dataset | Sentiment140 (1.6M labeled tweets, binary: positive/negative) — [Kaggle](https://www.kaggle.com/datasets/kazanova/sentiment140) |
| Sampling | 50,000 examples, balanced (25,000 positive / 25,000 negative), randomly sampled from the full dataset |
| Features | TF-IDF, unigrams + bigrams, 10,000 max features, English stopwords removed |
| Model | Logistic Regression (scikit-learn, max_iter=1000) |
| Split | 80/20 train/test, stratified (40,000 train / 10,000 test) |
| Baseline | VADER compound score, thresholded at ±0.05 |

Both models were evaluated on the **identical held-out test set** of 10,000
examples to ensure a fair comparison.

## Results

| Metric | TF-IDF + Logistic Regression | VADER (Baseline) |
|---|---|---|
| Accuracy | 0.7545 | 0.6509 |
| Precision | 0.7445 | 0.6612 |
| Recall | 0.7750 | 0.6190 |
| F1 Score | 0.7594 | 0.6394 |

**The trained classifier improves F1 score by ~12 points over the VADER
baseline** on the same test set, a meaningful and consistent gain across
every metric measured.

![Model Comparison](model_comparison.png)

### Confusion Matrices

**Trained Model:**
![ML Confusion Matrix](confusion_ml.png)

**VADER:**
![VADER Confusion Matrix](confusion_vader.png)

## Analysis

The trained classifier outperforms VADER across every metric. This is
expected: VADER is a general-purpose, domain-agnostic lexicon tool with no
exposure to the specific vocabulary, slang, and abbreviations common in
Twitter-style text, while the Logistic Regression model directly learns
word/phrase weightings from 40,000 labeled, in-domain examples.

VADER's precision and recall are notably more balanced than the trained
model's recall-heavy profile (0.775 recall vs 0.745 precision for the
trained model), meaning the trained model is somewhat more inclined to
predict "positive" when uncertain. This is a useful diagnostic: in a
security context where under-classifying a risky message as "safe" is the
costlier error, this recall/precision tradeoff is worth tuning further
(e.g. adjusting the classification threshold) rather than accepting
scikit-learn's default 0.5 cutoff.

## Why This Matters for the EAAE System

A higher-accuracy sentiment model directly improves the integrity of the
encryption policy: if sentiment is misclassified, a high-risk message could
receive weaker encryption than it should. This experiment demonstrates that
swapping VADER for a properly trained, evaluated model is a measurable
security and reliability improvement, not just a sentiment-analysis nicety.

## Limitations & Honest Caveats

- **Binary vs. three-class:** Sentiment140 is binary (positive/negative),
  while the EAAE policy uses three tiers (Positive/Neutral/Negative). The
  trained model approximates "Neutral" using a probability threshold band
  (0.4–0.6), which is a reasonable but imperfect substitute for genuine
  3-class training data. A dataset with explicit neutral labels (e.g.
  SemEval or a custom-labeled email corpus) would be a stronger foundation.
- **Domain mismatch:** Sentiment140 is Twitter data; EAAE messages are more
  like emails. Performance in production may differ from this benchmark —
  email text tends to be longer, more formal, and less reliant on slang/
  emoji than tweets. A stronger follow-up would fine-tune or re-train on
  email-style text specifically.
- **50k subsample, not the full 1.6M:** Training was run on a balanced
  50,000-row sample rather than the full dataset, to keep iteration fast
  during development. Scaling to the full corpus would likely improve
  results further but increases training time substantially with limited
  marginal benefit for a project at this scale.
- **Simplicity by design:** TF-IDF + Logistic Regression was chosen over a
  transformer-based model (e.g. BERT/DistilBERT) deliberately, to keep
  inference fast and dependency-light for a real-time encryption-policy
  decision. A transformer would likely score higher but adds meaningful
  latency and infrastructure cost for marginal gains in this specific
  use case — a deliberate engineering tradeoff, not an oversight.

## How to Reproduce

```bash
# 1. Download Sentiment140 from Kaggle:
#    https://www.kaggle.com/datasets/kazanova/sentiment140
#    Place the CSV at: notebooks/data/sentiment140.csv

cd notebooks
pip install pandas scikit-learn matplotlib seaborn nltk
python train_classifier.py

# Outputs land in notebooks/outputs/:
#   sentiment_model.pkl, confusion_ml.png, confusion_vader.png,
#   model_comparison.png, metrics_comparison.csv

# 2. Copy the trained model into the backend:
cp outputs/sentiment_model.pkl ../backend/ml_models/sentiment_model.pkl
```