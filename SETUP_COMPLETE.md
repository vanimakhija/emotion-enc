# Emotion-Aware Encryption - Setup Complete ✓

## What Has Been Set Up

Your frontend and backend are now fully integrated and working together! Here's what was accomplished:

### Backend (FastAPI)
- **Status**: Running on `http://localhost:8000`
- **Features**:
  - User registration & login with JWT authentication
  - Google OAuth integration for Gmail
  - Sentiment analysis for incoming messages
  - Adaptive encryption based on emotion risk level
  - Message encryption/decryption
  - File attachment support
  - Email notifications via Gmail
  - Analytics dashboard

### Frontend (Next.js)
- **Status**: Running on `http://localhost:3000`
- **Features**:
  - Modern UI with Tailwind CSS + Radix UI
  - User authentication with protected routes
  - Inbox view for received messages
  - Sent messages view
  - Compose new messages with file attachments
  - Real-time sentiment analysis preview
  - User profile with emotion analytics
  - Responsive design

## How to Access the Application

1. Open your browser and go to **http://localhost:3000**
2. Create an account or login
3. Start sending encrypted messages!

## Running the Servers

### Backend
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

Both are currently running in separate terminals.

## API Endpoints

The frontend communicates with the backend via REST API. Key endpoints:

- **Authentication**:
  - `POST /register` - Create new account
  - `POST /login` - Login with credentials
  - `GET /me` - Get current user profile
  - `GET /auth/google` - Google OAuth login

- **Messages**:
  - `POST /send` - Send encrypted message
  - `POST /send-with-attachments` - Send message with files
  - `GET /inbox` - Retrieve received messages
  - `GET /sent` - Retrieve sent messages
  - `POST /decrypt` - Decrypt a message
  - `PATCH /messages/{id}/read` - Mark message as read
  - `GET /messages/{id}/attachments` - Get file attachments

- **Analysis**:
  - `POST /analyze` - Real-time sentiment analysis
  - `GET /analytics/emotions` - Emotion distribution stats

- **Gmail Integration**:
  - `GET /gmail/inbox` - Fetch Gmail messages (requires OAuth)

## Environment Configuration

### Backend (.env)
- `FRONTEND_URL=http://localhost:3000` - Frontend URL for OAuth redirects
- `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000` - CORS configuration
- `DATABASE_URL=sqlite:///./emotion_encryption.db` - Database file
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - OAuth credentials

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL=http://localhost:8000` - Backend API URL

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Frontend (Next.js)              │
│  • React Components                         │
│  • Authentication Context                   │
│  • API Client Service                       │
│  • Pages: Login, Register, Inbox, Compose   │
└──────────────────┬──────────────────────────┘
                   │ HTTP/REST
                   ↓
┌─────────────────────────────────────────────┐
│             Backend (FastAPI)               │
│  • User Management                          │
│  • Message Encryption/Decryption            │
│  • Sentiment Analysis                       │
│  • Gmail Integration                        │
│  • Database (SQLite)                        │
└─────────────────────────────────────────────┘
```

## Key Features

### 1. Sentiment-Based Encryption
- Messages are analyzed for emotion (happy, sad, angry, etc.)
- Encryption strength adapts based on emotion risk level:
  - Neutral/Positive emotions → Standard encryption (AES-192)
  - Negative emotions → Stronger encryption (AES-256)

### 2. Secure Authentication
- JWT tokens for session management
- Password hashing with bcrypt
- Google OAuth 2.0 integration

### 3. End-to-End Workflow
1. User registers or logs in
2. Compose message - real-time sentiment preview
3. Message encrypted with adaptive strength
4. Sent via app or Gmail
5. Recipient receives encrypted message
6. Recipient decrypts and reads message
7. Emotion analytics tracked

### 4. File Attachments
- Upload up to 10MB files per message
- Files encrypted and stored securely
- Support for all file types

## File Structure

```
emotion-encryption/
├── backend/
│   ├── main.py              # FastAPI app & routes
│   ├── models.py            # Database models
│   ├── schemas.py           # Request/response schemas
│   ├── database.py          # DB initialization
│   ├── auth.py              # Authentication logic
│   ├── security.py          # Password hashing & JWT
│   ├── encryption.py        # AES encryption
│   ├── sentiment.py         # Emotion analysis
│   ├── gmail_service.py     # Gmail API integration
│   ├── oauth.py             # OAuth configuration
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Configuration
│
└── frontend/
    ├── app/
    │   ├── layout.tsx       # Root layout with auth provider
    │   ├── page.tsx         # Home page
    │   ├── login/           # Login page
    │   ├── register/        # Registration page
    │   └── (protected)/     # Protected routes
    │       ├── inbox/       # Inbox page
    │       ├── sent/        # Sent messages page
    │       ├── compose/     # Compose message page
    │       ├── message/     # Message detail page
    │       ├── profile/     # User profile page
    │       └── layout.tsx   # Protected layout with nav
    ├── lib/
    │   ├── api.ts           # API client service
    │   └── auth-context.tsx # Auth context provider
    ├── package.json         # Node dependencies
    ├── .env.local           # Frontend config
    └── next.config.mjs      # Next.js configuration
```

## Next Steps

1. **Create an account** and test the application
2. **Send test messages** to yourself or others
3. **Connect Gmail** for email notifications
4. **Monitor analytics** on the profile page
5. **Customize encryption policies** as needed

## Troubleshooting

### Frontend not starting?
- Ensure port 3000 is available
- Run `npm install` if dependencies are missing
- Check `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`

### Backend connection issues?
- Ensure backend is running on port 8000
- Check `.env` has correct database URL
- Verify CORS is configured in backend

### Database errors?
- Delete `emotion_encryption.db` to reset database
- Backend will create a new one on startup

## Security Notes

- JWT tokens expire after 7 days by default
- Passwords are hashed with bcrypt
- Encryption keys are derived from master secret using HKDF
- File attachments are encrypted before storage
- CORS is restricted to specified origins

---

**Your application is now ready to use!** 🚀

Visit http://localhost:3000 to get started.
