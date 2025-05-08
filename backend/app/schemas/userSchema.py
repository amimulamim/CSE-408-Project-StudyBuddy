from pydantic import BaseModel

class UserBase(BaseModel):
    uid: str
    email: str
    name: str | None = None
    avatar: str | None = None
    institution: str | None = None
    role: str | None = None

class UserUpdate(BaseModel):
    name: str | None = None
    avatar: str | None = None
    institution: str | None = None
    role: str | None = None
