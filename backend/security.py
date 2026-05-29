"""Password hashing (bcrypt) and JWT token creation/verification."""

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt, ExpiredSignatureError
from passlib.context import CryptContext

ALGORITHM = "HS256"

# Read expiry from env so it can be tuned per-environment.
# Default 7 days (was 30 min — too short, caused constant logouts).
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7)
)

SECRET_KEY = (
    os.environ.get("JWT_SECRET")
    or os.environ.get("SECRET_KEY")
    or "change-me-in-production-use-env-secret"
)

# bcrypt via passlib
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """
    Mint a signed JWT.  `data` must include at least {"sub": <email>}.
    Default expiry: ACCESS_TOKEN_EXPIRE_MINUTES (7 days).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict[str, Any] | None:
    """
    Decode and verify a JWT.
    Returns the payload dict if valid.
    Returns None for any invalid-but-not-expired token.
    Raises ExpiredSignatureError so callers can give a specific 401 message.
    """
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except ExpiredSignatureError:
        raise
    except JWTError:
        return None