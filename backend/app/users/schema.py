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


class SecureProfileEdit(BaseModel):
    """
    Secure schema for regular user profile edits - only allows safe fields.
    Excludes administrative and system fields for security.
    """
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="User's display name")
    bio: Optional[str] = Field(None, max_length=500, description="User's bio/description")
    avatar: Optional[str] = Field(None, description="Profile picture URL")
    institution: Optional[str] = Field(None, max_length=200, description="Educational institution")
    role: Optional[UserRole] = Field(None, description="User's professional role")
    location: Optional[str] = Field(None, max_length=100, description="User's location")
    study_domain: Optional[str] = Field(None, max_length=100, description="Field of study")
    interests: Optional[str] = Field(None, description="Comma-separated interests. Use +item to add, -item to remove")

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


class EmailChangeRequest(BaseModel):
    """
    Schema for email change requests - should trigger verification process
    """
    new_email: EmailStr = Field(..., description="New email address")
    password: Optional[str] = Field(None, description="Current password for verification")


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


class EmailVerificationToken(BaseModel):
    """Schema for email verification tokens"""
    token: str = Field(..., description="Verification token")
    uid: str = Field(..., description="User ID")
    new_email: EmailStr = Field(..., description="New email to verify")
    expires_at: str = Field(..., description="Token expiration timestamp")


class EmailVerificationResponse(BaseModel):
    """Response schema for email verification"""
    message: str
    status: str
    verification_sent_to: str
    expires_in_minutes: int = 30


class VerifyEmailChangeRequest(BaseModel):
    """Schema for verifying email change with token"""
    token: str = Field(..., description="Verification token received via email")


class AuditLogEntry(BaseModel):
    """Schema for audit logging"""
    user_id: str
    action: str = Field(..., description="Action performed (e.g., 'profile_update', 'email_change')")
    changes: dict = Field(..., description="Dictionary of field changes")
    timestamp: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
