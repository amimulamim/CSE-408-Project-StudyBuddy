from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_
from app.admin.model import AdminLog, Notification
from app.admin.schema import (
    AdminLogCreate, NotificationCreate, NotificationUpdate,
    UsageStatsResponse, PaginationQuery
)
from app.users.model import User
from app.chat.model import Chat, Message
from app.users.schema import AdminUserEdit
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone
import uuid
import json

# Admin Logging Functions
def create_admin_log(
    db: Session,
    log_data: AdminLogCreate
) -> AdminLog:
    """Create an admin action log entry"""
    log_entry = AdminLog(
        admin_uid=log_data.admin_uid,
        action_type=log_data.action_type.value,
        target_uid=log_data.target_uid,
        target_type=log_data.target_type,
        details=json.dumps(log_data.details) if log_data.details else None,
        ip_address=log_data.ip_address,
        user_agent=log_data.user_agent
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

def get_admin_logs(
    db: Session,
    pagination: PaginationQuery,
    admin_uid: Optional[str] = None,
    action_type: Optional[str] = None
) -> Tuple[List[AdminLog], int]:
    """Get paginated admin logs with optional filtering"""
    query = db.query(AdminLog)
    
    if admin_uid:
        query = query.filter(AdminLog.admin_uid == admin_uid)
    if action_type:
        query = query.filter(AdminLog.action_type == action_type)
    
    total = query.count()
    logs = query.order_by(desc(AdminLog.created_at))\
                .offset(pagination.offset)\
                .limit(pagination.size)\
                .all()
    
    return logs, total

# User Management Functions
def get_all_users_paginated(
    db: Session,
    pagination: PaginationQuery
) -> Tuple[List[User], int]:
    """Get paginated list of all users"""
    total = db.query(User).count()
    users = db.query(User)\
              .order_by(desc(User.created_at))\
              .offset(pagination.offset)\
              .limit(pagination.size)\
              .all()
    
    return users, total

def admin_delete_user(db: Session, user_uid: str) -> bool:
    """Delete a user (admin only)"""
    user = db.query(User).filter(User.uid == user_uid).first()
    if not user:
        return False
    
    db.delete(user)
    db.commit()
    return True

def promote_user_to_admin(
    db: Session,
    identifier: str
) -> Optional[User]:
    """Promote a user to admin by email or username"""
    # Try to find user by email first, then by name
    user = db.query(User).filter(
        or_(User.email == identifier, User.name == identifier)
    ).first()
    
    if not user:
        return None
    
    user.is_admin = True
    db.commit()
    db.refresh(user)
    return user

# Content Management Functions (Placeholders)
def get_all_content_paginated(
    db: Session,
    pagination: PaginationQuery
) -> Tuple[List[Dict[str, Any]], int]:
    """Get paginated list of all generated content (PLACEHOLDER)"""
    # TODO: Implement when content model is ready
    return [], 0

def moderate_content(
    db: Session,
    content_id: str,
    action: str,
    moderator_uid: str
) -> bool:
    """Moderate content (PLACEHOLDER)"""
    # TODO: Implement when content model is ready
    return True

# Quiz Management Functions (Placeholders)
def get_all_quiz_results_paginated(
    db: Session,
    pagination: PaginationQuery
) -> Tuple[List[Dict[str, Any]], int]:
    """Get paginated list of all quiz results (PLACEHOLDER)"""
    # TODO: Implement when quiz model is ready
    return [], 0

# Chat Management Functions
def get_all_chats_paginated(
    db: Session,
    pagination: PaginationQuery
) -> Tuple[List[Dict[str, Any]], int]:
    """Get paginated list of all chat history"""
    # Import here to avoid circular dependency
    try:
        from app.chat.model import Chat, Message
        
        # Get chats with message count
        query = db.query(Chat).join(Message, Chat.id == Message.chat_id, isouter=True)
        total = query.count()
        
        chats = query.order_by(desc(Chat.created_at))\
                    .offset(pagination.offset)\
                    .limit(pagination.size)\
                    .all()
        
        # Convert to dict format
        chat_list = []
        for chat in chats:
            chat_dict = {
                "id": str(chat.id),
                "user_uid": chat.user_id,
                "title": chat.name,
                "created_at": chat.created_at,
                "updated_at": chat.updated_at,
                "message_count": len(chat.messages) if hasattr(chat, 'messages') else 0
            }
            chat_list.append(chat_dict)
        
        return chat_list, total
    except ImportError:
        # If chat models not available, return empty
        return [], 0

# Notification Management Functions
def create_notification(
    db: Session,
    notification_data: NotificationCreate,
    created_by: str
) -> Notification:
    """Create a new notification"""
    notification = Notification(
        id=str(uuid.uuid4()),
        recipient_uid=notification_data.recipient_uid,
        title=notification_data.title,
        message=notification_data.message,
        type=notification_data.type.value,
        created_by=created_by
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

def update_notification(
    db: Session,
    notification_id: str,
    update_data: NotificationUpdate
) -> Optional[Notification]:
    """Update an existing notification"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        return None
    
    if update_data.title is not None:
        notification.title = update_data.title
    if update_data.message is not None:
        notification.message = update_data.message
    if update_data.type is not None:
        notification.type = update_data.type.value
    if update_data.is_read is not None:
        notification.is_read = update_data.is_read
    
    db.commit()
    db.refresh(notification)
    return notification

def delete_notification(db: Session, notification_id: str) -> bool:
    """Delete a notification"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        return False
    
    db.delete(notification)
    db.commit()
    return True

def get_notifications_for_user(
    db: Session,
    user_uid: str,
    pagination: PaginationQuery
) -> Tuple[List[Notification], int]:
    """Get notifications for a specific user"""
    total = db.query(Notification).filter(Notification.recipient_uid == user_uid).count()
    notifications = db.query(Notification)\
                     .filter(Notification.recipient_uid == user_uid)\
                     .order_by(desc(Notification.created_at))\
                     .offset(pagination.offset)\
                     .limit(pagination.size)\
                     .all()
    
    return notifications, total

# Statistics Functions
def get_usage_statistics(
    db: Session,
    start_time: datetime,
    end_time: Optional[datetime] = None
) -> UsageStatsResponse:
    """
    Get usage statistics for a time period using real-time calculations.
    
    Args:
        db: Database session
        start_time: Start of the time period to analyze
        end_time: End of the time period (defaults to current time if not provided)
    
    Returns:
        UsageStatsResponse with aggregated statistics for the time period
        
    Note:
        - Calculates statistics in real-time from individual tables
        - Currently supports: users_added, chats_done
        - Some features (content, quiz, uploads) are placeholders for future implementation
    """
    # Default end_time to current time if not provided
    if end_time is None:
        end_time = datetime.now(timezone.utc)
        
    # Ensure start_time is before end_time
    if start_time >= end_time:
        raise ValueError("start_time must be before end_time")
    
    # Calculate real-time statistics from actual tables
    total_users = db.query(User).filter(
        and_(User.created_at >= start_time, User.created_at <= end_time)
    ).count()
    
    # Calculate real chat statistics
    try:
        total_chats = db.query(Chat).filter(
            and_(Chat.created_at >= start_time, Chat.created_at <= end_time)
        ).count()
    except Exception:
        total_chats = 0
    
    # TODO: Implement when content model is ready
    total_content = 0
    
    # TODO: Implement when quiz model is ready  
    total_quiz = 0
    
    # TODO: Implement when file upload model is ready
    total_uploaded = 0
    
    return UsageStatsResponse(
        users_added=total_users,
        content_generated=total_content,
        quiz_generated=total_quiz,
        content_uploaded=total_uploaded,
        chats_done=total_chats,
        period_start=start_time,
        period_end=end_time
    )

# LLM/Parser Functions (Placeholders)
def invoke_llm_service(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Invoke LLM service (PLACEHOLDER)"""
    # TODO: Implement LLM invocation
    return {"status": "success", "message": "LLM invocation placeholder"}

def invoke_parser_service(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Invoke parser service (PLACEHOLDER)"""
    # TODO: Implement parser invocation
    return {"status": "success", "message": "Parser invocation placeholder"}
