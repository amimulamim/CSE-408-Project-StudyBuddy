import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Request, HTTPException, Depends
from app.core.config import settings

cred = credentials.Certificate(settings.FIREBASE_KEY_PATH)
firebase_admin.initialize_app(cred)

def verify_firebase_token(token: str):
    try:
        return auth.verify_id_token(token)
    except Exception:
        return None

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth_header.split(" ")[1]
    user_info = verify_token(token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_info
