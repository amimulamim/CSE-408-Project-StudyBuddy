from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.auth.firebase_auth import get_current_user
from app.core.database import get_db
from app.users.schema import UserBase, UserUpdate, ProfileEditRequest, UserProfile
from app.users.service import get_or_create_user, update_user, update_user_profile, get_user_by_uid

router = APIRouter()


@router.post("/login", response_model=UserBase)
def login(
    user_info: Dict[str, Any] = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
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




@router.put("/profile/edit", response_model=UserProfile)
def edit_profile_advanced(
    profile_data: ProfileEditRequest,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Advanced profile edit endpoint with array operations support.
    
    For interests field:
    - "+item" adds item to array
    - "-item" removes item from array  
    - "item1,item2" adds items to array
    
    Example request body:
    {
        "study_domain": "Physics", 
        "interests": "+quantum physics,-mechanics,thermodynamics"
    }
    """
    updated_user = update_user_profile(db, user_info["uid"], profile_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return updated_user


@router.get("/profile", response_model=UserProfile)
def get_profile(
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user profile"""
    user = get_user_by_uid(db, user_info["uid"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user
