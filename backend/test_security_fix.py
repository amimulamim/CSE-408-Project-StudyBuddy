#!/usr/bin/env python3
"""
Test script to verify that the Pydantic extra field security fix works.
This test ensures that admin fields like 'is_admin' cannot be injected 
through profile update requests.
"""

import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_secure_profile_edit_rejects_admin_fields():
    """Test that SecureProfileEdit rejects admin fields"""
    try:
        from app.users.schema import SecureProfileEdit
        
        # Test 1: Normal valid data should work
        try:
            valid_data = {
                'name': 'John Doe',
                'bio': 'A student',
                'institution': 'University'
            }
            profile = SecureProfileEdit(**valid_data)
            print("✓ Valid data accepted:", profile.model_dump())
        except Exception as e:
            print("✗ Valid data rejected:", str(e))
            return False
        
        # Test 2: Admin fields should be rejected
        admin_fields_to_test = ['is_admin', 'is_moderator', 'current_plan']
        
        for admin_field in admin_fields_to_test:
            try:
                invalid_data = {
                    'name': 'John Doe',
                    admin_field: True
                }
                profile = SecureProfileEdit(**invalid_data)
                print(f"✗ SECURITY VULNERABILITY: {admin_field} was accepted!")
                return False
            except Exception as e:
                print(f"✓ {admin_field} properly rejected: {type(e).__name__}")
        
        print("✅ Security test PASSED - All admin fields properly rejected")
        return True
        
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False

def test_admin_user_edit_accepts_admin_fields():
    """Test that AdminUserEdit accepts admin fields (as intended)"""
    try:
        from app.users.schema import AdminUserEdit
        
        # Test that admin fields are accepted in AdminUserEdit
        admin_data = {
            'name': 'Admin User',
            'is_admin': True,
            'is_moderator': True,
            'current_plan': 'premium'
        }
        
        try:
            admin_profile = AdminUserEdit(**admin_data)
            print("✓ AdminUserEdit accepts admin fields:", admin_profile.model_dump())
            return True
        except Exception as e:
            print("✗ AdminUserEdit rejected admin fields:", str(e))
            return False
            
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False

if __name__ == "__main__":
    print("=== Security Fix Verification Test ===")
    print()
    
    test1_result = test_secure_profile_edit_rejects_admin_fields()
    print()
    test2_result = test_admin_user_edit_accepts_admin_fields()
    print()
    
    if test1_result and test2_result:
        print("🔒 ALL SECURITY TESTS PASSED - Vulnerability is fixed!")
        sys.exit(0)
    else:
        print("⚠️  SECURITY TESTS FAILED - Vulnerability may still exist!")
        sys.exit(1)
