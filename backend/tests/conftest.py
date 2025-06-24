import pytest
import os
import tempfile
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
import firebase_admin
from firebase_admin import credentials

# Set test environment variables before any imports
os.environ.setdefault("TESTING", "1")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("FIREBASE_KEY_PATH", "/tmp/test_firebase_key.json")
os.environ.setdefault("FIREBASE_STORAGE_BUCKET", "test-bucket")
os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("GEMINI_MODEL", "test-model")
os.environ.setdefault("QDRANT_HOST", "localhost")
os.environ.setdefault("QDRANT_API_KEY", "test-key")
os.environ.setdefault("QDRANT_COLLECTION_NAME", "test-collection")

# Create a mock Firebase key file for testing
test_firebase_key = {
    "type": "service_account",
    "project_id": "test-project",
    "private_key_id": "test-key-id",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
    "client_email": "test@test-project.iam.gserviceaccount.com",
    "client_id": "123456789",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token"
}

import json
with open("/tmp/test_firebase_key.json", "w") as f:
    json.dump(test_firebase_key, f)

# Mock Firebase services before any Firebase imports
@pytest.fixture(scope="session", autouse=True)
def mock_firebase():
    """Mock Firebase services for testing."""
    
    # Mock Firebase Admin initialization
    with patch('firebase_admin.initialize_app') as mock_init, \
         patch('firebase_admin.credentials.Certificate') as mock_cert, \
         patch('firebase_admin.storage.bucket') as mock_bucket, \
         patch('firebase_admin._apps', [MagicMock()]):  # Mock apps to prevent re-initialization
        
        # Configure mock bucket
        mock_bucket_instance = MagicMock()
        mock_bucket.return_value = mock_bucket_instance
        
        yield {
            'init_app': mock_init,
            'certificate': mock_cert,
            'bucket': mock_bucket_instance
        }

@pytest.fixture(scope="session")
def test_db():
    """Create a test database."""
    engine = create_engine("sqlite:///:memory:", echo=True)
    from app.core.database import Base
    Base.metadata.create_all(bind=engine)
    
    test_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return test_session_local

@pytest.fixture
def client():
    """Create a test client."""
    # Import app after Firebase is mocked
    from app.main import app
    return TestClient(app)

@pytest.fixture
def db_session(test_db):
    """Create a database session for testing."""
    session = test_db()
    try:
        yield session
    finally:
        session.close()

# Mock external services
@pytest.fixture(autouse=True)
def mock_external_services():
    """Mock external services like Google AI, Qdrant, etc."""
    with patch('google.generativeai.configure'), \
         patch('google.generativeai.GenerativeModel'), \
         patch('google.generativeai.embed_content'), \
         patch('qdrant_client.QdrantClient'), \
         patch('chromadb.Client'):
        yield