import pytest
from fastapi import status
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from app.api.v1.routes.quiz import router
from app.quiz_generator.models import Quiz, QuizResult, QuizQuestion, QuestionResult
from fastapi import FastAPI

app = FastAPI()
app.include_router(router)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_user_info():
    return {"uid": "test-user-id"}

@patch("app.api.v1.routes.quiz.get_query_processor")
@patch("app.api.v1.routes.quiz.get_current_user", new_callable=AsyncMock)
def test_generate_exam(mock_get_current_user, mock_get_query_processor, client, mock_user_info):
    mock_get_current_user.return_value = {"uid": "test-user-id"}
    mock_proc = MagicMock()
    mock_proc.generate_exam.return_value = {"quiz_id": "1", "questions": []}
    mock_get_query_processor.return_value = mock_proc
    payload = {
        "query": "test",
        "num_questions": 1,
        "question_type": "MultipleChoice",
        "collection_name": "test_collection",
        "difficulty": "Easy",
        "duration": 10,
        "topic": "Math",
        "domain": "Algebra"
    }
    response = client.post("/quiz", json=payload)
    assert response.status_code == status.HTTP_200_OK
    assert "quiz_id" in response.json()

@patch("app.api.v1.routes.quiz.get_query_processor")
def test_evaluate_answer(mock_get_query_processor, client, mock_user_info):
    mock_proc = MagicMock()
    mock_proc.exam_generator.evaluate_answer.return_value = {
        "question_id": "q1",
        "is_correct": True,
        "score": 1,
        "explanation": "Correct!"
    }
    mock_get_query_processor.return_value = mock_proc
    payload = {"quiz_id": "1", "question_id": "q1", "student_answer": "A"}
    with patch("app.api.v1.routes.quiz.get_current_user", return_value=mock_user_info):
        response = client.post("/evaluate", json=payload)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["is_correct"] is True

# More unit tests can be added for other endpoints, mocking DB and dependencies as needed.
