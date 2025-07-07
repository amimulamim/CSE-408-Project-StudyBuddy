import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.config.openapi import setup_openapi


class TestOpenAPISetup:
    """Test OpenAPI configuration setup"""

    def setup_method(self):
        """Set up test dependencies"""
        self.app = FastAPI()

    def test_setup_openapi_function_exists(self):
        """Test that setup_openapi function is callable"""
        # Act & Assert
        assert callable(setup_openapi)

    def test_setup_openapi_basic_functionality(self):
        """Test basic setup_openapi functionality"""
        # Arrange
        assert self.app.openapi_schema is None
        
        # Act
        setup_openapi(self.app)
        
        # Assert
        assert hasattr(self.app, 'openapi')
        assert callable(self.app.openapi)

    def test_custom_openapi_schema_creation(self):
        """Test that custom_openapi creates the expected schema structure"""
        # Arrange
        setup_openapi(self.app)
        
        # Act
        schema = self.app.openapi()
        
        # Assert
        assert schema is not None
        assert "info" in schema
        assert "title" in schema["info"]
        assert schema["info"]["title"] == "StudyBuddy API"
        assert "version" in schema["info"]
        assert schema["info"]["version"] == "1.0.0"
        assert "description" in schema["info"]
        assert schema["info"]["description"] == "API for StudyBuddy with Firebase Auth"

    def test_bearer_auth_security_scheme_added(self):
        """Test that bearerAuth security scheme is properly added"""
        # Arrange
        setup_openapi(self.app)
        
        # Act
        schema = self.app.openapi()
        
        # Assert
        assert "components" in schema
        assert "securitySchemes" in schema["components"]
        assert "bearerAuth" in schema["components"]["securitySchemes"]
        
        bearer_auth = schema["components"]["securitySchemes"]["bearerAuth"]
        assert bearer_auth["type"] == "http"
        assert bearer_auth["scheme"] == "bearer"
        assert bearer_auth["bearerFormat"] == "JWT"

    def test_security_applied_to_endpoints(self):
        """Test that bearerAuth security is applied to all endpoints"""
        # Arrange
        @self.app.get("/test-endpoint")
        def test_endpoint():
            return {"message": "test"}
            
        setup_openapi(self.app)
        
        # Act
        schema = self.app.openapi()
        
        # Assert
        assert "paths" in schema
        if "/test-endpoint" in schema["paths"]:
            get_method = schema["paths"]["/test-endpoint"]["get"]
            assert "security" in get_method
            assert get_method["security"] == [{"bearerAuth": []}]

    def test_openapi_schema_caching(self):
        """Test that OpenAPI schema is cached after first generation"""
        # Arrange
        setup_openapi(self.app)
        
        # Act
        schema1 = self.app.openapi()
        schema2 = self.app.openapi()
        
        # Assert
        assert schema1 is schema2  # Same object reference (cached)
        assert self.app.openapi_schema is not None

    def test_openapi_with_existing_routes(self):
        """Test OpenAPI setup with existing routes"""
        # Arrange
        @self.app.get("/users")
        def get_users():
            return {"users": []}
            
        @self.app.post("/users")
        def create_user():
            return {"user": "created"}
            
        setup_openapi(self.app)
        
        # Act
        schema = self.app.openapi()
        
        # Assert
        assert "paths" in schema
        # Check that routes are included in the schema
        assert any("/users" in path for path in schema["paths"].keys())

    def test_openapi_with_no_routes(self):
        """Test OpenAPI setup with no existing routes"""
        # Arrange
        empty_app = FastAPI()
        
        # Act
        setup_openapi(empty_app)
        schema = empty_app.openapi()
        
        # Assert
        assert schema is not None
        assert "info" in schema
        assert schema["info"]["title"] == "StudyBuddy API"
        assert "components" in schema
        assert "securitySchemes" in schema["components"]

    def test_multiple_setup_calls(self):
        """Test that multiple calls to setup_openapi don't break functionality"""
        # Arrange & Act
        setup_openapi(self.app)
        setup_openapi(self.app)  # Second call
        
        schema = self.app.openapi()
        
        # Assert
        assert schema is not None
        assert schema["info"]["title"] == "StudyBuddy API"

    @patch('app.config.openapi.get_openapi')
    def test_get_openapi_called_with_correct_parameters(self, mock_get_openapi):
        """Test that get_openapi is called with correct parameters"""
        # Arrange
        mock_get_openapi.return_value = {
            "title": "StudyBuddy API",
            "version": "1.0.0",
            "description": "API for StudyBuddy with Firebase Auth",
            "paths": {},
            "components": {}
        }
        
        setup_openapi(self.app)
        
        # Act
        self.app.openapi()
        
        # Assert
        mock_get_openapi.assert_called_once_with(
            title="StudyBuddy API",
            version="1.0.0",
            description="API for StudyBuddy with Firebase Auth",
            routes=self.app.routes,
        )

    def test_security_not_overridden_if_already_exists(self):
        """Test that existing security in methods is not overridden"""
        # Arrange
        # Mock the get_openapi function to return a schema with existing security
        with patch('app.config.openapi.get_openapi') as mock_get_openapi:
            mock_get_openapi.return_value = {
                "openapi": "3.1.0",
                "info": {
                    "title": "StudyBuddy API",
                    "version": "1.0.0",
                    "description": "API for StudyBuddy with Firebase Auth",
                },
                "paths": {
                    "/test": {
                        "get": {
                            "security": [{"customAuth": []}]  # Existing security
                        }
                    }
                },
                "components": {}
            }
            
            setup_openapi(self.app)
            
            # Act
            schema = self.app.openapi()
            
            # Assert
            # The existing security should be preserved
            test_path = schema["paths"]["/test"]["get"]
            assert test_path["security"] == [{"customAuth": []}]

    def test_components_created_if_not_exists(self):
        """Test that components section is created if it doesn't exist"""
        # Arrange
        with patch('app.config.openapi.get_openapi') as mock_get_openapi:
            # Return schema without components
            mock_get_openapi.return_value = {
                "title": "StudyBuddy API",
                "version": "1.0.0",
                "description": "API for StudyBuddy with Firebase Auth",
                "paths": {}
                # No components section
            }
            
            setup_openapi(self.app)
            
            # Act
            schema = self.app.openapi()
            
            # Assert
            assert "components" in schema
            assert "securitySchemes" in schema["components"]
            assert "bearerAuth" in schema["components"]["securitySchemes"]

    def test_openapi_schema_structure_completeness(self):
        """Test that the complete OpenAPI schema structure is valid"""
        # Arrange
        @self.app.get("/health")
        def health_check():
            return {"status": "healthy"}
            
        setup_openapi(self.app)
        
        # Act
        schema = self.app.openapi()
        
        # Assert
        # Basic schema structure
        required_fields = ["openapi", "info", "paths"]
        for field in required_fields:
            assert field in schema, f"Missing required field: {field}"
            
        # Info section
        assert "title" in schema["info"]
        assert "version" in schema["info"]
        assert "description" in schema["info"]
        
        # Components and security
        assert "components" in schema
        assert "securitySchemes" in schema["components"]
        assert "bearerAuth" in schema["components"]["securitySchemes"]

    def test_app_openapi_method_replacement(self):
        """Test that the app's openapi method is properly replaced"""
        # Arrange
        original_openapi = self.app.openapi
        
        # Act
        setup_openapi(self.app)
        
        # Assert
        assert self.app.openapi != original_openapi
        assert callable(self.app.openapi)

    def test_openapi_with_different_app_configurations(self):
        """Test OpenAPI setup with different FastAPI app configurations"""
        # Arrange
        apps_to_test = [
            FastAPI(),
            FastAPI(title="Custom App"),
            FastAPI(version="2.0.0"),
            FastAPI(description="Custom Description")
        ]
        
        for app in apps_to_test:
            # Act
            setup_openapi(app)
            schema = app.openapi()
            
            # Assert
            assert schema is not None
            # StudyBuddy API configuration should override app defaults
            assert schema["info"]["title"] == "StudyBuddy API"
            assert schema["info"]["version"] == "1.0.0"
            assert schema["info"]["description"] == "API for StudyBuddy with Firebase Auth"
