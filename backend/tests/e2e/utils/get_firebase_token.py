import os
import requests
from dotenv import load_dotenv
from get_firebase_token import get_id_token

# Load environment variables from .env
load_dotenv()

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:8000/api/v1")
FIREBASE_EMAIL = os.getenv("FIREBASE_TEST_EMAIL")
FIREBASE_PASSWORD = os.getenv("FIREBASE_TEST_PASSWORD")
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")


def test_login_real_token():
    # ✅ Step 1: Get real ID token
    firebase_token = get_id_token(FIREBASE_EMAIL, FIREBASE_PASSWORD, FIREBASE_API_KEY)

    headers = {"Authorization": f"Bearer {firebase_token}"}

    # ✅ Step 2: Send request to your API
    response = requests.post(f"{BASE_URL}/login", headers=headers)

    # ✅ Step 3: Assert response correctness
    assert response.status_code == 200
    response_json = response.json()
    assert "email" in response_json
    assert response_json["email"] == FIREBASE_EMAIL
