"""SQLAlchemy database configuration and session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from models import Base

import os
from dotenv import load_dotenv

load_dotenv()

# SQLite file in backend directory
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./emotion_encryption.db")

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    poolclass=StaticPool,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency that yields a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Call on application startup."""
    Base.metadata.create_all(bind=engine)
