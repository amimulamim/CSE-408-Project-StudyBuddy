from sqlalchemy import Column, String, Enum, Float, ARRAY, Text, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from enum import Enum as PyEnum
import uuid
from datetime import datetime, timezone

class ContentItem(Base):
    __tablename__ = "content_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.uid"), nullable=False)
    collection_name = Column(String, nullable=False)  # Store the collection name this content belongs to
    content_url = Column(Text, nullable=False)
    image_preview = Column(Text, nullable=True)
    topic = Column(Text, nullable=True)
    content_type = Column(Text, nullable=True)
    raw_source = Column(Text, nullable=True)  # Store raw source URL for slides (LaTeX)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))