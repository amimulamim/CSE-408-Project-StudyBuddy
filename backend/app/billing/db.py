from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.database import Base

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

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
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

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(String, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"))
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, default="BDT")
    provider = Column(String, nullable=False)
    provider_payment_id = Column(String)
    status = Column(String)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    raw_payload = Column(JSONB, nullable=False)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    processed = Column(Boolean, default=False) 