from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_, case, cast, Float
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

# Constants
UNTITLED_CONTENT = "Untitled Content"

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
    pagination: PaginationQuery,
    filter_role: Optional[str] = None,
    filter_plan: Optional[str] = None
) -> Tuple[List[User], int]:
    """Get paginated list of all users"""

    query = db.query(User)
    if filter_role:
        query = query.filter(User.role == filter_role)  
    
    if filter_plan:
        query = query.filter(User.current_plan.ilike(f"%{filter_plan}%"))

    total = query.count()

    users = query.order_by(desc(User.created_at))\
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

def search_users_by_query(db: Session, query: str, limit: int = 50):
    """Search users by name or email"""
    from app.users.model import User
    from sqlalchemy import or_
    
    users = db.query(User).filter(
        or_(
            User.name.ilike(f"%{query}%"),
            User.email.ilike(f"%{query}%")
        )
    ).limit(limit).all()
    
    return users

# Content Management Functions
def get_all_content_paginated(
    db: Session,
    pagination: PaginationQuery,
    filter_type: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Tuple[List[Dict[str, Any]], int]:
    """Get paginated list of all generated content with user information (latest versions only)"""
    from app.content_generator.models import ContentItem
    
    # Join with users table to get user information, only show latest versions
    query = db.query(ContentItem, User).join(User, ContentItem.user_id == User.uid).filter(
        ContentItem.is_latest_version == True
    )

    if filter_type:
        query=query.filter(ContentItem.content_type == filter_type)

    # Apply date range filtering if specified
    if start_date:
        query = query.filter(ContentItem.created_at >= start_date)
    if end_date:
        query = query.filter(ContentItem.created_at <= end_date)

    total = query.count()

    sort_column = getattr(ContentItem, sort_by, ContentItem.created_at)
    if sort_order == "asc":
        order_expr= sort_column.asc()
    else:
        order_expr= sort_column.desc()
    
    content_items = query.order_by(order_expr)\
                         .offset(pagination.offset)\
                         .limit(pagination.size)\
                         .all()
    
    content_list = []
    for content_item, user in content_items:
        # Generate a proper title from topic or use a default
        title = content_item.topic if content_item.topic else UNTITLED_CONTENT
        if len(title) > 50:
            title = title[:47] + "..."
            
        content_list.append({
            "id": str(content_item.id),
            "title": title,
            "user_id": content_item.user_id,
            "user_name": user.name,
            "user_email": user.email,
            "content_url": content_item.content_url,
            "image_preview": content_item.image_preview,
            "topic": content_item.topic,
            "collection": content_item.collection_name,
            "content_type": content_item.content_type or "Unknown",
            "raw_source": content_item.raw_source,
            "created_at": content_item.created_at.isoformat() if content_item.created_at else None
        })
    
    return content_list, total

def search_content_by_query(
    db: Session, 
    query: str, 
    pagination: PaginationQuery
) -> Tuple[List[Dict[str, Any]], int]:
    """Search content by topic, content type, or user name (latest versions only)"""
    from app.content_generator.models import ContentItem
    from sqlalchemy import or_, and_
    
    # Join with users table to get user information and enable search, only show latest versions
    base_query = db.query(ContentItem, User).join(User, ContentItem.user_id == User.uid).filter(
        ContentItem.is_latest_version == True
    )
    
    # Apply search filters
    search_query = base_query.filter(
        or_(
            ContentItem.topic.ilike(f"%{query}%"),
            ContentItem.content_type.ilike(f"%{query}%"),
            User.name.ilike(f"%{query}%"),
            User.email.ilike(f"%{query}%")
        )
    )
    
    total = search_query.count()
    
    content_items = search_query.order_by(ContentItem.created_at.desc())\
                                .offset(pagination.offset)\
                                .limit(pagination.size)\
                                .all()
    
    content_list = []
    for content_item, user in content_items:
        # Generate a proper title from topic or use a default
        title = content_item.topic if content_item.topic else UNTITLED_CONTENT
        if len(title) > 50:
            title = title[:47] + "..."
            
        content_list.append({
            "id": str(content_item.id),
            "title": title,
            "user_id": content_item.user_id,
            "user_name": user.name,
            "user_email": user.email,
            "content_url": content_item.content_url,
            "image_preview": content_item.image_preview,
            "topic": content_item.topic,
            "content_type": content_item.content_type or "Unknown",
            "raw_source": content_item.raw_source,
            "created_at": content_item.created_at.isoformat() if content_item.created_at else None
        })
    
    return content_list, total

def get_content_details(
    db: Session,
    content_id: str
) -> Optional[Dict[str, Any]]:
    """Get detailed information about a specific content item"""
    from app.content_generator.models import ContentItem
    
    # Join with users table to get user information
    result = db.query(ContentItem, User).join(User, ContentItem.user_id == User.uid)\
               .filter(ContentItem.id == content_id).first()
    
    if not result:
        return None
    
    content_item, user = result
    
    return {
        "id": str(content_item.id),
        "title": content_item.topic if content_item.topic else UNTITLED_CONTENT,
        "user_id": content_item.user_id,
        "user_name": user.name,
        "user_email": user.email,
        "user_institution": user.institution,
        "content_url": content_item.content_url,
        "image_preview": content_item.image_preview,
        "topic": content_item.topic,
        "content_type": content_item.content_type,
        "raw_source": content_item.raw_source,
        "created_at": content_item.created_at.isoformat() if content_item.created_at else None,
        "user_profile": {
            "uid": user.uid,
            "name": user.name,
            "email": user.email,
            "institution": user.institution,
            "role": user.role,
            "study_domain": user.study_domain,
            "current_plan": user.current_plan,
            "is_admin": user.is_admin,
            "is_moderator": user.is_moderator
        }
    }

def moderate_content(
    db: Session,
    content_id: str,
    action: str,
    moderator_uid: str
) -> bool:
    """Moderate content - delete or flag content"""
    from app.content_generator.models import ContentItem
    
    content = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not content:
        return False
    
    if action.lower() == "delete":
        # Delete the content
        db.delete(content)
        db.commit()
        
        # Log the moderation action
        log_data = AdminLogCreate(
            admin_uid=moderator_uid,
            action_type="moderate_content",
            target_uid=content.user_id,
            target_type="content",
            details={
                "content_id": content_id,
                "action": "delete",
                "topic": content.topic,
                "content_type": content.content_type
            }
        )
        create_admin_log(db, log_data)
        return True
    
    # For other actions (flag, approve, etc.), you could implement additional logic here
    return False

# Quiz Management Functions
def get_all_quiz_results_paginated(
    db: Session,
    pagination: PaginationQuery,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    filter_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Tuple[List[Dict[str, Any]], int]:
    """Get paginated list of all quiz results with user and quiz information (latest attempt only)"""
    from app.quiz_generator.models import QuizResult, Quiz, QuizQuestion
    
    # Get the latest created_at timestamp for each quiz-user combination, then find the corresponding records
    latest_timestamps = (
        db.query(
            QuizResult.quiz_id,
            QuizResult.user_id,
            func.max(QuizResult.created_at).label('max_created_at')
        )
        .group_by(QuizResult.quiz_id, QuizResult.user_id)
        .subquery()
    )
    
    percentage_expr = case(
        (QuizResult.total > 0,
          cast(QuizResult.score, Float) / cast(QuizResult.total, Float) * 100),
        else_=0.0
    ).label("percentage")

    # Base query: Only latest QuizResults + joins + inject the percentage column
    query = (
        db.query(QuizResult, Quiz, User, percentage_expr)
        .join(Quiz, QuizResult.quiz_id == Quiz.quiz_id)
        .join(User, QuizResult.user_id == User.uid)
        .join(
            latest_timestamps,
            and_(
                QuizResult.quiz_id == latest_timestamps.c.quiz_id,
                QuizResult.user_id == latest_timestamps.c.user_id,
                QuizResult.created_at == latest_timestamps.c.max_created_at
            )
        )
    )
    
    # Apply quiz type filtering if specified
    if filter_type:
        try:
            # Validate that the filter_type is a valid QuestionType enum value
            from app.quiz_generator.models import QuestionType
            # This will raise ValueError if filter_type is not a valid enum value
            question_type_enum = QuestionType(filter_type)
            
            # Create a subquery to find quizzes that have questions of the specified type
            quiz_type_subquery = (
                db.query(QuizQuestion.quiz_id)
                .filter(QuizQuestion.type == question_type_enum)
                .distinct()
                .subquery()
            )
            
            # Filter the main query to only include quizzes with the specified type
            query = query.filter(QuizResult.quiz_id.in_(
                db.query(quiz_type_subquery.c.quiz_id)
            ))
        except ValueError:
            # If filter_type is not a valid enum value, return empty results
            # This prevents SQL errors and provides graceful handling
            return [], 0
    
    # Apply date range filtering if specified
    if start_date or end_date:
        if start_date:
            query = query.filter(QuizResult.created_at >= start_date)
        if end_date:
            query = query.filter(QuizResult.created_at <= end_date)


    total = query.count()

    # 3) Whitelist sorting fields
    if sort_by not in ("created_at", "percentage"):
        sort_by = "created_at"

    # Pick the SQL expression to sort on
    if sort_by == "percentage":
        sort_col = percentage_expr
    else:  # created_at
        sort_col = QuizResult.created_at

    order_expr = sort_col.asc() if sort_order.lower() == "asc" else sort_col.desc()

    # 5) Apply ORDER / OFFSET / LIMIT
    quiz_results = (
        query
        .order_by(order_expr)
        .offset(pagination.offset)
        .limit(pagination.size)
        .all()
    )
    
    results_list = []
    for result, quiz, user, percentage in quiz_results:
        # Generate a title from quiz topic or use default
        quiz_title = quiz.topic if quiz.topic else UNTITLED_CONTENT
        if quiz_title == UNTITLED_CONTENT:
            quiz_title = f"Quiz {str(result.quiz_id)[:8]}"
        
        # Calculate actual time taken (difference between quiz creation and result creation)
        time_taken_seconds = 0
        if quiz.created_at and result.created_at:
            time_diff = result.created_at - quiz.created_at
            time_taken_seconds = max(int(time_diff.total_seconds()), 0)
        
        # Format time taken as MM:SS
        minutes = time_taken_seconds // 60
        seconds = time_taken_seconds % 60
        time_taken_formatted = f"{minutes:02d}:{seconds:02d}"
        
        # Determine quiz type by looking at the questions
        quiz_questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.quiz_id).all()
        quiz_types = set()
        for question in quiz_questions:
            if question.type:
                quiz_types.add(question.type.value)
        
        # Format quiz type
        if len(quiz_types) == 1:
            quiz_type = list(quiz_types)[0]
        elif len(quiz_types) > 1:
            quiz_type = "Mixed"
        else:
            quiz_type = "Unknown"
        
        # Map technical names to user-friendly names
        quiz_type_mapping = {
            "MultipleChoice": "MCQ",
            "ShortAnswer": "Short Answer",
            "TrueFalse": "True/False",
            "Mixed": "Mixed",
            "Unknown": "Unknown"
        }
        quiz_type_display = quiz_type_mapping.get(quiz_type, quiz_type)
            
        results_list.append({
            "id": str(result.id),
            "quiz_title": quiz_title,
            "quiz_type": quiz_type_display,
            "user_id": result.user_id,
            "user_name": user.name,
            "user_email": user.email,
            "user_display": f"{user.name} ({user.email})",  # Combined display for frontend
            "quiz_id": str(result.quiz_id),
            "score": int(result.score),
            "total": int(result.total),
            "total_questions": len(quiz_questions),  # Actual number of questions
            "percentage": round(float(percentage), 2),  # Use the calculated percentage from query
            "feedback": result.feedback,
            "topic": quiz.topic or "No Topic",
            "domain": quiz.domain or "No Domain",
            "difficulty": quiz.difficulty.value if quiz.difficulty else "Easy",
            "duration": quiz.duration or 0,
            "time_taken": time_taken_seconds,  # Time in seconds
            "time_taken_formatted": time_taken_formatted,  # Formatted as MM:SS
            "created_at": result.created_at.isoformat() if result.created_at else None,
            "completed_at": result.created_at.isoformat() if result.created_at else None,
            "answers": []  # Placeholder for quiz answers - can be populated later if needed
        })
    
    return results_list, total

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
    user_id: str,
    pagination: PaginationQuery
) -> Tuple[List[Notification], int]:
    """Get notifications for a specific user with pagination"""
    try:
        # Get total count
        total = db.query(Notification).filter(
            Notification.recipient_uid == user_id
        ).count()
        
        # Get paginated notifications
        notifications = db.query(Notification).filter(
            Notification.recipient_uid == user_id
        ).order_by(
            desc(Notification.created_at)
        ).offset(
            pagination.offset
        ).limit(
            pagination.size
        ).all()
        
        return notifications, total
        
    except Exception as e:
        print(f"Error getting notifications for user {user_id}: {str(e)}")
        return [], 0

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
    
    # Calculate content generation statistics
    try:
        from app.content_generator.models import ContentItem
        total_content = db.query(ContentItem).filter(
            and_(ContentItem.created_at >= start_time, ContentItem.created_at <= end_time)
        ).count()
    except Exception:
        total_content = 0
    
    # Calculate quiz generation statistics
    try:
        from app.quiz_generator.models import Quiz
        total_quiz = db.query(Quiz).filter(
            and_(Quiz.created_at >= start_time, Quiz.created_at <= end_time)
        ).count()
    except Exception:
        total_quiz = 0
    
    # Calculate file upload statistics
    try:
        from app.document_upload.models import UploadedDocument
        total_uploaded = db.query(UploadedDocument).filter(
            and_(UploadedDocument.created_at >= start_time, UploadedDocument.created_at <= end_time)
        ).count()
    except Exception:
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
    # TODO: Implement LLM invocation - this will be implemented when LLM service is ready
    return {"status": "success", "message": "LLM invocation placeholder", "payload_received": bool(payload)}

def invoke_parser_service(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Invoke parser service (PLACEHOLDER)"""
    # TODO: Implement parser invocation - this will be implemented when parser service is ready
    return {"status": "success", "message": "Parser invocation placeholder", "payload_received": bool(payload)}
