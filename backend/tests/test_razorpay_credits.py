import pytest
import os
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Set environment variables for tests before importing main app
os.environ["RAZORPAY_KEY_ID"] = "rzp_test_mock"
os.environ["RAZORPAY_KEY_SECRET"] = "mock_secret_12345"

from app.main import app
from app.core.security import AuthContext
from app.models.schema import OrganizationProfile

client = TestClient(app)

@pytest.fixture
def auth_context():
    return AuthContext(
        user_id="test-user-uid",
        tenant_id="test-user-uid",
        role="owner",
        claims={"email": "test@example.com"},
    )

def test_create_order_insufficient_params(auth_context):
    with patch("app.main.authenticate_request", return_value=auth_context):
        response = client.post(
            "/api/create-order",
            headers={"Authorization": "Bearer test-token"},
            json={},
        )
        assert response.status_code == 422

@patch("razorpay.Client")
def test_create_order_success(mock_razorpay_client, auth_context):
    # Setup mock razorpay response
    mock_rzp_instance = MagicMock()
    mock_rzp_instance.order.create.return_value = {
        "id": "order_test123",
        "amount": 170000,
        "currency": "INR"
    }
    mock_razorpay_client.return_value = mock_rzp_instance

    with patch("app.main.authenticate_request", return_value=auth_context):
        # Call create-order for starter plan
        response = client.post(
            "/api/create-order",
            headers={"Authorization": "Bearer test-token"},
            json={"plan_id": "starter"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["order_id"] == "order_test123"
        assert data["amount"] == 170000
        assert data["currency"] == "INR"
        assert data["credits"] == 100

@patch("hmac.compare_digest")
def test_verify_payment_success(mock_compare_digest, auth_context):
    # Mock hmac comparison to succeed
    mock_compare_digest.return_value = True

    # Setup dummy database profile with correct schema fields
    dummy_profile = OrganizationProfile(
        id="test-user-uid",
        tenant_id="test-user-uid",
        user_id="test-user-uid",
        auth_email="test@example.com",
        credits=10
    )

    with patch("app.main.SessionLocal") as mock_session_local, \
         patch("app.main.authenticate_request", return_value=auth_context):
        
        # Mock database session
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = dummy_profile
        mock_session_local.return_value = mock_db

        payload = {
            "razorpay_payment_id": "pay_123",
            "razorpay_order_id": "order_123",
            "razorpay_signature": "sig_123",
            "plan_id": "starter",
            "credits": 0
        }
        
        response = client.post(
            "/api/verify-payment",
            headers={"Authorization": "Bearer test-token"},
            json=payload,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["profile"]["credits"] == 110  # 10 initial + 100 starter credits
