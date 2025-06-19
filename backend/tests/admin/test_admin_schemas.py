import pytest
from pydantic import ValidationError
from datetime import datetime, timezone
from typing import Dict, Any

# Mock Firebase initialization before importing app modules
from unittest.mock import patch, MagicMock
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.admin.schema import (
        NotificationType, AdminAction, PaginationQuery, UserListResponse,
        ContentListResponse, QuizResultsResponse, ChatHistoryResponse,
        NotificationCreate, NotificationUpdate, NotificationResponse,
        LLMInvokeRequest, UsageStatsQuery, UsageStatsResponse,
        UserPromoteRequest, AdminLogResponse, AdminLogCreate
    )


class TestEnums:
    """Test enum classes"""

    def test_notification_type_enum(self):
        """Test NotificationType enum values"""
        assert NotificationType.INFO == "info"
        assert NotificationType.WARNING == "warning"
        assert NotificationType.SUCCESS == "success"
        assert NotificationType.ERROR == "error"
        
        # Test all values are present
        expected_values = {"info", "warning", "success", "error"}
        actual_values = {item.value for item in NotificationType}
        assert actual_values == expected_values

    def test_admin_action_enum(self):
        """Test AdminAction enum values"""
        assert AdminAction.USER_EDIT == "user_edit"
        assert AdminAction.USER_DELETE == "user_delete"
        assert AdminAction.USER_PROMOTE == "user_promote"
        assert AdminAction.NOTIFICATION_SEND == "notification_send"
        assert AdminAction.NOTIFICATION_EDIT == "notification_edit"
        assert AdminAction.NOTIFICATION_DELETE == "notification_delete"
        assert AdminAction.CONTENT_MODERATE == "content_moderate"
        assert AdminAction.LLM_INVOKE == "llm_invoke"
        
        # Test all expected values are present
        expected_values = {
            "user_edit", "user_delete", "user_promote", "notification_send",
            "notification_edit", "notification_delete", "content_moderate", "llm_invoke"
        }
        actual_values = {item.value for item in AdminAction}
        assert actual_values == expected_values


class TestPaginationQuery:
    """Test PaginationQuery schema"""

    def test_pagination_query_defaults(self):
        """Test PaginationQuery with default values"""
        query = PaginationQuery()
        assert query.offset == 0
        assert query.size == 20

    def test_pagination_query_custom_values(self):
        """Test PaginationQuery with custom values"""
        query = PaginationQuery(offset=10, size=50)
        assert query.offset == 10
        assert query.size == 50

    def test_pagination_query_validation_offset(self):
        """Test PaginationQuery offset validation"""
        # Valid offset
        query = PaginationQuery(offset=0)
        assert query.offset == 0
        
        # Negative offset should fail
        with pytest.raises(ValidationError):
            PaginationQuery(offset=-1)

    def test_pagination_query_validation_size(self):
        """Test PaginationQuery size validation"""
        # Valid sizes
        query1 = PaginationQuery(size=1)
        assert query1.size == 1
        
        query2 = PaginationQuery(size=100)
        assert query2.size == 100
        
        # Size too small should fail
        with pytest.raises(ValidationError):
            PaginationQuery(size=0)
        
        # Size too large should fail
        with pytest.raises(ValidationError):
            PaginationQuery(size=101)


