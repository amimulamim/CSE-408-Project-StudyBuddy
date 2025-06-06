import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
import uuid
import json

from app.admin.service import (
    create_admin_log, get_admin_logs, get_all_users_paginated,
    admin_delete_user, promote_user_to_admin, create_notification,
    update_notification, delete_notification, get_notifications_for_user,
    get_usage_statistics, get_all_chats_paginated
)
from app.admin.schema import (
    AdminLogCreate, AdminAction, NotificationCreate, NotificationUpdate,
    NotificationType, PaginationQuery, UsageStatsResponse
)
from app.admin.model import AdminLog, Notification, SystemStats
from app.users.model import User


class TestAdminService:
    """Test admin service functions"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    @pytest.fixture
    def sample_user(self):
        """Sample user for testing"""
        user = Mock(spec=User)
        user.uid = "user123"
        user.email = "test@example.com"
        user.name = "Test User"
        user.is_admin = False
        user.created_at = datetime.now(timezone.utc)
        return user

    @pytest.fixture
    def sample_admin_log_data(self):
        """Sample admin log data"""
        return AdminLogCreate(
            admin_uid="admin123",
            action_type=AdminAction.USER_EDIT,
            target_uid="user123",
            target_type="user",
            details={"field": "name", "old_value": "Old Name", "new_value": "New Name"},
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0"
        )

    @pytest.fixture
    def sample_notification_data(self):
        """Sample notification data"""
        return NotificationCreate(
            recipient_uid="user123",
            title="Test Notification",
            message="This is a test notification",
            type=NotificationType.INFO
        )

    def test_create_admin_log_success(self, mock_db, sample_admin_log_data):
        """Test successful admin log creation"""
        # Arrange
        mock_log = Mock(spec=AdminLog)
        mock_log.id = 1
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        # Mock the AdminLog constructor
        with patch('app.admin.service.AdminLog') as mock_admin_log:
            mock_admin_log.return_value = mock_log
            
            # Act
            result = create_admin_log(mock_db, sample_admin_log_data)
            
            # Assert
            mock_admin_log.assert_called_once()
            mock_db.add.assert_called_once_with(mock_log)
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once_with(mock_log)
            assert result == mock_log

    def test_get_admin_logs_with_pagination(self, mock_db):
        """Test getting admin logs with pagination"""
        # Arrange
        pagination = PaginationQuery(offset=0, size=10)
        mock_query = Mock()
        mock_logs = [Mock(spec=AdminLog) for _ in range(5)]
        
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 5
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = mock_logs

        # Act
        logs, total = get_admin_logs(mock_db, pagination)

        # Assert
        assert logs == mock_logs
        assert total == 5
        mock_db.query.assert_called_with(AdminLog)

    def test_get_admin_logs_with_filters(self, mock_db):
        """Test getting admin logs with filters"""
        # Arrange
        pagination = PaginationQuery(offset=0, size=10)
        admin_uid = "admin123"
        action_type = "user_edit"
        
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 3
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = []

        # Act
        logs, total = get_admin_logs(mock_db, pagination, admin_uid, action_type)

        # Assert
        assert total == 3
        # Should call filter twice (for admin_uid and action_type)
        assert mock_query.filter.call_count == 2

    def test_get_all_users_paginated(self, mock_db, sample_user):
        """Test getting paginated users"""
        # Arrange
        pagination = PaginationQuery(offset=0, size=20)
        mock_users = [sample_user]
        
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = mock_users

        # Act
        users, total = get_all_users_paginated(mock_db, pagination)

        # Assert
        assert users == mock_users
        assert total == 1
        mock_db.query.assert_called_with(User)

    def test_admin_delete_user_success(self, mock_db, sample_user):
        """Test successful user deletion"""
        # Arrange
        user_uid = "user123"
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user

        # Act
        result = admin_delete_user(mock_db, user_uid)

        # Assert
        assert result is True
        mock_db.delete.assert_called_once_with(sample_user)
        mock_db.commit.assert_called_once()

    def test_admin_delete_user_not_found(self, mock_db):
        """Test user deletion when user not found"""
        # Arrange
        user_uid = "nonexistent"
        mock_db.query.return_value.filter.return_value.first.return_value = None

        # Act
        result = admin_delete_user(mock_db, user_uid)

        # Assert
        assert result is False
        mock_db.delete.assert_not_called()

    def test_promote_user_to_admin_by_email(self, mock_db, sample_user):
        """Test promoting user to admin by email"""
        # Arrange
        identifier = "test@example.com"
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user

        # Act
        result = promote_user_to_admin(mock_db, identifier)

        # Assert
        assert result == sample_user
        assert sample_user.is_admin is True
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(sample_user)

    def test_promote_user_to_admin_not_found(self, mock_db):
        """Test promoting user when user not found"""
        # Arrange
        identifier = "nonexistent@example.com"
        mock_db.query.return_value.filter.return_value.first.return_value = None

        # Act
        result = promote_user_to_admin(mock_db, identifier)

        # Assert
        assert result is None
        mock_db.commit.assert_not_called()

    def test_create_notification_success(self, mock_db, sample_notification_data):
        """Test successful notification creation"""
        # Arrange
        created_by = "admin123"
        mock_notification = Mock(spec=Notification)
        mock_notification.id = str(uuid.uuid4())
        
        with patch('app.admin.service.Notification') as mock_notification_class, \
             patch('app.admin.service.uuid.uuid4') as mock_uuid:
            
            mock_uuid.return_value = "test-uuid"
            mock_notification_class.return_value = mock_notification
            
            # Act
            result = create_notification(mock_db, sample_notification_data, created_by)
            
            # Assert
            mock_notification_class.assert_called_once()
            mock_db.add.assert_called_once_with(mock_notification)
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once_with(mock_notification)
            assert result == mock_notification

    def test_update_notification_success(self, mock_db):
        """Test successful notification update"""
        # Arrange
        notification_id = "notif123"
        update_data = NotificationUpdate(
            title="Updated Title",
            message="Updated message",
            type=NotificationType.WARNING
        )
        
        mock_notification = Mock(spec=Notification)
        mock_notification.title = "Old Title"
        mock_notification.message = "Old message"
        mock_notification.type = "info"
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_notification

        # Act
        result = update_notification(mock_db, notification_id, update_data)

        # Assert
        assert result == mock_notification
        assert mock_notification.title == "Updated Title"
        assert mock_notification.message == "Updated message"
        assert mock_notification.type == "warning"
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(mock_notification)

    def test_update_notification_not_found(self, mock_db):
        """Test updating notification when not found"""
        # Arrange
        notification_id = "nonexistent"
        update_data = NotificationUpdate(title="Updated Title")
        mock_db.query.return_value.filter.return_value.first.return_value = None

        # Act
        result = update_notification(mock_db, notification_id, update_data)

        # Assert
        assert result is None
        mock_db.commit.assert_not_called()

    def test_delete_notification_success(self, mock_db):
        """Test successful notification deletion"""
        # Arrange
        notification_id = "notif123"
        mock_notification = Mock(spec=Notification)
        mock_db.query.return_value.filter.return_value.first.return_value = mock_notification

        # Act
        result = delete_notification(mock_db, notification_id)

        # Assert
        assert result is True
        mock_db.delete.assert_called_once_with(mock_notification)
        mock_db.commit.assert_called_once()

    def test_delete_notification_not_found(self, mock_db):
        """Test deleting notification when not found"""
        # Arrange
        notification_id = "nonexistent"
        mock_db.query.return_value.filter.return_value.first.return_value = None

        # Act
        result = delete_notification(mock_db, notification_id)

        # Assert
        assert result is False
        mock_db.delete.assert_not_called()

    def test_get_notifications_for_user(self, mock_db):
        """Test getting notifications for a specific user"""
        # Arrange
        user_uid = "user123"
        pagination = PaginationQuery(offset=0, size=10)
        mock_notifications = [Mock(spec=Notification) for _ in range(3)]
        
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 3
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = mock_notifications

        # Act
        notifications, total = get_notifications_for_user(mock_db, user_uid, pagination)

        # Assert
        assert notifications == mock_notifications
        assert total == 3

    def test_get_usage_statistics_with_system_stats(self, mock_db):
        """Test getting usage statistics with existing system stats"""
        # Arrange
        start_time = datetime(2025, 6, 1, tzinfo=timezone.utc)
        end_time = datetime(2025, 6, 7, tzinfo=timezone.utc)
        
        mock_stats = [
            Mock(users_added=5, content_generated=10, quiz_generated=2, content_uploaded=3, chats_done=15),
            Mock(users_added=3, content_generated=8, quiz_generated=1, content_uploaded=2, chats_done=12)
        ]
        
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = mock_stats

        # Act
        result = get_usage_statistics(mock_db, start_time, end_time)

        # Assert
        assert isinstance(result, UsageStatsResponse)
        assert result.users_added == 8  # 5 + 3
        assert result.content_generated == 18  # 10 + 8
        assert result.quiz_generated == 3  # 2 + 1
        assert result.content_uploaded == 5  # 3 + 2
        assert result.chats_done == 27  # 15 + 12
        assert result.period_start == start_time
        assert result.period_end == end_time

    def test_get_usage_statistics_fallback(self, mock_db):
        """Test getting usage statistics fallback when no system stats"""
        # Arrange
        start_time = datetime(2025, 6, 1, tzinfo=timezone.utc)
        end_time = datetime(2025, 6, 7, tzinfo=timezone.utc)
        
        # Mock empty system stats
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = []
        
        # Mock user count query
        mock_user_query = Mock()
        mock_user_query.filter.return_value = mock_user_query
        mock_user_query.count.return_value = 5
        
        # Setup query method to return different mocks for different models
        def mock_query_side_effect(model):
            if model == SystemStats:
                return mock_query
            elif model == User:
                return mock_user_query
            return Mock()
        
        mock_db.query.side_effect = mock_query_side_effect

        # Act
        result = get_usage_statistics(mock_db, start_time, end_time)

        # Assert
        assert isinstance(result, UsageStatsResponse)
        assert result.users_added == 5
        assert result.content_generated == 0
        assert result.quiz_generated == 0
        assert result.content_uploaded == 0
        assert result.chats_done == 0

    def test_get_all_chats_paginated_success(self, mock_db):
        """Test getting paginated chats successfully"""
        # Arrange
        pagination = PaginationQuery(offset=0, size=10)
        
        # Mock chat objects
        mock_chat1 = Mock()
        mock_chat1.id = uuid.uuid4()
        mock_chat1.user_uid = "user123"
        mock_chat1.title = "Chat 1"
        mock_chat1.created_at = datetime.now(timezone.utc)
        mock_chat1.updated_at = datetime.now(timezone.utc)
        mock_chat1.messages = [Mock(), Mock()]  # 2 messages
        
        mock_chats = [mock_chat1]
        
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = mock_chats

        # Mock the Chat model and its attributes to work with SQLAlchemy
        mock_chat_model = Mock()
        mock_chat_model.id = Mock()
        mock_chat_model.created_at = Mock()
        
        mock_message_model = Mock()

        # Act
        with patch('builtins.__import__') as mock_import:
            def import_side_effect(name, *args, **kwargs):
                if 'chat.model' in name:
                    module = Mock()
                    module.Chat = mock_chat_model
                    module.Message = mock_message_model
                    return module
                return __import__(name, *args, **kwargs)
            
            mock_import.side_effect = import_side_effect
            
            # Also patch the desc function to avoid SQLAlchemy issues
            with patch('app.admin.service.desc') as mock_desc:
                mock_desc.return_value = Mock()
                chats, total = get_all_chats_paginated(mock_db, pagination)

        # Assert
        assert total == 1
        assert len(chats) == 1
        assert chats[0]["id"] == str(mock_chat1.id)
        assert chats[0]["user_uid"] == "user123"
        assert chats[0]["title"] == "Chat 1"
        assert chats[0]["message_count"] == 2

    def test_get_all_chats_paginated_import_error(self, mock_db):
        """Test getting chats when chat models not available"""
        # Arrange
        pagination = PaginationQuery(offset=0, size=10)

        # Act
        with patch('builtins.__import__', side_effect=ImportError("No module named 'app.chat.model'")):
            chats, total = get_all_chats_paginated(mock_db, pagination)

        # Assert
        assert chats == []
        assert total == 0
