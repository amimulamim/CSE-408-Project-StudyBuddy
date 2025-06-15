from sqlalchemy import Column, String, Float, TEXT, DateTime, ForeignKey, ARRAY, Enum, Text, PrimaryKeyConstraint, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from datetime import datetime, timezone
import enum
import uuid

class QuestionType(enum.Enum):
    MultipleChoice = "MultipleChoice"
    ShortAnswer = "ShortAnswer"
    TrueFalse = "TrueFalse"

class DifficultyLevel(enum.Enum):
    Easy = "easy"
    Medium = "medium"
    Hard = "hard"

class Quiz(Base):
    __tablename__ = "quizzes"
    quiz_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.quiz_id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    type = Column(Enum(QuestionType), nullable=False)
    options = Column(ARRAY(String))  # For MultipleChoice: list of options; null for others
    difficulty = Column(Enum(DifficultyLevel), nullable=False)
    marks = Column(Float, nullable=False)
    hints = Column(ARRAY(String))
    explanation = Column(Text)
    correct_answer = Column(String)  # For MultipleChoice: option index (e.g., "0"); for others: answer text
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class QuizResult(Base):
    __tablename__ = "quiz_results"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.quiz_id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)  # Total score achieved
    total = Column(Float, nullable=False)  # Maximum possible score
    feedback = Column(Text)  # Optional feedback
    topic = Column(String)  # Optional topic
    domain = Column(String)  # Optional domain
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class QuestionResult(Base):
    __tablename__ = "question_results"
    question_id = Column(UUID(as_uuid=True), ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.quiz_id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    student_answer = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (
        PrimaryKeyConstraint("question_id", "user_id", "quiz_id"),
    )