from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.firebase_auth import get_current_user
from app.billing import service, schema, db
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter()
billing_service = service.BillingService()

@router.post("/subscribe")
async def create_subscription(
    checkout: schema.CheckoutSession,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # extract user_id from Firebase token payload
    user_id = current_user.get("uid")
    try:
        result = await billing_service.create_checkout_session(
            db_session=db,
            user_id=user_id,
            plan_id=checkout.plan_id,
            frontend_base_url=checkout.frontend_base_url
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create subscription")

@router.get("/status")
def get_subscription_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Optional[schema.SubscriptionResponse]:
    # extract user_id from Firebase token payload
    user_id = current_user.get("uid")
    return billing_service.get_subscription_status(db_session=db, user_id=user_id)

@router.post("/cancel")
def cancel_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # extract user_id from Firebase token payload
    user_id = current_user.get("uid")
    if billing_service.cancel_subscription(db_session=db, user_id=user_id):
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
        print(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process webhook")

@router.get("/success")
async def payment_success(
    subscription_id: str = None,
    tran_id: str = None,
    db: Session = Depends(get_db)
):
    """Handle successful payment redirect from SSLCommerz"""
    try:
        # Get subscription
        subscription = db.query(db.Subscription).filter(db.Subscription.id == subscription_id).first()
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        # If subscription is already active, just return success
        if subscription.status == "active":
            return {"message": "Payment already processed", "subscription_id": subscription_id}

        # If subscription is incomplete, update it to active
        if subscription.status == "incomplete":
            subscription.status = "active"
            # Set end date based on plan interval
            if subscription.plan_id.endswith("_yearly"):
                subscription.end_date = datetime.now() + timedelta(days=365)
            else:
                subscription.end_date = datetime.now() + timedelta(days=30)
            db.commit()

        # Create payment record if not exists
        existing_payment = db.query(db.Payment).filter(
            db.Payment.subscription_id == subscription_id,
            db.Payment.provider_payment_id == tran_id
        ).first()

        if not existing_payment:
            payment = db.Payment(
                user_id=subscription.user_id,
                subscription_id=subscription.id,
                amount_cents=0,  # Amount will be updated by webhook
                currency="BDT",
                provider="sslcommerz",
                provider_payment_id=tran_id,
                status="success"
            )
            db.add(payment)
            db.commit()

        return {
            "message": "Payment successful",
            "subscription_id": subscription_id,
            "transaction_id": tran_id,
            "status": "success"
        }
    except Exception as e:
        print(f"Payment success error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process payment success")

@router.get("/cancel") 
async def payment_cancel(
    subscription_id: str = None,
    tran_id: str = None,
    db: Session = Depends(get_db)
):
    """Handle payment cancellation redirect from SSLCommerz"""
    # Mark the subscription as failed if it exists
    if subscription_id:
        try:
            subscription = db.query(db.Subscription).filter(db.Subscription.id == subscription_id).first()
            if subscription and subscription.status == "incomplete":
                subscription.status = "failed"
                db.commit()
        except Exception:
            pass  # Don't fail the redirect if DB update fails
    
    return {"message": "Payment cancelled", "subscription_id": subscription_id, "transaction_id": tran_id}