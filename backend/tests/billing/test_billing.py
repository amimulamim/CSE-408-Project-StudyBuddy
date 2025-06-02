import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock
import httpx
import hashlib

def generate_sslcommerz_signature(payload, store_password):
    verify_key = payload["verify_key"]
    keys = verify_key.split(",")
    base_string = "&".join(f"{k}={payload.get(k, '')}" for k in keys)
    base_string += f"&store_passwd={store_password}"
    return hashlib.md5(base_string.encode()).hexdigest()

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.core.database import get_db
    from app.billing import db
    from app.users.model import User
    from app.auth.firebase_auth import get_current_user
from datetime import datetime, timedelta
import uuid

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_db():
    # Use the actual database session from dependency injection
    def override_get_db():
        from app.core.database import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Return a test database session for fixture use
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Clean up the override
        if get_db in app.dependency_overrides:
            del app.dependency_overrides[get_db]

@pytest.fixture
def mock_auth():
    def mock_get_current_user():
        return {"uid": "test_user"}  # Return dict mimicking Firebase token structure
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(mock_db):
    """Create a test user in the database"""
    # Check if user already exists
    existing_user = mock_db.query(User).filter(User.uid == "test_user").first()
    if existing_user:
        return existing_user
    
    user = User(
        uid="test_user",
        email="test@example.com",
        name="Test User",
        auth_provider="email",
        institution="Test University",
        role="student"
    )
    mock_db.add(user)
    mock_db.commit()
    return user

@pytest.fixture
def sample_plan(mock_db):
    # Check if plan already exists
    existing_plan = mock_db.query(db.Plan).filter(db.Plan.id == "premium_monthly").first()
    if existing_plan:
        return existing_plan
    
    plan = db.Plan(
        id="premium_monthly",
        name="Premium Monthly",
        price_cents=100000,  # 1000 BDT
        currency="BDT",
        interval="monthly",
        is_active=True
    )
    mock_db.add(plan)
    mock_db.commit()
    return plan

@pytest.fixture
def sample_subscription(mock_db, sample_plan, test_user):
    subscription = db.Subscription(
        user_id=test_user.uid,
        plan_id=sample_plan.id,
        status="incomplete",  # Changed from "active" to "incomplete" for webhook testing
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=30)
    )
    mock_db.add(subscription)
    mock_db.commit()
    return subscription

@pytest.fixture  
def active_subscription(mock_db, sample_plan, test_user):
    subscription = db.Subscription(
        user_id=test_user.uid,
        plan_id=sample_plan.id,
        status="active",
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=30)
    )
    mock_db.add(subscription)
    mock_db.commit()
    return subscription

