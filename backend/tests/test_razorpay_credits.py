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


def test_account_profile_defaults_to_free_trial_credits(auth_context):
    with patch("app.main.authenticate_request", return_value=auth_context), \
         patch("app.main.SessionLocal") as mock_session_local:
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_session_local.return_value = mock_db

        response = client.put(
            "/account/profile",
            headers={"Authorization": "Bearer test-token"},
            json={
                "full_name": "Test User",
                "company_name": "Test Co",
                "job_title": "Recruiter",
                "company_size": "1-10",
                "hiring_volume": "1-5",
                "work_email": "test@example.com",
            },
        )

        assert response.status_code == 200
        added_profile = mock_db.add.call_args[0][0]
        assert added_profile.credits == 10

def test_create_order_success(auth_context):
    # Setup mock razorpay response
    mock_rzp_instance = MagicMock()
    mock_rzp_instance.order.create.return_value = {
        "id": "order_test123",
        "amount": 173400,
        "currency": "INR"
    }

    with patch("app.main.RAZORPAY_CLIENT", mock_rzp_instance), \
         patch("app.main.authenticate_request", return_value=auth_context):
        # Call create-order for starter plan
        response = client.post(
            "/api/create-order",
            headers={"Authorization": "Bearer test-token"},
            json={"plan_id": "starter"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["order_id"] == "order_test123"
        assert data["amount"] == 173400
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
        
        # Verify transaction record was added with 2% platform fee (1700 * 1.02 = 1734)
        added_tx = mock_db.add.call_args[0][0]
        assert added_tx.amount == 1734
