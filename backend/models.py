"""SQLAlchemy ORM models: User, Message, Attachment."""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, DateTime, ForeignKey,
    Text, Boolean, Index,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    """User — email/password or Google OAuth."""

    __tablename__ = "users"

    id                   = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email                = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password      = Column(String(255), nullable=True)
    google_access_token  = Column(Text, nullable=True)   # encrypted at rest (see security.py)
    google_refresh_token = Column(Text, nullable=True)   # encrypted at rest
    created_at           = Column(DateTime, default=datetime.utcnow)

    sent_messages = relationship(
        "Message",
        foreign_keys="Message.sender_id",
        back_populates="sender",
        lazy="dynamic",
    )
    received_messages = relationship(
        "Message",
        foreign_keys="Message.recipient_id",
        back_populates="recipient",
        lazy="dynamic",
    )


class Message(Base):
    """
    Encrypted message.  No plaintext stored — only ciphertext + iv + salt.
    The salt is required to re-derive the AES key on decryption.
    """

    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_recipient_created", "recipient_id", "created_at"),
        Index("ix_messages_sender_created",    "sender_id",    "created_at"),
    )

    id           = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    emotion    = Column(String(32), nullable=False)   # Positive / Neutral / Negative
    risk       = Column(String(32), nullable=False)   # Low / Medium / High
    encryption = Column(String(32), nullable=False)   # AES-128 / AES-192 / AES-256

    timestamp  = Column(String(64), nullable=False)   # ISO-8601 UTC (metadata only, NOT used in key derivation)
    ciphertext = Column(Text,       nullable=False)   # base64 AES-CBC ciphertext
    iv         = Column(Text,       nullable=False)   # base64 random IV
    salt       = Column(Text,       nullable=False, server_default="")  # base64 random HKDF salt (NEW)

    is_read    = Column(Boolean,  default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship(
        "User", foreign_keys=[sender_id], back_populates="sent_messages"
    )
    recipient = relationship(
        "User", foreign_keys=[recipient_id], back_populates="received_messages"
    )
    attachments = relationship(
        "Attachment", back_populates="message", cascade="all, delete-orphan"
    )


class Attachment(Base):
    """File attachment linked to a message. File content stored on disk/S3 encrypted."""

    __tablename__ = "attachments"

    id             = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id     = Column(String(36),  ForeignKey("messages.id"), nullable=False, index=True)
    filename       = Column(String(255), nullable=False)
    content_type   = Column(String(128), nullable=False, default="application/octet-stream")
    encrypted_path = Column(String(512), nullable=False)  # path on disk or S3 key
    file_size      = Column(Integer,     nullable=False, default=0)
    created_at     = Column(DateTime,    default=datetime.utcnow)

    message = relationship("Message", back_populates="attachments")