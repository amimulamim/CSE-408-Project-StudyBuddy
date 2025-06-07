import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.auth.firebase_auth import get_current_user
    from app.core.database import get_db

client = TestClient(app)


class TestUserNotificationEndpoints:
    """Test user notification API endpoints"""

    def setup_method(self):
        """Setup method to clear dependency overrides before each test"""
        app.dependency_overrides.clear()

    def teardown_method(self):
        """Teardown method to clear dependency overrides after each test"""
        app.dependency_overrides.clear()

    def test_get_my_notifications_success(self):
        """Test successfully getting user's own notifications"""
        mock_db = Mock()
        
        def mock_get_current_user():
            return {"uid": "test-user-123"}
            
        def mock_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        mock_notifications = [
            {"id": "notif-1", "title": "Test 1", "message": "Message 1", "type": "info", "is_read": False},
            {"id": "notif-2", "title": "Test 2", "message": "Message 2", "type": "warning", "is_read": True}
        ]

        with patch('app.api.v1.routes.user.get_user_notifications_with_filter') as mock_get_notifs, \
             patch('app.api.v1.routes.user.format_notification_response') as mock_format:
            
            mock_get_notifs.return_value = ([Mock(), Mock()], 2)
            mock_format.side_effect = mock_notifications

            response = client.get("/api/v1/user/notifications")

            assert response.status_code == 200
            data = response.json()
            assert data["notifications"] == mock_notifications
            assert data["total"] == 2
            assert data["page"] == 1
            assert data["size"] == 10
            assert data["unread_only"] == False
            
            mock_get_notifs.assert_called_once_with(
                mock_db, "test-user-123", 0, 10, False
            )

    def test_get_my_notifications_with_pagination(self):
        """Test getting notifications with custom pagination parameters"""
        mock_db = Mock()
        
        def mock_get_current_user():
            return {"uid": "test-user-123"}
            
        def mock_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        with patch('app.api.v1.routes.user.get_user_notifications_with_filter') as mock_get_notifs, \
             patch('app.api.v1.routes.user.format_notification_response') as mock_format:
            
            mock_get_notifs.return_value = ([Mock()], 15)
            mock_format.return_value = {"id": "notif-1", "title": "Test"}

            response = client.get("/api/v1/user/notifications?page=3&size=5&unread_only=true")

            assert response.status_code == 200
            data = response.json()
            assert data["page"] == 3
            assert data["size"] == 5
            assert data["unread_only"] == True
            assert data["total"] == 15
            
            # offset should be (page - 1) * size = (3 - 1) * 5 = 10
            mock_get_notifs.assert_called_once_with(
                mock_db, "test-user-123", 10, 5, True
            )

    def test_get_my_notifications_invalid_pagination(self):
        """Test getting notifications with invalid pagination parameters"""
        def mock_get_current_user():
            return {"uid": "test-user-123"}
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        # Test invalid page (less than 1)
        response = client.get("/api/v1/user/notifications?page=0")
        assert response.status_code == 422

        # Test invalid size (greater than 50)
        response = client.get("/api/v1/user/notifications?size=100")
        assert response.status_code == 422

        # Test invalid size (less than 1)
        response = client.get("/api/v1/user/notifications?size=0")
        assert response.status_code == 422

    def test_get_my_notifications_unauthorized(self):
        """Test getting notifications without authentication"""
        def mock_get_current_user():
            raise HTTPException(status_code=401, detail="Unauthorized")
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        response = client.get("/api/v1/user/notifications")
        assert response.status_code == 401

    def test_mark_notification_as_read_success(self):
        """Test successfully marking a notification as read"""
        mock_db = Mock()
        
        def mock_get_current_user():
            return {"uid": "test-user-123"}
            
        def mock_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        with patch('app.api.v1.routes.user.mark_notification_read') as mock_mark_read:
            mock_mark_read.return_value = True

            response = client.put("/api/v1/user/notifications/notif-123/read")

            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Notification marked as read"
            assert data["notification_id"] == "notif-123"
            
            mock_mark_read.assert_called_once_with(
                mock_db, "notif-123", "test-user-123"
            )

    def test_mark_notification_as_read_not_found(self):
        """Test marking notification as read when it doesn't exist or doesn't belong to user"""
        def mock_get_current_user():
            return {"uid": "test-user-123"}
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        with patch('app.api.v1.routes.user.mark_notification_read') as mock_mark_read:
            mock_mark_read.return_value = False

            response = client.put("/api/v1/user/notifications/notif-999/read")

            assert response.status_code == 404
            data = response.json()
            assert "not found" in data["detail"].lower()

    def test_mark_notification_as_read_unauthorized(self):
        """Test marking notification as read without authentication"""
        def mock_get_current_user():
            raise HTTPException(status_code=401, detail="Unauthorized")
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        response = client.put("/api/v1/user/notifications/notif-123/read")
        assert response.status_code == 401

    def test_mark_all_notifications_as_read_success(self):
        """Test successfully marking all notifications as read"""
        mock_db = Mock()
        
        def mock_get_current_user():
            return {"uid": "test-user-123"}
            
        def mock_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        with patch('app.api.v1.routes.user.mark_all_notifications_read') as mock_mark_all:
            mock_mark_all.return_value = 5

            response = client.put("/api/v1/user/notifications/mark-all-read")

            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Marked 5 notifications as read"
            assert data["notifications_updated"] == 5
            
            mock_mark_all.assert_called_once_with(mock_db, "test-user-123")

    def test_mark_all_notifications_as_read_zero_updated(self):
        """Test marking all notifications as read when none need updating"""
        def mock_get_current_user():
            return {"uid": "test-user-123"}
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        with patch('app.api.v1.routes.user.mark_all_notifications_read') as mock_mark_all:
            mock_mark_all.return_value = 0

            response = client.put("/api/v1/user/notifications/mark-all-read")

            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Marked 0 notifications as read"
            assert data["notifications_updated"] == 0

    def test_mark_all_notifications_as_read_unauthorized(self):
        """Test marking all notifications as read without authentication"""
        def mock_get_current_user():
            raise HTTPException(status_code=401, detail="Unauthorized")
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        response = client.put("/api/v1/user/notifications/mark-all-read")
        assert response.status_code == 401

    def test_get_unread_notifications_count_success(self):
        """Test successfully getting unread notifications count"""
        mock_db = Mock()
        
        def mock_get_current_user():
            return {"uid": "test-user-123"}
            
        def mock_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        with patch('app.api.v1.routes.user.get_unread_count') as mock_get_count:
            mock_get_count.return_value = 3

            response = client.get("/api/v1/user/notifications/unread-count")

            assert response.status_code == 200
            data = response.json()
            assert data["unread_count"] == 3
            
            mock_get_count.assert_called_once_with(mock_db, "test-user-123")

    def test_get_unread_notifications_count_zero(self):
        """Test getting unread count when there are no unread notifications"""
        def mock_get_current_user():
            return {"uid": "test-user-123"}
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        with patch('app.api.v1.routes.user.get_unread_count') as mock_get_count:
            mock_get_count.return_value = 0

            response = client.get("/api/v1/user/notifications/unread-count")

            assert response.status_code == 200
            data = response.json()
            assert data["unread_count"] == 0

    def test_get_unread_notifications_count_unauthorized(self):
        """Test getting unread count without authentication"""
        def mock_get_current_user():
            raise HTTPException(status_code=401, detail="Unauthorized")
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        response = client.get("/api/v1/user/notifications/unread-count")
        assert response.status_code == 401

    def test_notification_endpoints_user_isolation(self):
        """Test that notification endpoints only access user's own notifications"""
        mock_db = Mock()
        
        def mock_get_current_user():
            return {"uid": "user-456"}  # Different user
            
        def mock_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        # Test get notifications
        with patch('app.api.v1.routes.user.get_user_notifications_with_filter') as mock_get_notifs:
            mock_get_notifs.return_value = ([], 0)
            client.get("/api/v1/user/notifications")
            mock_get_notifs.assert_called_with(mock_db, "user-456", 0, 10, False)

        # Test mark notification read
        with patch('app.api.v1.routes.user.mark_notification_read') as mock_mark_read:
            mock_mark_read.return_value = True
            client.put("/api/v1/user/notifications/notif-123/read")
            mock_mark_read.assert_called_with(mock_db, "notif-123", "user-456")

        # Test mark all read
        with patch('app.api.v1.routes.user.mark_all_notifications_read') as mock_mark_all:
            mock_mark_all.return_value = 0
            client.put("/api/v1/user/notifications/mark-all-read")
            mock_mark_all.assert_called_with(mock_db, "user-456")

        # Test unread count
        with patch('app.api.v1.routes.user.get_unread_count') as mock_get_count:
            mock_get_count.return_value = 2
            client.get("/api/v1/user/notifications/unread-count")
            mock_get_count.assert_called_with(mock_db, "user-456")
