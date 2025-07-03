"""
WebSocket types tests
"""
import pytest
from datetime import datetime, timezone

from app.websocket.types import MessageType, WebSocketMessage, NotificationMessage, ConnectionInfo


class TestMessageType:
    """Test WebSocket message types"""
    
    def test_message_type_values(self):
        """Test that message types have correct string values"""
        assert MessageType.PING == "ping"
        assert MessageType.PONG == "pong"
        assert MessageType.NOTIFICATION_NEW == "notification_new"
        assert MessageType.NOTIFICATION_COUNT == "notification_count"
        assert MessageType.SYSTEM_MESSAGE == "system_message"


class TestWebSocketMessage:
    """Test WebSocket message model"""
    
    def test_basic_message_creation(self):
        """Test creating a basic WebSocket message"""
        message = WebSocketMessage(type=MessageType.PING)
        
        assert message.type == MessageType.PING
        assert message.data == {}
        assert isinstance(message.timestamp, datetime)
        assert message.message_id is None
        assert message.user_id is None
    
    def test_message_with_data(self):
        """Test creating message with data"""
        data = {"test": "value", "number": 42}
        message = WebSocketMessage(
            type=MessageType.SYSTEM_MESSAGE,
            data=data,
            user_id="test-user-123"
        )
        
        assert message.type == MessageType.SYSTEM_MESSAGE
        assert message.data == data
        assert message.user_id == "test-user-123"
    
    def test_message_serialization(self):
        """Test message serialization to dict"""
        message = WebSocketMessage(
            type=MessageType.NOTIFICATION_NEW,
            data={"title": "Test"},
            user_id="user-123"
        )
        
        message_dict = message.model_dump(mode='json')
        
        assert message_dict["type"] == "notification_new"
        assert message_dict["data"] == {"title": "Test"}
        assert message_dict["user_id"] == "user-123"
        assert "timestamp" in message_dict


class TestNotificationMessage:
    """Test notification-specific message"""
    
    def test_new_notification_creation(self):
        """Test creating a new notification message"""
        notification_data = {
            "id": "notif-123",
            "title": "Test Title",
            "message": "Test message",
            "type": "info"
        }
        user_id = "test-user-123"
        
        message = NotificationMessage.new_notification(notification_data, user_id)
        
        assert message.type == MessageType.NOTIFICATION_NEW
        assert message.data == notification_data
        assert message.user_id == user_id
    
    def test_unread_count_creation(self):
        """Test creating an unread count message"""
        count = 5
        user_id = "test-user-123"
        
        message = NotificationMessage.unread_count(count, user_id)
        
        assert message.type == MessageType.NOTIFICATION_COUNT
        assert message.data == {"unread_count": count}
        assert message.user_id == user_id


class TestConnectionInfo:
    """Test connection info model"""
    
    def test_basic_connection_info(self):
        """Test creating basic connection info"""
        user_id = "test-user-123"
        connected_at = datetime.now(timezone.utc)
        
        conn_info = ConnectionInfo(
            user_id=user_id,
            connected_at=connected_at
        )
        
        assert conn_info.user_id == user_id
        assert conn_info.connected_at == connected_at
        assert conn_info.last_ping is None
        assert conn_info.user_agent is None
        assert conn_info.ip_address is None
    
    def test_full_connection_info(self):
        """Test creating connection info with all fields"""
        user_id = "test-user-123"
        connected_at = datetime.now(timezone.utc)
        last_ping = datetime.now(timezone.utc)
        user_agent = "Test Browser/1.0"
        ip_address = "192.168.1.100"
        
        conn_info = ConnectionInfo(
            user_id=user_id,
            connected_at=connected_at,
            last_ping=last_ping,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        assert conn_info.user_id == user_id
        assert conn_info.connected_at == connected_at
        assert conn_info.last_ping == last_ping
        assert conn_info.user_agent == user_agent
        assert conn_info.ip_address == ip_address
