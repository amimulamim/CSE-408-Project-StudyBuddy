import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone

from app.users.service import update_user_profile_secure
from app.users.schema import SecureProfileEdit
from app.users.model import User


class TestUserProfileService:
    """Test user profile service functions including secure profile updates"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    @pytest.fixture
    def sample_user(self):
        """Sample user for testing"""
        user = User(
            uid="test-uid",
            email="test@example.com",
            name="Test User",
            bio="Original bio",
            institution="Original University",
            role="student",
            avatar="",
            current_plan="free",
            location="Original City",
            study_domain="Computer Science",
            is_admin=False,
            is_moderator=False
        )
        user.interests = ["programming", "web development"]
        return user

    def test_update_user_profile_secure_basic_fields(self, mock_db, sample_user):
        """Test updating basic profile fields"""
        # Arrange
        profile_data = SecureProfileEdit(
            name="Updated Name",
            bio="Updated bio",
            institution="Updated University",
            role="teacher",
            location="Updated City",
            study_domain="Data Science"
        )

        # Mock the query chain to return sample_user
        mock_db.query.return_value.filter_by.return_value.first.return_value = sample_user
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        # Act
        with patch('app.users.service.log_profile_change') as mock_log:
            result = update_user_profile_secure(mock_db, "test-uid", profile_data)

        # Assert
        assert result is not None
        assert result.name == "Updated Name"
        assert result.bio == "Updated bio"
        assert result.institution == "Updated University"
        assert result.role == "teacher"
        assert result.location == "Updated City"
        assert result.study_domain == "Data Science"

        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(sample_user)
        mock_log.assert_called_once()

    def test_update_profile_with_interest_array_operations(self, mock_db, sample_user):
        """Test interests array manipulation with add/remove syntax"""
        # Arrange
        profile_data = SecureProfileEdit(
            interests="+machine learning,-web development,data science"
        )
        
        mock_db.query.return_value.filter_by.return_value.first.return_value = sample_user
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        # Act
        result = update_user_profile_secure(mock_db, "test-uid", profile_data)

        # Assert
        assert result is not None
        # Should have: original "programming", removed "web development", added "machine learning" and "data science"
        expected_interests = ["programming", "machine learning", "data science"]
        assert set(result.interests) == set(expected_interests)

    def test_update_profile_replace_all_interests(self, mock_db, sample_user):
        """Test replacing all interests without add/remove syntax"""
        # Arrange
        profile_data = SecureProfileEdit(
            interests="ai,machine learning,data science"
        )
        
        mock_db.query.return_value.filter_by.return_value.first.return_value = sample_user
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        # Act
        result = update_user_profile_secure(mock_db, "test-uid", profile_data)

        # Assert
        assert result is not None
        # Plain text interests are added to existing ones
        expected_interests = ["programming", "web development", "ai", "machine learning", "data science"]
        assert set(result.interests) == set(expected_interests)

    def test_moderator_self_assignment(self, mock_db, sample_user):
        """Test user can volunteer to become moderator"""
        # Arrange
        profile_data = SecureProfileEdit(is_moderator=True)
        
        mock_db.query.return_value.filter_by.return_value.first.return_value = sample_user
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        # Act
        result = update_user_profile_secure(mock_db, "test-uid", profile_data)

        # Assert
        assert result is not None
        assert result.is_moderator is True

    def test_moderator_self_removal(self, mock_db, sample_user):
        """Test user can remove themselves from moderator status"""
        # Arrange
        sample_user.is_moderator = True  # Start as moderator
        profile_data = SecureProfileEdit(is_moderator=False)
        
        mock_db.query.return_value.filter_by.return_value.first.return_value = sample_user
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        # Act
        result = update_user_profile_secure(mock_db, "test-uid", profile_data)

        # Assert
        assert result is not None
        assert result.is_moderator is False

    def test_update_user_profile_secure_user_not_found(self, mock_db):
        """Test updating profile when user doesn't exist"""
        # Arrange
        profile_data = SecureProfileEdit(name="Updated Name")
        mock_db.query.return_value.filter_by.return_value.first.return_value = None

        # Act
        result = update_user_profile_secure(mock_db, "nonexistent-uid", profile_data)

        # Assert
        assert result is None
        mock_db.commit.assert_not_called()

    def test_update_user_profile_secure_partial_update(self, mock_db, sample_user):
        """Test updating only some fields (partial update)"""
        # Arrange
        profile_data = SecureProfileEdit(name="Updated Name Only")
        
        mock_db.query.return_value.filter_by.return_value.first.return_value = sample_user
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        # Act
        result = update_user_profile_secure(mock_db, "test-uid", profile_data)

        # Assert
        assert result is not None
        assert result.name == "Updated Name Only"
        # Other fields should remain unchanged
        assert result.bio == "Original bio"
        assert result.institution == "Original University"

    def test_update_user_profile_secure_empty_interests(self, mock_db, sample_user):
        """Test updating with empty interests string"""
        # Arrange
        profile_data = SecureProfileEdit(interests="")
        
        mock_db.query.return_value.filter_by.return_value.first.return_value = sample_user
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        # Act
        result = update_user_profile_secure(mock_db, "test-uid", profile_data)

        # Assert
        assert result is not None
        # Empty string should not change existing interests
        assert result.interests == ["programming", "web development"]

    def test_update_user_profile_secure_interests_with_whitespace(self, mock_db, sample_user):
        """Test interests with extra whitespace are properly cleaned"""
        # Arrange
        profile_data = SecureProfileEdit(
            interests="  ai  , machine learning ,  data science  "
        )
        
        mock_db.query.return_value.filter_by.return_value.first.return_value = sample_user
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        # Act
        result = update_user_profile_secure(mock_db, "test-uid", profile_data)

        # Assert
        assert result is not None
        # Should add new interests to existing ones, with whitespace cleaned
        expected_interests = ["programming", "web development", "ai", "machine learning", "data science"]
        assert set(result.interests) == set(expected_interests)

    def test_update_user_profile_secure_interests_deduplication(self, mock_db, sample_user):
        """Test that duplicate interests are removed"""
        # Arrange
        profile_data = SecureProfileEdit(
            interests="ai,machine learning,ai,data science,machine learning"
        )
        
        mock_db.query.return_value.filter_by.return_value.first.return_value = sample_user
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        # Act
        result = update_user_profile_secure(mock_db, "test-uid", profile_data)

        # Assert
        assert result is not None
        # Should add new interests and deduplicate them
        expected_interests = ["programming", "web development", "ai", "machine learning", "data science"]
        assert set(result.interests) == set(expected_interests)

    def test_update_user_profile_secure_database_error(self, mock_db, sample_user):
        """Test handling database errors during update"""
        # Arrange
        profile_data = SecureProfileEdit(name="Updated Name")
        
        mock_db.query.return_value.filter_by.return_value.first.return_value = sample_user
        mock_db.commit.side_effect = Exception("Database error")

        # Act & Assert
        with pytest.raises(Exception, match="Database error"):
            update_user_profile_secure(mock_db, "test-uid", profile_data)
