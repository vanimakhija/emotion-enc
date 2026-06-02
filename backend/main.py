"""
Emotion-Aware Adaptive Encryption — FastAPI backend
Google OAuth + Gmail Sending + JWT + AES Encryption
"""

import logging
import os
import uuid
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from starlette.middleware.sessions import SessionMiddleware

load_dotenv()

from database import get_db, init_db
from models import Attachment, Message, User
from schemas import (
    AttachmentMeta,
    DecryptRequest,
    DecryptResponse,
    GmailInboxResponse,
    MarkReadRequest,
    MessageMeta,
    RegisterResponse,
    SendRequest,
    SendResponse,
    Token,
    UserCreate,
    UserLogin,
    UserProfile,
)
from auth import get_current_user
from security import hash_password, verify_password, create_access_token
from sentiment import analyze_sentiment
from encryption import (
    ENCRYPTION_KEY_LEN,
    decrypt_ciphertext,
    encrypt_plaintext,
    get_encryption_policy,
    get_risk,
)
from gmail_service import GmailException, fetch_gmail_messages, refresh_access_token, send_email
from oauth import oauth

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("emotion-encryption")

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Emotion-Aware Adaptive Encryption",
    description="Sentiment-based AES strength with JWT + Google OAuth",
)

app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET", "change-me"))

_allowed_origins = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.getenv("ATTACHMENT_STORAGE_PATH", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.on_event("startup")
def startup():
    init_db()


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/register", response_model=RegisterResponse)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    db.add(User(email=data.email, hashed_password=hash_password(data.password)))
    db.commit()
    return RegisterResponse()


@app.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid email or password")
    return Token(access_token=create_access_token({"sub": user.email}))


# ─── Google OAuth ─────────────────────────────────────────────────────────────

@app.get("/auth/google")
async def auth_google(request: Request):
    redirect_uri = request.url_for("auth_google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/google/callback")
async def auth_google_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    email = token["userinfo"]["email"]

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password=None,
            google_access_token=token.get("access_token"),
            google_refresh_token=token.get("refresh_token"),
        )
        db.add(user)
    else:
        user.google_access_token = token.get("access_token")
        if token.get("refresh_token"):
            user.google_refresh_token = token.get("refresh_token")
    db.commit()

    jwt_token = create_access_token({"sub": user.email})
    return RedirectResponse(f"{os.getenv('FRONTEND_URL')}/oauth-success?token={jwt_token}")


# ─── Profile ──────────────────────────────────────────────────────────────────

@app.get("/me", response_model=UserProfile)
def read_me(current_user: User = Depends(get_current_user)):
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        created_at=current_user.created_at,
        gmail_connected=bool(current_user.google_access_token),
    )


# ─── Send Message ─────────────────────────────────────────────────────────────

