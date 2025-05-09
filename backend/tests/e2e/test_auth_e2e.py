import os
import requests
from dotenv import load_dotenv

# ✅ Adjust import based on location
from tests.e2e.utils.get_firebase_token import get_id_token

# ✅ Load .env config
load_dotenv()

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:8000/api/v1")
FIREBASE_EMAIL = os.getenv("FIREBASE_TEST_EMAIL")
FIREBASE_PASSWORD = os.getenv("FIREBASE_TEST_PASSWORD")
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")


def test_login_real_token():
    # Step 1: Get a real ID token using Firebase credentials
    firebase_token = get_id_token(FIREBASE_EMAIL, FIREBASE_PASSWORD, FIREBASE_API_KEY)

    headers = {"Authorization": f"Bearer {firebase_token}"}

    # Step 2: Send the login request to the Dockerized backend
    response = requests.post(f"{BASE_URL}/login", headers=headers)

    # Step 3: Assert the login works
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["email"] == FIREBASE_EMAIL
    assert "uid" in json_data
