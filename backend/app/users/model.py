from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import ARRAY  
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    uid = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False, default="User")
    avatar = Column(String, nullable=False, default="")
    institution = Column(String, nullable=False, default="")
    role = Column(String, nullable=False, default="student")
    auth_provider = Column(String, nullable=False, default="email")
    is_admin = Column(Boolean, nullable=False, default=False)
    is_moderator = Column(Boolean, nullable=False, default=False)
    moderator_id = Column(String, nullable=True)
    current_plan = Column(String, nullable=False, default="free")
    location = Column(String, nullable=False, default="")
    study_domain = Column(String, nullable=False, default="")
    interests = Column(ARRAY(String), default=[])  # or use CSV string if not using ARRAY
