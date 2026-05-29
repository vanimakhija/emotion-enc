"""Gmail service: sending encrypted emails and token refresh."""

import os
import base64
from datetime import datetime
from typing import List, Dict, Any
from email.mime.text import MIMEText
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request


class GmailException(Exception):
    """Safe exception for Gmail errors."""
    pass


def refresh_access_token(user, db) -> str | None:
    """
    Refresh Google OAuth access token using refresh token.
    Updates the user in database with new access token.
    
    Args:
        user: User model instance
        db: SQLAlchemy session
        
    Returns:
        New access token if successful, None otherwise
        
    Raises:
        GmailException: If refresh fails
    """
    if not user.google_refresh_token:
        raise GmailException("No refresh token available")
    
    try:
        creds = Credentials(
            token=None,
            refresh_token=user.google_refresh_token,
            client_id=os.environ.get("GOOGLE_CLIENT_ID"),
            client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
            token_uri="https://oauth2.googleapis.com/token",
        )
        request = Request()
        creds.refresh(request)
        
        # Update token in database
        user.google_access_token = creds.token
        db.commit()
        
        return creds.token
    except Exception as e:
        raise GmailException("Failed to refresh access token")


def fetch_gmail_messages(user, db, max_results: int = 10) -> List[Dict[str, Any]]:
    """
    Fetch messages from Gmail inbox.
    
    Args:
        user: User model instance
        db: SQLAlchemy session
        max_results: Maximum number of messages to fetch
        
    Returns:
        List of message dictionaries with id, subject, from, snippet, date
        
    Raises:
        GmailException: If fetch fails
    """
    if not user.google_access_token:
        raise GmailException("No Gmail access token available")
    
    try:
        creds = Credentials(token=user.google_access_token)
        service = build("gmail", "v1", credentials=creds)
        
        # List messages
        results = service.users().messages().list(
            userId="me",
            maxResults=max_results,
            q="in:inbox"  # Only fetch inbox messages
        ).execute()
        
        messages_list = results.get("messages", [])
        messages = []
        
        for msg in messages_list:
            try:
                # Get full message details
                msg_full = service.users().messages().get(
                    userId="me",
                    id=msg["id"],
                    format="full"
                ).execute()
                
                headers = msg_full["payload"]["headers"]
                
                # Extract relevant fields
                subject = ""
                from_addr = ""
                date_str = ""
                
                for header in headers:
                    if header["name"] == "Subject":
                        subject = header["value"]
                    elif header["name"] == "From":
                        from_addr = header["value"]
                    elif header["name"] == "Date":
                        date_str = header["value"]
                
                # Get snippet (preview)
                snippet = msg_full.get("snippet", "")
                
                # Parse date to ISO format
                try:
                    from email.utils import parsedate_to_datetime
                    parsed_date = parsedate_to_datetime(date_str)
                    iso_date = parsed_date.isoformat()
                except Exception:
                    iso_date = date_str  # Fallback to raw date string
                
                messages.append({
                    "id": msg["id"],
                    "subject": subject or "(No subject)",
                    "from": from_addr,
                    "snippet": snippet,
                    "date": iso_date,
                })
            except Exception as msg_error:
                # Skip individual messages that fail, continue with others
                continue
        
        return messages
        
    except HttpError as e:
        if e.resp.status == 401:
            raise GmailException("Access token expired")
        else:
            raise GmailException(f"Gmail API error: {e.resp.status}")
    except Exception as e:
        raise GmailException("Failed to fetch Gmail messages")


def send_email(access_token: str, to: str, subject: str, body: str) -> bool:
    """
    Send email via Gmail API.
    
    Args:
        access_token: Google OAuth access token
        to: Recipient email address
        subject: Email subject
        body: Email body text
        
    Returns:
        True if successful, False otherwise
        
    Raises:
        GmailException: If email sending fails
    """
    try:
        creds = Credentials(token=access_token)
        service = build("gmail", "v1", credentials=creds)

        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject

        raw_message = base64.urlsafe_b64encode(
            message.as_bytes()
        ).decode()

        service.users().messages().send(
            userId="me",
            body={"raw": raw_message},
        ).execute()

        return True

    except HttpError as e:
        # Handle HTTP errors from Gmail API
        if e.resp.status == 401:
            raise GmailException("Access token expired")
        else:
            raise GmailException(f"Gmail API error: {e.resp.status}")
    except Exception as e:
        raise GmailException("Failed to send email via Gmail")