def test_create_checkout_session(client, mock_db, sample_plan, test_user, mock_auth):
    # Mock the BillingService to avoid HTTP requests
    with patch('app.billing.service.BillingService.create_checkout_session') as mock_create:
        # Mock the service method to return a successful response
        mock_create.return_value = {
            "checkout_url": "https://sandbox.sslcommerz.com/gwprocess/v3/api.php?Q=pay&SESSIONKEY=test_session",
            "subscription_id": "test-subscription-id"
        }
        
        response = client.post(
            "/api/v1/billing/subscribe",
            json={
                "plan_id": sample_plan.id,
                "frontend_base_url": "http://localhost:3000"
                # "success_url": "http://localhost:3000/success",
                # "cancel_url": "http://localhost:3000/cancel"
            },
            headers={"Authorization": "Bearer test_token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "checkout_url" in data
        assert "subscription_id" in data

def test_get_subscription_status(client, mock_db, active_subscription, mock_auth):
    response = client.get(
        "/api/v1/billing/status",
        headers={"Authorization": "Bearer test_token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["plan_id"] == active_subscription.plan_id
    assert data["status"] == "active"

def test_cancel_subscription(client, mock_db, active_subscription, mock_auth):
    response = client.post(
        "/api/v1/billing/cancel",
        headers={"Authorization": "Bearer test_token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Subscription cancelled successfully"

def test_handle_webhook(client, mock_db, sample_subscription, mock_auth):
    from app.billing.service import BillingService
    billing_service = BillingService()

    webhook_payload = {
        "status": "VALID",
        "val_id": "123456789",
        "store_id": billing_service.store_id,
        "value_c": str(sample_subscription.id),
        "amount": "1000.00",
        "currency": "BDT",
        "tran_date": "2024-01-01 12:00:00",
        "tran_id": "TEST_TRANS_123",
        "verify_key": "val_id,store_id,amount,currency,tran_date,tran_id"
    }
    webhook_payload["verify_sign"] = generate_sslcommerz_signature(webhook_payload, billing_service.store_password)

    response = client.post(
        "/api/v1/billing/webhook",
        data=webhook_payload
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"

def test_invalid_plan_id(client, mock_db, test_user, mock_auth):
    # Ensure no active subscriptions exist for this test
    # First delete related payments to avoid foreign key constraint violations
    active_subscriptions = mock_db.query(db.Subscription).filter(
        db.Subscription.user_id == test_user.uid,
        db.Subscription.status == "active"
    ).all()
    
    for subscription in active_subscriptions:
        # Delete related payments first
        mock_db.query(db.Payment).filter(
            db.Payment.subscription_id == subscription.id
        ).delete()
        mock_db.flush()  # Ensure payments are deleted before subscription
    
    # Now delete subscriptions
    mock_db.query(db.Subscription).filter(
        db.Subscription.user_id == test_user.uid,
        db.Subscription.status == "active"
    ).delete()
    mock_db.commit()
    
    response = client.post(
        "/api/v1/billing/subscribe",
        json={
            "plan_id": "invalid_plan",
            "frontend_base_url": "http://localhost:3000"
            # "success_url": "http://localhost:3000/success",
            # "cancel_url": "http://localhost:3000/cancel"
        },
        headers={"Authorization": "Bearer test_token"}
    )
    assert response.status_code == 400
    data = response.json()
    assert "Invalid plan ID" in data["detail"]

def test_webhook_signature_validation(mock_db, sample_subscription):
    """Test webhook signature validation"""
    from app.billing.service import BillingService
    billing_service = BillingService()

    test_payload = {
        "val_id": "123456789",
        "store_id": billing_service.store_id,
        "amount": "1000.00",
        "currency": "BDT",
        "tran_date": "2024-01-01 12:00:00",
        "tran_id": "TEST_TRANS_123",
        "status": "VALID",
        "value_c": str(sample_subscription.id),
        "verify_key": "val_id,store_id,amount,currency,tran_date,tran_id"
    }
    test_payload["verify_sign"] = generate_sslcommerz_signature(test_payload, billing_service.store_password)
    assert billing_service._validate_webhook_signature(test_payload) == True

    # Test invalid signature
    test_payload["verify_sign"] = "invalid_signature"
    assert billing_service._validate_webhook_signature(test_payload) == False

    # Test missing verify_sign
    del test_payload["verify_sign"]
    assert billing_service._validate_webhook_signature(test_payload) == False

    # Test missing verify_key
    test_payload["verify_sign"] = generate_sslcommerz_signature(test_payload, billing_service.store_password)
    del test_payload["verify_key"]
    assert billing_service._validate_webhook_signature(test_payload) == False

    # Test invalid verify_key
    test_payload["verify_key"] = "wrong_key1,wrong_key2"
    test_payload["verify_sign"] = generate_sslcommerz_signature(test_payload, billing_service.store_password)
    assert billing_service._validate_webhook_signature(test_payload) == False

def test_handle_webhook_with_invalid_signature(client, mock_db, sample_subscription):
    """Test webhook handling rejects invalid signatures"""
    from app.billing.service import BillingService
    billing_service = BillingService()
    webhook_payload = {
        "status": "VALID",
        "val_id": "123456789",
        "store_id": billing_service.store_id,
        "value_c": str(sample_subscription.id),
        "amount": "1000.00",
        "currency": "BDT",
        "tran_date": "2024-01-01 12:00:00",
        "tran_id": "TEST_TRANS_123",
        "verify_key": "val_id,store_id,amount,currency,tran_date,tran_id",
        "verify_sign": "invalid_signature"
    }
    response = client.post(
        "/api/v1/billing/webhook",
        data=webhook_payload
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "failed"
    assert "Invalid webhook signature" in data["message"]