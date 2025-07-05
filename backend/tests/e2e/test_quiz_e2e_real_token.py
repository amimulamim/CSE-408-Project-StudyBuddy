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

def test_quiz_lifecycle_with_real_token():
    token = get_id_token(FIREBASE_TEST_EMAIL, FIREBASE_TEST_PASSWORD, FIREBASE_API_KEY)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create collection
    payload = {"collection_name": "e2e_collection"}
    response = client.post("/api/v1/document/collections", json=payload, headers=headers)
    assert response.status_code in (200, 409)

    # 2. Generate a quiz
    payload = {
        "query": "test",
        "num_questions": 1,
        "question_type": "MultipleChoice",
        "collection_name": "e2e_collection",
        "difficulty": "Easy",
        "duration": 10,
        "topic": "Science",
        "domain": "Physics"
    }
    response = client.post("/api/v1/quiz", json=payload, headers=headers)
    assert response.status_code == 200
    quiz_id = response.json().get("quiz_id")
    assert quiz_id

    # 3. Get quiz for taking
    response = client.get(f"/api/v1/quizzes/{quiz_id}?take=true", headers=headers)
    assert response.status_code == 200
    assert "questions" in response.json()

    # 4. Submit answers (simulate evaluate_all)
    answers = [{
        "question_id": q["question_id"],
        "student_answer": "A"
    } for q in response.json()["questions"]]
    response = client.post(f"/api/v1/quizzes/{quiz_id}/evaluate_all", json={"quiz_id": quiz_id, "answers": answers}, headers=headers)
    assert response.status_code == 200
    assert "score" in response.json()

    # 5. Complete quiz
    response = client.post(f"/api/v1/quizzes/{quiz_id}/submit", json={"topic": "Science", "domain": "Physics"}, headers=headers)
    assert response.status_code in (200, 400)

    # 6. Get quiz result
    response = client.get(f"/api/v1/quizzes/{quiz_id}/result", headers=headers)
    assert response.status_code == 200
    assert "score" in response.json()

    # 7. Get all quizzes
    response = client.get("/api/v1/quizzes", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

    # 8. Get quiz marks
    response = client.get("/api/v1/quiz-marks", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
