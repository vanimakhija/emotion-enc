"""Tests for sentiment.py — verifies VADER correctly classifies emotion tiers."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sentiment import analyze_sentiment


def test_positive_message():
    result = analyze_sentiment("I am so happy and grateful for everything, thank you!")
    assert result.emotion == "Positive"
    assert result.polarity > 0


def test_negative_message():
    result = analyze_sentiment("I hate this, it's absolutely terrible and infuriating.")
    assert result.emotion == "Negative"
    assert result.polarity < 0


def test_neutral_message():
    result = analyze_sentiment("The meeting is scheduled for 3pm tomorrow.")
    assert result.emotion == "Neutral"


def test_empty_message_does_not_crash():
    result = analyze_sentiment("")
    assert result.emotion in ("Positive", "Neutral", "Negative")


def test_intensifier_increases_negative_score():
    mild = analyze_sentiment("This is bad.")
    strong = analyze_sentiment("This is absolutely horrendous and disgusting.")
    assert strong.polarity < mild.polarity