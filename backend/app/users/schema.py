from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Union
from enum import Enum
import re
import html

class UserRole(str, Enum):
    """Predefined user roles"""
    STUDENT = "student"
    TEACHER = "teacher"
    RESEARCHER = "researcher"
    DEVELOPER = "developer"
    OTHER = "other"

class UserBase(BaseModel):
    model_config = {"extra": "forbid"}
    
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


class SecureProfileEdit(BaseModel):
    """
    Secure schema for regular user profile edits - only allows safe fields.
    Excludes administrative and system fields for security.
    Users can volunteer to be content moderators but cannot set admin status.
    """
    model_config = {"extra": "forbid"}
    
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="User's display name")
    bio: Optional[str] = Field(None, max_length=500, description="User's bio/description")
    avatar: Optional[str] = Field(None, description="Profile picture URL. Send empty string to remove avatar.")
    institution: Optional[str] = Field(None, max_length=200, description="Educational institution")
    role: Optional[UserRole] = Field(None, description="User's professional role")
    location: Optional[str] = Field(None, max_length=100, description="User's location")
    study_domain: Optional[str] = Field(None, max_length=100, description="Field of study")
    interests: Optional[str] = Field(None, description="Comma-separated interests. Use +item to add, -item to remove")
    is_moderator: Optional[bool] = Field(None, description="User can volunteer to be a content moderator")

    @field_validator('bio')
    @classmethod
    def validate_bio(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) == 0:
            return None
        # Sanitize HTML to prevent XSS
        if v:
            v = html.escape(v.strip())
        return v
    
    @field_validator('avatar')
    @classmethod
    def validate_avatar(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v == "":  # Empty string means remove avatar
            return ""
        if v and not (v.startswith('http://') or v.startswith('https://') or v.startswith('data:')):
            raise ValueError('Avatar must be a valid URL or data URI')
        return v
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v:
            # First validate basic format (before HTML escaping)
            v_stripped = v.strip()
            if not re.match(r'^[a-zA-Z0-9\s\-\.\_<>&\'"()\/]+$', v_stripped):
                raise ValueError('Name contains invalid characters')
            # Then sanitize HTML to prevent XSS
            v = html.escape(v_stripped)
        return v


class AdminUserEdit(BaseModel):
    """
    Schema for admin edits - includes administrative fields.
    Only admins should be able to use this schema.
    """
    model_config = {"extra": "forbid"}
    
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    avatar: Optional[str] = None
    institution: Optional[str] = Field(None, max_length=200)
    role: Optional[UserRole] = None
    location: Optional[str] = Field(None, max_length=100)
    study_domain: Optional[str] = Field(None, max_length=100)
    interests: Optional[str] = None
    is_admin: Optional[bool] = None
    is_moderator: Optional[bool] = None
    current_plan: Optional[str] = None
    
    @field_validator('bio')
    @classmethod
    def validate_bio(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) == 0:
            return None
        if v:
            v = html.escape(v.strip())
        return v
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = html.escape(v.strip())
            if not re.match(r'^[a-zA-Z0-9\s\-\.\_]+$', v):
                raise ValueError('Name contains invalid characters')
        return v


class UserProfile(BaseModel):
    """Response schema for user profile"""
    model_config = {"extra": "forbid", "from_attributes": True}
    
    uid: str
    email: EmailStr
    name: str
    bio: Optional[str] = None
    institution: str
    role: str
    is_admin: bool
    is_moderator: bool
    avatar: str
    current_plan: str
    location: str
    study_domain: str
    interests: List[str]


class AuditLogEntry(BaseModel):
    """Schema for audit logging"""
    model_config = {"extra": "forbid"}
    
    user_id: str
    action: str = Field(..., description="Action performed (e.g., 'profile_update', 'email_change')")
    changes: dict = Field(..., description="Dictionary of field changes")
    timestamp: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
