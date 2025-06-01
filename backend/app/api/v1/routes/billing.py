from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.firebase_auth import get_current_user
from app.billing import service, schema
from typing import Optional

router = APIRouter()
billing_service = service.BillingService()

@router.post("/subscribe")
async def create_subscription(
    checkout: schema.CheckoutSession,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = await billing_service.create_checkout_session(
            db_session=db,
            user_id=current_user,
            plan_id=checkout.plan_id,
            success_url=checkout.success_url,
            cancel_url=checkout.cancel_url
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create subscription")

@router.get("/status")
def get_subscription_status(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Optional[schema.SubscriptionResponse]:
    subscription = billing_service.get_subscription_status(db_session=db, user_id=current_user)
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    return subscription

@router.post("/cancel")
def cancel_subscription(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if billing_service.cancel_subscription(db_session=db, user_id=current_user):
        return {"message": "Subscription cancelled successfully"}
    raise HTTPException(status_code=404, detail="No active subscription found")

@router.post("/webhook")
async def handle_webhook(
    payload: dict,
    db: Session = Depends(get_db)
):
    try:
        result = await billing_service.handle_webhook(db_session=db, payload=payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process webhook") 