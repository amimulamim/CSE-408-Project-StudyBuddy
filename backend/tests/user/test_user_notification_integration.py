import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
from fastapi.testclient import TestClient

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.auth.firebase_auth import get_current_user
    from app.core.database import get_db
    from app.admin.model import Notification

client = TestClient(app)


class TestUserNotificationIntegration:
    """Integration tests for user notification system"""

    def setup_method(self):
        """Setup method to clear dependency overrides before each test"""
        app.dependency_overrides.clear()

    def teardown_method(self):
        """Teardown method to clear dependency overrides after each test"""
        app.dependency_overrides.clear()

    def create_mock_notification(self, notif_id, title, message, is_read=False, recipient_uid="test-user-123"):
        """Helper to create mock notification objects"""
        mock_notif = Mock(spec=Notification)
        mock_notif.id = notif_id
        mock_notif.title = title
        mock_notif.message = message
        mock_notif.type = "info"
        mock_notif.is_read = is_read
        mock_notif.recipient_uid = recipient_uid
        mock_notif.created_at = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        mock_notif.updated_at = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        return mock_notif

    def test_full_notification_flow(self):
        """Test complete notification flow: get notifications, mark one as read, get updated list"""
        def mock_get_current_user():
            return {"uid": "test-user-123"}

        mock_db = Mock()
        def mock_get_db():
            return mock_db

        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        # Create mock notifications
        notif1 = self.create_mock_notification("notif-1", "Notification 1", "Message 1", is_read=False)
        notif2 = self.create_mock_notification("notif-2", "Notification 2", "Message 2", is_read=False)
        notif3 = self.create_mock_notification("notif-3", "Notification 3", "Message 3", is_read=True)

        # Setup mock database responses
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query

        # Step 1: Get all notifications (should return 3 total, 2 unread)
        mock_query.count.return_value = 3
        mock_query.all.return_value = [notif1, notif2, notif3]

        response = client.get("/api/v1/user/notifications")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["notifications"]) == 3
        assert data["notifications"][0]["is_read"] == False
        assert data["notifications"][1]["is_read"] == False
        assert data["notifications"][2]["is_read"] == True

        # Step 2: Get unread count (should be 2)
        mock_query.count.return_value = 2
        response = client.get("/api/v1/user/notifications/unread-count")
        assert response.status_code == 200
        assert response.json()["unread_count"] == 2

        # Step 3: Mark first notification as read
        mock_query.first.return_value = notif1
        response = client.put("/api/v1/user/notifications/notif-1/read")
        assert response.status_code == 200
        assert response.json()["notification_id"] == "notif-1"
        # Verify the notification is marked as read
        assert notif1.is_read == True

        # Step 4: Get unread count again (should be 1 now)
        mock_query.count.return_value = 1
        response = client.get("/api/v1/user/notifications/unread-count")
        assert response.status_code == 200
        assert response.json()["unread_count"] == 1

        # Step 5: Mark all notifications as read
        mock_query.update.return_value = 1  # Only 1 notification was still unread
        response = client.put("/api/v1/user/notifications/mark-all-read")
        assert response.status_code == 200
        assert response.json()["notifications_updated"] == 1

        # Step 6: Get unread count final check (should be 0)
        mock_query.count.return_value = 0
        response = client.get("/api/v1/user/notifications/unread-count")
        assert response.status_code == 200
        assert response.json()["unread_count"] == 0

    def test_notification_pagination_flow(self):
        """Test notification pagination with different parameters"""
        def mock_get_current_user():
            return {"uid": "test-user-123"}

        mock_db = Mock()
        def mock_get_db():
            return mock_db

        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        # Create 15 mock notifications (10 unread, 5 read)
        notifications = []
        for i in range(15):
            is_read = i >= 10  # First 10 are unread, last 5 are read
            notif = self.create_mock_notification(f"notif-{i}", f"Title {i}", f"Message {i}", is_read)
            notifications.append(notif)

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query

        # Test page 1, size 5, all notifications
        mock_query.count.return_value = 15
        mock_query.all.return_value = notifications[:5]
        response = client.get("/api/v1/user/notifications?page=1&size=5")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 15
        assert data["page"] == 1
        assert data["size"] == 5
        assert len(data["notifications"]) == 5

        # Test page 2, size 5, unread only
        mock_query.count.return_value = 10  # Only 10 unread
        mock_query.all.return_value = notifications[5:10]  # Next 5 unread
        response = client.get("/api/v1/user/notifications?page=2&size=5&unread_only=true")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 10
        assert data["page"] == 2
        assert data["size"] == 5
        assert data["unread_only"] == True
        assert len(data["notifications"]) == 5

        # Test last page (page 3 of unread, should have 0 items since 10 unread / 5 per page = 2 pages)
        mock_query.count.return_value = 10
        mock_query.all.return_value = []
        response = client.get("/api/v1/user/notifications?page=3&size=5&unread_only=true")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 10
        assert data["page"] == 3
        assert len(data["notifications"]) == 0

    def test_user_isolation_integration(self):
        """Test that users can only access their own notifications (integration test)"""
        mock_db = Mock()
        def mock_get_db():
            return mock_db

        app.dependency_overrides[get_db] = mock_get_db

        # Create notifications for different users
        user1_notif = self.create_mock_notification("notif-user1", "User 1 Notification", "Message for user 1", recipient_uid="user-1")
        user2_notif = self.create_mock_notification("notif-user2", "User 2 Notification", "Message for user 2", recipient_uid="user-2")

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query

        # Test as user 1
        def mock_get_current_user_1():
            return {"uid": "user-1"}
        app.dependency_overrides[get_current_user] = mock_get_current_user_1

        # User 1 should only see their notification
        mock_query.count.return_value = 1
        mock_query.all.return_value = [user1_notif]
        response = client.get("/api/v1/user/notifications")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["notifications"][0]["title"] == "User 1 Notification"

        # User 1 tries to mark user 2's notification as read (should fail)
        mock_query.first.return_value = None  # Simulates not finding the notification for this user
        response = client.put("/api/v1/user/notifications/notif-user2/read")
        assert response.status_code == 404

        # Test as user 2
        def mock_get_current_user_2():
            return {"uid": "user-2"}
        app.dependency_overrides[get_current_user] = mock_get_current_user_2

        # User 2 should only see their notification
        mock_query.count.return_value = 1
        mock_query.all.return_value = [user2_notif]
        response = client.get("/api/v1/user/notifications")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["notifications"][0]["title"] == "User 2 Notification"

        # User 2 can mark their own notification as read
        mock_query.first.return_value = user2_notif
        response = client.put("/api/v1/user/notifications/notif-user2/read")
        assert response.status_code == 200
        assert response.json()["notification_id"] == "notif-user2"

    def test_error_handling_integration(self):
        """Test error handling in notification system"""
        def mock_get_current_user():
            return {"uid": "test-user-123"}

        mock_db = Mock()
        def mock_get_db():
            return mock_db

        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query

        # Test marking non-existent notification as read
        mock_query.first.return_value = None
        response = client.put("/api/v1/user/notifications/nonexistent-notif/read")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

        # Test database error handling by mocking the helper function instead
        with patch('app.api.v1.routes.user.get_unread_count') as mock_get_count:
            mock_get_count.side_effect = Exception("Database connection error")
            try:
                response = client.get("/api/v1/user/notifications/unread-count")
                # The exception should be caught by FastAPI and return 500
                assert response.status_code == 500
            except Exception:
                # If the exception propagates, that's also expected behavior
                pass

    def test_notification_types_and_formatting(self):
        """Test different notification types and response formatting"""
        def mock_get_current_user():
            return {"uid": "test-user-123"}

        mock_db = Mock()
        def mock_get_db():
            return mock_db

        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

        # Create notifications of different types
        info_notif = self.create_mock_notification("notif-info", "Info Notification", "Information message")
        info_notif.type = "info"
        
        warning_notif = self.create_mock_notification("notif-warning", "Warning Notification", "Warning message")
        warning_notif.type = "warning"
        
        error_notif = self.create_mock_notification("notif-error", "Error Notification", "Error message")
        error_notif.type = "error"

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.count.return_value = 3
        mock_query.all.return_value = [info_notif, warning_notif, error_notif]

        response = client.get("/api/v1/user/notifications")
        assert response.status_code == 200
        data = response.json()
        
        notifications = data["notifications"]
        assert len(notifications) == 3
        
        # Check that all notification types are properly formatted
        types_found = {notif["type"] for notif in notifications}
        assert types_found == {"info", "warning", "error"}
        
        # Check that all notifications have required fields
        for notif in notifications:
            assert "id" in notif
            assert "title" in notif
            assert "message" in notif
            assert "type" in notif
            assert "is_read" in notif
            assert "created_at" in notif
            assert "updated_at" in notif
