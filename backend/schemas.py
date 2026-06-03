"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, constr, field_validator, ConfigDict


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        return v



class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    """Returned by GET /me."""
    id:              int
    email:           EmailStr
    created_at:      datetime
    gmail_connected: bool = False   # True when google_access_token is present

    model_config = ConfigDict(from_attributes=True)


# ─── Messaging ───────────────────────────────────────────────────────────────

class SendRequest(BaseModel):
    message:   str = Field(..., min_length=1)
    recipient: str = Field(..., min_length=1)


class DecryptRequest(BaseModel):
    message_id: str


class SendResponse(BaseModel):
    message_id: str
    emotion:    str
    risk:       str
    encryption: str


class MessageMeta(BaseModel):
    """Message metadata for inbox / sent views (no ciphertext exposed)."""
    id:               str
    sender_id:        int
    recipient_id:     int
    sender_email:     Optional[str] = None
    recipient_email:  Optional[str] = None
    recipient:        Optional[str] = None
    emotion:          str
    risk:             str
    encryption:       str
    timestamp:        str
    is_read:          bool
    created_at:       Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DecryptResponse(BaseModel):
    plaintext: str


class MarkReadRequest(BaseModel):
    message_id: str


# ─── Attachments ─────────────────────────────────────────────────────────────

class AttachmentMeta(BaseModel):
    id:           str
    filename:     str
    content_type: str
    file_size:    int
    created_at:   datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Sentiment (internal) ────────────────────────────────────────────────────

class SentimentResult(BaseModel):
    polarity: float
    emotion:  Literal["Positive", "Neutral", "Negative"]


# ─── Register ────────────────────────────────────────────────────────────────

class RegisterResponse(BaseModel):
    message: str = "User registered successfully"


# ─── Gmail ───────────────────────────────────────────────────────────────────

class GmailMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id:      str
    subject: str
    from_:   str = Field(..., alias="from", serialization_alias="from")
    snippet: str
    date:    str


class GmailInboxResponse(BaseModel):
    messages: list[GmailMessage]
    count:    int