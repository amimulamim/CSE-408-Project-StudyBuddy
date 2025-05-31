import pytest
from unittest.mock import Mock, patch
from app.users.service import parse_interests_operations, get_user_by_uid
from app.users.model import User


class TestUserService:
    """Test user service functions"""

    def test_parse_interests_operations_add_new(self):
        """Test adding new interests"""
        current = ["math", "physics"]
        result = parse_interests_operations("+chemistry,+biology", current)
        expected = ["math", "physics", "chemistry", "biology"]
        assert result == expected

    def test_parse_interests_operations_remove_existing(self):
        """Test removing existing interests"""
        current = ["math", "physics", "chemistry"]
        result = parse_interests_operations("-physics", current)
        expected = ["math", "chemistry"]
        assert result == expected

    def test_parse_interests_operations_mixed(self):
        """Test mixed add/remove operations"""
        current = ["math", "physics"]
        result = parse_interests_operations("+quantum physics,-math,thermodynamics", current)
        expected = ["physics", "quantum physics", "thermodynamics"]
        assert result == expected

    def test_parse_interests_operations_empty(self):
        """Test empty interests string"""
        current = ["math", "physics"]
        result = parse_interests_operations("", current)
        assert result == current

    def test_parse_interests_operations_no_duplicates(self):
        """Test that duplicates are not added"""
        current = ["math", "physics"]
        result = parse_interests_operations("+math,+physics,+chemistry", current)
        expected = ["math", "physics", "chemistry"]
        assert result == expected

    def test_parse_interests_operations_remove_nonexistent(self):
        """Test removing non-existent interest (should be ignored)"""
        current = ["math", "physics"]
        result = parse_interests_operations("-chemistry", current)
        assert result == current

    def test_get_user_by_uid_success(self):
        """Test getting user by UID successfully"""
        mock_db = Mock()
        mock_user = Mock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = mock_user
        
        result = get_user_by_uid(mock_db, "test-uid")
        
        assert result == mock_user
        mock_db.query.assert_called_with(User)

    def test_get_user_by_uid_not_found(self):
        """Test getting user by UID when user doesn't exist"""
        mock_db = Mock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = None
        
        result = get_user_by_uid(mock_db, "nonexistent-uid")
        
        assert result is None
