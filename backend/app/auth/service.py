from app.auth.firebase_auth import verify_firebase_token
from app.users.schema import UserBase

def get_user_from_token(token: str) -> UserBase:
    user_info = verify_firebase_token(token)
    return UserBase(
        uid=user_info["uid"],
        email=user_info["email"],
        name=user_info.get("name", "User"),
        avatar=user_info.get("picture")
    )
