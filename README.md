# Emotion-Aware Adaptive Encryption (EAAE)

A full-stack encrypted messaging system where **AES encryption strength
automatically adapts based on the emotional sentiment of a message**.
Negative or high-risk messages get stronger encryption (AES-256);
neutral messages get moderate encryption (AES-192); positive messages
get lighter encryption (AES-128).

This isn't just a toy AES wrapper — it's a working demonstration of
**adaptive, content-aware security policy**, combining NLP sentiment
analysis with cryptographic key derivation.

---

## How It Works

```
User writes a message
        │
        ▼
VADER sentiment analysis (NLP)
        │
        ▼
Emotion → Risk → AES tier
   Positive → Low    → AES-128
   Neutral  → Medium  → AES-192
   Negative → High    → AES-256
        │
        ▼
HKDF-SHA256 key derivation (random salt per message)
        │
        ▼
AES-CBC encryption → stored in DB
        │
        ▼
Gmail notification sent (link only — plaintext never leaves the server)
        │
        ▼
Recipient logs in → decrypts inside the app
```

---

## Tech Stack

**Backend**
- FastAPI (Python)
- VADER (NLTK) — sentiment analysis
- PyCryptodome — AES-CBC encryption
- `cryptography` — HKDF-SHA256 key derivation
- SQLAlchemy + SQLite (swappable to PostgreSQL)
- JWT (python-jose) — session auth
- Authlib — Google OAuth 2.0
- Google API Client — Gmail send/read

**Frontend**
- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Recharts — analytics visualizations
- Axios — API client with JWT interceptor

---

## Features

- 🔐 Adaptive AES-128/192/256 encryption based on real-time sentiment
- 🧠 Live sentiment analysis as you type (debounced API call)
- 📎 File attachment support (multipart upload, 10MB limit per file)
- 📊 Analytics dashboard — emotion distribution & encryption tier usage charts
- 🔑 JWT authentication + Google OAuth login
- 📧 Gmail integration — notifies recipients without ever leaking plaintext
- 📱 Responsive dark-themed UI

---

## Running Locally

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1        # Windows
source .venv/bin/activate         # Mac/Linux

pip install -r requirements.txt
python -c "import nltk; nltk.download('vader_lexicon')"

# Copy .env.example to .env and fill in your secrets
cp .env.example .env

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

---

## Environment Variables

See `backend/.env.example` and `frontend/.env.local` for the full list.
Key variables:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Signs auth tokens |
| `ENCRYPTION_SECRET` | Master key material for HKDF derivation |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth + Gmail API |
| `NEXT_PUBLIC_API_URL` | Frontend → backend base URL |

Generate secure secrets:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Security Design Notes

**Why VADER instead of TextBlob?**
TextBlob scores most informal/email-style text near 0.0 polarity,
making sentiment-driven policy effectively useless — nearly every
message ends up "Neutral." VADER is built for short, informal text
and produces meaningfully different scores for genuinely different
tones.

**Why HKDF instead of raw SHA256?**
The original design derived the AES key as
`SHA256(secret + emotion + timestamp)`. Since `emotion` only has
3 possible values, this is brute-forceable in 3 attempts if an
attacker knows the timestamp (stored in the same database row).
HKDF with a random 16-byte salt per message produces a
cryptographically independent key for every message, with the salt
safely stored alongside the ciphertext.

**Why does Gmail only get a link, not the message?**
Sending the plaintext over email would defeat the entire purpose of
encrypting it. The notification email contains only a link back into
the app — decryption only ever happens inside the authenticated
session.

---

## Project Structure

```
emotion-encryption/
├── backend/
│   ├── main.py            # FastAPI app, all routes
│   ├── sentiment.py        # VADER sentiment analysis
│   ├── encryption.py       # HKDF + AES-CBC encrypt/decrypt
│   ├── models.py           # SQLAlchemy models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── security.py          # JWT + password hashing
│   ├── auth.py               # get_current_user dependency
│   ├── oauth.py               # Google OAuth client setup
│   ├── gmail_service.py        # Gmail API send/fetch
│   └── database.py              # DB engine/session
└── frontend/
    ├── app/                       # Next.js App Router pages
    ├── components/                 # React components
    ├── context/AuthContext.tsx      # Auth state management
    └── lib/api.ts                    # Axios API client
```

---

## License

MIT