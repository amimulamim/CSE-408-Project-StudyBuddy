from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.auth.firebase_auth import get_current_user
from app.core.database import get_db
from app.utils.rate_limiter import check_profile_rate_limit
from app.utils.notification_helpers import (
    format_notification_response,
    get_user_notifications_with_filter,
    mark_notification_read,
    mark_all_notifications_read,
    get_unread_count
)
from app.users.schema import (
    UserBase, UserProfile, 
    SecureProfileEdit
)
from app.users.service import (
    get_or_create_user, get_user_by_uid,
    update_user_profile_secure
)

# Constants
USER_NOT_FOUND = "User not found"
NOTIFICATION_NOT_FOUND = "Notification not found"

router = APIRouter()


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


@router.get("/notifications")
def get_my_notifications(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=50, description="Number of notifications per page"),
    unread_only: bool = Query(False, description="Only show unread notifications"),
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's notifications with pagination.
    
    - Users can only access their own notifications
    - For admin access to any user's notifications, use /admin/users/{user_id}/notifications
    
    Query Parameters:
    - page: Page number (default: 1)
    - size: Number of notifications per page (default: 10, max: 50)
    - unread_only: If true, only returns unread notifications (default: false)
    """
    offset = (page - 1) * size
    
    # Get notifications for current user only
    notifications, total = get_user_notifications_with_filter(
        db, user_info["uid"], offset, size, unread_only
    )
    
    # Convert notifications to response format
    notification_list = [format_notification_response(notif) for notif in notifications]
    
    return {
        "notifications": notification_list,
        "total": total,
        "page": page,
        "size": size,
        "unread_only": unread_only
    }


@router.put("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: str,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a specific notification as read.
    
    - Users can only mark their own notifications as read
    - For admin access, use admin endpoints
    """
    success = mark_notification_read(db, notification_id, user_info["uid"])
    if not success:
        raise HTTPException(
            status_code=404, 
            detail="Notification not found or you don't have permission to access it"
        )
    
    return {
        "message": "Notification marked as read",
        "notification_id": notification_id
    }


@router.put("/notifications/mark-all-read")
def mark_all_notifications_as_read(
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark all notifications as read for the current user.
    
    - Users can only mark their own notifications as read
    - For admin access, use admin endpoints
    """
    updated_count = mark_all_notifications_read(db, user_info["uid"])
    
    return {
        "message": f"Marked {updated_count} notifications as read",
        "notifications_updated": updated_count
    }


@router.get("/notifications/unread-count")
def get_unread_notifications_count(
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the count of unread notifications for the current user.
    
    - Users can only get their own unread count
    - For admin access, use admin endpoints
    
    Useful for displaying notification badges in UI.
    """
    unread_count = get_unread_count(db, user_info["uid"])
    
    return {
        "unread_count": unread_count
    }
