from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.api.v1.routes import user
from app.api.v1.routes.chat import router as chat_router
from app.core.database import engine, Base
from app.api.v1.routes.quiz import router as quiz_router 

# Create DB tables
Base.metadata.create_all(bind=engine)

# Initialize app
app = FastAPI()


# ✅ Setup CORS
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3000"],  # React frontend
    allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    ],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Include routes
app.include_router(user.router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")  # Chat router handles its own /ai prefix
app.include_router(quiz_router, prefix="/api/v1", tags=["Quiz"])

# ✅ Sanity root endpoint
@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI"}


# ✅ Add bearerAuth to Swagger (OpenAPI)
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="StudyBuddy API",
        version="1.0.0",
        description="API for StudyBuddy with Firebase Auth",
        routes=app.routes,
    )

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

# ✅ Set custom OpenAPI function
app.openapi = custom_openapi
