from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class PlanBase(BaseModel):
    id: str
    name: str
    price_cents: int
    currency: str = "BDT"
    interval: str
    is_active: bool = True

class PlanCreate(PlanBase):
    pass

class PlanResponse(PlanBase):
    class Config:
        from_attributes = True

class SubscriptionBase(BaseModel):
    user_id: str
    plan_id: str
    status: str
    start_date: datetime
    end_date: Optional[datetime] = None
    cancel_at: Optional[datetime] = None

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionResponse(SubscriptionBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CheckoutSession(BaseModel):
    plan_id: str
    frontend_base_url: str

class PaymentBase(BaseModel):
    user_id: str
    subscription_id: Optional[str] = None
    amount_cents: int
    currency: str = "BDT"
    provider: str
    provider_payment_id: Optional[str] = None
    status: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 