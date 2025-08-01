from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List,Optional

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

    db: Session = Depends(get_db),
    filter_role: Optional[str] = Query(
        None,
        title="Filter by role",
        description="Only return users whose role is this value (student,researcher, etc.)"
    ),

    filter_plan: Optional[str] = Query(
        None,
        title="Filter by plan",
        description="Only return users whose current plan is this value (free,pro, etc.)"
    )

):
    """Get paginated list of all users (Admin only)"""
    require_admin_access(db, user_info)
    
    pagination = PaginationQuery(offset=offset, size=size)
    users, total = admin_service.get_all_users_paginated(db, pagination,filter_role=filter_role,filter_plan=filter_plan)
    
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
    db: Session = Depends(get_db),
    filter_type: Optional[str] = Query(
        None,
        title="Filter by type",
        description="Only return users whose type matches"
    ),
    sort_by: Optional[str] = Query(
        "created_at",
        title="Sort by",
        description="Field to sort content by (created_at, topic, etc.)"
    ),
    sort_order: Optional[str] = Query(
        "desc",
        title="Sort order",   
        description="Order of sorting (asc or desc)"
    ),
    start_date: Optional[str] = Query(
        None,
        title="Start date",
        description="Filter content from this date (ISO format)"
    ),
    end_date: Optional[str] = Query(
        None,
        title="End date", 
        description="Filter content until this date (ISO format)"
    ),
):
    """Get paginated list of all generated content (Admin only)"""
    require_admin_access(db, user_info)
    
    # Parse date strings to datetime objects
    parsed_start_date = None
    parsed_end_date = None
    
    try:
        if start_date:
            from datetime import datetime
            parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            from datetime import datetime
            parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
        )
    
    pagination = PaginationQuery(offset=offset, size=size)
    content, total = admin_service.get_all_content_paginated(
        db, pagination, filter_type, sort_by=sort_by, sort_order=sort_order,
        start_date=parsed_start_date, end_date=parsed_end_date
    )
    
    return ContentListResponse(
        content=content,
        total=total,
        offset=offset,
        size=size
    )

