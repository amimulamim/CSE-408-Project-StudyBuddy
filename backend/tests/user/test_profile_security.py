"""
Tests for user profile security.
This test ensures that admin fields like 'is_admin' cannot be injected 
through profile update requests.
"""

import pytest
from pydantic import ValidationError


class TestUserProfileSecurity:
    """Test profile security validations"""

    def test_secure_profile_edit_rejects_admin_fields(self):
        """Test that SecureProfileEdit rejects admin fields"""
        from app.users.schema import SecureProfileEdit
        
        # Test 1: Normal valid data should work
        valid_data = {
            'name': 'John Doe',
            'bio': 'A student',
            'institution': 'University'
        }
        profile = SecureProfileEdit(**valid_data)
        assert profile.name == 'John Doe'
        
        # Test 2: Dangerous admin fields should be rejected
        dangerous_admin_fields = ['is_admin', 'current_plan']
        
        for admin_field in dangerous_admin_fields:
            invalid_data = {
                'name': 'John Doe',
                admin_field: True
            }
            with pytest.raises((ValidationError, TypeError)):
                SecureProfileEdit(**invalid_data)
                
        # Test 3: is_moderator is allowed (users can volunteer to be moderators)
        moderator_data = {
            'name': 'John Doe',
            'is_moderator': True
        }
        profile = SecureProfileEdit(**moderator_data)
        assert profile.is_moderator is True

    def test_admin_user_edit_accepts_admin_fields(self):
        """Test that AdminUserEdit accepts admin fields (as intended)"""
        from app.users.schema import AdminUserEdit
        
        # Admin schema should accept admin fields
        admin_data = {
            'name': 'Admin User',
            'is_admin': True,
            'is_moderator': True,
            'current_plan': 'premium_monthly'
        }
        admin_edit = AdminUserEdit(**admin_data)
        assert admin_edit.is_admin is True
        assert admin_edit.is_moderator is True
        assert admin_edit.current_plan == 'premium_monthly'

    def test_regular_user_cannot_escalate_privileges(self):
        """Test that regular users cannot escalate their privileges"""
        from app.users.schema import SecureProfileEdit
        
        # Test with dangerous privilege escalation attempts
        dangerous_escalation_attempts = [
            {'is_admin': True},
            {'current_plan': 'premium_monthly'}
        ]
        
        for attempt in dangerous_escalation_attempts:
            attempt.update({'name': 'Test User'})  # Add required field
            with pytest.raises((ValidationError, TypeError)):
                SecureProfileEdit(**attempt)
                
        # Test that is_moderator is allowed (users can volunteer)
        moderator_data = {'name': 'Test User', 'is_moderator': True}
        profile = SecureProfileEdit(**moderator_data)
        assert profile.is_moderator is True
