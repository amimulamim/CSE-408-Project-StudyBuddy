from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.auth.firebase_auth import get_current_user
from app.core.database import get_db
from app.users.service import is_user_admin, admin_update_user
from app.users.schema import AdminUserEdit, UserProfile
from app.admin import service as admin_service
from app.admin import schema as admin_schema
from app.admin.schema import (
    PaginationQuery, UserListResponse, ContentListResponse,
    QuizResultsResponse, ChatHistoryResponse, NotificationCreate,
    NotificationUpdate, NotificationResponse, LLMInvokeRequest,
    UsageStatsQuery, UsageStatsResponse, UserPromoteRequest,
    AdminLogCreate, AdminAction
)

# Constants
USER_NOT_FOUND = "User not found"
NOTIFICATION_NOT_FOUND = "Notification not found"
ADMIN_ACCESS_REQUIRED = "Admin access required"
INVALID_TARGET = "Invalid target. Must be 'llm' or 'parser'"
INVALID_DATETIME = "Invalid datetime format. Use ISO format."

router = APIRouter()

# Helper function to check admin privileges
def require_admin_access(db: Session, user_info: Dict[str, Any]):
    """Check if user has admin privileges, raise exception if not"""
    if not is_user_admin(db, user_info["uid"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ADMIN_ACCESS_REQUIRED
        )

# Helper function to log admin actions
def log_admin_action(
    db: Session,
    admin_uid: str,
    action: AdminAction,
    target_uid: str = None,
    target_type: str = "user",
    details: Dict[str, Any] = None,
    request: Request = None
):
    """Log admin actions for audit purposes"""
    ip_address = request.client.host if request and request.client else "unknown"
    user_agent = request.headers.get("user-agent") if request else "unknown"
    
    log_data = AdminLogCreate(
        admin_uid=admin_uid,
        action_type=action,
        target_uid=target_uid,
        target_type=target_type,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent
    )
    admin_service.create_admin_log(db, log_data)

@router.get("/users", response_model=UserListResponse)
def get_all_users(
    offset: int = 0,
    size: int = 20,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get paginated list of all users (Admin only)"""
    require_admin_access(db, user_info)
    
    pagination = PaginationQuery(offset=offset, size=size)
    users, total = admin_service.get_all_users_paginated(db, pagination)
    
    # Convert users to dict format
    user_list = []
    for user in users:
        user_dict = {
            "uid": user.uid,
            "email": user.email,
            "name": user.name,
            "bio": user.bio,
            "institution": user.institution,
            "role": user.role,
            "avatar": user.avatar,
            "auth_provider": user.auth_provider,
            "is_admin": user.is_admin,
            "is_moderator": user.is_moderator,
            "current_plan": user.current_plan,
            "location": user.location,
            "study_domain": user.study_domain,
            "interests": user.interests,
            "created_at": user.created_at,
            "updated_at": user.updated_at
        }
        user_list.append(user_dict)
    
    return UserListResponse(
        users=user_list,
        total=total,
        offset=offset,
        size=size
    )

@router.put("/users/{user_id}", response_model=UserProfile)
def admin_edit_user_profile(
    user_id: str,
    admin_data: AdminUserEdit,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Edit any user's profile (Admin only)"""
    require_admin_access(db, user_info)
    
    updated_user = admin_update_user(db, user_id, admin_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail=USER_NOT_FOUND)
    
    # Log the admin action
    log_admin_action(
        db, user_info["uid"], AdminAction.USER_EDIT,
        target_uid=user_id, target_type="user",
        details={"updated_fields": admin_data.dict(exclude_unset=True)},
        request=request
    )
    
    return updated_user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Delete a user account (Admin only)"""
    require_admin_access(db, user_info)
    
    success = admin_service.admin_delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail=USER_NOT_FOUND)
    
    # Log the admin action
    log_admin_action(
        db, user_info["uid"], AdminAction.USER_DELETE,
        target_uid=user_id, target_type="user",
        request=request
    )
    
    return {"message": "User deleted successfully"}

@router.get("/content", response_model=ContentListResponse)
def get_all_content(
    offset: int = 0,
    size: int = 20,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get paginated list of all generated content (Admin only)"""
    require_admin_access(db, user_info)
    
    pagination = PaginationQuery(offset=offset, size=size)
    content, total = admin_service.get_all_content_paginated(db, pagination)
    
    return ContentListResponse(
        content=content,
        total=total,
        offset=offset,
        size=size
    )

@router.get("/quiz-results", response_model=QuizResultsResponse)
def get_all_quiz_results(
    offset: int = 0,
    size: int = 20,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get paginated list of all quiz results (Admin only)"""
    require_admin_access(db, user_info)
    
    pagination = PaginationQuery(offset=offset, size=size)
    quiz_results, total = admin_service.get_all_quiz_results_paginated(db, pagination)
    
    return QuizResultsResponse(
        quiz_results=quiz_results,
        total=total,
        offset=offset,
        size=size
    )

@router.get("/chats", response_model=ChatHistoryResponse)
def get_all_chats(
    offset: int = 0,
    size: int = 20,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get paginated chat history across all users (Admin only)"""
    require_admin_access(db, user_info)
    
    pagination = PaginationQuery(offset=offset, size=size)
    chats, total = admin_service.get_all_chats_paginated(db, pagination)
    
    return ChatHistoryResponse(
        chats=chats,
        total=total,
        offset=offset,
        size=size
    )

@router.post("/llm/invoke")
def invoke_llm_or_parser(
    request_data: LLMInvokeRequest,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Invoke LLM or parser APIs (Admin only)"""
    require_admin_access(db, user_info)
    
    if request_data.target == "llm":
        response = admin_service.invoke_llm_service(request_data.payload)
    elif request_data.target == "parser":
        response = admin_service.invoke_parser_service(request_data.payload)
    else:
        raise HTTPException(status_code=400, detail=INVALID_TARGET)
    
    # Log the admin action
    log_admin_action(
        db, user_info["uid"], AdminAction.LLM_INVOKE,
        target_type=request_data.target,
        details={"target": request_data.target, "payload_keys": list(request_data.payload.keys())},
        request=request
    )
    
    return response

@router.get("/stats/usage", response_model=UsageStatsResponse)
def get_usage_statistics(
    start_time: str,
    end_time: str = None,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get usage statistics for a time period (Admin only)"""
    require_admin_access(db, user_info)
    
    try:
        from datetime import datetime
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        
        # If end_time is not provided, use current datetime
        if end_time is None:
            end_dt = datetime.now()
        else:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail=INVALID_DATETIME)
    
    return admin_service.get_usage_statistics(db, start_dt, end_dt)

@router.post("/notifications", response_model=NotificationResponse)
def send_notification(
    notification: NotificationCreate,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Send a notification to a specific user (Admin only).Allowed type: info,warning,error,success"""
    require_admin_access(db, user_info)
    
    created_notification = admin_service.create_notification(
        db, notification, user_info["uid"]
    )
    
    # Log the admin action
    log_admin_action(
        db, user_info["uid"], AdminAction.NOTIFICATION_SEND,
        target_uid=notification.recipient_uid, target_type="notification",
        details={"title": notification.title, "type": notification.type},
        request=request
    )
    
    return NotificationResponse(
        id=created_notification.id,
        recipient_uid=created_notification.recipient_uid,
        title=created_notification.title,
        message=created_notification.message,
        type=created_notification.type,
        is_read=created_notification.is_read,
        created_by=created_notification.created_by,
        created_at=created_notification.created_at,
        updated_at=created_notification.updated_at
    )

@router.put("/notifications/{notification_id}", response_model=NotificationResponse)
def edit_notification(
    notification_id: str,
    update_data: NotificationUpdate,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Edit a notification (Admin only)"""
    require_admin_access(db, user_info)
    
    updated_notification = admin_service.update_notification(db, notification_id, update_data)
    if not updated_notification:
        raise HTTPException(status_code=404, detail=NOTIFICATION_NOT_FOUND)
    
    # Log the admin action
    log_admin_action(
        db, user_info["uid"], AdminAction.NOTIFICATION_EDIT,
        target_uid=updated_notification.recipient_uid, target_type="notification",
        details={"notification_id": notification_id, "updated_fields": update_data.dict(exclude_unset=True)},
        request=request
    )
    
    return NotificationResponse(
        id=updated_notification.id,
        recipient_uid=updated_notification.recipient_uid,
        title=updated_notification.title,
        message=updated_notification.message,
        type=updated_notification.type,
        is_read=updated_notification.is_read,
        created_by=updated_notification.created_by,
        created_at=updated_notification.created_at,
        updated_at=updated_notification.updated_at
    )

@router.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: str,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Delete a notification (Admin only)"""
    require_admin_access(db, user_info)
    
    success = admin_service.delete_notification(db, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail=NOTIFICATION_NOT_FOUND)
    
    # Log the admin action
    log_admin_action(
        db, user_info["uid"], AdminAction.NOTIFICATION_DELETE,
        target_type="notification",
        details={"notification_id": notification_id},
        request=request
    )
    
    return {"message": "Notification deleted successfully"}

@router.post("/promote")
def promote_user_to_admin(
    promote_request: UserPromoteRequest,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Promote a user to admin role (Admin only)"""
    require_admin_access(db, user_info)
    
    promoted_user = admin_service.promote_user_to_admin(db, promote_request.identifier)
    if not promoted_user:
        raise HTTPException(status_code=404, detail=USER_NOT_FOUND)
    
    # Log the admin action
    log_admin_action(
        db, user_info["uid"], AdminAction.USER_PROMOTE,
        target_uid=promoted_user.uid, target_type="user",
        details={"identifier": promote_request.identifier, "promoted_to": "admin"},
        request=request
    )
    
    return {
        "message": f"User {promoted_user.name} ({promoted_user.email}) successfully promoted to admin",
        "user": {
            "uid": promoted_user.uid,
            "name": promoted_user.name,
            "email": promoted_user.email,
            "is_admin": promoted_user.is_admin
        }
    }

@router.get("/logs")
def get_admin_logs(
    offset: int = 0,
    size: int = 20,
    admin_uid: str = None,
    action_type: str = None,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get paginated admin logs with optional filtering (Admin only)"""
    require_admin_access(db, user_info)
    
    pagination = PaginationQuery(offset=offset, size=size)
    logs, total = admin_service.get_admin_logs(db, pagination, admin_uid, action_type)
    
    # Convert logs to dict format for JSON serialization
    log_list = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "admin_uid": log.admin_uid,
            "action_type": log.action_type,
            "target_uid": log.target_uid,
            "target_type": log.target_type,
            "details": log.details_dict,  # Use the property that returns dict
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at.isoformat() if log.created_at else None
        }
        log_list.append(log_dict)
    
    return {
        "logs": log_list,
        "total": total,
        "offset": offset,
        "size": size
    }

@router.get("/users/{user_id}/notifications")
def get_user_notifications(
    user_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for a specific user (Admin only)"""
    require_admin_access(db, user_info)
    
    offset = (page - 1) * size
    pagination = admin_schema.PaginationQuery(offset=offset, size=size)
    notifications, total = admin_service.get_notifications_for_user(db, user_id, pagination)
    
    # Convert notifications to dict format for JSON serialization
    notification_list = []
    for notif in notifications:
        notif_dict = {
            "id": notif.id,
            "title": notif.title,
            "message": notif.message,
            "type": notif.type,
            "recipient_uid": notif.recipient_uid,
            "is_read": notif.is_read,
            "created_at": notif.created_at.isoformat() if notif.created_at else None,
            "read_at": notif.read_at.isoformat() if notif.read_at else None
        }
        notification_list.append(notif_dict)
    
    return {
        "notifications": notification_list,
        "total": total,
        "page": page,
        "size": size
    }
