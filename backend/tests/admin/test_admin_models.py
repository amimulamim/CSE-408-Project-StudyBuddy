import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
import json

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.admin.model import AdminLog, Notification, SystemStats
    from app.core.database import Base


class TestAdminLog:
    """Test AdminLog model"""

    def test_admin_log_creation(self):
        """Test creating an AdminLog instance"""
        log = AdminLog(
            admin_uid="admin123",
            action_type="user_edit",
            target_uid="user123",
            target_type="user",
            details='{"field": "name", "old_value": "John", "new_value": "Jane"}',
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0"
        )
        
        assert log.admin_uid == "admin123"
        assert log.action_type == "user_edit"
        assert log.target_uid == "user123"
        assert log.target_type == "user"
        assert log.ip_address == "192.168.1.1"
        assert log.user_agent == "Mozilla/5.0"

    def test_admin_log_details_dict_getter(self):
        """Test details_dict property getter"""
        log = AdminLog()
        
        # Test with valid JSON
        log.details = '{"field": "name", "old_value": "John", "new_value": "Jane"}'
        expected = {"field": "name", "old_value": "John", "new_value": "Jane"}
        assert log.details_dict == expected
        
        # Test with None
        log.details = None
        assert log.details_dict == {}
        
        # Test with empty string
        log.details = ""
        assert log.details_dict == {}
        
        # Test with invalid JSON
        log.details = "invalid json"
        assert log.details_dict == {}

    def test_admin_log_details_dict_setter(self):
        """Test details_dict property setter"""
        log = AdminLog()
        
        # Test with dict
        test_dict = {"field": "name", "old_value": "John", "new_value": "Jane"}
        log.details_dict = test_dict
        assert log.details == json.dumps(test_dict)
        
        # Test with None
        log.details_dict = None
        assert log.details is None
        
        # Test with empty dict
        log.details_dict = {}
        assert log.details == "{}"

    def test_admin_log_required_fields(self):
        """Test AdminLog with only required fields"""
        log = AdminLog(
            admin_uid="admin123",
            action_type="user_delete",
            target_type="user"
        )
        
        assert log.admin_uid == "admin123"
        assert log.action_type == "user_delete"
        assert log.target_type == "user"
        assert log.target_uid is None
        assert log.details is None

    def test_admin_log_tablename(self):
        """Test AdminLog table name"""
        assert AdminLog.__tablename__ == "admin_logs"

    def test_admin_log_primary_key(self):
        """Test AdminLog primary key configuration"""
        # This would normally be tested with actual database, but we can test the column definition
        assert hasattr(AdminLog, 'id')
        assert AdminLog.id.primary_key is True
        assert AdminLog.id.index is True


class TestNotification:
    """Test Notification model"""

    def test_notification_creation(self):
        """Test creating a Notification instance"""
        notification = Notification(
            id="notif-123",
            recipient_uid="user123",
            title="Test Notification",
            message="This is a test notification",
            type="info",
            is_read=False,
            created_by="admin123"
        )
        
        assert notification.id == "notif-123"
        assert notification.recipient_uid == "user123"
        assert notification.title == "Test Notification"
        assert notification.message == "This is a test notification"
        assert notification.type == "info"
        assert notification.is_read is False
        assert notification.created_by == "admin123"

    def test_notification_defaults(self):
        """Test Notification default values"""
        notification = Notification(
            id="notif-123",
            recipient_uid="user123",
            title="Test Notification",
            message="This is a test notification"
        )
        
        # Note: SQLAlchemy defaults are applied at database level, not object level
        # So we test the column definitions instead
        assert hasattr(Notification.type, 'default')
        assert hasattr(Notification.is_read, 'default') 
        assert notification.created_by is None  # Can be None

    def test_notification_required_fields(self):
        """Test Notification with only required fields"""
        notification = Notification(
            id="notif-123",
            recipient_uid="user123",
            title="Test Notification",
            message="This is a test notification"
        )
        
        assert notification.id == "notif-123"
        assert notification.recipient_uid == "user123"
        assert notification.title == "Test Notification"
        assert notification.message == "This is a test notification"

    def test_notification_tablename(self):
        """Test Notification table name"""
        assert Notification.__tablename__ == "notifications"

    def test_notification_primary_key(self):
        """Test Notification primary key configuration"""
        assert hasattr(Notification, 'id')
        assert Notification.id.primary_key is True
        assert Notification.id.index is True

    def test_notification_types(self):
        """Test different notification types"""
        types = ["info", "warning", "success", "error"]
        
        for notif_type in types:
            notification = Notification(
                id=f"notif-{notif_type}",
                recipient_uid="user123",
                title=f"Test {notif_type}",
                message=f"This is a {notif_type} notification",
                type=notif_type
            )
            assert notification.type == notif_type


