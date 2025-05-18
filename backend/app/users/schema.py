from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserBase(BaseModel):
    uid: str
    email: EmailStr
    name: str = ""
    avatar: str = ""
    institution: str = ""
    role: str = "student"
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
    avatar: Optional[str] = None
    institution: Optional[str] = None
    role: Optional[str] = None
    current_plan: Optional[str] = None
    location: Optional[str] = None
    study_domain: Optional[str] = None
    interests: Optional[List[str]] = None
