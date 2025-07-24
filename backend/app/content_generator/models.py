from sqlalchemy import Column, String, Enum, Float, ARRAY, Text, ForeignKey, DateTime, func, Integer, Boolean
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
    length = Column(String, nullable=True)  # Store content length (short, medium, long)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Versioning fields
    version_number = Column(Integer, default=1, nullable=False)
    parent_content_id = Column(UUID(as_uuid=True), ForeignKey("content_items.id"), nullable=True)
    is_latest_version = Column(Boolean, default=True, nullable=False)
    modification_instructions = Column(Text, nullable=True)
    modified_from_version = Column(Integer, nullable=True)
    
    # Relationships
    parent = relationship("ContentItem", remote_side=[id], backref="versions")

class ContentModification(Base):
    __tablename__ = "content_modifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id = Column(UUID(as_uuid=True), ForeignKey("content_items.id"), nullable=False)
    modification_instructions = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationship
    content = relationship("ContentItem", foreign_keys=[content_id])