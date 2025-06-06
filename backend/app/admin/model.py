from sqlalchemy import Column, String, Boolean, TIMESTAMP, Text, func, Integer
from app.core.database import Base
import json

class AdminLog(Base):
    """Model for tracking admin actions and audit logs"""
    __tablename__ = "admin_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    admin_uid = Column(String, nullable=False, index=True)  # Admin who performed the action
    action_type = Column(String, nullable=False)  # e.g., 'user_edit', 'user_delete', 'promote_admin'
    target_uid = Column(String, nullable=True, index=True)  # User being acted upon (if applicable)
    target_type = Column(String, nullable=False)  # e.g., 'user', 'content', 'notification'
    details = Column(Text, nullable=True)  # JSON string with action details
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    @property
    def details_dict(self):
        """Convert JSON string to dict for Python usage"""
        if not self.details:
            return {}
        try:
            return json.loads(self.details)
        except json.JSONDecodeError:
            return {}

    @details_dict.setter
    def details_dict(self, value):
        """Convert dict to JSON string for database storage"""
        if value is None:
            self.details = None
        else:
            self.details = json.dumps(value)


class Notification(Base):
    """Model for admin-managed notifications"""
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)  # UUID
    recipient_uid = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, nullable=False, default="info")  # info, warning, success, error
    is_read = Column(Boolean, nullable=False, default=False)
    created_by = Column(String, nullable=True)  # Admin UID who created it
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class SystemStats(Base):
    """Model for storing system statistics"""
    __tablename__ = "system_stats"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    stat_type = Column(String, nullable=False)  # daily, weekly, monthly
    date = Column(String, nullable=False)  # YYYY-MM-DD format
    users_added = Column(Integer, nullable=False, default=0)
    content_generated = Column(Integer, nullable=False, default=0)
    quiz_generated = Column(Integer, nullable=False, default=0)
    content_uploaded = Column(Integer, nullable=False, default=0)
    chats_done = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
