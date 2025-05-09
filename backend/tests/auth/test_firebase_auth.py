# tests/auth/test_firebase_auth.py

import pytest
from app.auth.service import extract_token

def test_extract_token_valid():
    header = "Bearer test_token_123"
    assert extract_token(header) == "test_token_123"

def test_extract_token_missing_prefix():
    header = "InvalidToken test_token_123"
    with pytest.raises(ValueError):
        extract_token(header)

def test_extract_token_empty():
    with pytest.raises(ValueError):
        extract_token("")