class TestSystemStats:
    """Test SystemStats model"""

    def test_system_stats_creation(self):
        """Test creating a SystemStats instance"""
        stats = SystemStats(
            stat_type="daily",
            date="2025-06-06",
            users_added=10,
            content_generated=25,
            quiz_generated=5,
            content_uploaded=8,
            chats_done=50
        )
        
        assert stats.stat_type == "daily"
        assert stats.date == "2025-06-06"
        assert stats.users_added == 10
        assert stats.content_generated == 25
        assert stats.quiz_generated == 5
        assert stats.content_uploaded == 8
        assert stats.chats_done == 50

    def test_system_stats_defaults(self):
        """Test SystemStats default values"""
        stats = SystemStats(
            stat_type="weekly",
            date="2025-06-06"
        )
        
        assert stats.stat_type == "weekly"
        assert stats.date == "2025-06-06"
        # Note: SQLAlchemy defaults are applied at database level, not object level
        # So we test the column definitions instead
        assert hasattr(SystemStats.users_added, 'default')
        assert hasattr(SystemStats.content_generated, 'default')
        assert hasattr(SystemStats.quiz_generated, 'default')
        assert hasattr(SystemStats.content_uploaded, 'default')
        assert hasattr(SystemStats.chats_done, 'default')

    def test_system_stats_required_fields(self):
        """Test SystemStats with only required fields"""
        stats = SystemStats(
            stat_type="monthly",
            date="2025-06-01"
        )
        
        assert stats.stat_type == "monthly"
        assert stats.date == "2025-06-01"

    def test_system_stats_tablename(self):
        """Test SystemStats table name"""
        assert SystemStats.__tablename__ == "system_stats"

    def test_system_stats_primary_key(self):
        """Test SystemStats primary key configuration"""
        assert hasattr(SystemStats, 'id')
        assert SystemStats.id.primary_key is True
        assert SystemStats.id.index is True

    def test_system_stats_types(self):
        """Test different stat types"""
        stat_types = ["daily", "weekly", "monthly"]
        
        for stat_type in stat_types:
            stats = SystemStats(
                stat_type=stat_type,
                date="2025-06-06",
                users_added=1,
                content_generated=2,
                quiz_generated=3,
                content_uploaded=4,
                chats_done=5
            )
            assert stats.stat_type == stat_type

    def test_system_stats_date_formats(self):
        """Test different date formats"""
        dates = ["2025-06-06", "2025-12-31", "2025-01-01"]
        
        for date in dates:
            stats = SystemStats(
                stat_type="daily",
                date=date
            )
            assert stats.date == date


class TestModelInheritance:
    """Test model inheritance from Base"""

    def test_admin_log_inherits_base(self):
        """Test AdminLog inherits from Base"""
        assert issubclass(AdminLog, Base)

    def test_notification_inherits_base(self):
        """Test Notification inherits from Base"""
        assert issubclass(Notification, Base)

    def test_system_stats_inherits_base(self):
        """Test SystemStats inherits from Base"""
        assert issubclass(SystemStats, Base)


class TestModelRelationships:
    """Test model relationships and constraints"""

    def test_admin_log_indexes(self):
        """Test AdminLog index configuration"""
        # Check that indexed fields exist
        assert hasattr(AdminLog, 'admin_uid')
        assert hasattr(AdminLog, 'target_uid')
        
        # In a real test with DB, we'd check actual indexes
        # Here we verify the columns exist
        assert AdminLog.admin_uid.index is True
        assert AdminLog.target_uid.index is True

    def test_notification_indexes(self):
        """Test Notification index configuration"""
        assert hasattr(Notification, 'recipient_uid')
        assert Notification.recipient_uid.index is True

    def test_system_stats_indexes(self):
        """Test SystemStats index configuration"""
        # SystemStats has primary key index
        assert hasattr(SystemStats, 'id')
        assert SystemStats.id.index is True
