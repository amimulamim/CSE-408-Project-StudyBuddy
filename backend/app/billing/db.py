from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

# For SQLite compatibility, use String for UUIDs and Text for JSON

class Plan(Base):
    __tablename__ = "plans"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    price_cents = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, default="BDT")
    interval = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False)
    plan_id = Column(String, ForeignKey("plans.id"), nullable=False)
    status = Column(String, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    end_date = Column(DateTime(timezone=True))
    cancel_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False)
    subscription_id = Column(String(36), ForeignKey("subscriptions.id"))
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, default="BDT")
    provider = Column(String, nullable=False)
    provider_payment_id = Column(String)
    status = Column(String)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    raw_payload = Column(Text, nullable=False)  # JSON as text for SQLite compatibility
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    processed = Column(Boolean, default=False) 