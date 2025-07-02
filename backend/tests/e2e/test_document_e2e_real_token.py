import os
import requests
import pytest
from fastapi.testclient import TestClient
from app.main import app

FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
FIREBASE_TEST_EMAIL = os.getenv("FIREBASE_TEST_EMAIL")
FIREBASE_TEST_PASSWORD = os.getenv("FIREBASE_TEST_PASSWORD")


def get_id_token(email, password, api_key):
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    res = requests.post(url, json=payload)
    res.raise_for_status()
    return res.json()["idToken"]

client = TestClient(app)

def test_document_collection_lifecycle_with_real_token():
    token = get_id_token(FIREBASE_TEST_EMAIL, FIREBASE_TEST_PASSWORD, FIREBASE_API_KEY)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create collection
    payload = {"collection_name": "e2e_document_collection"}
    response = client.post("/api/v1/document/collections", json=payload, headers=headers)
    assert response.status_code in (200, 409)

    # 2. List collections
    response = client.get("/api/v1/document/collections", headers=headers)
    assert response.status_code == 200
    assert any(c["collection_name"] == "e2e_document_collection" for c in response.json())

    # 3. Delete collection
    response = client.delete(f"/api/v1/document/collections/e2e_document_collection", headers=headers)
    assert response.status_code in (200, 404)  # 404 if already deleted
    if response.status_code == 200:
        assert "deleted" in response.json().get("message", "")
