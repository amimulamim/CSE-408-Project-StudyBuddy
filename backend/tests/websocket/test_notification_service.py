"""
WebSocket notification service tests
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from sqlalchemy.orm import Session

from app.websocket.notification_service import WebSocketNotificationService
from app.websocket.types import MessageType


class TestWebSocketNotificationService:
    """Test WebSocket notification service"""
    
    def setup_method(self):
        """Setup for each test"""
        self.service = WebSocketNotificationService()
    
    @pytest.mark.asyncio
    @patch('app.websocket.notification_service.websocket_manager')
    async def test_notify_new_notification(self, mock_manager):
        """Test sending new notification via WebSocket"""
        mock_manager.send_to_user = AsyncMock(return_value=1)
        
        user_id = "test-user-123"
        notification_data = {
            "id": "notif-123",
            "title": "Test Notification",
            "message": "Test message",
            "type": "info"
        }
        
        sent_count = await self.service.notify_new_notification(user_id, notification_data)
        
        assert sent_count == 1
        mock_manager.send_to_user.assert_called_once()
        
        # Verify the message was constructed correctly
        call_args = mock_manager.send_to_user.call_args
        assert call_args[0][0] == user_id  # user_id
        message = call_args[0][1]  # message
        assert message.type == MessageType.NOTIFICATION_NEW
        assert message.data == notification_data
        assert message.user_id == user_id
    
    @pytest.mark.asyncio
    @patch('app.websocket.notification_service.websocket_manager')
    @patch('app.websocket.notification_service.get_unread_count')
    async def test_notify_unread_count_update(self, mock_get_unread_count, mock_manager):
        """Test sending unread count update via WebSocket"""
        mock_manager.send_to_user = AsyncMock(return_value=1)
        mock_get_unread_count.return_value = 5
        
        user_id = "test-user-123"
        mock_db = Mock(spec=Session)
        
        sent_count = await self.service.notify_unread_count_update(user_id, mock_db)
        
        assert sent_count == 1
        mock_get_unread_count.assert_called_once_with(mock_db, user_id)
        mock_manager.send_to_user.assert_called_once()
        
        # Verify the message was constructed correctly
        call_args = mock_manager.send_to_user.call_args
        message = call_args[0][1]  # message
        assert message.type == MessageType.NOTIFICATION_COUNT
        assert message.data["unread_count"] == 5
    
    @pytest.mark.asyncio
    @patch('app.websocket.notification_service.websocket_manager')
    @patch('app.websocket.notification_service.WebSocketNotificationService.notify_unread_count_update')
    async def test_notify_notification_read(self, mock_notify_count, mock_manager):
        """Test notifying that a notification was read"""
        mock_manager.send_to_user = AsyncMock(return_value=1)
        mock_notify_count.return_value = 1
        
        user_id = "test-user-123"
        notification_id = "notif-123"
        mock_db = Mock(spec=Session)
        
        sent_count = await self.service.notify_notification_read(user_id, notification_id, mock_db)
        
        assert sent_count == 1
        mock_manager.send_to_user.assert_called_once()
        mock_notify_count.assert_called_once_with(user_id, mock_db)
        
        # Verify the message was constructed correctly
        call_args = mock_manager.send_to_user.call_args
        message = call_args[0][1]  # message
        assert message.type == MessageType.NOTIFICATION_UPDATE
        assert message.data["notification_id"] == notification_id
        assert message.data["is_read"] is True
        assert message.data["action"] == "marked_as_read"
    
    @pytest.mark.asyncio
    @patch('app.websocket.notification_service.websocket_manager')
    async def test_notify_system_message(self, mock_manager):
        """Test sending system message to multiple users"""
        mock_manager.send_to_multiple_users = AsyncMock(return_value=3)
        
        user_ids = ["user-1", "user-2", "user-3"]
        message = "System maintenance scheduled"
        message_type = "warning"
        
        sent_count = await self.service.notify_system_message(user_ids, message, message_type)
        
        assert sent_count == 3
        mock_manager.send_to_multiple_users.assert_called_once()
        
        # Verify the message was constructed correctly
        call_args = mock_manager.send_to_multiple_users.call_args
        assert call_args[0][0] == user_ids  # user_ids
        ws_message = call_args[0][1]  # message
        assert ws_message.type == MessageType.SYSTEM_MESSAGE
        assert ws_message.data["message"] == message
        assert ws_message.data["message_type"] == message_type
    
    @patch('app.websocket.notification_service.websocket_manager')
    def test_is_user_connected(self, mock_manager):
        """Test checking if user is connected"""
        mock_manager.is_user_connected.return_value = True
        
        user_id = "test-user-123"
        result = self.service.is_user_connected(user_id)
        
        assert result is True
        mock_manager.is_user_connected.assert_called_once_with(user_id)
    
    @patch('app.websocket.notification_service.websocket_manager')
    def test_get_connection_stats(self, mock_manager):
        """Test getting connection statistics"""
        mock_manager.get_total_connection_count.return_value = 5
        mock_manager.get_connected_users.return_value = ["user-1", "user-2", "user-3"]
        
        stats = self.service.get_connection_stats()
        
        assert stats["total_connections"] == 5
        assert stats["connected_users_count"] == 3
        assert stats["connected_users"] == ["user-1", "user-2", "user-3"]