class TestResponseSchemas:
    """Test response schema classes"""

    def test_user_list_response(self):
        """Test UserListResponse schema"""
        users_data = [
            {"uid": "user1", "email": "user1@example.com", "name": "User One"},
            {"uid": "user2", "email": "user2@example.com", "name": "User Two"}
        ]
        
        response = UserListResponse(
            users=users_data,
            total=2,
            offset=0,
            size=20
        )
        
        assert response.users == users_data
        assert response.total == 2
        assert response.offset == 0
        assert response.size == 20

    def test_content_list_response(self):
        """Test ContentListResponse schema"""
        content_data = [
            {"id": "content1", "title": "Content One", "type": "note"},
            {"id": "content2", "title": "Content Two", "type": "document"}
        ]
        
        response = ContentListResponse(
            content=content_data,
            total=2,
            offset=0,
            size=20
        )
        
        assert response.content == content_data
        assert response.total == 2
        assert response.offset == 0
        assert response.size == 20

    def test_quiz_results_response(self):
        """Test QuizResultsResponse schema"""
        quiz_data = [
            {"id": "quiz1", "score": 85, "user_uid": "user1"},
            {"id": "quiz2", "score": 92, "user_uid": "user2"}
        ]
        
        response = QuizResultsResponse(
            quiz_results=quiz_data,
            total=2,
            offset=0,
            size=20
        )
        
        assert response.quiz_results == quiz_data
        assert response.total == 2
        assert response.offset == 0
        assert response.size == 20

    def test_chat_history_response(self):
        """Test ChatHistoryResponse schema"""
        chat_data = [
            {"id": "chat1", "title": "Chat One", "user_uid": "user1"},
            {"id": "chat2", "title": "Chat Two", "user_uid": "user2"}
        ]
        
        response = ChatHistoryResponse(
            chats=chat_data,
            total=2,
            offset=0,
            size=20
        )
        
        assert response.chats == chat_data
        assert response.total == 2
        assert response.offset == 0
        assert response.size == 20


class TestNotificationSchemas:
    """Test notification-related schemas"""

    def test_notification_create_valid(self):
        """Test NotificationCreate with valid data"""
        notification = NotificationCreate(
            recipient_uid="user123",
            title="Test Notification",
            message="This is a test message",
            type=NotificationType.INFO
        )
        
        assert notification.recipient_uid == "user123"
        assert notification.title == "Test Notification"
        assert notification.message == "This is a test message"
        assert notification.type == NotificationType.INFO

    def test_notification_create_defaults(self):
        """Test NotificationCreate with default values"""
        notification = NotificationCreate(
            recipient_uid="user123",
            title="Test Notification",
            message="This is a test message"
        )
        
        assert notification.type == NotificationType.INFO

    def test_notification_create_validation_title_length(self):
        """Test NotificationCreate title length validation"""
        # Valid title
        notification = NotificationCreate(
            recipient_uid="user123",
            title="A" * 200,
            message="Test message"
        )
        assert len(notification.title) == 200
        
        # Title too long should fail
        with pytest.raises(ValidationError):
            NotificationCreate(
                recipient_uid="user123",
                title="A" * 201,
                message="Test message"
            )

    def test_notification_create_validation_message_length(self):
        """Test NotificationCreate message length validation"""
        # Valid message
        notification = NotificationCreate(
            recipient_uid="user123",
            title="Test Title",
            message="A" * 2000
        )
        assert len(notification.message) == 2000
        
        # Message too long should fail
        with pytest.raises(ValidationError):
            NotificationCreate(
                recipient_uid="user123",
                title="Test Title",
                message="A" * 2001
            )

    def test_notification_update_partial(self):
        """Test NotificationUpdate with partial data"""
        # Test with only title
        update1 = NotificationUpdate(title="Updated Title")
        assert update1.title == "Updated Title"
        assert update1.message is None
        assert update1.type is None
        assert update1.is_read is None
        
        # Test with only message
        update2 = NotificationUpdate(message="Updated message")
        assert update2.title is None
        assert update2.message == "Updated message"
        
        # Test with multiple fields
        update3 = NotificationUpdate(
            title="Updated Title",
            type=NotificationType.WARNING,
            is_read=True
        )
        assert update3.title == "Updated Title"
        assert update3.type == NotificationType.WARNING
        assert update3.is_read is True

    def test_notification_update_validation(self):
        """Test NotificationUpdate validation"""
        # Valid updates
        update = NotificationUpdate(
            title="A" * 200,
            message="A" * 2000
        )
        assert len(update.title) == 200
        assert len(update.message) == 2000
        
        # Invalid title length
        with pytest.raises(ValidationError):
            NotificationUpdate(title="A" * 201)
        
        # Invalid message length
        with pytest.raises(ValidationError):
            NotificationUpdate(message="A" * 2001)

    def test_notification_response(self):
        """Test NotificationResponse schema"""
        now = datetime.now(timezone.utc)
        
        response = NotificationResponse(
            id="notif123",
            recipient_uid="user123",
            title="Test Notification",
            message="Test message",
            type="info",
            is_read=False,
            created_by="admin123",
            created_at=now,
            updated_at=now
        )
        
        assert response.id == "notif123"
        assert response.recipient_uid == "user123"
        assert response.title == "Test Notification"
        assert response.message == "Test message"
        assert response.type == "info"
        assert response.is_read is False
        assert response.created_by == "admin123"
        assert response.created_at == now
        assert response.updated_at == now

    def test_notification_response_optional_created_by(self):
        """Test NotificationResponse with None created_by"""
        now = datetime.now(timezone.utc)
        
        response = NotificationResponse(
            id="notif123",
            recipient_uid="user123",
            title="Test Notification",
            message="Test message",
            type="info",
            is_read=False,
            created_by=None,
            created_at=now,
            updated_at=now
        )
        
        assert response.created_by is None


