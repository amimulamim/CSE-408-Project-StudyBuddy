from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.auth.firebase_auth import get_current_user
from app.core.database import get_db
from app.utils.rate_limiter import check_profile_rate_limit
from app.users.schema import (
    UserBase, UserProfile, 
    SecureProfileEdit, AdminUserEdit
)
from app.users.service import (
    get_or_create_user, get_user_by_uid,
    update_user_profile_secure, admin_update_user, is_user_admin
)

# Constants
USER_NOT_FOUND = "User not found"

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


@router.put("/profile", response_model=UserProfile)
def edit_profile_secure(
    profile_data: SecureProfileEdit,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Secure profile edit endpoint - only allows safe user fields.
    
    Rate limited: 10 requests per minute per user.
    
    Editable fields: name, bio, avatar, institution, role, location, study_domain, interests
    
    Protected fields (admin only): is_admin, is_moderator, current_plan, email, uid, auth_provider
    
    For interests field:
    - "+item" adds item to array
    - "-item" removes item from array  
    - "item1,item2" adds items to array
    
    Example request body:
    {
        "name": "John Doe",
        "bio": "Computer Science student",
        "role": "student",
        "study_domain": "Computer Science", 
        "interests": "+machine learning,-web development,data science"
    }
    """
    # Check rate limit
    is_allowed, _ = check_profile_rate_limit(user_info["uid"])
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={"X-RateLimit-Remaining": "0"}
        )
    
    updated_user = update_user_profile_secure(db, user_info["uid"], profile_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail=USER_NOT_FOUND)
    
    return updated_user


@router.put("/admin/users/{target_uid}", response_model=UserProfile)
def admin_edit_user(
    target_uid: str,
    admin_data: AdminUserEdit,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint for editing user administrative fields.
    
    Allows editing all fields including:
    - Administrative: is_admin, is_moderator, current_plan
    - Profile: name, bio, avatar, institution, role, location, study_domain, interests
    
    Requires admin privileges.
    """
    # Check if current user is admin
    if not is_user_admin(db, user_info["uid"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Admin access required"
        )
    
    updated_user = admin_update_user(db, target_uid, admin_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    return updated_user



@router.put("/profile/secure", response_model=UserProfile)
def edit_profile_with_audit(
    profile_data: SecureProfileEdit,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Enhanced secure profile edit endpoint with audit logging.
    
    Rate limited: 10 requests per minute per user.
    
    This endpoint:
    - Only allows safe user fields (excludes admin fields)
    - Logs all profile changes for audit purposes
    - Includes request metadata in audit logs
    
    Editable fields: name, bio, avatar, institution, role, location, study_domain, interests
    Protected fields: is_admin, is_moderator, current_plan, email, uid, auth_provider
    """
    # Check rate limit
    is_allowed, _ = check_profile_rate_limit(user_info["uid"])
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={"X-RateLimit-Remaining": "0"}
        )
    
    # Extract request metadata for audit logging
    ip_address = request.client.host if request and request.client else "unknown"
    user_agent = request.headers.get("user-agent") if request else "unknown"
    
    updated_user = update_user_profile_secure(
        db, user_info["uid"], profile_data, ip_address, user_agent
    )
    if not updated_user:
        raise HTTPException(status_code=404, detail=USER_NOT_FOUND)
    
    return updated_user


@router.get("/profile", response_model=UserProfile)
def get_profile(
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user profile"""
    user = get_user_by_uid(db, user_info["uid"])
    if not user:
        raise HTTPException(status_code=404, detail=USER_NOT_FOUND)
    
    return user
