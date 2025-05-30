import pytest
from unittest.mock import Mock, patch
from app.users.service import parse_interests_operations, get_user_by_uid, update_user_profile
from app.users.schema import ProfileEditRequest
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

    @patch('app.users.service.get_user_by_uid')
    def test_update_user_profile_success(self, mock_get_user):
        """Test updating user profile successfully"""
        # Setup
        mock_db = Mock()
        mock_user = Mock()
        mock_user.interests = ["math", "physics"]
        mock_get_user.return_value = mock_user
        
        profile_data = ProfileEditRequest(
            name="John Doe",
            study_domain="Computer Science",
            interests="+programming,-physics"
        )
        
        # Execute
        result = update_user_profile(mock_db, "test-uid", profile_data)
        
        # Assert
        assert result == mock_user
        assert mock_user.name == "John Doe"
        assert mock_user.study_domain == "Computer Science"
        assert mock_user.interests == ["math", "programming"]
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(mock_user)

    @patch('app.users.service.get_user_by_uid')
    def test_update_user_profile_user_not_found(self, mock_get_user):
        """Test updating profile when user doesn't exist"""
        mock_db = Mock()
        mock_get_user.return_value = None
        
        profile_data = ProfileEditRequest(name="John Doe")
        
        result = update_user_profile(mock_db, "nonexistent-uid", profile_data)
        
        assert result is None
        mock_db.commit.assert_not_called()

    @patch('app.users.service.get_user_by_uid')
    def test_update_user_profile_interests_only(self, mock_get_user):
        """Test updating only interests field"""
        mock_db = Mock()
        mock_user = Mock()
        mock_user.interests = ["math", "physics", "chemistry"]
        mock_get_user.return_value = mock_user
        
        profile_data = ProfileEditRequest(interests="+biology,-chemistry")
        
        result = update_user_profile(mock_db, "test-uid", profile_data)
        
        assert result == mock_user
        assert mock_user.interests == ["math", "physics", "biology"]

    @patch('app.users.service.get_user_by_uid')
    def test_update_user_profile_database_error(self, mock_get_user):
        """Test handling database error during profile update"""
        mock_db = Mock()
        mock_user = Mock()
        mock_user.interests = ["math"]
        mock_get_user.return_value = mock_user
        mock_db.commit.side_effect = Exception("Database error")
        
        profile_data = ProfileEditRequest(name="John Doe")
        
        with pytest.raises(Exception):
            update_user_profile(mock_db, "test-uid", profile_data)
        
        mock_db.rollback.assert_called_once()
