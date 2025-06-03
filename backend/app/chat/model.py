from sqlalchemy import Column, String, Text, ForeignKey, Enum, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum
import uuid

class RoleEnum(str, enum.Enum):
    user = "user"
    assistant = "assistant"

class StatusEnum(str, enum.Enum):
    complete = "complete"
    streaming = "streaming"
    failed = "failed"

class Chat(Base):
    __tablename__ = "chats"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    user_id = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default="now()")
    updated_at = Column(TIMESTAMP(timezone=True), server_default="now()", onupdate="now()")

    messages = relationship("Message", back_populates="chat", cascade="all, delete")

class Message(Base):
    __tablename__ = "messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    text = Column(Text, default="")
    status = Column(Enum(StatusEnum), default=StatusEnum.complete)
    timestamp = Column(TIMESTAMP(timezone=True), server_default="now()")

    chat = relationship("Chat", back_populates="messages")
    files = relationship("MessageFile", back_populates="message", cascade="all, delete")

class MessageFile(Base):
    __tablename__ = "message_files"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    file_url = Column(Text, nullable=False)

    message = relationship("Message", back_populates="files")
