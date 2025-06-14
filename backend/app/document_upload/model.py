from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, ARRAY, Enum, Text, PrimaryKeyConstraint, UniqueConstraint
from app.core.database import Base
from sqlalchemy.dialects.postgresql import UUID, TEXT
from datetime import datetime
import enum
import uuid

class UserCollection(Base):
    __tablename__ = "user_collections"
    user_id = Column(TEXT, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False)
    collection_name = Column(String, nullable=False)
    full_collection_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (
        PrimaryKeyConstraint("user_id", "collection_name"),
        UniqueConstraint("full_collection_name"),
    )