@router.get("/content/search")
def search_content(
    query: str = Query(..., description="Search term for content topic, type, or user name"),
    offset: int = 0,
    size: int = 20,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search content by topic, content type, or user name (Admin only)"""
    require_admin_access(db, user_info)
    
    try:
        pagination = PaginationQuery(offset=offset, size=size)
        content, total = admin_service.search_content_by_query(db, query, pagination)
        
        return ContentListResponse(
            content=content,
            total=total,
            offset=offset,
            size=size
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@router.get("/content/{content_id}")
def get_content_details(
    content_id: str,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific content item (Admin only)"""
    require_admin_access(db, user_info)
    
    content_details = admin_service.get_content_details(db, content_id)
    if not content_details:
        raise HTTPException(status_code=404, detail="Content not found")
    
    return content_details

@router.delete("/content/{content_id}")
def moderate_content(
    content_id: str,
    action: str = Query("delete", description="Moderation action: delete, flag, approve"),
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Moderate content - delete or flag content (Admin/Moderator only)"""
    from app.users.service import is_user_moderator
    
    # Check if user has admin or moderator privileges
    if not is_user_moderator(db, user_info["uid"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or moderator access required"
        )
    
    success = admin_service.moderate_content(db, content_id, action, user_info["uid"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found or action failed"
        )
    
    # Log the moderation action
    log_admin_action(
        db, user_info["uid"], AdminAction.MODERATE_CONTENT,
        target_type="content",
        details={"content_id": content_id, "action": action},
        request=request
    )
    
    # Create appropriate success message based on action
    action_messages = {
        "delete": "deleted",
        "flag": "flagged", 
        "approve": "approved"
    }
    action_past = action_messages.get(action.lower(), f"{action}d")
    
    return {"message": f"Content {action_past} successfully", "content_id": content_id}

@router.get("/quiz-results", response_model=QuizResultsResponse)
def get_all_quiz_results(
    offset: int = 0,
    size: int = 20,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    sort_by: Optional[str] = Query("created_at", description="Field to sort quiz results by"),
    sort_order: Optional[str] = Query("desc", description="Order of sorting (asc or desc)"),
    filter_type: Optional[str] = Query(
        None,
        title="Filter by type",
        description="Only return quiz results of this type (e.g., MultipleChoice,ShortAnswer,TrueFalse, etc.)"
    ),
    start_date: Optional[str] = Query(
        None,
        title="Start date",
        description="Filter results from this date (ISO format)"
    ),
    end_date: Optional[str] = Query(
        None,
        title="End date", 
        description="Filter results until this date (ISO format)"
    ),
):
    """Get paginated list of all quiz results (Admin only)"""
    require_admin_access(db, user_info)
    
    # Validate filter_type if provided
    from app.quiz_generator.models import QuestionType
    valid_question_types = [qt.value for qt in QuestionType]
    if filter_type and filter_type not in valid_question_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid filter_type '{filter_type}'. Valid types are: {', '.join(valid_question_types)}"
        )
    
    # Parse date strings to datetime objects
    parsed_start_date = None
    parsed_end_date = None
    
    try:
        if start_date:
            from datetime import datetime
            parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            from datetime import datetime
            parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
        )
    
    try:
        pagination = PaginationQuery(offset=offset, size=size)
        quiz_results, total = admin_service.get_all_quiz_results_paginated(
            db, pagination, sort_by=sort_by, sort_order=sort_order, 
            filter_type=filter_type, start_date=parsed_start_date, end_date=parsed_end_date
        )
        
        return QuizResultsResponse(
            quiz_results=quiz_results,
            total=total,
            offset=offset,
            size=size
        )
    except Exception as e:
        # Log the error for debugging
        import logging
        logging.error(f"Error in get_all_quiz_results: {str(e)}")
        
        # Return a more user-friendly error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve quiz results. Please check your filter parameters."
        )

@router.get("/quiz/{quiz_id}")
def get_quiz_details(
    quiz_id: str,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific quiz (Admin only)"""
    require_admin_access(db, user_info)
    
    from app.quiz_generator.models import Quiz, QuizQuestion, QuizResult
    
    quiz = db.query(Quiz).filter(Quiz.quiz_id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Get quiz questions
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    
    # Get quiz results
    results = db.query(QuizResult).filter(QuizResult.quiz_id == quiz_id).all()
    
    return {
        "quiz": {
            "quiz_id": str(quiz.quiz_id),
            "user_id": quiz.user_id,
            "created_at": quiz.created_at.isoformat() if quiz.created_at else None
        },
        "questions": [
            {
                "id": str(q.id),
                "question_text": q.question_text,
                "type": q.type.value if q.type else None,
                "difficulty": q.difficulty.value if q.difficulty else None,
                "marks": q.marks,
                "options": q.options,
                "correct_answer": q.correct_answer
            }
            for q in questions
        ],
        "results": [
            {
                "id": str(r.id),
                "user_id": r.user_id,
                "score": r.score,
                "total": r.total,
                "percentage": round((r.score / r.total * 100), 2) if r.total > 0 else 0,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in results
        ]
    }

@router.delete("/quiz/{quiz_id}")
def delete_quiz_admin(
    quiz_id: str,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Delete a quiz (Admin only)"""
    require_admin_access(db, user_info)
    
    from app.quiz_generator.models import Quiz
    
    quiz = db.query(Quiz).filter(Quiz.quiz_id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Store quiz info before deletion for logging
    quiz_user_id = quiz.user_id
    
    # Delete the quiz (cascade delete should handle questions and results)
    db.delete(quiz)
    db.commit()
    
    # Log the admin action
    log_admin_action(
        db, user_info["uid"], AdminAction.DELETE_QUIZ,
        target_uid=quiz_user_id,
        target_type="quiz",
        details={"quiz_id": quiz_id},
        request=request
    )
    
    return {"message": "Quiz deleted successfully", "quiz_id": quiz_id}

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
        }
        notification_list.append(notif_dict)
    
    return {
        "notifications": notification_list,
        "total": total,
        "page": page,
        "size": size
    }

@router.get("/vector-db/collections")
def get_vector_db_collections(
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get information about vector database collections (Admin only)"""
    require_admin_access(db, user_info)
    
    try:
        from app.core.vector_db import VectorDatabaseManager
        from app.core.config import settings
        
        # Initialize Qdrant client
        vector_db = VectorDatabaseManager(
            qdrant_url=settings.QDRANT_URL,
            qdrant_api_key=settings.QDRANT_API_KEY,
            collection_name=settings.QDRANT_COLLECTION_NAME
        )
        
        # Get collections info
        collections = vector_db.client.get_collections()
        
        collections_info = []
        for collection in collections.collections:
            collection_info = vector_db.client.get_collection(collection.name)
            collections_info.append({
                "name": collection.name,
                "vectors_count": collection_info.vectors_count,
                "status": collection_info.status.value if collection_info.status else "unknown",
                "config": {
                    "distance": collection_info.config.params.distance.value if collection_info.config and collection_info.config.params else None,
                    "vector_size": collection_info.config.params.size if collection_info.config and collection_info.config.params else None
                }
            })
        
        return {
            "collections": collections_info,
            "total_collections": len(collections_info)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve vector database collections: {str(e)}"
        )

@router.get("/users/search")
def search_users(
    query: str = Query(..., description="Search term for user name or email"),
    size: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search users by name or email across all pages (Admin only)"""
    require_admin_access(db, user_info)
    
    try:
        users = admin_service.search_users_by_query(db, query, size)
        
        # Convert users to the same format as get_all_users endpoint
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
        
        return {
            "users": user_list,
            "total": len(user_list),
            "query": query
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@router.get("/quiz/{quiz_id}/user/{user_id}/result")
def get_user_quiz_result(
    quiz_id: str,
    user_id: str,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific user's quiz result (Admin only)"""
    require_admin_access(db, user_info)
    
    from app.quiz_generator.models import Quiz, QuizQuestion, QuizResult, QuestionResult
    
    # Get the latest quiz result for the specific user (in case of retakes)
    quiz_result = db.query(QuizResult).filter(
        QuizResult.quiz_id == quiz_id,
        QuizResult.user_id == user_id
    ).order_by(QuizResult.created_at.desc()).first()
    
    if not quiz_result:
        raise HTTPException(status_code=404, detail="Quiz result not found")
    
    # Get quiz information
    quiz = db.query(Quiz).filter(Quiz.quiz_id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Get question results for detailed answers (matching the same attempt timeframe)
    if quiz_result.created_at:
        # Get question results created around the same time as the quiz result
        # Allow a 10-minute window to account for any timing differences
        from datetime import timedelta
        time_window = timedelta(minutes=10)
        start_time = quiz_result.created_at - time_window
        end_time = quiz_result.created_at + time_window
        
        question_results = db.query(QuestionResult).filter(
            QuestionResult.quiz_id == quiz_id,
            QuestionResult.user_id == user_id,
            QuestionResult.created_at >= start_time,
            QuestionResult.created_at <= end_time
        ).order_by(QuestionResult.created_at.desc()).all()
    else:
        # Fallback to getting the most recent question results
        question_results = db.query(QuestionResult).filter(
            QuestionResult.quiz_id == quiz_id,
            QuestionResult.user_id == user_id
        ).order_by(QuestionResult.created_at.desc()).all()
    
    # Get quiz questions for additional context
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    question_map = {str(q.id): q for q in questions}
    
    # Format question results
    formatted_question_results = []
    for qr in question_results:
        question = question_map.get(str(qr.question_id))
        formatted_question_results.append({
            "question_id": str(qr.question_id),
            "score": qr.score,
            "is_correct": qr.is_correct,
            "student_answer": qr.student_answer,
            "correct_answer": question.correct_answer if question else None,
            "explanation": qr.explanation if hasattr(qr, 'explanation') else None,
            "type": question.type.value if question and question.type else None,
            "options": question.options if question else None,
            "question_text": question.question_text if question else None
        })
    
    return {
        "quiz_id": quiz_id,
        "score": quiz_result.score,
        "total": quiz_result.total,
        "topic": quiz.topic if hasattr(quiz, 'topic') else 'Quiz',
        "domain": quiz.domain if hasattr(quiz, 'domain') else 'General',
        "feedback": quiz_result.feedback or '',
        "completed_at": quiz_result.created_at.isoformat() if quiz_result.created_at else None,
        "question_results": formatted_question_results
    }
