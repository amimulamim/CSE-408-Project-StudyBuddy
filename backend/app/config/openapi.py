from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi


def setup_openapi(app: FastAPI) -> None:
    """Configure OpenAPI schema with bearer authentication."""
    
    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema

        openapi_schema = get_openapi(
            title="StudyBuddy API",
            version="1.0.0",
            description="API for StudyBuddy with Firebase Auth",
            routes=app.routes,
        )

        # Ensure components section exists
        if "components" not in openapi_schema:
            openapi_schema["components"] = {}
            
        # Add bearerAuth security scheme
        openapi_schema["components"]["securitySchemes"] = {
            "bearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
            }
        }

        # Apply bearerAuth to all endpoints unless explicitly overridden
        for path in openapi_schema["paths"].values():
            for method in path.values():
                method.setdefault("security", [{"bearerAuth": []}])

        app.openapi_schema = openapi_schema
        return app.openapi_schema

    app.openapi = custom_openapi
