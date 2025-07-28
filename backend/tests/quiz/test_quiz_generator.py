import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
import uuid
import json

from app.quiz_generator.quiz_generator import ExamGenerator
from app.quiz_generator.models import QuizQuestion, QuestionResult, QuestionType, DifficultyLevel
from app.document_upload.embedding_generator import EmbeddingGenerator


class TestExamGenerator:
    """Test ExamGenerator class for quiz question generation and evaluation"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    @pytest.fixture
    def mock_genai_model(self):
        """Mock Gemini AI model"""
        with patch('google.generativeai.configure'), \
             patch('google.generativeai.GenerativeModel') as mock_model:
            mock_instance = Mock()
            mock_model.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def mock_embedding_generator(self):
        """Mock EmbeddingGenerator"""
        with patch('app.quiz_generator.quiz_generator.EmbeddingGenerator') as mock_class:
            mock_instance = Mock()
            mock_class.return_value = mock_instance
            # Mock embedding return values
            mock_instance.get_embedding.return_value = [0.1, 0.2, 0.3, 0.4, 0.5]
            yield mock_instance

    @pytest.fixture
    def exam_generator(self, mock_genai_model, mock_embedding_generator):
        """Create ExamGenerator instance with mocked dependencies"""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            generator = ExamGenerator()
            generator.model = mock_genai_model
            generator.embedding_generator = mock_embedding_generator
            return generator

    def test_init_success(self, mock_genai_model, mock_embedding_generator):
        """Test successful initialization of ExamGenerator"""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            
            generator = ExamGenerator()
            
            assert generator.model == mock_genai_model
            assert generator.embedding_generator == mock_embedding_generator

    def test_init_failure_no_api_key(self):
        """Test ExamGenerator initialization failure with missing API key"""
        with patch('app.core.config.settings') as mock_settings, \
             patch('app.quiz_generator.quiz_generator.EmbeddingGenerator') as mock_emb_class:
            mock_settings.GEMINI_API_KEY = None
            mock_emb_class.side_effect = ValueError("Missing GEMINI_API_KEY in environment.")
            
            with pytest.raises(Exception):
                ExamGenerator()

    def test_init_failure_genai_exception(self):
        """Test ExamGenerator initialization failure with Gemini AI exception"""
        with patch('app.core.config.settings') as mock_settings, \
             patch('google.generativeai.configure', side_effect=Exception("API Error")), \
             patch('app.quiz_generator.quiz_generator.EmbeddingGenerator'):
            mock_settings.GEMINI_API_KEY = "test-api-key"
            
            with pytest.raises(Exception) as exc_info:
                ExamGenerator()
            assert "API Error" in str(exc_info.value)

    def test_generate_questions_multiple_choice_success(self, exam_generator):
        """Test successful generation of multiple choice questions"""
        # Arrange
        mock_response = Mock()
        mock_response.text = '''```json
        [
            {
                "question": "What is Python?",
                "type": "MultipleChoice",
                "options": ["A programming language", "A snake", "A tool", "A framework"],
                "difficulty": "Easy",
                "marks": 2,
                "hints": ["Think about coding", "It's not an animal"],
                "explanation": "Python is a programming language",
                "correct_answer": "0"
            }
        ]
        ```'''
        exam_generator.model.generate_content.return_value = mock_response
        
        # Act
        questions = exam_generator.generate_questions(
            context="Python programming basics",
            num_questions=1,
            question_type="multiple_choice",
            difficulty="Easy"
        )
        
        # Assert
        assert len(questions) == 1
        assert questions[0]["question"] == "What is Python?"
        assert questions[0]["type"] == "MultipleChoice"
        assert len(questions[0]["options"]) == 4
        assert questions[0]["correct_answer"] == "0"
        assert "question_id" in questions[0]

    def test_generate_questions_short_answer_success(self, exam_generator):
        """Test successful generation of short answer questions"""
        # Arrange
        mock_response = Mock()
        mock_response.text = '''```json
        [
            {
                "question": "Explain Python variables",
                "type": "ShortAnswer",
                "options": null,
                "difficulty": "Medium",
                "marks": 3,
                "hints": ["Think about data storage"],
                "explanation": "Variables store data values",
                "correct_answer": "Variables are used to store data values in Python"
            }
        ]
        ```'''
        exam_generator.model.generate_content.return_value = mock_response
        
        # Act
        questions = exam_generator.generate_questions(
            context="Python programming basics",
            num_questions=1,
            question_type="short_answer",
            difficulty="Medium"
        )
        
        # Assert
        assert len(questions) == 1
        assert questions[0]["question"] == "Explain Python variables"
        assert questions[0]["type"] == "ShortAnswer"
        assert questions[0]["options"] == []

    def test_generate_questions_true_false_success(self, exam_generator):
        """Test successful generation of true/false questions"""
        # Arrange
        mock_response = Mock()
        mock_response.text = '''```json
        [
            {
                "question": "Python is an interpreted language",
                "type": "TrueFalse",
                "options": null,
                "difficulty": "Easy",
                "marks": 1,
                "hints": ["Think about execution"],
                "explanation": "Python code is executed line by line",
                "correct_answer": "True"
            }
        ]
        ```'''
        exam_generator.model.generate_content.return_value = mock_response
        
        # Act
        questions = exam_generator.generate_questions(
            context="Python programming basics",
            num_questions=1,
            question_type="true_false",
            difficulty="Easy"
        )
        
        # Assert
        assert len(questions) == 1
        assert questions[0]["question"] == "Python is an interpreted language"
        assert questions[0]["type"] == "TrueFalse"
        assert questions[0]["correct_answer"] == "True"

    def test_generate_questions_invalid_type(self, exam_generator):
        """Test generation with invalid question type"""
        with pytest.raises(Exception) as exc_info:
            exam_generator.generate_questions(
                context="Test context",
                num_questions=1,
                question_type="invalid_type",
                difficulty="Easy"
            )
        assert "Unsupported question type" in str(exc_info.value)

    def test_generate_questions_no_response(self, exam_generator):
        """Test generation with no response from Gemini API"""
        exam_generator.model.generate_content.return_value = None
        
        with pytest.raises(Exception) as exc_info:
            exam_generator.generate_questions(
                context="Test context",
                num_questions=1,
                question_type="multiple_choice",
                difficulty="Easy"
            )
        assert "No valid response from Gemini API" in str(exc_info.value)

    def test_generate_questions_empty_response(self, exam_generator):
        """Test generation with empty response from Gemini API"""
        mock_response = Mock()
        mock_response.text = ""
        exam_generator.model.generate_content.return_value = mock_response
        
        with pytest.raises(Exception) as exc_info:
            exam_generator.generate_questions(
                context="Test context",
                num_questions=1,
                question_type="multiple_choice",
                difficulty="Easy"
            )
        assert "No valid response from Gemini API" in str(exc_info.value)

    def test_generate_questions_api_exception(self, exam_generator):
        """Test generation with API exception"""
        exam_generator.model.generate_content.side_effect = Exception("API Error")
        
        with pytest.raises(Exception) as exc_info:
            exam_generator.generate_questions(
                context="Test context",
                num_questions=1,
                question_type="multiple_choice",
                difficulty="Easy"
            )
        assert "Error generating questions" in str(exc_info.value)

    def test_build_prompt_multiple_choice(self, exam_generator):
        """Test prompt building for multiple choice questions"""
        prompt = exam_generator._build_prompt(
            context="Python basics",
            num_questions=2,
            question_type="MultipleChoice",
            difficulty="Easy"
        )
        
        assert "Python basics" in prompt
        assert "2 unique" in prompt
        assert "multiple-choice questions" in prompt
        assert "Easy" in prompt
        assert "MultipleChoice" in prompt

    def test_build_prompt_short_answer(self, exam_generator):
        """Test prompt building for short answer questions"""
        prompt = exam_generator._build_prompt(
            context="Python concepts",
            num_questions=3,
            question_type="ShortAnswer",
            difficulty="Medium"
        )
        
        assert "Python concepts" in prompt
        assert "3 unique" in prompt
        assert "short-answer questions" in prompt
        assert "Medium" in prompt
        assert "ShortAnswer" in prompt

    def test_parse_questions_valid_json(self, exam_generator):
        """Test parsing valid JSON response"""
        response_text = '''```json
        [
            {
                "question": "What is Python?",
                "type": "MultipleChoice",
                "options": ["Language", "Snake", "Tool", "Framework"],
                "difficulty": "Easy",
                "marks": 2,
                "hints": ["Coding related"],
                "explanation": "Python is a programming language",
                "correct_answer": "0"
            }
        ]
        ```'''
        
        questions = exam_generator._parse_questions(response_text, "MultipleChoice")
        
        assert len(questions) == 1
        assert questions[0]["question"] == "What is Python?"
        assert len(questions[0]["options"]) == 4
        assert "question_id" in questions[0]

    def test_parse_questions_no_json_wrapper(self, exam_generator):
        """Test parsing JSON without markdown wrapper"""
        response_text = '''[
            {
                "question": "What is Python?",
                "type": "MultipleChoice",
                "options": ["Language", "Snake", "Tool", "Framework"],
                "difficulty": "Easy",
                "marks": 2,
                "hints": ["Coding related"],
                "explanation": "Python is a programming language",
                "correct_answer": "0"
            }
        ]'''
        
        questions = exam_generator._parse_questions(response_text, "MultipleChoice")
        
        assert len(questions) == 1
        assert questions[0]["question"] == "What is Python?"

    def test_parse_questions_invalid_json(self, exam_generator):
        """Test parsing invalid JSON"""
        response_text = "invalid json content"
        
        with pytest.raises(Exception) as exc_info:
            exam_generator._parse_questions(response_text, "MultipleChoice")
        assert "Error parsing questions" in str(exc_info.value)

    def test_parse_questions_not_array(self, exam_generator):
        """Test parsing JSON that's not an array"""
        response_text = '''{"question": "What is Python?"}'''
        
        with pytest.raises(Exception) as exc_info:
            exam_generator._parse_questions(response_text, "MultipleChoice")
        assert "Response is not a JSON array" in str(exc_info.value)

    def test_parse_questions_invalid_mcq(self, exam_generator):
        """Test parsing invalid multiple choice question"""
        response_text = '''```json
        [
            {
                "question": "What is Python?",
                "type": "MultipleChoice",
                "options": ["Option1", "Option2"],
                "difficulty": "Easy",
                "marks": 2,
                "hints": ["Hint"],
                "explanation": "Explanation",
                "correct_answer": "5"
            }
        ]
        ```'''
        
        with pytest.raises(Exception) as exc_info:
            exam_generator._parse_questions(response_text, "MultipleChoice")
        assert "No valid questions parsed" in str(exc_info.value)

    def test_parse_questions_empty_question_text(self, exam_generator):
        """Test parsing question with empty text"""
        response_text = '''```json
        [
            {
                "question": "",
                "type": "MultipleChoice",
                "options": ["A", "B", "C", "D"],
                "difficulty": "Easy",
                "marks": 2,
                "hints": ["Hint"],
                "explanation": "Explanation",
                "correct_answer": "0"
            }
        ]
        ```'''
        
        with pytest.raises(Exception) as exc_info:
            exam_generator._parse_questions(response_text, "MultipleChoice")
        assert "No valid questions parsed" in str(exc_info.value)

    def test_parse_questions_control_characters(self, exam_generator):
        """Test parsing JSON with control characters"""
        response_text = '''```json
        [
            {
                "question": "What is\x0CPython?",
                "type": "MultipleChoice",
                "options": ["A", "B", "C", "D"],
                "difficulty": "Easy",
                "marks": 2,
                "hints": ["Hint"],
                "explanation": "Explanation",
                "correct_answer": "0"
            }
        ]
        ```'''
        
        questions = exam_generator._parse_questions(response_text, "MultipleChoice")
        
        assert len(questions) == 1
        assert "What is Python?" in questions[0]["question"]

    def test_deduplicate_questions_unique(self, exam_generator):
        """Test deduplication with unique questions"""
        questions = [
            {
                "question": "What is Python?",
                "type": "ShortAnswer",
                "options": []
            },
            {
                "question": "What is Java?",
                "type": "ShortAnswer", 
                "options": []
            }
        ]
        
        # Mock different embeddings for different questions (orthogonal vectors to ensure low similarity)
        exam_generator.embedding_generator.get_embedding.side_effect = [
            [1.0, 0.0, 0.0],  # Python question
            [0.0, 1.0, 0.0],  # Java question (orthogonal, cosine similarity = 0)
        ]
        
        unique_questions = exam_generator._deduplicate_questions(questions, 2, "ShortAnswer")
        
        assert len(unique_questions) == 2

    def test_deduplicate_questions_similar(self, exam_generator):
        """Test deduplication with similar questions"""
        questions = [
            {
                "question": "What is Python?",
                "type": "ShortAnswer",
                "options": []
            },
            {
                "question": "What is Python programming?",
                "type": "ShortAnswer",
                "options": []
            }
        ]
        
        # Mock similar embeddings for similar questions (cosine similarity > 0.9)
        # Use vectors that will have high cosine similarity
        exam_generator.embedding_generator.get_embedding.side_effect = [
            [1.0, 0.0, 0.0],  # First question
            [0.95, 0.31, 0.0], # Very similar second question (cosine sim = 0.95)
        ]
        
        unique_questions = exam_generator._deduplicate_questions(questions, 2, "ShortAnswer")
        
        # Should only keep one question due to similarity
        assert len(unique_questions) == 1

    def test_deduplicate_questions_exception(self, exam_generator):
        """Test deduplication with exception"""
        questions = [{"question": "What is Python?", "type": "MultipleChoice", "options": ["A", "B", "C", "D"]}]
        
        exam_generator.embedding_generator.get_embedding.side_effect = Exception("Embedding error")
        
        with pytest.raises(Exception) as exc_info:
            exam_generator._deduplicate_questions(questions, 1, "MultipleChoice")
        assert "Error deduplicating questions" in str(exc_info.value)

    def test_cosine_similarity_identical(self, exam_generator):
        """Test cosine similarity with identical vectors"""
        vec1 = [1.0, 2.0, 3.0]
        vec2 = [1.0, 2.0, 3.0]
        
        similarity = exam_generator._cosine_similarity(vec1, vec2)
        
        assert abs(similarity - 1.0) < 1e-6

    def test_cosine_similarity_orthogonal(self, exam_generator):
        """Test cosine similarity with orthogonal vectors"""
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [0.0, 1.0, 0.0]
        
        similarity = exam_generator._cosine_similarity(vec1, vec2)
        
        assert abs(similarity - 0.0) < 1e-6

    def test_cosine_similarity_zero_vectors(self, exam_generator):
        """Test cosine similarity with zero vectors"""
        vec1 = [0.0, 0.0, 0.0]
        vec2 = [1.0, 2.0, 3.0]
        
        similarity = exam_generator._cosine_similarity(vec1, vec2)
        
        assert similarity == pytest.approx(0.0)

    def test_evaluate_answer_multiple_choice_correct(self, exam_generator, mock_db):
        """Test evaluating correct multiple choice answer"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.MultipleChoice
        question.correct_answer = "0"
        question.marks = 2.0
        question.options = ["Correct", "Wrong", "Wrong", "Wrong"]
        question.explanation = "This is correct"
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act
        result = exam_generator.evaluate_answer(
            exam_id="quiz-123",
            question_id="question-123",
            student_answer="0",
            user_id="user-123",
            db=mock_db
        )
        
        # Assert
        assert result["is_correct"] is True
        assert result["score"] == pytest.approx(2.0)
        assert result["question_id"] == "question-123"
        mock_db.merge.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_evaluate_answer_multiple_choice_incorrect(self, exam_generator, mock_db):
        """Test evaluating incorrect multiple choice answer"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.MultipleChoice
        question.correct_answer = "0"
        question.marks = 2.0
        question.options = ["Correct", "Wrong", "Wrong", "Wrong"]
        question.explanation = "This is correct"
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act
        result = exam_generator.evaluate_answer(
            exam_id="quiz-123",
            question_id="question-123",
            student_answer="1",
            user_id="user-123",
            db=mock_db
        )
        
        # Assert
        assert result["is_correct"] is False
        assert result["score"] == pytest.approx(0.0)

    def test_evaluate_answer_multiple_choice_by_text(self, exam_generator, mock_db):
        """Test evaluating multiple choice answer by option text"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.MultipleChoice
        question.correct_answer = "0"
        question.marks = 2.0
        question.options = ["Correct", "Wrong", "Wrong", "Wrong"]
        question.explanation = "This is correct"
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act
        result = exam_generator.evaluate_answer(
            exam_id="quiz-123",
            question_id="question-123",
            student_answer="Correct",
            user_id="user-123",
            db=mock_db
        )
        
        # Assert
        assert result["is_correct"] is True
        assert result["score"] == pytest.approx(2.0)

    def test_evaluate_answer_short_answer_correct(self, exam_generator, mock_db):
        """Test evaluating correct short answer"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.ShortAnswer
        question.question_text = "What is Python?"
        question.correct_answer = "A programming language"
        question.marks = 3.0
        question.explanation = "Python is a programming language"
        
        mock_response = Mock()
        mock_response.text = '{"is_correct": true, "score": 3.0}'
        exam_generator.model.generate_content.return_value = mock_response
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act
        result = exam_generator.evaluate_answer(
            exam_id="quiz-123",
            question_id="question-123",
            student_answer="Python is a programming language",
            user_id="user-123",
            db=mock_db
        )
        
        # Assert
        assert result["is_correct"] is True
        assert result["score"] == pytest.approx(3.0)

    def test_evaluate_answer_short_answer_incorrect(self, exam_generator, mock_db):
        """Test evaluating incorrect short answer"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.ShortAnswer
        question.question_text = "What is Python?"
        question.correct_answer = "A programming language"
        question.marks = 3.0
        question.explanation = "Python is a programming language"
        
        mock_response = Mock()
        mock_response.text = '{"is_correct": false, "score": 0.0}'
        exam_generator.model.generate_content.return_value = mock_response
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act
        result = exam_generator.evaluate_answer(
            exam_id="quiz-123",
            question_id="question-123",
            student_answer="A snake",
            user_id="user-123",
            db=mock_db
        )
        
        # Assert
        assert result["is_correct"] is False
        assert result["score"] == pytest.approx(0.0)

    def test_evaluate_answer_short_answer_with_json_wrapper(self, exam_generator, mock_db):
        """Test evaluating short answer with JSON markdown wrapper"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.ShortAnswer
        question.question_text = "What is Python?"
        question.correct_answer = "A programming language"
        question.marks = 3.0
        question.explanation = "Python is a programming language"
        
        mock_response = Mock()
        mock_response.text = '```json\n{"is_correct": true, "score": 3.0}\n```'
        exam_generator.model.generate_content.return_value = mock_response
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act
        result = exam_generator.evaluate_answer(
            exam_id="quiz-123",
            question_id="question-123",
            student_answer="Python is a programming language",
            user_id="user-123",
            db=mock_db
        )
        
        # Assert
        assert result["is_correct"] is True
        assert result["score"] == pytest.approx(3.0)

    def test_evaluate_answer_short_answer_partial_score(self, exam_generator, mock_db):
        """Test evaluating short answer with partial scoring"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.ShortAnswer
        question.question_text = "What is Python?"
        question.correct_answer = "A programming language"
        question.marks = 4.0
        question.explanation = "Python is a programming language"
        
        mock_response = Mock()
        # LLM gives partial score (2.5 out of 4.0)
        mock_response.text = '{"is_correct": false, "score": 2.5, "percentage": 62.5}'
        exam_generator.model.generate_content.return_value = mock_response
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act
        result = exam_generator.evaluate_answer(
            exam_id="quiz-123",
            question_id="question-123",
            student_answer="A language for programming",
            user_id="user-123",
            db=mock_db
        )
        
        # Assert
        assert result["is_correct"] is False  # Not considered correct since < 80% of marks
        assert result["score"] == pytest.approx(2.5)

    def test_evaluate_answer_short_answer_high_partial_score(self, exam_generator, mock_db):
        """Test evaluating short answer with high partial score (considered correct)"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.ShortAnswer
        question.question_text = "What is Python?"
        question.correct_answer = "A programming language"
        question.marks = 5.0
        question.explanation = "Python is a programming language"
        
        mock_response = Mock()
        # LLM gives high partial score (4.2 out of 5.0 = 84%)
        mock_response.text = '{"is_correct": true, "score": 4.2, "percentage": 84}'
        exam_generator.model.generate_content.return_value = mock_response
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act
        result = exam_generator.evaluate_answer(
            exam_id="quiz-123",
            question_id="question-123",
            student_answer="Python is a high-level programming language",
            user_id="user-123",
            db=mock_db
        )
        
        # Assert
        assert result["is_correct"] is True  # Considered correct since >= 80% of marks
        assert result["score"] == pytest.approx(4.2)

    def test_evaluate_answer_short_answer_invalid_json(self, exam_generator, mock_db):
        """Test evaluating short answer with invalid JSON response"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.ShortAnswer
        question.question_text = "What is Python?"
        question.correct_answer = "A programming language"
        question.marks = 3.0
        
        mock_response = Mock()
        mock_response.text = 'invalid json'
        exam_generator.model.generate_content.return_value = mock_response
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            exam_generator.evaluate_answer(
                exam_id="quiz-123",
                question_id="question-123",
                student_answer="Python is a programming language",
                user_id="user-123",
                db=mock_db
            )
        assert "Error evaluating answer" in str(exc_info.value)

    def test_evaluate_answer_short_answer_no_json_object(self, exam_generator, mock_db):
        """Test evaluating short answer with no JSON object in response"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.ShortAnswer
        question.question_text = "What is Python?"
        question.correct_answer = "A programming language"
        question.marks = 3.0
        
        mock_response = Mock()
        mock_response.text = 'No JSON here'
        exam_generator.model.generate_content.return_value = mock_response
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            exam_generator.evaluate_answer(
                exam_id="quiz-123",
                question_id="question-123",
                student_answer="Python is a programming language",
                user_id="user-123",
                db=mock_db
            )
        assert "Error evaluating answer" in str(exc_info.value)

    def test_evaluate_answer_short_answer_no_response(self, exam_generator, mock_db):
        """Test evaluating short answer with no API response"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.ShortAnswer
        question.question_text = "What is Python?"
        question.correct_answer = "A programming language"
        question.marks = 3.0
        
        exam_generator.model.generate_content.return_value = None
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            exam_generator.evaluate_answer(
                exam_id="quiz-123",
                question_id="question-123",
                student_answer="Python is a programming language",
                user_id="user-123",
                db=mock_db
            )
        assert "Error evaluating answer" in str(exc_info.value)

    def test_evaluate_answer_true_false_correct(self, exam_generator, mock_db):
        """Test evaluating correct true/false answer"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.TrueFalse
        question.correct_answer = "True"
        question.marks = 1.0
        question.explanation = "This is true"
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act
        result = exam_generator.evaluate_answer(
            exam_id="quiz-123",
            question_id="question-123",
            student_answer="true",
            user_id="user-123",
            db=mock_db
        )
        
        # Assert
        assert result["is_correct"] is True
        assert result["score"] == pytest.approx(1.0)

    def test_evaluate_answer_true_false_incorrect(self, exam_generator, mock_db):
        """Test evaluating incorrect true/false answer"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.TrueFalse
        question.correct_answer = "True"
        question.marks = 1.0
        question.explanation = "This is true"
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        
        # Act
        result = exam_generator.evaluate_answer(
            exam_id="quiz-123",
            question_id="question-123",
            student_answer="false",
            user_id="user-123",
            db=mock_db
        )
        
        # Assert
        assert result["is_correct"] is False
        assert result["score"] == pytest.approx(0.0)

    def test_evaluate_answer_question_not_found(self, exam_generator, mock_db):
        """Test evaluating answer when question is not found"""
        # Arrange
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            exam_generator.evaluate_answer(
                exam_id="quiz-123",
                question_id="question-123",
                student_answer="answer",
                user_id="user-123",
                db=mock_db
            )
        assert "Question question-123 not found in quiz quiz-123" in str(exc_info.value)

    def test_evaluate_answer_database_exception(self, exam_generator, mock_db):
        """Test evaluating answer with database exception"""
        # Arrange
        question = Mock(spec=QuizQuestion)
        question.id = "question-123"
        question.quiz_id = "quiz-123"
        question.type = QuestionType.MultipleChoice
        question.correct_answer = "0"
        question.marks = 2.0
        question.options = ["Correct", "Wrong", "Wrong", "Wrong"]
        
        mock_db.query.return_value.filter.return_value.first.return_value = question
        mock_db.merge.side_effect = Exception("Database error")
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            exam_generator.evaluate_answer(
                exam_id="quiz-123",
                question_id="question-123",
                student_answer="0",
                user_id="user-123",
                db=mock_db
            )
        assert "Error evaluating answer" in str(exc_info.value)
        mock_db.rollback.assert_called_once()

    def test_question_type_mapping(self, exam_generator):
        """Test question type mapping for backward compatibility"""
        # Test underscore to camel case mapping
        test_cases = [
            ("multiple_choice", "MultipleChoice"),
            ("short_answer", "ShortAnswer"),
            ("true_false", "TrueFalse"),
            ("multiplechoice", "MultipleChoice"),
            ("shortanswer", "ShortAnswer"),
            ("truefalse", "TrueFalse"),
        ]
        
        for input_type, expected_type in test_cases:
            mock_response = Mock()
            if expected_type == "MultipleChoice":
                mock_response.text = '''```json
                [
                    {
                        "question": "Test question",
                        "type": "MultipleChoice",
                        "options": ["A", "B", "C", "D"],
                        "difficulty": "Easy",
                        "marks": 1,
                        "hints": ["Hint"],
                        "explanation": "Explanation",
                        "correct_answer": "0"
                    }
                ]
                ```'''
            else:
                mock_response.text = f'''```json
                [
                    {{
                        "question": "Test question",
                        "type": "{expected_type}",
                        "options": null,
                        "difficulty": "Easy",
                        "marks": 1,
                        "hints": ["Hint"],
                        "explanation": "Explanation",
                        "correct_answer": "Test answer"
                    }}
                ]
                ```'''
            exam_generator.model.generate_content.return_value = mock_response
            
            questions = exam_generator.generate_questions(
                context="Test context",
                num_questions=1,
                question_type=input_type,
                difficulty="Easy"
            )
            
            assert len(questions) == 1
            assert questions[0]["type"] == expected_type

    def test_generate_questions_with_deduplication_limit(self, exam_generator):
        """Test generation when fewer unique questions are generated than requested"""
        # Arrange
        mock_response = Mock()
        mock_response.text = '''```json
        [
            {
                "question": "What is Python?",
                "type": "MultipleChoice",
                "options": ["Language", "Snake", "Tool", "Framework"],
                "difficulty": "Easy",
                "marks": 2,
                "hints": ["Coding"],
                "explanation": "Python is a programming language",
                "correct_answer": "0"
            }
        ]
        ```'''
        exam_generator.model.generate_content.return_value = mock_response
        
        # Mock deduplication to return fewer questions
        with patch.object(exam_generator, '_deduplicate_questions') as mock_dedupe:
            mock_dedupe.return_value = [{"question": "Single question", "type": "MultipleChoice"}]
            
            # Act
            questions = exam_generator.generate_questions(
                context="Python programming basics",
                num_questions=5,
                question_type="multiple_choice",
                difficulty="Easy"
            )
            
            # Assert
            assert len(questions) == 1
            mock_dedupe.assert_called_once()
