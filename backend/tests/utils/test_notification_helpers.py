import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.utils.notification_helpers import (
    format_notification_response,
    get_user_notifications_with_filter,
    mark_notification_read,
    mark_all_notifications_read,
    get_unread_count
)
from app.admin.model import Notification


class TestNotificationHelpers:
    """Test notification helper functions"""

    def test_format_notification_response(self):
        """Test formatting notification object into response dictionary"""
        # Create mock notification
        mock_notif = Mock()
        mock_notif.id = "notif-123"
        mock_notif.title = "Test Notification"
        mock_notif.message = "This is a test message"
        mock_notif.type = "info"
        mock_notif.is_read = False
        mock_notif.created_at = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        mock_notif.updated_at = datetime(2024, 1, 1, 12, 30, 0, tzinfo=timezone.utc)

        result = format_notification_response(mock_notif)

        assert result["id"] == "notif-123"
        assert result["title"] == "Test Notification"
        assert result["message"] == "This is a test message"
        assert result["type"] == "info"
        assert result["is_read"] == False
        assert result["created_at"] == "2024-01-01T12:00:00+00:00"
        assert result["updated_at"] == "2024-01-01T12:30:00+00:00"

    def test_format_notification_response_none_dates(self):
        """Test formatting notification with None dates"""
        mock_notif = Mock()
        mock_notif.id = "notif-123"
        mock_notif.title = "Test Notification"
        mock_notif.message = "This is a test message"
        mock_notif.type = "info"
        mock_notif.is_read = True
        mock_notif.created_at = None
        mock_notif.updated_at = None

        result = format_notification_response(mock_notif)

        assert result["created_at"] is None
        assert result["updated_at"] is None

    def test_get_user_notifications_with_filter_basic(self):
        """Test getting user notifications with basic parameters"""
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 5
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        
        mock_notifications = [Mock(), Mock(), Mock()]
        mock_query.all.return_value = mock_notifications

        notifications, total = get_user_notifications_with_filter(
            mock_db, "user-123", offset=0, limit=10, unread_only=False
        )

        assert notifications == mock_notifications
        assert total == 5
        mock_db.query.assert_called_once_with(Notification)
        mock_query.filter.assert_called_once()

    def test_get_user_notifications_with_filter_unread_only(self):
        """Test getting only unread notifications"""
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 2
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        
        mock_notifications = [Mock(), Mock()]
        mock_query.all.return_value = mock_notifications

        notifications, total = get_user_notifications_with_filter(
            mock_db, "user-123", offset=5, limit=5, unread_only=True
        )

        assert notifications == mock_notifications
        assert total == 2
        # Should be called twice - once for user filter, once for unread filter
        assert mock_query.filter.call_count == 2

    def test_mark_notification_read_success(self):
        """Test successfully marking notification as read"""
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        
        mock_notification = Mock()
        mock_notification.is_read = False
        mock_query.first.return_value = mock_notification

        result = mark_notification_read(mock_db, "notif-123", "user-123")

        assert result == True
        assert mock_notification.is_read == True
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(mock_notification)

    def test_mark_notification_read_already_read(self):
        """Test marking notification that's already read"""
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        
        mock_notification = Mock()
        mock_notification.is_read = True
        mock_query.first.return_value = mock_notification

        result = mark_notification_read(mock_db, "notif-123", "user-123")

        assert result == True
        # Should not call commit if already read
        mock_db.commit.assert_not_called()
        mock_db.refresh.assert_not_called()

    def test_mark_notification_read_not_found(self):
        """Test marking notification that doesn't exist or belongs to different user"""
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None

        result = mark_notification_read(mock_db, "notif-123", "user-123")

        assert result == False
        mock_db.commit.assert_not_called()

    def test_mark_all_notifications_read(self):
        """Test marking all notifications as read for a user"""
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.update.return_value = 3

        with patch('datetime.datetime') as mock_datetime:
            mock_now = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
            mock_datetime.now.return_value = mock_now
            mock_datetime.timezone.utc = timezone.utc

            result = mark_all_notifications_read(mock_db, "user-123")

        assert result == 3
        mock_query.update.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_get_unread_count(self):
        """Test getting unread notification count"""
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 7

        result = get_unread_count(mock_db, "user-123")

        assert result == 7
        mock_db.query.assert_called_once_with(Notification)
        mock_query.filter.assert_called_once()
        mock_query.count.assert_called_once()

    def test_get_unread_count_zero(self):
        """Test getting unread count when there are no unread notifications"""
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 0

        result = get_unread_count(mock_db, "user-123")

        assert result == 0
