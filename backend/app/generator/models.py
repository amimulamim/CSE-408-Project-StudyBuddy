from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, ForeignKey, ARRAY, Text
from app.core.database import Base
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import enum
import uuid

class QuestionType(enum.Enum):
    MultipleChoice = "MultipleChoice"
    ShortAnswer = "ShortAnswer"
    TrueFalse = "TrueFalse"

class DifficultyLevel(enum.Enum):
    Easy = "Easy"
    Medium = "Medium"
    Hard = "Hard"

class Quiz(Base):
    __tablename__ = "quizzes"
    quiz_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.quiz_id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(ARRAY(String))
    type = Column(Enum(QuestionType), nullable=False)
    difficulty = Column(Enum(DifficultyLevel), nullable=False)
    marks = Column(Integer, nullable=False)
    hints = Column(ARRAY(String))
    explanation = Column(Text)
    correct_answer = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class QuizResult(Base):
    __tablename__ = "quiz_results"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.quiz_id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, nullable=False)
    topic = Column(String)
    domain = Column(String)
    student_answer = Column(Text)
    is_correct = Column(Boolean)
    score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)