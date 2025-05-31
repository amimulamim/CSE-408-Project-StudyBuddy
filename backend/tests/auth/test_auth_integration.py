# tests/auth/test_auth_integration.py

from fastapi.testclient import TestClient
from app.main import app
import pytest

client = TestClient(app)

@pytest.fixture
def fake_token(monkeypatch):
    def mock_verify_id_token(token):
        return {"uid": "mock123", "email": "test@email.com", "name": "Test User"}
    
    monkeypatch.setattr("app.auth.firebase_auth.auth.verify_id_token", mock_verify_id_token)
    return "mocked_token"

def test_login_creates_user(fake_token):
    response = client.post("/api/v1/auth/login", headers={
        "Authorization": f"Bearer {fake_token}"
    })
    assert response.status_code == 200
    assert response.json()["email"] == "test@email.com"

# def test_profile_update(fake_token):
#     update_payload = {"name": "Updated User"}
#     response = client.put("/api/v1/user/profile", headers={
#         "Authorization": f"Bearer {fake_token}"
#     }, json=update_payload)
#     assert response.status_code == 200
#     assert response.json()["name"] == "Updated User"