@app.post("/send", response_model=SendResponse)
def send(
    req: SendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Ensure recipient placeholder exists for FK integrity
    recipient_user = db.query(User).filter(User.email == req.recipient).first()
    if not recipient_user:
        recipient_user = User(email=req.recipient, hashed_password=None)
        db.add(recipient_user)
        db.commit()
        db.refresh(recipient_user)

    sentiment = analyze_sentiment(req.message)
    risk = get_risk(sentiment.emotion)
    encryption_label, key_length = get_encryption_policy(risk)

    message_id = str(uuid.uuid4())
    timestamp = _ts()

    ciphertext_b64, iv_b64, salt_b64 = encrypt_plaintext(req.message, key_length)

    logger.info(
        "Message encrypted",
        extra={
            "message_id": message_id,
            "emotion": sentiment.emotion,
            "encryption": encryption_label,
        },
    )

    msg = Message(
        id=message_id,
        sender_id=current_user.id,
        recipient_id=recipient_user.id,
        emotion=sentiment.emotion,
        risk=risk,
        encryption=encryption_label,
        timestamp=timestamp,
        ciphertext=ciphertext_b64,
        iv=iv_b64,
        salt=salt_b64,
    )
    db.add(msg)
    db.commit()

    # Send via Gmail if OAuth is connected.
    # We send the ciphertext — NOT the plaintext — so the message remains
    # encrypted in transit and in the recipient's Gmail inbox.
    if current_user.google_access_token:
        gmail_body = (
            f"You have a new encrypted message.\n\n"
            f"Encryption: {encryption_label}  |  Emotion: {sentiment.emotion}\n\n"
            f"Open the app to read it: {os.getenv('FRONTEND_URL', '')}/message/{message_id}\n\n"
            f"--- Ciphertext (for reference) ---\n{ciphertext_b64}"
        )
        try:
            send_email(current_user.google_access_token, req.recipient, "New Encrypted Message", gmail_body)
        except GmailException:
            if current_user.google_refresh_token:
                try:
                    new_token = refresh_access_token(current_user, db)
                    if new_token:
                        send_email(new_token, req.recipient, "New Encrypted Message", gmail_body)
                except Exception:
                    pass  # Gmail delivery is best-effort; message is already in DB

    return SendResponse(
        message_id=message_id,
        emotion=sentiment.emotion,
        risk=risk,
        encryption=encryption_label,
    )


# ─── Send with Attachments ────────────────────────────────────────────────────

@app.post("/send-with-attachments", response_model=SendResponse)
async def send_with_attachments(
    message: str = Form(...),
    recipient: str = Form(...),
    files: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Multipart endpoint supporting file attachments."""
    # Reuse the JSON send logic by constructing a SendRequest-like object
    from schemas import SendRequest as SR
    req = SR(message=message, recipient=recipient)

    # Delegate to the core send function (re-use the same send() logic inline)
    recipient_user = db.query(User).filter(User.email == req.recipient).first()
    if not recipient_user:
        recipient_user = User(email=req.recipient, hashed_password=None)
        db.add(recipient_user)
        db.commit()
        db.refresh(recipient_user)

    sentiment = analyze_sentiment(req.message)
    risk = get_risk(sentiment.emotion)
    encryption_label, key_length = get_encryption_policy(risk)
    message_id = str(uuid.uuid4())
    timestamp = _ts()

    ciphertext_b64, iv_b64, salt_b64 = encrypt_plaintext(req.message, key_length)

    msg = Message(
        id=message_id,
        sender_id=current_user.id,
        recipient_id=recipient_user.id,
        emotion=sentiment.emotion,
        risk=risk,
        encryption=encryption_label,
        timestamp=timestamp,
        ciphertext=ciphertext_b64,
        iv=iv_b64,
        salt=salt_b64,
    )
    db.add(msg)
    db.flush()  # get message_id before saving attachments

    for upload in files:
        content = await upload.read()
        if len(content) > 10 * 1024 * 1024:  # 10 MB limit per file
            raise HTTPException(413, f"File {upload.filename} exceeds 10 MB limit")

        safe_name = f"{uuid.uuid4()}_{upload.filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_name)
        with open(file_path, "wb") as f:
            f.write(content)

        db.add(Attachment(
            message_id=message_id,
            filename=upload.filename,
            content_type=upload.content_type or "application/octet-stream",
            encrypted_path=file_path,
            file_size=len(content),
        ))

    db.commit()
    logger.info("Message with %d attachment(s) saved", len(files), extra={"message_id": message_id})

    return SendResponse(
        message_id=message_id,
        emotion=sentiment.emotion,
        risk=risk,
        encryption=encryption_label,
    )


# ─── Inbox ───────────────────────────────────────────────────────────────────

@app.get("/inbox", response_model=list[MessageMeta])
def get_inbox(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    messages = (
        db.query(Message)
        .filter(Message.recipient_id == current_user.id)
        .order_by(Message.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        result.append(MessageMeta(
            id=msg.id,
            sender_id=msg.sender_id,
            recipient_id=msg.recipient_id,
            sender_email=sender.email if sender else "Unknown",
            recipient_email=current_user.email,
            recipient=current_user.email,
            emotion=msg.emotion,
            risk=msg.risk,
            encryption=msg.encryption,
            timestamp=msg.timestamp,
            is_read=msg.is_read,
            created_at=msg.created_at,
        ))
    return result


# ─── Sent ────────────────────────────────────────────────────────────────────

@app.get("/sent", response_model=list[MessageMeta])
def get_sent(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    messages = (
        db.query(Message)
        .filter(Message.sender_id == current_user.id)
        .order_by(Message.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    result = []
    for msg in messages:
        recipient = db.query(User).filter(User.id == msg.recipient_id).first()
        result.append(MessageMeta(
            id=msg.id,
            sender_id=msg.sender_id,
            recipient_id=msg.recipient_id,
            sender_email=current_user.email,
            recipient_email=recipient.email if recipient else "Unknown",
            recipient=recipient.email if recipient else "Unknown",
            emotion=msg.emotion,
            risk=msg.risk,
            encryption=msg.encryption,
            timestamp=msg.timestamp,
            is_read=msg.is_read,
            created_at=msg.created_at,
        ))
    return result


# ─── Get All Messages ─────────────────────────────────────────────────────────

@app.get("/messages", response_model=list[MessageMeta])
def get_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = (
        db.query(Message)
        .filter((Message.sender_id == current_user.id) | (Message.recipient_id == current_user.id))
        .order_by(Message.created_at.desc())
        .all()
    )
    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        recipient = db.query(User).filter(User.id == msg.recipient_id).first()
        result.append(MessageMeta(
            id=msg.id,
            sender_id=msg.sender_id,
            recipient_id=msg.recipient_id,
            sender_email=sender.email if sender else "Unknown",
            recipient_email=recipient.email if recipient else "Unknown",
            recipient=recipient.email if recipient else "Unknown",
            emotion=msg.emotion,
            risk=msg.risk,
            encryption=msg.encryption,
            timestamp=msg.timestamp,
            is_read=msg.is_read,
            created_at=msg.created_at,
        ))
    return result


# ─── Mark Read ───────────────────────────────────────────────────────────────

@app.patch("/messages/{message_id}/read")
def mark_read(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(Message).filter(
        Message.id == message_id,
        Message.recipient_id == current_user.id,
    ).first()
    if not msg:
        raise HTTPException(404, "Message not found")
    msg.is_read = True
    db.commit()
    return {"ok": True}


# ─── Decrypt ─────────────────────────────────────────────────────────────────

@app.post("/decrypt", response_model=DecryptResponse)
def decrypt_message(
    req: DecryptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(Message).filter(Message.id == req.message_id).first()
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.sender_id != current_user.id and msg.recipient_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized")

    key_length = ENCRYPTION_KEY_LEN.get(msg.encryption, 24)

    # salt column may be empty for old rows encrypted with the previous scheme
    if not msg.salt:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "This message was encrypted with an older key scheme and cannot be "
            "decrypted with the current version. Please re-send the message.",
        )

    plaintext = decrypt_ciphertext(
        msg.ciphertext,
        msg.iv,
        msg.salt,
        key_length,
    )

    # Mark as read when the recipient decrypts
    if msg.recipient_id == current_user.id and not msg.is_read:
        msg.is_read = True
        db.commit()

    return DecryptResponse(plaintext=plaintext)


# ─── Attachments ──────────────────────────────────────────────────────────────

@app.get("/messages/{message_id}/attachments", response_model=list[AttachmentMeta])
def list_attachments(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.sender_id != current_user.id and msg.recipient_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized")
    return msg.attachments


# ─── Real-time Sentiment Analysis (public) ────────────────────────────────────

from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    message: str


class AnalyzeResponse(BaseModel):
    emotion: str
    risk: str
    encryption: str


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_message(req: AnalyzeRequest):
    """Predict emotion/risk/encryption for a draft — used by the compose form."""
    sentiment = analyze_sentiment(req.message)
    risk = get_risk(sentiment.emotion)
    encryption_label, _ = get_encryption_policy(risk)
    return AnalyzeResponse(emotion=sentiment.emotion, risk=risk, encryption=encryption_label)


# ─── Analytics ───────────────────────────────────────────────────────────────

from sqlalchemy import func


@app.get("/analytics/emotions")
def emotion_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return emotion distribution for the current user's sent messages."""
    rows = (
        db.query(Message.emotion, func.count(Message.id).label("count"))
        .filter(Message.sender_id == current_user.id)
        .group_by(Message.emotion)
        .all()
    )
    return {emotion: count for emotion, count in rows}


# ─── Gmail Inbox ─────────────────────────────────────────────────────────────

@app.get("/gmail/inbox", response_model=GmailInboxResponse)
def get_gmail_inbox(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.google_access_token:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Gmail not connected. Please authenticate with Google OAuth.",
        )
    try:
        messages = fetch_gmail_messages(current_user, db, max_results=20)
        return GmailInboxResponse(messages=messages, count=len(messages))
    except GmailException as e:
        if current_user.google_refresh_token:
            try:
                new_token = refresh_access_token(current_user, db)
                if new_token:
                    messages = fetch_gmail_messages(current_user, db, max_results=20)
                    return GmailInboxResponse(messages=messages, count=len(messages))
            except Exception:
                pass
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e))