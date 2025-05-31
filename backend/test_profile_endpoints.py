#!/usr/bin/env python3
"""
Test script for profile endpoints
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.users.service import parse_interests_operations

def test_interests_parsing():
    """Test the interests parsing function"""
    print("Testing interests parsing...")
    
    # Test case 1: Adding new interests
    current = ["math", "physics"]
    result = parse_interests_operations("+chemistry,+biology", current)
    expected = ["math", "physics", "chemistry", "biology"]
    assert result == expected, f"Expected {expected}, got {result}"
    print("✓ Adding new interests works")
    
    # Test case 2: Removing interests
    current = ["math", "physics", "chemistry"]
    result = parse_interests_operations("-physics,+biology", current)
    expected = ["math", "chemistry", "biology"]
    assert result == expected, f"Expected {expected}, got {result}"
    print("✓ Removing interests works")
    
    # Test case 3: Mixed operations
    current = ["math", "physics"]
    result = parse_interests_operations("+quantum physics,-math,thermodynamics", current)
    expected = ["physics", "quantum physics", "thermodynamics"]
    assert result == expected, f"Expected {expected}, got {result}"
    print("✓ Mixed operations work")
    
    # Test case 4: Empty string
    current = ["math", "physics"]
    result = parse_interests_operations("", current)
    expected = ["math", "physics"]
    assert result == expected, f"Expected {expected}, got {result}"
    print("✓ Empty string handling works")
    
    # Test case 5: Duplicate prevention
    current = ["math", "physics"]
    result = parse_interests_operations("+math,+physics,+chemistry", current)
    expected = ["math", "physics", "chemistry"]
    assert result == expected, f"Expected {expected}, got {result}"
    print("✓ Duplicate prevention works")
    
    print("All tests passed! ✅")

if __name__ == "__main__":
    test_interests_parsing()
