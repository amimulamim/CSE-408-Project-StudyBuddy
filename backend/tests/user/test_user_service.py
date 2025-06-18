import pytest
from unittest.mock import Mock, patch
from app.users.service import parse_interests_operations, get_user_by_uid, update_user_avatar
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

    def test_update_user_avatar_success(self):
        """Test updating user avatar successfully"""
        
        mock_db = Mock()
        mock_user = Mock()
        mock_user.avatar = "old_avatar_url"
        
        # Mock get_user_by_uid to return our mock user
        with patch('app.users.service.get_user_by_uid') as mock_get_user, \
             patch('app.users.service.log_profile_change') as mock_log:
            
            mock_get_user.return_value = mock_user
            
            result = update_user_avatar(mock_db, "test-uid", "new_avatar_url")
            
            assert result == mock_user
            assert mock_user.avatar == "new_avatar_url"
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once_with(mock_user)
            mock_log.assert_called_once_with(
                "test-uid", 
                {"avatar": {"old": "old_avatar_url", "new": "new_avatar_url"}}, 
                "avatar_update"
            )

    def test_update_user_avatar_user_not_found(self):
        """Test updating avatar when user doesn't exist"""
        
        mock_db = Mock()
        
        with patch('app.users.service.get_user_by_uid') as mock_get_user:
            mock_get_user.return_value = None
            
            result = update_user_avatar(mock_db, "nonexistent-uid", "new_avatar_url")
            
            assert result is None
            mock_db.commit.assert_not_called()

    def test_update_user_avatar_database_error(self):
        """Test updating avatar with database error"""
        
        mock_db = Mock()
        mock_user = Mock()
        mock_user.avatar = "old_avatar_url"
        mock_db.commit.side_effect = Exception("Database error")
        
        with patch('app.users.service.get_user_by_uid') as mock_get_user:
            mock_get_user.return_value = mock_user
            
            with pytest.raises(Exception, match="Database error"):
                update_user_avatar(mock_db, "test-uid", "new_avatar_url")
            
            mock_db.rollback.assert_called_once()
