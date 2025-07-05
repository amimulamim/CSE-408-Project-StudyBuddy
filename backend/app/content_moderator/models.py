from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime, timezone

class ModeratorProfile(Base):
    __tablename__ = "moderator_profiles"
    
    moderator_id = Column(String, ForeignKey("users.uid"), primary_key=True)
    contents_modified = Column(Integer, nullable=False, default=0)
    quizzes_modified = Column(Integer, nullable=False, default=0)
    total_time_spent = Column(Numeric(6, 2), default=0)  # hours, up to 9999.99

class ModeratorDomain(Base):
    __tablename__ = "moderator_domains"
    
    moderator_id = Column(String, ForeignKey("moderator_profiles.moderator_id"), primary_key=True)
    domain = Column(String, nullable=False, primary_key=True)

class ModeratorTopic(Base):
    __tablename__ = "moderator_topics"
    
    moderator_id = Column(String, ForeignKey("moderator_profiles.moderator_id"), primary_key=True)
    topic = Column(String, nullable=False, primary_key=True)

class ModeratorQuizHistory(Base):
    __tablename__ = "moderator_quiz_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    moderator_id = Column(String, ForeignKey("moderator_profiles.moderator_id"))
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id"))
    modified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ModeratorContentHistory(Base):
    __tablename__ = "moderator_content_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    moderator_id = Column(String, ForeignKey("moderator_profiles.moderator_id"))
    content_id = Column(UUID(as_uuid=True), ForeignKey("content_items.id"))
    modified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
