# Security Design

This document explains the cryptographic and security decisions in this
project — useful for interviews and code review.

## 1. Sentiment Analysis: VADER over TextBlob

**Problem with TextBlob:** TextBlob's polarity scoring is pattern-based
and tuned for formal text. Informal/email-style writing — "ugh this is
so annoying", "thanks so much!!" — scores very close to 0.0, collapsing
almost every message into "Neutral." This makes the entire premise of
the project (adaptive encryption based on emotion) non-functional.

**Why VADER:** VADER (Valence Aware Dictionary for sEntiment Reasoning)
is a lexicon- and rule-based model specifically tuned for social-media
and informal text. It accounts for intensifiers ("very", "extremely"),
negation ("not good"), and punctuation/capitalization emphasis ("GREAT!!!").

## 2. Key Derivation: HKDF over raw SHA256

**Original flawed approach:**
```
key = SHA256(secret + emotion + timestamp)
```
This is broken for two reasons:
1. `emotion` only takes 3 values (Positive/Neutral/Negative) — an
   attacker who obtains the ciphertext and timestamp (both stored in
   the same DB row) can brute-force the key in 3 attempts.
2. SHA256 is a hash function, not a KDF. Hash functions are designed
   for speed and collision resistance, not for safely stretching a
   secret into key material.

**Fixed approach:**
```
key = HKDF-SHA256(secret, salt=random_16_bytes, info=b"emotion-encryption-v2")
```
A fresh, cryptographically random salt is generated per message and
stored alongside the ciphertext. Even if an attacker has full database
access, they cannot derive the key without the master `ENCRYPTION_SECRET`,
which is never persisted to disk except in the server's own `.env`.

## 3. AES Mode: CBC with Random IV

Each message uses a freshly generated 16-byte IV (`Crypto.Random.get_random_bytes`),
preventing identical plaintexts from producing identical ciphertexts.
PKCS7 padding is applied via `Crypto.Util.Padding`.

*Future improvement: migrate to AES-GCM for authenticated encryption
(integrity + confidentiality in one primitive, removing the need for
a separate MAC).*

## 4. Why Gmail Never Receives Plaintext or Even Ciphertext in Full

The notification email sent via Gmail API contains:
- The encryption tier used (e.g. "AES-256")
- The detected emotion
- A link back into the app to view/decrypt the message

It deliberately does **not** include plaintext. This was a real bug
in an earlier version of this project — the Gmail integration sent
`req.message` (the raw plaintext) directly, which defeated the purpose
of encrypting it in the first place. Decryption only happens inside
an authenticated session in the app.

## 5. Password Storage

Passwords are hashed with bcrypt via `passlib`. Plaintext passwords are
never logged or stored. bcrypt's built-in work factor protects against
brute-force and rainbow-table attacks.

## 6. JWT Token Handling

- Tokens are signed with HS256 using a server-side secret (`JWT_SECRET`).
- Default expiry: 7 days (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`).
- On `401 Unauthorized`, the frontend automatically clears the token
  and redirects to `/login`.

## 7. Known Limitations / Future Work

- **No AES-GCM yet** — CBC mode requires careful IV handling and lacks
  built-in authentication; GCM would be a stronger choice for v2.
- **No rate limiting** on `/login` or `/register` — recommended addition:
  `slowapi` middleware to prevent brute-force login attempts.
- **OAuth tokens stored in plaintext** in the database — should be
  encrypted at rest using the same `ENCRYPTION_SECRET`.
- **SQLite in development** — fine for a final-year project demo, but
  should be PostgreSQL for any real deployment (better concurrency,
  backups, and durability guarantees).