from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.chat.service import get_latest_chats 

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
    SecureProfileEdit, Activity
)
from app.users.service import (
    get_or_create_user, get_user_by_uid,
    update_user_profile_secure, validate_and_upload_avatar,
    update_user_avatar, delete_user_avatar, build_activities
)
from app.quiz_generator.models import QuizResult, Quiz

from app.chat.schema import ChatListResponse, ChatSummary
from app.content_generator.models import ContentItem

# Constants
USER_NOT_FOUND = "User not found"
NOTIFICATION_NOT_FOUND = "Notification not found"
RATE_LIMIT_EXCEEDED = "Rate limit exceeded. Please try again later."

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
    
    Editable fields: name, bio, avatar, institution, role, location, study_domain, interests, is_moderator
    
    Protected fields (admin only): is_admin, current_plan, email, uid, auth_provider
    
    For interests field:
    - "+item" adds item to array
    - "-item" removes item from array  
    - "item1,item2" adds items to array
    
    For is_moderator field:
    - Users can volunteer to become content moderators
    -Users can anytime remove themselves from moderator status
    - Only admins can revoke moderator status or assign admin status
    
    Example request body:
    {
        "name": "John Doe",
        "bio": "Computer Science student",
        "role": "student",
        "study_domain": "Computer Science", 
        "interests": "+machine learning,-web development,data science",
        "is_moderator": true
    }
    """
    # Check rate limit
    is_allowed, _ = check_profile_rate_limit(user_info["uid"])
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=RATE_LIMIT_EXCEEDED,
            headers={"X-RateLimit-Remaining": "0"}
        )
    
    updated_user = update_user_profile_secure(db, user_info["uid"], profile_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail=USER_NOT_FOUND)
    
    return updated_user


@router.put("/profile/avatar", response_model=Dict[str, str])
async def upload_profile_photo(
    avatar: UploadFile = File(...),
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Upload and update user profile photo.
    
    Rate limited: 10 requests per minute per user.
    
    Accepts image files: JPEG, JPG, PNG, GIF, WebP
    Maximum file size: 5MB
    
    Returns the new avatar URL and updates the user's profile in the database.
    
    Example response:
    {
        "avatar_url": "https://storage.googleapis.com/bucket/avatars/1234567890_abc123.jpg",
        "message": "Profile photo updated successfully"
    }
    """
    # Check rate limit
    is_allowed, _ = check_profile_rate_limit(user_info["uid"])
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=RATE_LIMIT_EXCEEDED,
            headers={"X-RateLimit-Remaining": "0"}
        )
    
    # Validate and upload the avatar
    avatar_url = await validate_and_upload_avatar(avatar)
    
    # Get current user to check for old avatar
    user = get_user_by_uid(db, user_info["uid"])
    if not user:
        raise HTTPException(status_code=404, detail=USER_NOT_FOUND)
    
    old_avatar = user.avatar
    
    # Update avatar in database
    updated_user = update_user_avatar(db, user_info["uid"], avatar_url)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile photo in database"
        )
    
    # Optionally delete old avatar from Firebase if it exists and is a Firebase URL
    # Note: You might want to implement cleanup in a background task for better performance
    if old_avatar and "storage.googleapis.com" in old_avatar:
        try:
            from app.utils.file_upload import delete_from_firebase
            delete_from_firebase(old_avatar)
        except Exception:
            # Don't fail the request if cleanup fails
            pass
    
    return {
        "avatar_url": avatar_url,
        "message": "Profile photo updated successfully"
    }


@router.delete("/profile/avatar", response_model=Dict[str, str])
def delete_profile_photo(
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Delete user profile photo.
    
    Rate limited: 10 requests per minute per user.
    
    This endpoint will:
    - Remove the avatar URL from the user's database record (set to null)
    - Delete the image file from Firebase Storage if it exists
    - Log the deletion for audit purposes
    
    Returns confirmation of deletion.
    
    Example response:
    {
        "message": "Profile photo deleted successfully",
        "avatar_url": ""
    }
    """
    # Check rate limit
    is_allowed, _ = check_profile_rate_limit(user_info["uid"])
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=RATE_LIMIT_EXCEEDED,
            headers={"X-RateLimit-Remaining": "0"}
        )
    
    # Delete the avatar
    updated_user = delete_user_avatar(db, user_info["uid"])
    if not updated_user:
        raise HTTPException(status_code=404, detail=USER_NOT_FOUND)
    
    return {
        "message": "Profile photo deleted successfully",
        "avatar_url": ""
    }





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

@router.get('/activities')
def get_user_activities(
    db: Session = Depends(get_db),
    user_info: Dict[str, any] = Depends(get_current_user)
):
    """
    Dummy activity endpoint for future implementation
    """
    chats = get_latest_chats(db, user_info["uid"])
    ci = ContentItem
    contents = (
        db.query(ci.id,ci.topic,ci.content_type,ci.created_at).
        where(ci.user_id == user_info["uid"]).
        order_by(ci.created_at.desc()).
        limit(10)
    )
    qr = QuizResult
    q = Quiz
    quiz_results = (
        db.query(qr.created_at, qr.id, q.topic).
        join(q, q.quiz_id == qr.quiz_id).
        where(q.user_id == user_info["uid"]).
        order_by(qr.created_at.desc()).
        limit(10)
    )
    # activities = [
    #     {
    #         "activity_type" : "chat",
    #         "details" : dict(c._mapping),
    #         "created_at": c.created_at
    #     }
    #     for c in chats
    # ]
    # activities.extend(
    #     [
    #         {
    #             "activity_type" : "content",
    #             "details" : dict(c._mapping),
    #             "created_at": c.created_at
    #         }
    #         for c in contents
    #     ]
    # )
    # activities.extend(
    #     [
    #         {
    #             "activity_type" : "quiz_taken",
    #             "details" : dict(q._mapping),
    #             "created_at": q.created_at
    #         }
    #         for q in quiz_results
    #     ]
    # )
    activities = (
        build_activities(chats, "chat") +
        build_activities(contents, "content") +
        build_activities(quiz_results, "quiz_taken")
    )

    return sorted(activities, key=lambda x:x.created_at, reverse=True)[:10]
               