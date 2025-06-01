from sqlalchemy import Column, String, Boolean, TIMESTAMP, Text, func
from app.core.database import Base
import json

class User(Base):
    __tablename__ = "users"

    uid = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False, default="User")
    bio = Column(String, nullable=True)
    institution = Column(String, nullable=False, default="")
    role = Column(String, nullable=False, default="student")
    avatar = Column(String, nullable=False, default="")
    auth_provider = Column(String, nullable=False, default="email")
    is_admin = Column(Boolean, nullable=False, default=False)
    is_moderator = Column(Boolean, nullable=False, default=False)
    moderator_id = Column(String, nullable=True)
    current_plan = Column(String, nullable=False, default="free")
    location = Column(String, nullable=False, default="")
    study_domain = Column(String, nullable=False, default="")
    _interests = Column("interests", Text, default='[]')  # JSON string for database compatibility
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def interests(self):
        """Convert JSON string to list for Python usage"""
        if not self._interests:
            return []
        try:
            return json.loads(self._interests)
        except (json.JSONDecodeError, TypeError):
            return []

    @interests.setter
    def interests(self, value):
        """Convert list to JSON string for database storage"""
        if isinstance(value, list):
            self._interests = json.dumps(value)
        elif isinstance(value, str):
            # If setting directly with JSON string (for database operations)
            self._interests = value
        else:
            self._interests = '[]'
