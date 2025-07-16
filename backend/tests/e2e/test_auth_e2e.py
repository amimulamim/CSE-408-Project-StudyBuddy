import os
import requests
import pytest
from tests.e2e.utils.get_firebase_token import get_id_token
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("E2E_BASE_URL")

@pytest.mark.skip(reason="E2E test requires external app connectivity")
def test_login_real_token():
    # Debug: Print environment variables
    print(f"FIREBASE_TEST_EMAIL: {os.getenv('FIREBASE_TEST_EMAIL')}")
    print(f"FIREBASE_API_KEY: {os.getenv('FIREBASE_API_KEY')[:10] if os.getenv('FIREBASE_API_KEY') else 'None'}...")
    print(f"E2E_BASE_URL: {os.getenv('E2E_BASE_URL')}")
    
    token = get_id_token(
        os.getenv("FIREBASE_TEST_EMAIL"),
        os.getenv("FIREBASE_TEST_PASSWORD"),
        os.getenv("FIREBASE_API_KEY")
    )
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{BASE_URL}/auth/login", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == os.getenv("FIREBASE_TEST_EMAIL")