class TestLLMInvokeRequest:
    """Test LLMInvokeRequest schema"""

    def test_llm_invoke_request_valid_targets(self):
        """Test LLMInvokeRequest with valid targets"""
        # Test with llm target
        request1 = LLMInvokeRequest(
            target="llm",
            payload={"prompt": "Test prompt"}
        )
        assert request1.target == "llm"
        assert request1.payload == {"prompt": "Test prompt"}
        
        # Test with parser target
        request2 = LLMInvokeRequest(
            target="parser",
            payload={"text": "Test text"}
        )
        assert request2.target == "parser"
        assert request2.payload == {"text": "Test text"}

    def test_llm_invoke_request_invalid_target(self):
        """Test LLMInvokeRequest with invalid target"""
        with pytest.raises(ValidationError):
            LLMInvokeRequest(
                target="invalid",
                payload={"test": "data"}
            )

    def test_llm_invoke_request_empty_payload(self):
        """Test LLMInvokeRequest with empty payload"""
        request = LLMInvokeRequest(
            target="llm",
            payload={}
        )
        assert request.payload == {}


class TestUsageStatsSchemas:
    """Test usage statistics schemas"""

    def test_usage_stats_query(self):
        """Test UsageStatsQuery schema"""
        start_time = datetime(2025, 6, 1, tzinfo=timezone.utc)
        end_time = datetime(2025, 6, 7, tzinfo=timezone.utc)
        
        query = UsageStatsQuery(
            start_time=start_time,
            end_time=end_time
        )
        
        assert query.start_time == start_time
        assert query.end_time == end_time

    def test_usage_stats_response(self):
        """Test UsageStatsResponse schema"""
        start_time = datetime(2025, 6, 1, tzinfo=timezone.utc)
        end_time = datetime(2025, 6, 7, tzinfo=timezone.utc)
        
        response = UsageStatsResponse(
            users_added=10,
            content_generated=25,
            quiz_generated=5,
            content_uploaded=8,
            chats_done=50,
            period_start=start_time,
            period_end=end_time
        )
        
        assert response.users_added == 10
        assert response.content_generated == 25
        assert response.quiz_generated == 5
        assert response.content_uploaded == 8
        assert response.chats_done == 50
        assert response.period_start == start_time
        assert response.period_end == end_time


