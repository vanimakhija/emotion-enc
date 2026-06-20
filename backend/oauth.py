from authlib.integrations.starlette_client import OAuth
from fastapi import Request
import os

oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
        # access_type=offline tells Google to issue a refresh token, not just an access token.
        # prompt=consent forces the consent screen every time, which is required for Google
        # to re-issue a refresh token even if the user has authorized this app before.
        "access_type": "offline",
        "prompt": "consent",
    },
)