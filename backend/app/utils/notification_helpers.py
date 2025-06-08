"""
Notification utility functions and helpers
"""
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.admin.model import Notification


def format_notification_response(notif: Notification) -> Dict[str, Any]:
    """
    Format a notification object into a consistent response dictionary
    """
    return {
        "id": notif.id,
        "title": notif.title,
        "message": notif.message,
        "type": notif.type,
        "is_read": notif.is_read,
        "created_at": notif.created_at.isoformat() if notif.created_at else None,
        "updated_at": notif.updated_at.isoformat() if notif.updated_at else None
    }


def get_user_notifications_with_filter(
    db: Session,
    user_uid: str,
    offset: int = 0,
    limit: int = 10,
    unread_only: bool = False
):
    """
    Get notifications for a specific user with optional filtering
    
    Args:
        db: Database session
        user_uid: User UID to get notifications for
        offset: Number of notifications to skip
        limit: Maximum number of notifications to return
        unread_only: If True, only return unread notifications
    
    Returns:
        Tuple of (notifications_list, total_count)
    """
    query = db.query(Notification).filter(Notification.recipient_uid == user_uid)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    total = query.count()
    notifications = query.order_by(Notification.created_at.desc())\
                         .offset(offset)\
                         .limit(limit)\
                         .all()
    
    return notifications, total


def mark_notification_read(db: Session, notification_id: str, user_uid: str) -> bool:
    """
    Mark a notification as read, but only if it belongs to the specified user
    
    Args:
        db: Database session
        notification_id: ID of the notification to mark as read
        user_uid: UID of the user (for authorization)
    
    Returns:
        True if notification was marked as read, False if not found or unauthorized
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_uid == user_uid
    ).first()
    
    if not notification:
        return False
    
    if not notification.is_read:
        notification.is_read = True
        db.commit()
        db.refresh(notification)
    
    return True


def mark_all_notifications_read(db: Session, user_uid: str) -> int:
    """
    Mark all unread notifications as read for a specific user
    
    Args:
        db: Database session
        user_uid: UID of the user
    
    Returns:
        Number of notifications that were marked as read
    """
    from datetime import datetime, timezone
    
    updated_count = db.query(Notification)\
        .filter(
            Notification.recipient_uid == user_uid,
            Notification.is_read == False
        )\
        .update({
            "is_read": True,
            "updated_at": datetime.now(timezone.utc)
        })
    
    db.commit()
    return updated_count


def get_unread_count(db: Session, user_uid: str) -> int:
    """
    Get the count of unread notifications for a user
    
    Args:
        db: Database session
        user_uid: UID of the user
    
    Returns:
        Number of unread notifications
    """
    return db.query(Notification).filter(
        Notification.recipient_uid == user_uid,
        Notification.is_read == False
    ).count()
