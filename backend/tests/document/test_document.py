import pytest
from fastapi import status
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.api.v1.routes.document import router
from fastapi import FastAPI

app = FastAPI()
app.include_router(router)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_user_info():
    return {"uid": "test-user-id"}

@patch("app.api.v1.routes.document.get_current_user")
@patch("app.api.v1.routes.document.get_db")
def test_list_collections(mock_get_db, mock_get_current_user, client, mock_user_info):
    mock_get_current_user.return_value = mock_user_info
    mock_col = MagicMock(collection_name="col1", full_collection_name="user_col1", created_at=MagicMock(isoformat=lambda: "2024-01-01T00:00:00"))
    mock_db = MagicMock()
    mock_db.query().filter().all.return_value = [mock_col]
    mock_get_db.return_value = mock_db
    response = client.get("/collections")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()[0]["collection_name"] == "col1"

@patch("app.api.v1.routes.document.get_current_user")
@patch("app.api.v1.routes.document.get_db")
@patch("app.api.v1.routes.document.document_service")
def test_create_collection(mock_document_service, mock_get_db, mock_get_current_user, client, mock_user_info):
    mock_get_current_user.return_value = mock_user_info
    mock_document_service.create_or_update_collection.return_value = "user_col1"
    mock_db = MagicMock()
    mock_get_db.return_value = mock_db
    payload = {"collection_name": "col1"}
    response = client.post("/collections", json=payload)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["full_collection_name"] == "user_col1"

# More unit tests can be added for other endpoints, mocking DB and dependencies as needed.
