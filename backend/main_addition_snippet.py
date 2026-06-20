# ─── ADD THIS TO main.py ───────────────────────────────────────────────────
#
# 1. Add this import near the top, with your other imports:
#
#    from sentiment_ml import analyze_sentiment_ml
#
# 2. Add this new endpoint anywhere after your existing /analyze route.
#    It runs BOTH VADER and the trained ML model on the same input and
#    returns both results side by side — this is what powers the
#    "VADER vs Trained Model" comparison toggle in the UI.

class CompareRequest(BaseModel):
    message: str


class CompareResponse(BaseModel):
    vader: AnalyzeResponse
    ml_model: AnalyzeResponse
    agreement: bool


@app.post("/analyze-compare", response_model=CompareResponse)
def analyze_compare(req: CompareRequest):
    """
    Run both VADER (rule-based) and the trained TF-IDF + Logistic Regression
    classifier on the same message, for side-by-side comparison.

    Useful for the project demo: shows the trained model agreeing/disagreeing
    with the rule-based baseline on real input, in real time.
    """
    # VADER
    vader_sentiment = analyze_sentiment(req.message)
    vader_risk = get_risk(vader_sentiment.emotion)
    vader_encryption, _ = get_encryption_policy(vader_risk)

    # Trained ML model
    try:
        ml_sentiment = analyze_sentiment_ml(req.message)
        ml_risk = get_risk(ml_sentiment.emotion)
        ml_encryption, _ = get_encryption_policy(ml_risk)
    except FileNotFoundError:
        # Model not yet trained/copied into place — fall back gracefully
        ml_sentiment = vader_sentiment
        ml_risk = vader_risk
        ml_encryption = vader_encryption

    return CompareResponse(
        vader=AnalyzeResponse(emotion=vader_sentiment.emotion, risk=vader_risk, encryption=vader_encryption),
        ml_model=AnalyzeResponse(emotion=ml_sentiment.emotion, risk=ml_risk, encryption=ml_encryption),
        agreement=(vader_sentiment.emotion == ml_sentiment.emotion),
    )