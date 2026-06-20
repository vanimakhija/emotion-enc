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
| Dataset | Sentiment140 (1.6M labeled tweets, binary: positive/negative) |
| Features | TF-IDF, unigrams + bigrams, 10,000 max features, English stopwords removed |
| Model | Logistic Regression (scikit-learn, max_iter=1000) |
| Split | 80/20 train/test, stratified |
| Baseline | VADER compound score, thresholded at ±0.05 |

Both models were evaluated on the **identical held-out test set** to ensure
a fair comparison.

## Results

| Metric | TF-IDF + Logistic Regression | VADER (Baseline) |
|---|---|---|
| Accuracy | 0.83 | 0.65 |
| Precision | 0.81 | 0.61 |
| Recall | 0.86 | 0.81 |
| F1 Score | 0.83 | 0.70 |

*(Numbers shown are from the pipeline validation run on a 2,000-document
sample. Re-run `train_classifier.py` with the full Sentiment140 dataset
for the final reported numbers — see `notebooks/train_classifier.py`.)*

![Model Comparison](model_comparison.png)

### Confusion Matrices

**Trained Model:**
![ML Confusion Matrix](confusion_ml.png)

**VADER:**
![VADER Confusion Matrix](confusion_vader.png)

## Analysis

The trained classifier outperforms VADER across every metric, which is
expected — VADER is a general-purpose, domain-agnostic tool with no exposure
to the specific vocabulary and patterns in the training data, while the
Logistic Regression model directly learns word/phrase weightings from
labeled examples in-domain.

VADER's recall is closer to the trained model's than its precision —
meaning VADER tends to **over-predict positive sentiment**, flagging more
borderline or neutral text as positive than the trained model does. This
matches a known criticism of lexicon-based sentiment tools: they can be
swayed by individual positive words ("good", "great") even when the overall
sentence is negative or sarcastic ("yeah, great, my phone broke again").

## Why This Matters for the EAAE System

A higher-accuracy sentiment model directly improves the integrity of the
encryption policy: if sentiment is misclassified, a high-risk message could
receive weaker encryption than it should. This experiment demonstrates that
swapping VADER for a properly trained, evaluated model is a measurable
security and reliability improvement, not just a sentiment-analysis nicety.

## Limitations & Honest Caveats

- **Binary vs. three-class:** Most public sentiment datasets (including
  Sentiment140) are binary (positive/negative), while the EAAE policy uses
  three tiers (Positive/Neutral/Negative). The trained model approximates
  "Neutral" using a probability threshold band, which is a reasonable but
  imperfect substitute for genuine 3-class training data.
- **Domain mismatch:** Sentiment140 is Twitter data; EAAE messages are more
  like emails. Performance in production may differ from this benchmark.
  A stronger follow-up would fine-tune or re-train on email-style text.
- **Simplicity by design:** TF-IDF + Logistic Regression was chosen over a
  transformer-based model (e.g. BERT) deliberately, to keep inference fast
  and dependency-light for a real-time encryption-policy decision. A
  transformer would likely score higher but adds significant latency and
  infrastructure cost for marginal gains in this specific use case.

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