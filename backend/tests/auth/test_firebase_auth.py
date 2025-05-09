from app.auth.service import get_user_from_token
from app.users.schema import UserBase
from unittest.mock import patch
import pytest

@patch("app.auth.firebase_auth.auth.verify_id_token")
def test_get_user_from_token_valid(mock_verify):
    mock_verify.return_value = {
        "uid": "123", "email": "test@x.com", "name": "X", "picture": "img"
    }
    token = "dummy"
    user = get_user_from_token(token)
    assert isinstance(user, UserBase)
    assert user.email == "test@x.com"

@patch("app.auth.firebase_auth.auth.verify_id_token", side_effect=Exception)
def test_get_user_from_token_invalid(mock_verify):
    with pytest.raises(Exception):
        get_user_from_token("bad-token")
