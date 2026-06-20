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
from sentiment_ml import analyze_sentiment_ml
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

# ─── Middleware (order matters — FastAPI applies in reverse) ──────────────────
# CORS must be added first so it wraps everything
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

# SessionMiddleware must be added AFTER CORS so it is innermost
# This fixes: AssertionError: SessionMiddleware must be installed to access request.session
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", os.getenv("JWT_SECRET", "change-me")),
    https_only=False,   # False for localhost dev
    same_site="lax",
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
    # access_type=offline + prompt=consent force Google to issue a refresh
    # token, even if the user has authorized this app before. Without this,
    # Google only issues a refresh token on the very first-ever consent grant.
    return await oauth.google.authorize_redirect(
        request,
        redirect_uri,
        access_type="offline",
        prompt="consent",
    )


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
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(f"{frontend_url}/oauth-success?token={jwt_token}")


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

def _process_and_dispatch_message(
    message_text: str,
    recipient_email: str,
    db: Session,
    current_user: User,
) -> tuple[str, str, str, str, str]:
    recipient_user = db.query(User).filter(User.email == recipient_email).first()
    if not recipient_user:
        recipient_user = User(email=recipient_email, hashed_password=None)
        db.add(recipient_user)
        db.commit()
        db.refresh(recipient_user)

    sentiment = analyze_sentiment(message_text)
    risk = get_risk(sentiment.emotion)
    encryption_label, key_length = get_encryption_policy(risk)

    message_id = str(uuid.uuid4())
    timestamp = _ts()

    ciphertext_b64, iv_b64, salt_b64 = encrypt_plaintext(message_text, key_length)

    logger.info(
        "Message encrypted | id=%s emotion=%s encryption=%s",
        message_id, sentiment.emotion, encryption_label,
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
    db.flush()

    return message_id, sentiment.emotion, risk, encryption_label, ciphertext_b64


def _notify_recipient_via_gmail(
    current_user: User,
    recipient_email: str,
    encryption_label: str,
    emotion: str,
    message_id: str,
    ciphertext_b64: str,
    db: Session,
):
    """Send a Gmail notification to the recipient. Never sends plaintext —
    only a link back into the app plus the ciphertext for reference.
    All outcomes (success, failure, skip) are logged explicitly so delivery
    issues are visible in the backend terminal instead of failing silently.
    """
    if not current_user.google_access_token:
        logger.info("Gmail notification skipped — sender has no Google access token")
        return

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    gmail_body = (
        f"You have a new encrypted message.\n\n"
        f"Encryption: {encryption_label}  |  Emotion: {emotion}\n\n"
        f"Open the app to read it: {frontend_url}/decrypt/{message_id}\n\n"
        f"--- Ciphertext (for reference) ---\n{ciphertext_b64}"
    )
    try:
        result = send_email(current_user.google_access_token, recipient_email, "New Encrypted Message", gmail_body)
        logger.info("Gmail notification sent successfully | to=%s result=%s", recipient_email, result)
    except GmailException as e:
        logger.warning("Gmail send failed with access token, trying refresh | error=%s", str(e))
        if current_user.google_refresh_token:
            try:
                new_token = refresh_access_token(current_user, db)
                if new_token:
                    result = send_email(new_token, recipient_email, "New Encrypted Message", gmail_body)
                    logger.info("Gmail notification sent successfully after refresh | to=%s result=%s", recipient_email, result)
                else:
                    logger.error("Token refresh returned no new token")
            except Exception as refresh_error:
                logger.error("Gmail send failed even after token refresh | error=%s", str(refresh_error))
        else:
            logger.error("Gmail send failed and no refresh token available | error=%s", str(e))


@app.post("/send", response_model=SendResponse)
def send(
    req: SendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message_id, emotion, risk, encryption_label, ciphertext_b64 = _process_and_dispatch_message(
        req.message, req.recipient, db, current_user
    )
    db.commit()

    _notify_recipient_via_gmail(
        current_user, req.recipient, encryption_label, emotion, message_id, ciphertext_b64, db
    )

    return SendResponse(
        message_id=message_id,
        emotion=emotion,
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
    message_id, emotion, risk, encryption_label, ciphertext_b64 = _process_and_dispatch_message(
        message, recipient, db, current_user
    )

    for upload in files:
        if not upload.filename:
            continue
        content = await upload.read()
        if len(content) > 10 * 1024 * 1024:
            db.rollback()
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
    logger.info("Message with %d attachment(s) saved | id=%s", len(files), message_id)

    _notify_recipient_via_gmail(
        current_user, recipient, encryption_label, emotion, message_id, ciphertext_b64, db
    )

    return SendResponse(
        message_id=message_id,
        emotion=emotion,
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
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    messages = (
        db.query(Message)
        .filter((Message.sender_id == current_user.id) | (Message.recipient_id == current_user.id))
        .order_by(Message.created_at.desc())
        .offset(offset)
        .limit(limit)
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


# ─── Get Single Message ───────────────────────────────────────────────────────

@app.get("/messages/{message_id}", response_model=MessageMeta)
def get_message_by_id(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a single message by ID — used by the decrypt view instead of
    loading the entire message list and filtering client-side."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.sender_id != current_user.id and msg.recipient_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized")

    sender = db.query(User).filter(User.id == msg.sender_id).first()
    recipient = db.query(User).filter(User.id == msg.recipient_id).first()
    return MessageMeta(
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
    )


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

    if not msg.salt:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "This message was encrypted with an older key scheme. Please re-send the message.",
        )

    plaintext = decrypt_ciphertext(msg.ciphertext, msg.iv, msg.salt, key_length)

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


# ─── Real-time Sentiment Analysis ────────────────────────────────────────────

from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    message: str


class AnalyzeResponse(BaseModel):
    emotion: str
    risk: str
    encryption: str


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_message(req: AnalyzeRequest):
    """Live sentiment prediction for compose form — no auth required."""
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