class TestUserPromoteRequest:
    """Test UserPromoteRequest schema"""

    def test_user_promote_request_email(self):
        """Test UserPromoteRequest with email"""
        request = UserPromoteRequest(identifier="user@example.com")
        assert request.identifier == "user@example.com"

    def test_user_promote_request_username(self):
        """Test UserPromoteRequest with username"""
        request = UserPromoteRequest(identifier="username123")
        assert request.identifier == "username123"


class TestAdminLogSchemas:
    """Test admin log schemas"""

    def test_admin_log_response(self):
        """Test AdminLogResponse schema"""
        now = datetime.now(timezone.utc)
        details = {"field": "name", "old_value": "John", "new_value": "Jane"}
        
        response = AdminLogResponse(
            id=1,
            admin_uid="admin123",
            action_type="user_edit",
            target_uid="user123",
            target_type="user",
            details=details,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            created_at=now
        )
        
        assert response.id == 1
        assert response.admin_uid == "admin123"  
        assert response.action_type == "user_edit"
        assert response.target_uid == "user123"
        assert response.target_type == "user"
        assert response.details == details
        assert response.ip_address == "192.168.1.1"
        assert response.user_agent == "Mozilla/5.0"
        assert response.created_at == now

    def test_admin_log_response_optional_fields(self):
        """Test AdminLogResponse with optional fields as None"""
        now = datetime.now(timezone.utc)
        
        response = AdminLogResponse(
            id=1,
            admin_uid="admin123",
            action_type="system_check",
            target_uid=None,
            target_type="system",
            details=None,
            ip_address=None,
            user_agent=None,
            created_at=now
        )
        
        assert response.target_uid is None
        assert response.details is None
        assert response.ip_address is None
        assert response.user_agent is None

    def test_admin_log_create(self):
        """Test AdminLogCreate schema"""
        details = {"action_details": "Updated user profile"}
        
        log_create = AdminLogCreate(
            admin_uid="admin123",
            action_type=AdminAction.USER_EDIT,
            target_uid="user123",
            target_type="user",
            details=details,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0"
        )
        
        assert log_create.admin_uid == "admin123"
        assert log_create.action_type == AdminAction.USER_EDIT
        assert log_create.target_uid == "user123"
        assert log_create.target_type == "user"
        assert log_create.details == details
        assert log_create.ip_address == "192.168.1.1"
        assert log_create.user_agent == "Mozilla/5.0"

    def test_admin_log_create_optional_fields(self):
        """Test AdminLogCreate with optional fields"""
        log_create = AdminLogCreate(
            admin_uid="admin123",
            action_type=AdminAction.CONTENT_MODERATE,
            target_type="content"
        )
        
        assert log_create.admin_uid == "admin123"
        assert log_create.action_type == AdminAction.CONTENT_MODERATE
        assert log_create.target_type == "content"
        assert log_create.target_uid is None
        assert log_create.details is None
        assert log_create.ip_address is None
        assert log_create.user_agent is None


class TestSchemaValidation:
    """Test schema validation edge cases"""

    def test_empty_string_validation(self):
        """Test handling of empty strings"""
        # Empty strings are allowed by default in Pydantic, but may be validated by business logic
        notification = NotificationCreate(
            recipient_uid="",  # Empty string is technically allowed
            title="Test",
            message="Test"
        )
        assert notification.recipient_uid == ""

    def test_whitespace_handling(self):
        """Test handling of whitespace in string fields"""
        # Whitespace should be preserved
        notification = NotificationCreate(
            recipient_uid="user123",
            title="  Test Title  ",
            message="  Test Message  "
        )
        
        assert notification.title == "  Test Title  "
        assert notification.message == "  Test Message  "

    def test_none_vs_missing_fields(self):
        """Test difference between None and missing optional fields"""
        # Missing optional field
        update1 = NotificationUpdate()
        assert update1.title is None
        assert update1.message is None
        
        # Explicitly None optional field
        update2 = NotificationUpdate(title=None, message=None)
        assert update2.title is None
        assert update2.message is None
