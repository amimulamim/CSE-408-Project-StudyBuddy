import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Request,exceptions
from app.core.config import settings


# Initialize Firebase app only once
if not firebase_admin._apps:
    cred = credentials.Certificate(settings.FIREBASE_KEY_PATH)
    firebase_admin.initialize_app(cred,{
        'storageBucket': settings.FIREBASE_STORAGE_BUCKET
    })

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

    # except exceptions.FirebaseError as e:



    #     raise HTTPException(status_code=403, detail=f"Authentication failed: {e}") # Use 403 if verification fails after format check

    except Exception as e:



        raise HTTPException(status_code=500, detail="Internal authentication error")


async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = auth_header.split(" ")[1]
    user_info = verify_firebase_token(token)
    return user_info
