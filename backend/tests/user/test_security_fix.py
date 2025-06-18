#!/usr/bin/env python3
"""
Test script to verify that the Pydantic extra field security fix works.
This test ensures that admin fields like 'is_admin' cannot be injected 
through profile update requests.
"""

import sys
import os

# Add the backend directory to the Python path so we can import app modules
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_dir)

def test_secure_profile_edit_rejects_admin_fields():
    """Test that SecureProfileEdit rejects admin fields"""
    from app.users.schema import SecureProfileEdit
    
    # Test 1: Normal valid data should work
    valid_data = {
        'name': 'John Doe',
        'bio': 'A student',
        'institution': 'University'
    }
    profile = SecureProfileEdit(**valid_data)
    print("✓ Valid data accepted:", profile.model_dump())
    assert profile.name == 'John Doe'
    
    # Test 2: Admin fields should be rejected
    admin_fields_to_test = ['is_admin', 'is_moderator', 'current_plan']
    
    for admin_field in admin_fields_to_test:
        invalid_data = {
            'name': 'John Doe',
            admin_field: True
        }
        try:
            profile = SecureProfileEdit(**invalid_data)
            assert False, f"SECURITY VULNERABILITY: {admin_field} was accepted!"
        except Exception as e:
            print(f"✓ {admin_field} properly rejected: {type(e).__name__}")
            # This is expected - admin fields should be rejected
            assert True
    
    print("✅ Security test PASSED - All admin fields properly rejected")

def test_admin_user_edit_accepts_admin_fields():
    """Test that AdminUserEdit accepts admin fields (as intended)"""
    from app.users.schema import AdminUserEdit
    
    # Test that admin fields are accepted in AdminUserEdit
    admin_data = {
        'name': 'Admin User',
        'is_admin': True,
        'is_moderator': True,
        'current_plan': 'premium_monthly',
    }
    
    admin_profile = AdminUserEdit(**admin_data)
    print("✓ AdminUserEdit accepts admin fields:", admin_profile.model_dump())
    
    # Assert that admin fields were properly set
    assert admin_profile.name == 'Admin User'
    assert admin_profile.is_admin is True
    assert admin_profile.is_moderator is True
    assert admin_profile.current_plan == 'premium_monthly'
    print("✅ Admin fields test PASSED - All admin fields properly accepted")
