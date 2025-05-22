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
        orm_mode = True

class MessageOut(BaseModel):
    id: UUID
    role: RoleEnum
    text: str
    status: StatusEnum
    timestamp: datetime
    files: List[MessageFileOut] = []

    class Config:
        orm_mode = True

class ChatOut(BaseModel):
    id: UUID = Field(..., alias="_id")
    name: str
    messages: List[MessageOut]

    class Config:
        orm_mode = True

class ChatSummary(BaseModel):
    _id: UUID
    name: str

    class Config:
        from_attributes = True  # instead of deprecated orm_mode

class ChatListResponse(BaseModel):
    chats: List[ChatSummary]
