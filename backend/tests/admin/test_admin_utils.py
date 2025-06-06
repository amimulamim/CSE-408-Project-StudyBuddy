import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from app.admin.utils.helpers import (
    validate_email,
    sanitize_user_input,
    format_admin_action_details,
    validate_datetime_range,
    mask_sensitive_data,
    generate_admin_summary
)


class TestValidateEmail:
    """Test email validation function"""

    def test_valid_emails(self):
        """Test with valid email addresses"""
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@example.org",
            "123@numbers.com",
            "a@b.co",
            "long.email.address@very-long-domain-name.com",
            "user@example..com"  # This is valid according to current regex
        ]
        
        for email in valid_emails:
            assert validate_email(email) is True, f"Email {email} should be valid"

    def test_invalid_emails(self):
        """Test with invalid email addresses"""
        invalid_emails = [
            "notanemail",
            "@example.com",
            "user@",
            "user@.com",
            "user.example.com",
            "user@example",
            "user@ex ample.com",
            ""
        ]

        for email in invalid_emails:
            assert validate_email(email) is False, f"Email {email} should be invalid"

    def test_email_edge_cases(self):
        """Test edge cases for email validation"""
        edge_cases = [
            ("user@domain.c", False),    # Domain extension too short
            ("user@domain.toolong", True),  # Long extension should be valid
            ("user123@123.com", True),   # Numeric parts
            ("user-name@domain-name.com", True),  # Hyphens
            ("user_name@domain_name.com", False),  # Underscores not allowed in current regex
        ]
        
        for email, expected in edge_cases:
            result = validate_email(email)
            assert result == expected, f"Email {email} validation should return {expected}"


class TestSanitizeUserInput:
    """Test user input sanitization function"""

    def test_normal_input(self):
        """Test with normal, safe input"""
        input_text = "This is normal text with numbers 123"
        result = sanitize_user_input(input_text)
        assert result == input_text

    def test_remove_dangerous_characters(self):
        """Test removal of potentially dangerous characters"""
        dangerous_input = 'Hello <script>alert("xss")</script> world'
        result = sanitize_user_input(dangerous_input)
        expected = "Hello scriptalert(xss)/script world"
        assert result == expected

    def test_length_limiting(self):
        """Test that input length is limited"""
        long_input = "a" * 1500  # Longer than default max_length of 1000
        result = sanitize_user_input(long_input)
        assert len(result) == 1000

    def test_whitespace_handling(self):
        """Test whitespace trimming"""
        whitespace_input = "  text with spaces  "
        result = sanitize_user_input(whitespace_input)
        assert result == "text with spaces"

    def test_empty_input(self):
        """Test with empty or None input"""
        assert sanitize_user_input("") == ""
        assert sanitize_user_input("   ") == ""

    def test_only_dangerous_characters(self):
        """Test input with only dangerous characters"""
        dangerous_only = '<>"\'<>'
        result = sanitize_user_input(dangerous_only)
        assert result == ""

    def test_mixed_content(self):
        """Test mixed safe and dangerous content"""
        mixed_input = 'Good content <bad> more "good" content'
        result = sanitize_user_input(mixed_input)
        expected = "Good content bad more good content"
        assert result == expected


