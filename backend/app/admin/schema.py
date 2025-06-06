from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class NotificationType(str, Enum):
    """Notification types"""
    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
    ERROR = "error"

class AdminAction(str, Enum):
    """Admin action types for logging"""
    USER_EDIT = "user_edit"
    USER_DELETE = "user_delete"
    USER_PROMOTE = "user_promote"
    NOTIFICATION_SEND = "notification_send"
    NOTIFICATION_EDIT = "notification_edit"
    NOTIFICATION_DELETE = "notification_delete"
    CONTENT_MODERATE = "content_moderate"
    LLM_INVOKE = "llm_invoke"

class PaginationQuery(BaseModel):
    """Standard pagination parameters"""
    offset: int = Field(ge=0, default=0)
    size: int = Field(ge=1, le=100, default=20)

class UserListResponse(BaseModel):
    """Response model for paginated user list"""
    users: List[Dict[str, Any]]
    total: int
    offset: int
    size: int

class ContentListResponse(BaseModel):
    """Response model for paginated content list"""
    content: List[Dict[str, Any]]
    total: int
    offset: int
    size: int

class QuizResultsResponse(BaseModel):
    """Response model for paginated quiz results"""
    quiz_results: List[Dict[str, Any]]
    total: int
    offset: int
    size: int

class ChatHistoryResponse(BaseModel):
    """Response model for paginated chat history"""
    chats: List[Dict[str, Any]]
    total: int
    offset: int
    size: int

class NotificationCreate(BaseModel):
    """Schema for creating notifications"""
    recipient_uid: str
    title: str = Field(max_length=200)
    message: str = Field(max_length=2000)
    type: NotificationType = NotificationType.INFO

class NotificationUpdate(BaseModel):
    """Schema for updating notifications"""
    title: Optional[str] = Field(None, max_length=200)
    message: Optional[str] = Field(None, max_length=2000)
    type: Optional[NotificationType] = None
    is_read: Optional[bool] = None

class NotificationResponse(BaseModel):
    """Response schema for notifications"""
    id: str
    recipient_uid: str
    title: str
    message: str
    type: str
    is_read: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

class LLMInvokeRequest(BaseModel):
    """Schema for LLM/Parser invocation"""
    target: str = Field(pattern="^(llm|parser)$")
    payload: Dict[str, Any]

class UsageStatsQuery(BaseModel):
    """Query parameters for usage statistics"""
    start_time: datetime
    end_time: datetime

class UsageStatsResponse(BaseModel):
    """Response schema for usage statistics"""
    users_added: int
    content_generated: int
    quiz_generated: int
    content_uploaded: int
    chats_done: int
    period_start: datetime
    period_end: datetime

class UserPromoteRequest(BaseModel):
    """Schema for promoting user to admin"""
    identifier: str = Field(description="Username or email of the user to be promoted")

class AdminLogResponse(BaseModel):
    """Response schema for admin logs"""
    id: int
    admin_uid: str
    action_type: str
    target_uid: Optional[str]
    target_type: str
    details: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

class AdminLogCreate(BaseModel):
    """Schema for creating admin logs"""
    admin_uid: str
    action_type: AdminAction
    target_uid: Optional[str] = None
    target_type: str
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
