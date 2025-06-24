import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Request,exceptions
from app.core.config import settings



import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Request,exceptions
from app.core.config import settings
import os

def initialize_firebase():
    """Initialize Firebase app only once"""
    if not firebase_admin._apps:
        # Skip Firebase initialization during testing
        if os.getenv("TESTING"):
            return
            
        cred = credentials.Certificate(settings.FIREBASE_KEY_PATH)
        firebase_admin.initialize_app(cred,{
            'storageBucket': settings.FIREBASE_STORAGE_BUCKET
        })

# Initialize Firebase app only once
initialize_firebase()

def verify_firebase_token(token: str) -> dict:
    """
    Verifies the Firebase ID token.
    Returns the decoded token (user info) or raises HTTPException if invalid.
    """
    try:
        return auth.verify_id_token(token)
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Firebase token expired")
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid Firebase token format")
    except Exception:
        raise HTTPException(status_code=500, detail="Internal authentication error")


async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = auth_header.split(" ")[1]
    user_info = verify_firebase_token(token)
    return user_info
