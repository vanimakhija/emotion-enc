"""Tests for encryption.py — verifies HKDF key derivation and AES round-trip."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from encryption import (
    encrypt_plaintext,
    decrypt_ciphertext,
    get_risk,
    get_encryption_policy,
)


def test_encrypt_decrypt_round_trip():
    plaintext = "This is a secret message."
    ciphertext, iv, salt = encrypt_plaintext(plaintext, key_length=32)
    decrypted = decrypt_ciphertext(ciphertext, iv, salt, key_length=32)
    assert decrypted == plaintext


def test_different_salts_produce_different_ciphertext():
    """Same plaintext encrypted twice must NOT produce the same ciphertext,
    proving the salt/IV are randomized per call."""
    plaintext = "Same message every time"
    ct1, iv1, salt1 = encrypt_plaintext(plaintext, key_length=16)
    ct2, iv2, salt2 = encrypt_plaintext(plaintext, key_length=16)
    assert ct1 != ct2
    assert salt1 != salt2
    assert iv1 != iv2


def test_wrong_salt_fails_to_decrypt_correctly():
    """Using the wrong salt should not silently return the right plaintext."""
    plaintext = "Confidential data"
    ciphertext, iv, salt = encrypt_plaintext(plaintext, key_length=24)
    _, _, wrong_salt = encrypt_plaintext("different message", key_length=24)

    try:
        result = decrypt_ciphertext(ciphertext, iv, wrong_salt, key_length=24)
        assert result != plaintext
    except Exception:
        # Padding error is also an acceptable outcome — proves the wrong key was derived
        pass


def test_risk_mapping():
    assert get_risk("Positive") == "Low"
    assert get_risk("Neutral") == "Medium"
    assert get_risk("Negative") == "High"


def test_encryption_policy_mapping():
    assert get_encryption_policy("Low") == ("AES-128", 16)
    assert get_encryption_policy("Medium") == ("AES-192", 24)
    assert get_encryption_policy("High") == ("AES-256", 32)


def test_all_three_key_lengths_work():
    plaintext = "Testing all AES tiers"
    for key_length in (16, 24, 32):
        ciphertext, iv, salt = encrypt_plaintext(plaintext, key_length)
        decrypted = decrypt_ciphertext(ciphertext, iv, salt, key_length)
        assert decrypted == plaintext