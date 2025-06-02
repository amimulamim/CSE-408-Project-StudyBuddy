import os
import uuid
from datetime import datetime, timedelta
import hashlib
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
        frontend_base_url: str
    ) -> dict:
        # Check for existing active subscription
        existing_subscription = db_session.query(db.Subscription).filter(
            db.Subscription.user_id == user_id,
            db.Subscription.status == "active",
            db.Subscription.end_date > datetime.now()
        ).first()
        
        if existing_subscription:
            raise ValueError("User already has an active subscription. Please cancel your current subscription before subscribing to a new plan.")

        # Get plan details
        plan = db_session.query(db.Plan).filter(db.Plan.id == plan_id).first()
        if not plan:
            raise ValueError("Invalid plan ID")
        
        if not plan.is_active:
            raise ValueError("This plan is no longer available")

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

        # Construct success and cancel URLs using the real subscription_id
        success_url = f"{frontend_base_url}/dashboard/billing?success=true&subscription_id={subscription.id}"
        cancel_url = f"{frontend_base_url}/dashboard/billing?canceled=true&subscription_id={subscription.id}"

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
            "ipn_url": f"{settings.BACKEND_URL}/api/v1/billing/webhook",  # Webhook URL
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
            "value_c": str(subscription.id),  # Store subscription ID in custom field
            "value_d": str(subscription.id)   # Store subscription ID in another custom field for redundancy
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
        import json
        webhook_event = db.WebhookEvent(
            raw_payload=json.dumps(payload),
            received_at=datetime.now()
        )
        db_session.add(webhook_event)
        db_session.commit()

        print(f"[BillingService] Received webhook: {json.dumps(payload, indent=2)}")

        # Validate webhook signature for security
        if not self._validate_webhook_signature(payload):
            print("[BillingService] Invalid webhook signature. Aborting update.")
            return {"status": "failed", "message": "Invalid webhook signature"}

        # SSLCommerz sends different status values, check for successful payment
        status = payload.get("status", "").upper()
        print(f"[BillingService] Webhook status: {status}")
        if status not in ["VALID", "VALIDATED"]:
            print(f"[BillingService] Invalid transaction status: {status}. Aborting update.")
            return {"status": "failed", "message": f"Invalid transaction status: {status}"}

        # Get subscription ID - check different possible field names
        subscription_id = None
        if payload.get("subscription_id"):
            subscription_id = payload.get("subscription_id")
        elif payload.get("value_c"):  # SSLCommerz custom field
            subscription_id = payload.get("value_c")
        elif payload.get("value_d"):
            subscription_id = payload.get("value_d")
        elif payload.get("tran_id", "").startswith("SUB_"):
            subscription_id = payload.get("tran_id", "").replace("SUB_", "")

        print(f"[BillingService] Found subscription_id: {subscription_id}")
        if not subscription_id:
            print("[BillingService] No subscription ID found in webhook payload. Aborting update.")
            return {"status": "failed", "message": "No subscription ID found in webhook payload"}

        # Convert string to UUID string for database query
        try:
            if isinstance(subscription_id, str):
                uuid.UUID(subscription_id)  # Just for validation
                subscription_uuid_str = subscription_id
            else:
                subscription_uuid_str = str(subscription_id)
            print(f"[BillingService] Using subscription ID: {subscription_uuid_str}")
        except (ValueError, TypeError) as e:
            print(f"[BillingService] UUID validation failed: {e}. Aborting update.")
            return {"status": "failed", "message": f"Invalid subscription ID format: {subscription_id}"}

        subscription = db_session.query(db.Subscription).filter(
            db.Subscription.id == subscription_uuid_str
        ).first()

        print(f"[BillingService] Found subscription: {subscription}")
        if not subscription:
            print(f"[BillingService] Subscription not found: {subscription_id}. Aborting update.")
            return {"status": "failed", "message": f"Subscription not found: {subscription_id}"}

        # Update subscription status if it's not already active
        if subscription.status != "active":
            subscription.status = "active"
            if subscription.plan_id.endswith("_yearly"):
                subscription.end_date = datetime.now() + timedelta(days=365)
            else:
                subscription.end_date = datetime.now() + timedelta(days=30)
            db_session.commit()
            print(f"[BillingService] Updated subscription status to active: {subscription_id}")
        else:
            print(f"[BillingService] Subscription already active: {subscription_id}")

        # Create or update payment record
        amount_str = payload.get("amount", "0")
        try:
            amount_cents = int(float(amount_str) * 100)
        except (ValueError, TypeError):
            amount_cents = 0

        existing_payment = db_session.query(db.Payment).filter(
            db.Payment.subscription_id == subscription.id,
            db.Payment.provider_payment_id == payload.get("tran_id")
        ).first()

        if existing_payment:
            existing_payment.amount_cents = amount_cents
            existing_payment.status = "success"
            existing_payment.updated_at = datetime.now()
            print(f"[BillingService] Updated existing payment record: {existing_payment.id}")
        else:
            payment = db.Payment(
                user_id=subscription.user_id,
                subscription_id=subscription.id,
                amount_cents=amount_cents,
                currency=payload.get("currency", "BDT"),
                provider="sslcommerz",
                provider_payment_id=payload.get("tran_id"),
                status="success"
            )
            db_session.add(payment)
            print(f"[BillingService] Created new payment record for subscription: {subscription_id}")

        db_session.commit()
        print(f"[BillingService] Successfully processed webhook for subscription: {subscription_id}")

        return {"status": "success", "message": "Webhook processed successfully"}

    def get_subscription_status(self, db_session: Session, user_id: str) -> Optional[schema.SubscriptionResponse]:
        # First try to get active subscription
        subscription = db_session.query(db.Subscription).filter(
            db.Subscription.user_id == user_id,
            db.Subscription.status == "active",
            db.Subscription.end_date > datetime.now()
        ).first()

        # If no active subscription, get the most recent one to show status
        if not subscription:
            subscription = db_session.query(db.Subscription).filter(
                db.Subscription.user_id == user_id
            ).order_by(db.Subscription.created_at.desc()).first()

        if subscription:
            # Convert to dict to handle UUID serialization
            subscription_dict = {
                'id': str(subscription.id),
                'user_id': str(subscription.user_id),
                'plan_id': str(subscription.plan_id),
                'status': subscription.status,
                'start_date': subscription.start_date,
                'end_date': subscription.end_date,
                'cancel_at': subscription.cancel_at,
                'created_at': subscription.created_at,
                'updated_at': subscription.updated_at
            }
            return schema.SubscriptionResponse.model_validate(subscription_dict)
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

    def _validate_webhook_signature(self, payload: dict) -> bool:
        """
        Validate SSLCommerz webhook signature for security.
        SSLCommerz provides verify_sign and verify_key parameters for validation.
        """
        # Get signature parameters from payload
        verify_sign = payload.get("verify_sign")
        verify_key = payload.get("verify_key")
        
        if not verify_sign or not verify_key:
            print(f"[BillingService] Missing signature parameters: verify_sign={verify_sign}, verify_key={verify_key}")
            return False
        
        # Validate verify_key matches store password
        if verify_key != self.store_password:
            print(f"[BillingService] Invalid verify_key: expected {self.store_password}, got {verify_key}")
            return False
        
        # Create signature string from key payload parameters
        # Based on SSLCommerz documentation, signature is typically created from:
        # val_id + store_id + store_passwd + amount + currency + tran_date + tran_id
        signature_string = (
            str(payload.get("val_id", "")) +
            str(payload.get("store_id", "")) +
            str(self.store_password) +
            str(payload.get("amount", "")) +
            str(payload.get("currency", "")) +
            str(payload.get("tran_date", "")) +
            str(payload.get("tran_id", ""))
        )
        
        # Create MD5 hash of signature string
        calculated_signature = hashlib.md5(signature_string.encode()).hexdigest()
        
        # Compare with provided signature
        if calculated_signature.lower() != verify_sign.lower():
            print(f"[BillingService] Signature mismatch: calculated={calculated_signature}, received={verify_sign}")
            return False
        
        print("[BillingService] Webhook signature validation successful")
        return True