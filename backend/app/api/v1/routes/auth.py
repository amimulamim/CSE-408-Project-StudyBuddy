from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.auth.firebase_auth import get_current_user
from app.core.database import get_db
from app.users.schema import UserBase
from app.users.service import get_or_create_user

router = APIRouter()


@router.post("/login", response_model=UserBase)
def login(
    user_info: Dict[str, Any] = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    User login endpoint.
    
    This endpoint:
    - Validates the Firebase JWT token
    - Creates a new user record if first login
    - Returns existing user data if user already exists
    
    All new users are created with default settings:
    - Role: student
    - Plan: free
    - Admin/Moderator: false
    """
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