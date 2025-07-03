"""
WebSocket connection types and models
"""
from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timezone


class MessageType(str, Enum):
    """Types of WebSocket messages"""
    # Connection management
    PING = "ping"
    PONG = "pong"
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    
    # Notifications
    NOTIFICATION_NEW = "notification_new"
    NOTIFICATION_UPDATE = "notification_update"
    NOTIFICATION_DELETE = "notification_delete"
    NOTIFICATION_COUNT = "notification_count"
    
    # Chat (for future use)
    CHAT_MESSAGE = "chat_message"
    CHAT_TYPING = "chat_typing"
    
    # MCP AI Agent (for future use)
    MCP_REQUEST = "mcp_request"
    MCP_RESPONSE = "mcp_response"
    MCP_STATUS = "mcp_status"
    
    # Generic system messages
    SYSTEM_MESSAGE = "system_message"
    ERROR = "error"


class WebSocketMessage(BaseModel):
    """Standard WebSocket message format"""
    type: MessageType
    data: Dict[str, Any] = {}
    timestamp: datetime = datetime.now(timezone.utc)
    message_id: Optional[str] = None
    user_id: Optional[str] = None
    
    class Config:
        use_enum_values = True


class NotificationMessage(WebSocketMessage):
    """Notification-specific message"""
    type: MessageType = MessageType.NOTIFICATION_NEW
    
    @classmethod
    def new_notification(cls, notification_data: Dict[str, Any], user_id: str):
        return cls(
            type=MessageType.NOTIFICATION_NEW,
            data=notification_data,
            user_id=user_id
        )
    
    @classmethod
    def unread_count(cls, count: int, user_id: str):
        return cls(
            type=MessageType.NOTIFICATION_COUNT,
            data={"unread_count": count},
            user_id=user_id
        )


class ConnectionInfo(BaseModel):
    """Information about a WebSocket connection"""
    user_id: str
    connected_at: datetime
    last_ping: Optional[datetime] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
