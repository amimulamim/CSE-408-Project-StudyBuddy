from sqlalchemy import Column, String
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    uid = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String,nullable=True)
    avatar = Column(String, nullable=True)
    institution = Column(String, nullable=True)
    role = Column(String,nullable=True)
    