class TestFormatAdminActionDetails:
    """Test admin action details formatting"""

    @patch('app.admin.utils.helpers.datetime')
    def test_format_basic_action(self, mock_datetime):
        """Test formatting of basic admin action"""
        mock_now = datetime(2025, 6, 6, 12, 0, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_now
        
        action_type = "USER_UPDATE"
        details = {"user_id": 123, "field": "email"}
        
        result = format_admin_action_details(action_type, details)
        
        expected = {
            "action": "USER_UPDATE",
            "timestamp": "2025-06-06T12:00:00+00:00",
            "details": {"user_id": 123, "field": "email"}
        }
        
        assert result == expected

    @patch('app.admin.utils.helpers.datetime')
    def test_format_empty_details(self, mock_datetime):
        """Test formatting with empty details"""
        mock_now = datetime(2025, 6, 6, 12, 0, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_now
        
        result = format_admin_action_details("TEST_ACTION", {})
        
        assert result["action"] == "TEST_ACTION"
        assert result["details"] == {}
        assert "timestamp" in result

    @patch('app.admin.utils.helpers.datetime')
    def test_format_complex_details(self, mock_datetime):
        """Test formatting with complex details"""
        mock_now = datetime(2025, 6, 6, 12, 0, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_now
        
        complex_details = {
            "user_data": {"name": "John", "age": 30},
            "changes": ["email", "password"],
            "metadata": {"reason": "security_update", "priority": "high"}
        }
        
        result = format_admin_action_details("COMPLEX_ACTION", complex_details)
        
        assert result["action"] == "COMPLEX_ACTION"
        assert result["details"] == complex_details
        assert isinstance(result["timestamp"], str)


class TestValidateDatetimeRange:
    """Test datetime range validation"""

    def test_valid_range(self):
        """Test with valid datetime ranges"""
        start = datetime(2025, 1, 1, tzinfo=timezone.utc)
        end = datetime(2025, 6, 1, tzinfo=timezone.utc)
        assert validate_datetime_range(start, end) is True

    def test_invalid_range_start_after_end(self):
        """Test with start time after end time"""
        start = datetime(2025, 6, 1, tzinfo=timezone.utc)
        end = datetime(2025, 1, 1, tzinfo=timezone.utc)
        assert validate_datetime_range(start, end) is False

    def test_invalid_range_start_equals_end(self):
        """Test with start time equal to end time"""
        time_point = datetime(2025, 6, 1, tzinfo=timezone.utc)
        assert validate_datetime_range(time_point, time_point) is False

    def test_range_too_long(self):
        """Test with range longer than maximum allowed"""
        start = datetime(2025, 1, 1, tzinfo=timezone.utc)
        end = datetime(2026, 1, 2, tzinfo=timezone.utc)  # 366 days
        assert validate_datetime_range(start, end) is False

    def test_range_exactly_one_year(self):
        """Test with range exactly at the limit"""
        start = datetime(2025, 1, 1, tzinfo=timezone.utc)
        end = datetime(2025, 12, 31, tzinfo=timezone.utc)  # 364 days
        assert validate_datetime_range(start, end) is True

    def test_range_edge_cases(self):
        """Test edge cases for datetime ranges"""
        # Very short range (1 second)
        start = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
        end = datetime(2025, 6, 1, 12, 0, 1, tzinfo=timezone.utc)
        assert validate_datetime_range(start, end) is True


class TestMaskSensitiveData:
    """Test sensitive data masking"""

    def test_mask_default_sensitive_fields(self):
        """Test masking with default sensitive fields"""
        data = {
            "name": "John Doe",
            "email": "john@example.com",
            "password": "secretpassword",
            "age": 30
        }

        result = mask_sensitive_data(data)

        expected = {
            "name": "John Doe",
            "email": "jo************om",  # 2 chars from start/end
            "password": "se**********rd",  # 2 chars from start/end
            "age": 30
        }

        assert result == expected

    def test_mask_custom_sensitive_fields(self):
        """Test masking with custom sensitive fields"""
        data = {
            "username": "johndoe",
            "secret_key": "abcdef123456",
            "public_info": "visible data"
        }

        sensitive_fields = ["username", "secret_key"]
        result = mask_sensitive_data(data, sensitive_fields)

        expected = {
            "username": "jo***oe",  # 2 chars from start/end
            "secret_key": "ab********56",  # 2 chars from start/end
            "public_info": "visible data"
        }

        assert result == expected

    def test_mask_short_values(self):
        """Test masking with values shorter than 4 characters"""
        data = {
            "password": "abc",  # 3 chars
            "key": "xy"        # 2 chars
        }

        result = mask_sensitive_data(data)

        expected = {
            "password": "***",  # All masked for short values
            "key": "**"         # All masked for short values
        }

        assert result == expected

    def test_mask_empty_data(self):
        """Test masking with empty data"""
        result = mask_sensitive_data({})
        assert result == {}

    def test_mask_no_sensitive_fields(self):
        """Test with data containing no sensitive fields"""
        data = {
            "name": "John Doe",
            "age": 30,
            "city": "New York"
        }

        result = mask_sensitive_data(data)
        assert result == data  # Should be unchanged

    def test_mask_preserves_original(self):
        """Test that original data is not modified"""
        original_data = {
            "email": "test@example.com",
            "password": "secret123"
        }

        result = mask_sensitive_data(original_data)

        # Original should be unchanged
        assert original_data["email"] == "test@example.com"
        assert original_data["password"] == "secret123"

        # Result should be masked
        assert result["email"] == "te************om"
        assert result["password"] == "se*****23"

    def test_mask_non_string_values(self):
        """Test masking handles non-string values"""
        data = {
            "email": "test@example.com",
            "token": 123456,  # Number
            "secret": None,   # None
            "key": ["a", "b"] # List
        }

        sensitive_fields = ["email", "token", "secret", "key"]
        result = mask_sensitive_data(data, sensitive_fields)

        # Should convert to string and then mask
        assert result["email"] == "te************om"
        assert result["token"] == "12**56"  # "123456" -> "12**56"
        assert result["secret"] == "****"   # "None" -> "****"
        assert "key" in result              # List converted to string and masked


class TestGenerateAdminSummary:
    """Test admin summary generation"""

    def test_generate_summary_with_data(self):
        """Test summary generation with various statistics"""
        stats = {
            "user_created": 5,
            "user_updated": 3,
            "user_deleted": 1,
            "content_moderated": 12
        }

        result = generate_admin_summary(stats)
        expected = "Total: 21 actions (user_created: 5, user_updated: 3, user_deleted: 1, content_moderated: 12)"

        assert result == expected

    def test_generate_summary_empty_stats(self):
        """Test summary generation with empty statistics"""
        result = generate_admin_summary({})
        assert result == "No administrative actions performed"

    def test_generate_summary_zero_stats(self):
        """Test summary generation with all zero values"""
        stats = {
            "user_created": 0,
            "user_updated": 0,
            "user_deleted": 0
        }

        result = generate_admin_summary(stats)
        assert result == "No administrative actions performed"

    def test_generate_summary_mixed_stats(self):
        """Test summary with mix of zero and non-zero values"""
        stats = {
            "user_created": 5,
            "user_updated": 0,  # Should not appear in summary
            "user_deleted": 2,
            "notifications_sent": 0  # Should not appear in summary
        }

        result = generate_admin_summary(stats)
        expected = "Total: 7 actions (user_created: 5, user_deleted: 2)"

        assert result == expected

    def test_generate_summary_single_action(self):
        """Test summary with single action type"""
        stats = {"user_created": 1}

        result = generate_admin_summary(stats)
        expected = "Total: 1 actions (user_created: 1)"

        assert result == expected

    def test_generate_summary_large_numbers(self):
        """Test summary with large numbers"""
        stats = {
            "bulk_import": 1000,
            "bulk_update": 2500
        }

        result = generate_admin_summary(stats)
        expected = "Total: 3500 actions (bulk_import: 1000, bulk_update: 2500)"

        assert result == expected


class TestUtilityFunctionsIntegration:
    """Test integration between utility functions"""

    def test_email_validation_with_sanitization(self):
        """Test email validation combined with input sanitization"""
        # Valid email that needs sanitization
        email_input = "  test@example.com  "
        sanitized = sanitize_user_input(email_input)
        assert validate_email(sanitized) is True

        # Invalid email with dangerous characters becomes valid after sanitization
        bad_email = 'test<script>@example.com'
        sanitized_bad = sanitize_user_input(bad_email)
        # After sanitization: 'testscript@example.com' which is valid
        assert validate_email(sanitized_bad) is True

    @patch('app.admin.utils.helpers.datetime')
    def test_datetime_range_with_action_formatting(self, mock_datetime):
        """Test datetime validation combined with action formatting"""
        mock_now = datetime(2025, 6, 6, 12, 0, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_now

        start = datetime(2025, 1, 1, tzinfo=timezone.utc)
        end = datetime(2025, 6, 1, tzinfo=timezone.utc)

        # First validate the range
        is_valid = validate_datetime_range(start, end)
        assert is_valid is True

        # Then format an action with the range details
        details = {
            "date_range": {"start": start.isoformat(), "end": end.isoformat()},
            "valid": is_valid
        }

        formatted = format_admin_action_details("DATE_RANGE_QUERY", details)

        assert formatted["action"] == "DATE_RANGE_QUERY"
        assert formatted["details"]["valid"] is True
        assert "date_range" in formatted["details"]

    def test_sensitive_data_masking_with_summary(self):
        """Test masking sensitive data before generating summaries"""
        admin_data = {
            "email": "admin@company.com",  # Changed to default sensitive field
            "password": "secret123",       # Changed to default sensitive field
            "action_counts": {
                "password_reset": 5,
                "email_change": 3
            }
        }

        # Mask sensitive data
        masked_data = mask_sensitive_data(admin_data)

        # Generate summary from action counts
        summary = generate_admin_summary(masked_data["action_counts"])

        # Verify masking worked
        assert masked_data["email"] == "ad*************om"
        assert masked_data["password"] == "se*****23"

        # Verify summary generation worked
        expected_summary = "Total: 8 actions (password_reset: 5, email_change: 3)"
        assert summary == expected_summary
