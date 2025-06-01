import os
import uuid
from datetime import datetime, timedelta
import httpx
from sqlalchemy.orm import Session
from app.billing import db, schema
from app.core.config import settings
from typing import Optional

class BillingService:
    def __init__(self):
        self.store_id = settings.SSLCOMMERZ_STORE_ID
        self.store_password = settings.SSLCOMMERZ_STORE_PASSWORD
        self.base_url = "https://sandbox.sslcommerz.com" if settings.SSLCOMMERZ_SANDBOX else "https://secure.sslcommerz.com"

    async def create_checkout_session(
        self,
        db_session: Session,
        user_id: str,
        plan_id: str,
        success_url: str,
        cancel_url: str
    ) -> dict:
        # Get plan details
        plan = db_session.query(db.Plan).filter(db.Plan.id == plan_id).first()
        if not plan:
            raise ValueError("Invalid plan ID")

        # Generate unique transaction ID
        tran_id = f"SUB_{uuid.uuid4().hex[:16]}"

        # Create incomplete subscription (will be activated after payment)
        subscription = db.Subscription(
            user_id=user_id,
            plan_id=plan_id,
            status="incomplete",
            start_date=datetime.now()
        )
        db_session.add(subscription)
        db_session.commit()
        db_session.refresh(subscription)

        # Prepare SSLCommerz payload
        payload = {
            "store_id": self.store_id,
            "store_passwd": self.store_password,
            "total_amount": plan.price_cents / 100,  # Convert cents to main currency unit
            "currency": plan.currency,
            "tran_id": tran_id,
            "product_category": "subscription",
            "success_url": success_url,
            "fail_url": cancel_url,
            "cancel_url": cancel_url,
            "cus_name": user_id,  # You might want to get actual user name
            "cus_email": f"{user_id}@example.com",  # You might want to get actual email
            "cus_add1": "N/A",
            "cus_city": "N/A",
            "cus_postcode": "N/A",
            "cus_country": "Bangladesh",
            "cus_phone": "N/A",
            "shipping_method": "NO",
            "product_name": f"Subscription: {plan.name}",
            "product_profile": "general",
            "product_amount": plan.price_cents / 100,
            "subscription_id": str(subscription.id)
        }

        # Create checkout session
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/gwprocess/v3/api.php",
                data=payload
            )
            response.raise_for_status()
            result = response.json()
            # Debug: log the raw response from SSLCommerz
            print(f"[BillingService] SSLCommerz response: {result}")

            # Return checkout URL if provided by SSLCommerz
            if result.get("GatewayPageURL"):
                return {
                    "checkout_url": result["GatewayPageURL"],
                    "subscription_id": str(subscription.id)
                }
            # Otherwise mark subscription failed and raise error with reason
            subscription.status = "failed"
            db_session.commit()
            reason = result.get("failedreason") or result.get("status") or "No checkout URL received"
            raise ValueError(f"Failed to create checkout session: {reason}")

    async def handle_webhook(self, db_session: Session, payload: dict) -> dict:
        # Store webhook event
        webhook_event = db.WebhookEvent(raw_payload=payload)
        db_session.add(webhook_event)
        db_session.commit()

        # Validate transaction
        if payload.get("status") != "VALID":
            return {"status": "failed", "message": "Invalid transaction"}

        # Get subscription
        subscription_id = payload.get("subscription_id")
        if not subscription_id:
            return {"status": "failed", "message": "No subscription ID found"}

        subscription = db_session.query(db.Subscription).filter(
            db.Subscription.id == subscription_id
        ).first()

        if not subscription:
            return {"status": "failed", "message": "Subscription not found"}

        # Update subscription status
        subscription.status = "active"
        subscription.end_date = datetime.now() + timedelta(days=30)  # For monthly plans
        db_session.commit()

        # Create payment record
        payment = db.Payment(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            amount_cents=int(float(payload["amount"]) * 100),
            currency=payload["currency"],
            provider="sslcommerz",
            provider_payment_id=payload["tran_id"],
            status="success"
        )
        db_session.add(payment)
        db_session.commit()

        return {"status": "success", "message": "Webhook processed successfully"}

    def get_subscription_status(self, db_session: Session, user_id: str) -> Optional[schema.SubscriptionResponse]:
        subscription = db_session.query(db.Subscription).filter(
            db.Subscription.user_id == user_id,
            db.Subscription.status == "active",
            db.Subscription.end_date > datetime.now()
        ).first()

        if subscription:
            return schema.SubscriptionResponse.from_orm(subscription)
        return None

    def cancel_subscription(self, db_session: Session, user_id: str) -> bool:
        subscription = db_session.query(db.Subscription).filter(
            db.Subscription.user_id == user_id,
            db.Subscription.status == "active"
        ).first()

        if not subscription:
            return False

        subscription.status = "canceled"
        subscription.cancel_at = datetime.now()
        db_session.commit()
        return True