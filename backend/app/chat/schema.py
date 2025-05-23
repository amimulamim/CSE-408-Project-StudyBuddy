from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


class RoleEnum(str, Enum):
    user = "user"
    assistant = "assistant"

class StatusEnum(str, Enum):
    complete = "complete"
    streaming = "streaming"
    failed = "failed"


class MessageFileOut(BaseModel):
    id: UUID
    file_url: str

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: UUID
    role: RoleEnum
    text: str
    status: StatusEnum
    timestamp: datetime
    files: List[MessageFileOut] = []

    class Config:
        from_attributes = True


class ChatOut(BaseModel):
    id: UUID #= Field(..., alias="_id")
    name: str
    messages: List[MessageOut]

    class Config:
        from_attributes = True


class ChatSummary(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class ChatListResponse(BaseModel):
    chats: List[ChatSummary]


class ChatCreateRequest(BaseModel):
    text: str
    chatId: Optional[UUID] = None
