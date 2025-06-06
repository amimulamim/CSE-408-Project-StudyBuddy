import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
import json
from datetime import datetime, timezone

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.auth.firebase_auth import get_current_user
    from app.core.database import get_db
    from app.admin.schema import (
        AdminLogResponse, NotificationCreate, NotificationUpdate,
        NotificationType, UsageStatsResponse
    )
    from app.users.model import User
    from app.admin.model import AdminLog, Notification

client = TestClient(app)


class TestAdminRoutes:
    """Test admin API routes"""

    @pytest.fixture
    def admin_user(self):
        """Mock admin user"""
        return {"uid": "admin123", "is_admin": True}

    @pytest.fixture
    def regular_user(self):
        """Mock regular user"""
        return {"uid": "user123", "is_admin": False}

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    def setup_admin_auth(self, admin_user, mock_db):
        """Setup admin authentication and database"""
        app.dependency_overrides[get_current_user] = lambda: admin_user
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock the is_user_admin function to return True for admin tests
        self.admin_patcher = patch('app.users.service.is_user_admin')
        self.mock_is_admin = self.admin_patcher.start()
        self.mock_is_admin.return_value = admin_user.get('is_admin', False)
        
        # Also patch the require_admin_access function import in routes
        self.route_admin_patcher = patch('app.api.v1.routes.admin.is_user_admin')
        self.mock_route_admin = self.route_admin_patcher.start()
        self.mock_route_admin.return_value = admin_user.get('is_admin', False)

    def teardown_overrides(self):
        """Cleanup dependency overrides"""
        app.dependency_overrides.clear()
        if hasattr(self, 'admin_patcher'):
            self.admin_patcher.stop()
        if hasattr(self, 'route_admin_patcher'):
            self.route_admin_patcher.stop()

    def test_get_admin_logs_success(self, admin_user, mock_db):
        """Test getting admin logs successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.get_admin_logs') as mock_get_logs:
                # Arrange
                mock_log = Mock(spec=AdminLog)
                mock_log.id = 1
                mock_log.admin_uid = "admin123"
                mock_log.action_type = "user_edit"
                mock_log.target_uid = "user123"
                mock_log.target_type = "user"
                mock_log.details = {"field": "name"}
                mock_log.details_dict = {"field": "name"}  # Add details_dict property
                mock_log.created_at = datetime.now(timezone.utc)
                mock_log.ip_address = "192.168.1.1"
                mock_log.user_agent = "Mozilla/5.0"

                mock_get_logs.return_value = ([mock_log], 1)

                # Act
                response = client.get("/api/v1/admin/logs?offset=0&size=10")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "logs" in data
                assert "total" in data
                assert data["total"] == 1
                
        finally:
            self.teardown_overrides()

    def test_get_admin_logs_unauthorized(self, regular_user, mock_db):
        """Test getting admin logs without admin privileges"""
        self.setup_admin_auth(regular_user, mock_db)

        try:
            with patch('app.admin.service.get_admin_logs') as mock_get_logs:
                # Mock the service to return empty list to avoid iteration issues
                mock_get_logs.return_value = ([], 0)
                
                # Act
                response = client.get("/api/v1/admin/logs")

                # Assert
                assert response.status_code == 403
        finally:
            self.teardown_overrides()
            self.teardown_overrides()

    def test_get_users_success(self, admin_user, mock_db):
        """Test getting users successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.get_all_users_paginated') as mock_get_users:
                # Arrange
                mock_user = Mock(spec=User)
                mock_user.uid = "user123"
                mock_user.email = "user@example.com"
                mock_user.name = "Test User"
                mock_user.bio = "User bio"
                mock_user.institution = "Test University"
                mock_user.role = "student"
                mock_user.avatar = None
                mock_user.auth_provider = "firebase"
                mock_user.is_admin = False
                mock_user.is_moderator = False
                mock_user.current_plan = "free"
                mock_user.location = "City"
                mock_user.study_domain = "Computer Science"
                mock_user.interests = "AI, ML"
                mock_user.created_at = datetime.now(timezone.utc)
                mock_user.updated_at = datetime.now(timezone.utc)
                
                mock_get_users.return_value = ([mock_user], 1)

                # Act
                response = client.get("/api/v1/admin/users?offset=0&size=10")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "users" in data
                assert "total" in data
                assert data["total"] == 1
                assert len(data["users"]) == 1
                
        finally:
            self.teardown_overrides()

    def test_edit_user_success(self, admin_user, mock_db):
        """Test editing user successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.users.service.admin_update_user') as mock_update_user, \
                 patch('app.users.service.get_user_by_uid') as mock_get_user, \
                 patch('app.admin.service.create_admin_log'):
                # Arrange - Create an actual User instance for proper serialization
                from app.users.model import User
                
                mock_user = User(
                    uid="user123",
                    email="user@example.com",
                    name="Updated User",
                    bio="Updated bio",
                    institution="Updated University",
                    role="student",
                    avatar="",
                    current_plan="free",
                    location="Updated City",
                    study_domain="Updated Domain"
                )
                # Set interests using the property setter
                mock_user.interests = ["coding", "learning"]
                
                # Mock both functions to prevent database calls
                mock_get_user.return_value = mock_user
                mock_update_user.return_value = mock_user

                # Act
                edit_data = {
                    "name": "Updated User",
                    "bio": "Updated bio",
                    "institution": "Updated University"
                }
                response = client.put("/api/v1/admin/users/user123", json=edit_data)

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["name"] == "Updated User"
                assert data["bio"] == "Updated bio"
                assert data["institution"] == "Updated University"
                
        finally:
            self.teardown_overrides()

    def test_edit_user_not_found(self, admin_user, mock_db):
        """Test editing non-existent user"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.users.service.admin_update_user') as mock_update_user, \
                 patch('app.users.service.get_user_by_uid') as mock_get_user:
                # Arrange - Service returns None when user not found
                mock_get_user.return_value = None
                mock_update_user.return_value = None

                # Act
                edit_data = {"name": "Updated User"}
                response = client.put("/api/v1/admin/users/nonexistent", json=edit_data)

                # Assert
                assert response.status_code == 404
                
        finally:
            self.teardown_overrides()

    def test_delete_user_success(self, admin_user, mock_db):
        """Test deleting user successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.admin_delete_user') as mock_delete_user, \
                 patch('app.admin.service.create_admin_log'):
                # Arrange
                mock_delete_user.return_value = True

                # Act
                response = client.delete("/api/v1/admin/users/user123")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "message" in data
                
        finally:
            self.teardown_overrides()

    def test_delete_user_not_found(self, admin_user, mock_db):
        """Test deleting non-existent user"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.admin_delete_user') as mock_delete_user:
                # Arrange
                mock_delete_user.return_value = False

                # Act
                response = client.delete("/api/v1/admin/users/nonexistent")

                # Assert
                assert response.status_code == 404
                
        finally:
            self.teardown_overrides()

    def test_promote_user_success(self, admin_user, mock_db):
        """Test promoting user to admin successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.promote_user_to_admin') as mock_promote, \
                 patch('app.admin.service.create_admin_log'):
                # Arrange
                mock_user = Mock(spec=User)
                mock_user.uid = "user123"
                mock_user.name = "Test User"
                mock_user.email = "user@example.com"
                mock_user.is_admin = True
                mock_promote.return_value = mock_user

                # Act
                response = client.post("/api/v1/admin/promote", json={"identifier": "user@example.com"})

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "message" in data
                assert "user" in data
                assert data["user"]["is_admin"] is True
                
        finally:
            self.teardown_overrides()

    def test_promote_user_not_found(self, admin_user, mock_db):
        """Test promoting non-existent user"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.promote_user_to_admin') as mock_promote:
                # Arrange
                mock_promote.return_value = None

                # Act
                response = client.post("/api/v1/admin/promote", json={"identifier": "nonexistent@example.com"})

                # Assert
                assert response.status_code == 404
                
        finally:
            self.teardown_overrides()

    def test_create_notification_success(self, admin_user, mock_db):
        """Test creating notification successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.create_notification') as mock_create_notif, \
                 patch('app.admin.service.create_admin_log'):
                # Arrange
                mock_notification = Mock(spec=Notification)
                mock_notification.id = "notif123"
                mock_notification.recipient_uid = "user123"
                mock_notification.title = "Test Notification"
                mock_notification.message = "Test message"
                mock_notification.type = "info"
                mock_notification.is_read = False
                mock_notification.created_by = "admin123"
                mock_notification.created_at = datetime.now(timezone.utc)
                mock_notification.updated_at = datetime.now(timezone.utc)
                mock_create_notif.return_value = mock_notification

                # Act
                notification_data = {
                    "recipient_uid": "user123",
                    "title": "Test Notification",
                    "message": "Test message",
                    "type": "info"
                }
                response = client.post("/api/v1/admin/notifications", json=notification_data)

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["title"] == "Test Notification"
                
        finally:
            self.teardown_overrides()

    def test_update_notification_success(self, admin_user, mock_db):
        """Test updating notification successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.update_notification') as mock_update_notif, \
                 patch('app.admin.service.create_admin_log'):
                # Arrange
                mock_notification = Mock(spec=Notification)
                mock_notification.id = "notif123"
                mock_notification.recipient_uid = "user123"
                mock_notification.title = "Updated Notification"
                mock_notification.message = "Updated message"
                mock_notification.type = "info"
                mock_notification.is_read = True
                mock_notification.created_by = "admin123"
                mock_notification.created_at = datetime.now(timezone.utc)
                mock_notification.updated_at = datetime.now(timezone.utc)
                mock_update_notif.return_value = mock_notification

                # Act
                update_data = {
                    "title": "Updated Notification",
                    "message": "Updated message",
                    "is_read": True
                }
                response = client.put("/api/v1/admin/notifications/notif123", json=update_data)

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["title"] == "Updated Notification"
                assert data["is_read"] is True
                
        finally:
            self.teardown_overrides()

    def test_update_notification_not_found(self, admin_user, mock_db):
        """Test updating non-existent notification"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.update_notification') as mock_update_notif:
                # Arrange
                mock_update_notif.return_value = None

                # Act
                update_data = {"title": "Updated Notification"}
                response = client.put("/api/v1/admin/notifications/nonexistent", json=update_data)

                # Assert
                assert response.status_code == 404
                
        finally:
            self.teardown_overrides()

    def test_delete_notification_success(self, admin_user, mock_db):
        """Test deleting notification successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.delete_notification') as mock_delete_notif, \
                 patch('app.admin.service.create_admin_log'):
                # Arrange
                mock_delete_notif.return_value = True

                # Act
                response = client.delete("/api/v1/admin/notifications/notif123")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "message" in data
                
        finally:
            self.teardown_overrides()

    def test_delete_notification_not_found(self, admin_user, mock_db):
        """Test deleting non-existent notification"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.delete_notification') as mock_delete_notif:
                # Arrange
                mock_delete_notif.return_value = False

                # Act
                response = client.delete("/api/v1/admin/notifications/nonexistent")

                # Assert
                assert response.status_code == 404
                
        finally:
            self.teardown_overrides()

    def test_get_user_notifications_success(self, admin_user, mock_db):
        """Test getting user notifications successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.get_notifications_for_user') as mock_get_notifs:
                # Arrange
                mock_notification = Mock(spec=Notification)
                mock_notification.id = "notif123"
                mock_notification.title = "Test Notification"
                mock_notification.message = "Test message"
                mock_notification.type = "info"
                mock_notification.recipient_uid = "user123"
                mock_notification.is_read = False
                mock_notification.created_at = datetime.now(timezone.utc)
                mock_notification.read_at = None  # Add the missing read_at attribute
                
                mock_get_notifs.return_value = ([mock_notification], 1)

                # Act
                response = client.get("/api/v1/admin/users/user123/notifications")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "notifications" in data
                assert "total" in data
                assert "page" in data
                assert "size" in data
                assert len(data["notifications"]) == 1
                assert data["total"] == 1
                assert data["page"] == 1
                assert data["size"] == 10
                
        finally:
            self.teardown_overrides()

    def test_get_usage_statistics_success(self, admin_user, mock_db):
        """Test getting usage statistics successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.get_usage_statistics') as mock_get_stats:
                # Arrange
                mock_stats = UsageStatsResponse(
                    users_added=10,
                    content_generated=25,
                    quiz_generated=5,
                    content_uploaded=8,
                    chats_done=50,
                    period_start=datetime(2025, 6, 1, tzinfo=timezone.utc),
                    period_end=datetime(2025, 6, 7, tzinfo=timezone.utc)
                )
                mock_get_stats.return_value = mock_stats

                # Act
                response = client.get("/api/v1/admin/stats/usage?start_time=2025-06-01T00:00:00Z&end_time=2025-06-07T23:59:59Z")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["users_added"] == 10
                assert data["chats_done"] == 50
                
        finally:
            self.teardown_overrides()

    def test_get_chats_success(self, admin_user, mock_db):
        """Test getting chats successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.get_all_chats_paginated') as mock_get_chats:
                # Arrange
                mock_chat = {
                    "id": "chat123",
                    "user_uid": "user123",
                    "title": "Test Chat",
                    "created_at": datetime.now(timezone.utc),
                    "message_count": 5
                }
                mock_get_chats.return_value = ([mock_chat], 1)

                # Act
                response = client.get("/api/v1/admin/chats?offset=0&size=10")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "chats" in data
                assert "total" in data
                assert data["total"] == 1
                
        finally:
            self.teardown_overrides()

    def test_llm_invoke_placeholder(self, admin_user, mock_db):
        """Test LLM invoke placeholder endpoint"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.invoke_llm_service') as mock_invoke, \
                 patch('app.admin.service.create_admin_log'):
                # Arrange
                mock_invoke.return_value = {"result": "success"}

                # Act
                response = client.post("/api/v1/admin/llm/invoke", json={
                    "target": "llm",
                    "payload": {"action": "test"}
                })

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["result"] == "success"
                
        finally:
            self.teardown_overrides()

    def test_admin_access_required_middleware(self, regular_user, mock_db):
        """Test that admin access is required for all admin endpoints"""
        self.setup_admin_auth(regular_user, mock_db)

        admin_endpoints = [
            ("/api/v1/admin/logs", "GET", None),
            ("/api/v1/admin/users", "GET", None),
            ("/api/v1/admin/users/user123", "PUT", {"name": "Test User"}),
            ("/api/v1/admin/users/user123", "DELETE", None),
            ("/api/v1/admin/promote", "POST", {"identifier": "test@example.com"}),
            ("/api/v1/admin/notifications", "POST", {
                "recipient_uid": "user123",
                "title": "Test",
                "message": "Test message",
                "type": "info"
            }),
            ("/api/v1/admin/notifications/notif123", "PUT", {"title": "Updated"}),
            ("/api/v1/admin/notifications/notif123", "DELETE", None),
            ("/api/v1/admin/users/user123/notifications", "GET", None),
            ("/api/v1/admin/stats/usage?start_time=2025-06-01T00:00:00Z&end_time=2025-06-07T23:59:59Z", "GET", None),
            ("/api/v1/admin/chats", "GET", None),
            ("/api/v1/admin/llm/invoke", "POST", {
                "target": "llm",
                "payload": {"action": "test"}
            }),
        ]

        try:
            # Mock admin service functions to avoid execution issues
            with patch('app.admin.service.get_admin_logs') as mock_logs, \
                 patch('app.admin.service.get_notifications_for_user') as mock_notifs:
                
                mock_logs.return_value = ([], 0)
                mock_notifs.return_value = ([], 0)
                
                for endpoint, method, data in admin_endpoints:
                    # Act
                    if method == "GET":
                        response = client.get(endpoint)
                    elif method == "POST":
                        response = client.post(endpoint, json=data)
                    elif method == "PUT":
                        response = client.put(endpoint, json=data)
                    elif method == "DELETE":
                        response = client.delete(endpoint)

                    # Assert - should get 403 Forbidden for non-admin users
                    assert response.status_code == 403, f"Expected 403 for {method} {endpoint}, got {response.status_code}"
        finally:
            self.teardown_overrides()
