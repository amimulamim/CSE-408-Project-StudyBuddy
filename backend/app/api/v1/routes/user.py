from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from app.auth.firebase_auth import verify_firebase_token
from app.core.database import get_db
from app.users.schema import UserBase, UserUpdate
from app.users.service import get_or_create_user, update_user

router = APIRouter()


@router.post("/login", response_model=UserBase)
def login(authorization: str = Header(...), db: Session = Depends(get_db)):
    token = authorization.split("Bearer ")[-1]
    user_info = verify_firebase_token(token)
    user_data = UserBase(
        uid=user_info["uid"],
        email=user_info["email"],
        name=user_info.get("name", "User") or "",
        avatar=user_info.get("picture") or "",  
        institution=user_info.get("institution", "") or "",
        role="student",  # or infer from user_info if available
        auth_provider=user_info.get("firebase", {}).get("sign_in_provider", "email") or "email",
        is_admin=False,
        is_moderator=False,
        moderator_id=None,
        current_plan="free",
        location="",
        study_domain="",
        interests=[],
    )
    return get_or_create_user(db, user_data)


@router.put("/profile", response_model=UserBase)
def edit_profile(
    updates: UserUpdate,
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    token = authorization.split("Bearer ")[-1]
    user_info = verify_firebase_token(token)
    return update_user(db, user_info["uid"], updates)
