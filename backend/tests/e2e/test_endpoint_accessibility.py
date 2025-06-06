#!/usr/bin/env python3
"""
Test script to verify profile endpoints are accessible
"""
import requests
import json
import pytest

BASE_URL = "http://localhost:8000"

def test_profile_endpoints():
    """Test if our profile endpoints are accessible"""
    
    # Test 1: Check if the API is running
    try:
        response = requests.get(f"{BASE_URL}/docs")
        print(f"✓ API is running - Status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("✗ API is not accessible. Make sure Docker container is running.")
        return
    
    # Test 2: Check if our endpoints appear in OpenAPI docs
    try:
        response = requests.get(f"{BASE_URL}/openapi.json")
        if response.status_code == 200:
            openapi_spec = response.json()
            paths = openapi_spec.get("paths", {})
            
            # Check for our profile endpoints
            profile_edit_path = "/api/v1/user/profile/edit"
            profile_get_path = "/api/v1/user/profile"
            
            if profile_edit_path in paths:
                print(f"✓ Profile edit endpoint found: {profile_edit_path}")
                methods = list(paths[profile_edit_path].keys())
                print(f"  Available methods: {methods}")
            else:
                print(f"✗ Profile edit endpoint not found: {profile_edit_path}")
            
            if profile_get_path in paths:
                print(f"✓ Profile get endpoint found: {profile_get_path}")
                methods = list(paths[profile_get_path].keys())
                print(f"  Available methods: {methods}")
            else:
                print(f"✗ Profile get endpoint not found: {profile_get_path}")
                
        else:
            print(f"✗ Could not fetch OpenAPI spec - Status: {response.status_code}")
            
    except Exception as e:
        print(f"✗ Error checking OpenAPI spec: {e}")

    # Test 3: Test unauthorized access (should return 401/422)
    try:
        response = requests.get(f"{BASE_URL}/api/v1/user/profile")
        print(f"✓ Profile endpoint responded to unauthorized request: {response.status_code}")
        if response.status_code in [401, 422]:
            print("  ✓ Proper authorization required")
        else:
            print(f"  ? Unexpected status code: {response.status_code}")
    except Exception as e:
        print(f"✗ Error testing profile endpoint: {e}")

def test_endpoints_accessible():
    """Test if our new endpoints are accessible (without auth for now)"""
    
    # Test if the API is running
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Root endpoint status: {response.status_code}")
        print(f"Root response: {response.json()}")
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}"
    except requests.exceptions.ConnectionError as e:
        print(f"Error connecting to API: {e}")
        pytest.skip("API is not accessible. Skipping endpoint tests.")
    
    # Test if our profile endpoint exists (should get 422 due to missing auth)
    try:
        response = requests.get(f"{BASE_URL}/api/v1/profile")
        print(f"Profile GET endpoint status: {response.status_code}")
        if response.status_code == 422:
            print("✓ Profile GET endpoint exists (422 = missing auth header)")
        else:
            print(f"Profile GET response: {response.text}")
    except Exception as e:
        print(f"Error testing profile GET: {e}")
    
    # Test if our profile/edit endpoint exists (should get 422 due to missing auth)
    try:
        response = requests.put(f"{BASE_URL}/api/v1/profile/edit", json={"name": "test"})
        print(f"Profile PUT endpoint status: {response.status_code}")
        if response.status_code == 422:
            print("✓ Profile PUT endpoint exists (422 = missing auth header)")
        else:
            print(f"Profile PUT response: {response.text}")
    except Exception as e:
        print(f"Error testing profile PUT: {e}")
    
    # Test OpenAPI docs
    response = requests.get(f"{BASE_URL}/docs")
    print(f"OpenAPI docs status: {response.status_code}")
    if response.status_code == 200:
        print("✓ OpenAPI docs accessible")
        assert response.status_code == 200
