from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Union

class UserBase(BaseModel):
    uid: str
    email: EmailStr
    name: str = ""
    bio: Optional[str] = None
    institution: str = ""
    role: str = "student"
    avatar: str = ""
    auth_provider: str = "email"
    is_admin: bool = False
    is_moderator: bool = False
    moderator_id: Optional[str] = None
    current_plan: str = "free"
    location: str = ""
    study_domain: str = ""
    interests: List[str] = []


class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    institution: Optional[str] = None
    role: Optional[str] = None
    avatar: Optional[str] = None
    current_plan: Optional[str] = None
    location: Optional[str] = None
    study_domain: Optional[str] = None
    interests: Optional[str] = None  # Changed to str to support +/- syntax


class ProfileEditRequest(BaseModel):
    """
    Schema for profile edit endpoint that supports array operations.
    For interests field: "+item" adds item, "-item" removes item, "item1,item2" replaces entire list
    """
    name: Optional[str] = None
    bio: Optional[str] = None
    institution: Optional[str] = None
    role: Optional[str] = None
    avatar: Optional[str] = None
    current_plan: Optional[str] = None
    location: Optional[str] = None
    study_domain: Optional[str] = None
    interests: Optional[str] = Field(None, description="Comma-separated interests. Use +item to add, -item to remove")


class UserProfile(BaseModel):
    """Response schema for user profile"""
    uid: str
    email: EmailStr
    name: str
    bio: Optional[str] = None
    institution: str
    role: str
    avatar: str
    current_plan: str
    location: str
    study_domain: str
    interests: List[str]
    
    class Config:
        from_attributes = True
