import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
import uuid
from datetime import datetime, timezone

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.auth.firebase_auth import get_current_user
    from app.core.database import get_db
    from app.quiz_generator.models import Quiz, QuizQuestion, QuizResult, QuestionResult, QuestionType, DifficultyLevel

client = TestClient(app)


class TestQuizRoutes:
    """Test quiz API routes"""

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Setup and cleanup for each test"""
        # Clear any existing dependency overrides
        app.dependency_overrides.clear()
        yield
        # Cleanup after test
        app.dependency_overrides.clear()

    def mock_get_current_user(self, uid="test-user-123"):
        """Helper to create mock current user"""
        def _mock():
            return {"uid": uid, "email": "test@example.com"}
        return _mock

    def mock_get_db(self):
        """Helper to create mock database session"""
        def _mock():
            return Mock()
        return _mock

    def test_generate_exam_success(self):
        """Test successful exam generation"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = self.mock_get_db()

        # Mock QueryProcessor
        with patch('app.api.v1.routes.quiz.get_query_processor') as mock_get_processor:
            mock_processor = Mock()
            mock_processor.generate_exam = AsyncMock(return_value={
                "quiz_id": "quiz-123",
                "questions": [
                    {
                        "question_id": "q1",
                        "question": "What is Python?",
                        "type": "MultipleChoice",
                        "options": ["Language", "Snake", "Tool", "Framework"],
                        "difficulty": "Easy",
                        "marks": 2
                    }
                ]
            })
            mock_get_processor.return_value = mock_processor

            # Make request to the correct endpoint
            response = client.post("/api/v1/quiz/quiz", json={
                "query": "Python programming",
                "num_questions": 5,
                "question_type": "multiple_choice",
                "collection_name": "test-collection",
                "difficulty": "Easy",
                "duration": 30,
                "topic": "Python",
                "domain": "Programming"
            })

            # Assertions
            assert response.status_code == 200
            data = response.json()
            assert data["quiz_id"] == "quiz-123"
            assert len(data["questions"]) == 1
            mock_processor.generate_exam.assert_called_once()

    def test_generate_exam_exception(self):
        """Test exam generation with exception"""
        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = self.mock_get_db()

        with patch('app.api.v1.routes.quiz.get_query_processor') as mock_get_processor:
            mock_processor = Mock()
            mock_processor.generate_exam = AsyncMock(side_effect=Exception("Generation failed"))
            mock_get_processor.return_value = mock_processor

            response = client.post("/api/v1/quiz/quiz", json={
                "query": "Python programming",
                "num_questions": 5,
                "question_type": "multiple_choice",
                "collection_name": "test-collection",
                "difficulty": "Easy",
                "duration": 30,
                "topic": "Python",
                "domain": "Programming"
            })

            assert response.status_code == 500
            assert "internal server error" in response.json()["detail"].lower()

    def test_evaluate_answer_success(self):
        """Test successful answer evaluation"""
        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = self.mock_get_db()

        with patch('app.api.v1.routes.quiz.get_query_processor') as mock_get_processor:
            mock_processor = Mock()
            mock_exam_generator = Mock()
            mock_exam_generator.evaluate_answer.return_value = {
                "question_id": "q1",
                "is_correct": True,
                "score": 2.0,
                "explanation": "Correct answer"
            }
            mock_processor.exam_generator = mock_exam_generator
            mock_get_processor.return_value = mock_processor

            response = client.post("/api/v1/quiz/evaluate", json={
                "quiz_id": "quiz-123",
                "question_id": "q1",
                "student_answer": "0"
            })

            assert response.status_code == 200
            data = response.json()
            assert data["question_id"] == "q1"
            assert data["is_correct"] is True
            assert data["score"] == pytest.approx(2.0)
            assert data["explanation"] == "Correct answer"

    def test_evaluate_answer_exception(self):
        """Test answer evaluation with exception"""
        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = self.mock_get_db()

        with patch('app.api.v1.routes.quiz.get_query_processor') as mock_get_processor:
            mock_processor = Mock()
            mock_exam_generator = Mock()
            mock_exam_generator.evaluate_answer.side_effect = Exception("Evaluation failed")
            mock_processor.exam_generator = mock_exam_generator
            mock_get_processor.return_value = mock_processor

            response = client.post("/api/v1/quiz/evaluate", json={
                "quiz_id": "quiz-123",
                "question_id": "q1",
                "student_answer": "0"
            })

            assert response.status_code == 500
            assert "internal server error" in response.json()["detail"].lower()

    def test_delete_exam_success(self):
        """Test successful exam deletion"""
        mock_db = Mock()
        mock_quiz = Mock()
        mock_quiz.user_id = "test-user-123"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_quiz

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        with patch('app.api.v1.routes.quiz.get_query_processor') as mock_get_processor:
            mock_processor = Mock()
            mock_processor.delete_exam = AsyncMock()
            mock_get_processor.return_value = mock_processor

            response = client.delete("/api/v1/quiz/quizzes/quiz-123")

            assert response.status_code == 200
            data = response.json()
            assert "deleted successfully" in data["message"]
            mock_processor.delete_exam.assert_called_once_with("quiz-123", mock_db)

    def test_delete_exam_not_found(self):
        """Test deleting non-existent exam"""
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.delete("/api/v1/quiz/quizzes/quiz-123")

        assert response.status_code == 404
        assert "Exam not found" in response.json()["detail"]

    def test_delete_exam_unauthorized(self):
        """Test deleting exam from different user"""
        mock_db = Mock()
        mock_quiz = Mock()
        mock_quiz.user_id = "different-user"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_quiz

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.delete("/api/v1/quiz/quizzes/quiz-123")

        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]

    def test_complete_quiz_success(self):
        """Test successful quiz completion"""
        mock_db = Mock()

        # Mock quiz
        mock_quiz = Mock()
        mock_quiz.user_id = "test-user-123"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_quiz

        # Mock question results
        mock_question_result1 = Mock()
        mock_question_result1.score = 2.0
        mock_question_result2 = Mock()
        mock_question_result2.score = 1.5
        mock_db.query.return_value.filter.return_value.all.return_value = [
            mock_question_result1, mock_question_result2
        ]

        # Mock questions for total calculation
        mock_question1 = Mock()
        mock_question1.marks = 2.0
        mock_question2 = Mock()
        mock_question2.marks = 2.0

        # Setup different returns for different queries
        def mock_query(model):
            mock_query_obj = Mock()
            if model == Quiz:
                mock_query_obj.filter.return_value.first.return_value = mock_quiz
            elif model == QuestionResult:
                mock_query_obj.filter.return_value.all.return_value = [
                    mock_question_result1, mock_question_result2
                ]
            elif model == QuizQuestion:
                mock_query_obj.filter.return_value.all.return_value = [
                    mock_question1, mock_question2
                ]
            return mock_query_obj

        mock_db.query.side_effect = mock_query

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.post("/api/v1/quiz/quizzes/quiz-123/submit", json={
            "topic": "Python",
            "domain": "Programming",
            "feedback": "Great quiz!"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["quiz_id"] == "quiz-123"
        assert data["score"] == pytest.approx(3.5)
        assert data["total"] == pytest.approx(4.0)

    def test_complete_quiz_not_found(self):
        """Test completing non-existent quiz"""
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.post("/api/v1/quiz/quizzes/quiz-123/submit", json={
            "topic": "Python",
            "domain": "Programming"
        })

        assert response.status_code == 404
        assert "Quiz not found" in response.json()["detail"]

    def test_complete_quiz_unauthorized(self):
        """Test completing quiz from different user"""
        mock_db = Mock()
        mock_quiz = Mock()
        mock_quiz.user_id = "different-user"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_quiz

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.post("/api/v1/quiz/quizzes/quiz-123/submit", json={
            "topic": "Python",
            "domain": "Programming"
        })

        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]

    def test_complete_quiz_no_answers(self):
        """Test completing quiz with no answers submitted"""
        mock_db = Mock()
        mock_quiz = Mock()
        mock_quiz.user_id = "test-user-123"

        def mock_query(model):
            mock_query_obj = Mock()
            if model == Quiz:
                mock_query_obj.filter.return_value.first.return_value = mock_quiz
            elif model == QuestionResult:
                mock_query_obj.filter.return_value.all.return_value = []
            return mock_query_obj

        mock_db.query.side_effect = mock_query

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.post("/api/v1/quiz/quizzes/quiz-123/submit", json={
            "topic": "Python",
            "domain": "Programming"
        })

        assert response.status_code == 400
        assert "No answers submitted" in response.json()["detail"]

    def test_get_quiz_for_taking_success(self):
        """Test getting quiz for taking (take=True)"""
        mock_db = Mock()

        # Mock quiz
        mock_quiz = Mock()
        mock_quiz.user_id = "test-user-123"
        mock_quiz.created_at = datetime.now(timezone.utc)
        mock_quiz.difficulty = DifficultyLevel.Easy
        mock_quiz.collection_name = "test-collection"
        mock_quiz.duration = 30

        # Mock questions
        mock_question = Mock()
        mock_question.id = "q1"
        mock_question.question_text = "What is Python?"
        mock_question.type = QuestionType.MultipleChoice
        mock_question.options = ["Language", "Snake", "Tool", "Framework"]
        mock_question.difficulty = DifficultyLevel.Easy
        mock_question.marks = 2
        mock_question.hints = ["Programming language"]

        def mock_query(model):
            mock_query_obj = Mock()
            if model == Quiz:
                mock_query_obj.filter.return_value.first.return_value = mock_quiz
            elif model == QuizQuestion:
                mock_query_obj.filter.return_value.all.return_value = [mock_question]
            return mock_query_obj

        mock_db.query.side_effect = mock_query

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/v1/quiz/quizzes/quiz-123?take=true")

        assert response.status_code == 200
        data = response.json()
        assert data["quiz_id"] == "quiz-123"
        assert len(data["questions"]) == 1
        assert data["questions"][0]["question_id"] == "q1"
        assert data["collection_name"] == "test-collection"

    def test_get_quiz_result_success(self):
        """Test getting quiz result (take=False)"""
        mock_db = Mock()

        # Mock quiz
        mock_quiz = Mock()
        mock_quiz.user_id = "test-user-123"
        mock_quiz.topic = "Python"
        mock_quiz.domain = "Programming"
        mock_quiz.created_at = datetime.now(timezone.utc)
        mock_quiz.difficulty = DifficultyLevel.Easy
        mock_quiz.collection_name = "test-collection"
        mock_quiz.duration = 30

        # Mock quiz result
        mock_quiz_result = Mock()
        mock_quiz_result.score = 3.5
        mock_quiz_result.total = 4.0
        mock_quiz_result.feedback = "Good job!"
        mock_quiz_result.created_at = datetime.now(timezone.utc)

        # Mock question results
        mock_question_result = Mock()
        mock_question_result.question_id = "q1"
        mock_question_result.score = 2.0
        mock_question_result.is_correct = True
        mock_question_result.student_answer = "0"

        # Mock question data
        mock_question = Mock()
        mock_question.id = "q1"
        mock_question.correct_answer = "0"
        mock_question.explanation = "Python is a programming language"
        mock_question.type = QuestionType.MultipleChoice
        mock_question.options = ["Language", "Snake", "Tool", "Framework"]

        def mock_query(model):
            mock_query_obj = Mock()
            if model == Quiz:
                mock_query_obj.filter.return_value.first.return_value = mock_quiz
            elif model == QuizResult:
                mock_query_obj.filter.return_value.first.return_value = mock_quiz_result
            elif model == QuestionResult:
                mock_query_obj.filter.return_value.all.return_value = [mock_question_result]
            elif model == QuizQuestion:
                mock_query_obj.filter.return_value.all.return_value = [mock_question]
            return mock_query_obj

        mock_db.query.side_effect = mock_query

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/v1/quiz/quizzes/quiz-123?take=false")

        assert response.status_code == 200
        data = response.json()
        assert data["quiz_id"] == "quiz-123"
        assert data["score"] == pytest.approx(3.5)
        assert data["total"] == pytest.approx(4.0)
        assert data["topic"] == "Python"
        assert data["domain"] == "Programming"
        assert len(data["question_results"]) == 1

    def test_get_quiz_not_found(self):
        """Test getting non-existent quiz"""
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/v1/quiz/quizzes/quiz-123")

        assert response.status_code == 404
        assert "Quiz not found" in response.json()["detail"]

    def test_get_quiz_result_not_found(self):
        """Test getting quiz result when not taken"""
        mock_db = Mock()

        # Mock quiz exists but no result
        mock_quiz = Mock()
        mock_quiz.user_id = "test-user-123"

        def mock_query(model):
            mock_query_obj = Mock()
            if model == Quiz:
                mock_query_obj.filter.return_value.first.return_value = mock_quiz
            elif model == QuizResult:
                mock_query_obj.filter.return_value.first.return_value = None
            return mock_query_obj

        mock_db.query.side_effect = mock_query

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/v1/quiz/quizzes/quiz-123?take=false")

        assert response.status_code == 404
        assert "Quiz result not found" in response.json()["detail"]

    def test_get_quiz_no_questions(self):
        """Test getting quiz with no questions"""
        mock_db = Mock()

        # Mock quiz exists but no questions
        mock_quiz = Mock()
        mock_quiz.user_id = "test-user-123"

        def mock_query(model):
            mock_query_obj = Mock()
            if model == Quiz:
                mock_query_obj.filter.return_value.first.return_value = mock_quiz
            elif model == QuizQuestion:
                mock_query_obj.filter.return_value.all.return_value = []
            return mock_query_obj

        mock_db.query.side_effect = mock_query

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/v1/quiz/quizzes/quiz-123")

        assert response.status_code == 404
        assert "No questions found" in response.json()["detail"]

    def test_get_quiz_result_endpoint_success(self):
        """Test the separate quiz result endpoint"""
        mock_db = Mock()

        # Mock quiz result
        mock_quiz_result = Mock()
        mock_quiz_result.score = 3.5
        mock_quiz_result.total = 4.0
        mock_quiz_result.feedback = "Good job!"

        # Mock quiz
        mock_quiz = Mock()
        mock_quiz.topic = "Python"
        mock_quiz.domain = "Programming"

        # Mock question results
        mock_question_result = Mock()
        mock_question_result.question_id = "q1"
        mock_question_result.score = 2.0
        mock_question_result.is_correct = True
        mock_question_result.student_answer = "0"

        def mock_query(model):
            mock_query_obj = Mock()
            if model == QuizResult:
                mock_query_obj.filter.return_value.first.return_value = mock_quiz_result
            elif model == Quiz:
                mock_query_obj.filter.return_value.first.return_value = mock_quiz
            elif model == QuestionResult:
                mock_query_obj.filter.return_value.all.return_value = [mock_question_result]
            return mock_query_obj

        mock_db.query.side_effect = mock_query

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/v1/quiz/quizzes/quiz-123/result")

        assert response.status_code == 200
        data = response.json()
        assert data["quiz_id"] == "quiz-123"
        assert data["score"] == pytest.approx(3.5)
        assert data["total"] == pytest.approx(4.0)
        assert data["topic"] == "Python"
        assert data["domain"] == "Programming"
        assert len(data["question_results"]) == 1

    def test_get_quiz_result_endpoint_not_found(self):
        """Test quiz result endpoint when result not found"""
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/v1/quiz/quizzes/quiz-123/result")

        assert response.status_code == 404
        assert "Quiz result not found" in response.json()["detail"]

    def test_evaluate_all_answers_success(self):
        """Test bulk answer evaluation"""
        mock_db = Mock()

        # Mock questions
        mock_question1 = Mock()
        mock_question1.id = "q1"
        mock_question1.correct_answer = "0"
        mock_question1.options = ["Language", "Snake", "Tool", "Framework"]
        mock_question1.type = QuestionType.MultipleChoice
        mock_question1.marks = 2.0

        mock_question2 = Mock()
        mock_question2.id = "q2"
        mock_question2.correct_answer = "True"
        mock_question2.options = None
        mock_question2.type = QuestionType.TrueFalse
        mock_question2.marks = 1.0

        mock_db.query.return_value.filter.return_value.all.return_value = [
            mock_question1, mock_question2
        ]

        # Mock quiz and quiz result
        mock_quiz = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_quiz

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        with patch('app.quiz_generator.quiz_generator.ExamGenerator') as mock_exam_gen_class:
            mock_exam_gen = Mock()
            mock_exam_gen.evaluate_answer.side_effect = [
                {
                    "question_id": "q1",
                    "is_correct": True,
                    "score": 2.0,
                    "explanation": "Correct answer"
                },
                {
                    "question_id": "q2",
                    "is_correct": False,
                    "score": 0.0,
                    "explanation": "Incorrect answer"
                }
            ]
            mock_exam_gen_class.return_value = mock_exam_gen

            response = client.post("/api/v1/quiz/quizzes/quiz-123/evaluate_all", json={
                "quiz_id": "quiz-123",
                "answers": [
                    {"question_id": "q1", "student_answer": "0"},
                    {"question_id": "q2", "student_answer": "False"}
                ]
            })

            assert response.status_code == 200
            data = response.json()
            assert data["quiz_id"] == "quiz-123"
            assert data["score"] == pytest.approx(2.0)
            assert data["total"] == pytest.approx(3.0)
            assert len(data["question_results"]) == 2
            assert len(data["correct_answers"]) == 2

    def test_get_all_quizzes_success(self):
        """Test getting all user quizzes"""
        mock_db = Mock()

        # Mock quizzes
        mock_quiz1 = Mock()
        mock_quiz1.quiz_id = "quiz-1"
        mock_quiz1.created_at = datetime.now(timezone.utc)
        mock_quiz1.difficulty = DifficultyLevel.Easy
        mock_quiz1.duration = 30
        mock_quiz1.collection_name = "collection-1"

        mock_quiz2 = Mock()
        mock_quiz2.quiz_id = "quiz-2"
        mock_quiz2.created_at = datetime.now(timezone.utc)
        mock_quiz2.difficulty = DifficultyLevel.Medium
        mock_quiz2.duration = 45
        mock_quiz2.collection_name = "collection-2"

        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [
            mock_quiz1, mock_quiz2
        ]

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/v1/quiz/quizzes")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["quiz_id"] == "quiz-1"
        assert data[1]["quiz_id"] == "quiz-2"

    def test_get_quiz_marks_success(self):
        """Test getting quiz marks"""
        mock_db = Mock()

        # Mock quiz result and quiz
        mock_quiz_result = Mock()
        mock_quiz_result.score = 8.5
        mock_quiz_result.total = 10.0

        mock_quiz = Mock()
        mock_quiz.quiz_id = "quiz-123"
        mock_quiz.difficulty = DifficultyLevel.Easy
        mock_quiz.topic = "Python"
        mock_quiz.domain = "Programming"
        mock_quiz.duration = 30
        mock_quiz.collection_name = "test-collection"
        mock_quiz.created_at = datetime.now(timezone.utc)

        mock_db.query.return_value.join.return_value.filter.return_value.all.return_value = [
            (mock_quiz_result, mock_quiz)
        ]

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/v1/quiz/quiz-marks")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["quiz_id"] == "quiz-123"
        assert data[0]["score"] == pytest.approx(8.5)
        assert data[0]["total"] == pytest.approx(10.0)

    def test_get_quiz_marks_with_collection_filter(self):
        """Test getting quiz marks filtered by collection"""
        mock_db = Mock()

        # Mock the query chain
        mock_query = Mock()
        mock_join = Mock()
        mock_filter1 = Mock()
        mock_filter2 = Mock()

        mock_db.query.return_value = mock_query
        mock_query.join.return_value = mock_join
        mock_join.filter.return_value = mock_filter1
        mock_filter1.filter.return_value = mock_filter2
        mock_filter2.all.return_value = []

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/v1/quiz/quiz-marks?collection=test-collection")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_api_exception_handling(self):
        """Test general exception handling in API endpoints"""
        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: Mock()

        # Test with quiz endpoint that will cause an exception
        with patch('app.api.v1.routes.quiz.get_query_processor', side_effect=Exception("Unexpected error")):
            response = client.post("/api/v1/quiz/quiz", json={
                "query": "Python programming",
                "num_questions": 5,
                "question_type": "multiple_choice",
                "collection_name": "test-collection",
                "difficulty": "Easy",
                "duration": 30,
                "topic": "Python",
                "domain": "Programming"
            })

            assert response.status_code == 500
            assert "internal server error" in response.json()["detail"].lower()

    def test_invalid_request_data(self):
        """Test API with invalid request data"""
        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = self.mock_get_db()

        # Test with missing required fields
        response = client.post("/api/v1/quiz/quiz", json={
            "query": "Python programming"
            # Missing required fields
        })

        assert response.status_code == 422  # Validation error

    def test_authentication_required(self):
        """Test that authentication is required"""
        # Don't set up authentication override
        response = client.post("/api/v1/quiz/quiz", json={
            "query": "Python programming",
            "num_questions": 5,
            "question_type": "multiple_choice",
            "collection_name": "test-collection",
            "difficulty": "Easy",
            "duration": 30,
            "topic": "Python",
            "domain": "Programming"
        })

        # Should fail without authentication
        assert response.status_code in [401, 403, 500]  # Depends on auth implementation

    def test_complete_quiz_database_exception(self):
        """Test quiz completion with database exception"""
        mock_db = Mock()
        mock_quiz = Mock()
        mock_quiz.user_id = "test-user-123"

        # Mock successful initial queries but fail on commit
        mock_db.query.return_value.filter.return_value.first.return_value = mock_quiz
        mock_db.query.return_value.filter.return_value.all.return_value = [Mock(score=2.0)]
        mock_db.commit.side_effect = Exception("Database error")

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.post("/api/v1/quiz/quizzes/quiz-123/submit", json={
            "topic": "Python",
            "domain": "Programming"
        })

        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()
        mock_db.rollback.assert_called_once()

    def test_evaluate_all_answers_database_exception(self):
        """Test bulk evaluation with database exception"""
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.all.return_value = [Mock(id="q1", marks=1.0)]
        mock_db.commit.side_effect = Exception("Database error")

        app.dependency_overrides[get_current_user] = self.mock_get_current_user()
        app.dependency_overrides[get_db] = lambda: mock_db

        with patch('app.quiz_generator.quiz_generator.ExamGenerator'):
            response = client.post("/api/v1/quiz/quizzes/quiz-123/evaluate_all", json={
                "quiz_id": "quiz-123",
                "answers": [{"question_id": "q1", "student_answer": "test"}]
            })

            assert response.status_code == 500
            assert "internal server error" in response.json()["detail"].lower()
            mock_db.rollback.assert_called_once()
