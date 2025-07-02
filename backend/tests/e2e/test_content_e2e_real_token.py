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

def test_content_lifecycle_with_real_token():
    token = get_id_token(FIREBASE_TEST_EMAIL, FIREBASE_TEST_PASSWORD, FIREBASE_API_KEY)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create collection for content
    payload = {"collection_name": "e2e_content_collection"}
    response = client.post("/api/v1/document/collections", json=payload, headers=headers)
    assert response.status_code in (200, 409)

    # 2. Generate content (flashcards)
    payload = {
        "contentType": "flashcards",
        "contentTopic": "Biology",
        "difficulty": "easy",
        "length": "short",
        "tone": "instructive",
        "collection_name": "e2e_content_collection"
    }
    response = client.post("/api/v1/content/generate", json=payload, headers=headers)
    assert response.status_code == 200
    content_id = response.json().get("contentId")
    assert content_id

    # 3. Get content by ID
    response = client.get(f"/api/v1/content/{content_id}", headers=headers)
    assert response.status_code == 200
    assert "content" in response.json()

    # 4. Update topic
    response = client.patch(f"/api/v1/content/topic/{content_id}", json={"topic": "NewTopic"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["topic"] == "NewTopic"

    # 5. Delete content
    response = client.delete(f"/api/v1/content/{content_id}", headers=headers)
    assert response.status_code == 200
    assert "deleted" in response.json().get("message", "") or "successfully" in response.json().get("message", "")

    # 6. Get user content
    response = client.get("/api/v1/content/user", headers=headers)
    assert response.status_code == 200
    assert "contents" in response.json()
