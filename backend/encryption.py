"""
Encryption engine: HKDF key derivation, AES-CBC (PKCS7), sentiment-based policy.
Key is derived from a random per-message salt — salt is stored in DB, never the key.
"""

import base64
import os
from typing import Literal, Tuple

from Crypto.Cipher import AES as AES_cipher
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

# Master secret — override via env in production.
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
_SECRET_RAW = os.environ.get(
    "ENCRYPTION_SECRET",
    "emotion-encryption-default-secret-change-in-production",
)
SECRET: bytes = (
    _SECRET_RAW.encode("utf-8") if isinstance(_SECRET_RAW, str) else _SECRET_RAW
)

# Risk → (AES label, key length in bytes)
RISK_TO_ENCRYPTION: dict[str, Tuple[str, int]] = {
    "Low":    ("AES-128", 16),
    "Medium": ("AES-192", 24),
    "High":   ("AES-256", 32),
}

ENCRYPTION_KEY_LEN: dict[str, int] = {
    "AES-128": 16,
    "AES-192": 24,
    "AES-256": 32,
}


def get_risk(emotion: Literal["Positive", "Neutral", "Negative"]) -> str:
    """Map emotion → risk level.  Positive=Low, Neutral=Medium, Negative=High."""
    return {"Positive": "Low", "Neutral": "Medium", "Negative": "High"}.get(
        emotion, "Medium"
    )


def get_encryption_policy(risk: str) -> Tuple[str, int]:
    """Map risk → (encryption label, key_bytes)."""
    return RISK_TO_ENCRYPTION.get(risk, ("AES-192", 24))


def _derive_key(salt: bytes, key_length: int) -> bytes:
    """
    HKDF-SHA256 with a random per-message salt.
    The salt is stored in the DB; the derived key is never stored anywhere.
    This replaces the old SHA256(secret+emotion+timestamp) approach which was
    brute-forceable because emotion has only 3 possible values.
    """
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=key_length,
        salt=salt,
        info=b"emotion-encryption-v2",
    )
    return hkdf.derive(SECRET)


def encrypt_plaintext(plaintext: str, key_length: int) -> Tuple[str, str, str]:
    """
    AES-CBC with PKCS7 padding.

    Returns:
        (base64_ciphertext, base64_iv, base64_salt)

    The caller must store all three values.  Salt + IV are safe to store
    publicly; neither reveals the key or the plaintext.
    """
    salt = get_random_bytes(16)
    key = _derive_key(salt, key_length)
    iv = get_random_bytes(16)
    cipher = AES_cipher.new(key, AES_cipher.MODE_CBC, iv)
    padded = pad(plaintext.encode("utf-8"), AES_cipher.block_size)
    ct = cipher.encrypt(padded)
    return (
        base64.b64encode(ct).decode("ascii"),
        base64.b64encode(iv).decode("ascii"),
        base64.b64encode(salt).decode("ascii"),
    )


def decrypt_ciphertext(
    ciphertext_b64: str,
    iv_b64: str,
    salt_b64: str,
    key_length: int,
) -> str:
    """
    Decrypt using HKDF key re-derived from the stored salt.

    Args:
        ciphertext_b64: base64-encoded ciphertext (from DB)
        iv_b64:         base64-encoded IV (from DB)
        salt_b64:       base64-encoded salt (from DB)
        key_length:     16 / 24 / 32 depending on AES tier
    """
    salt = base64.b64decode(salt_b64)
    key = _derive_key(salt, key_length)
    iv = base64.b64decode(iv_b64)
    ct = base64.b64decode(ciphertext_b64)
    cipher = AES_cipher.new(key, AES_cipher.MODE_CBC, iv)
    padded = cipher.decrypt(ct)
    return unpad(padded, AES_cipher.block_size).decode("utf-8")