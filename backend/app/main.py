from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.database import engine, Base
from app.config.openapi import setup_openapi
from app.core.config import settings

# Create DB tables
Base.metadata.create_all(bind=engine)

# Initialize app
app = FastAPI()


# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 routes
app.include_router(api_router, prefix="/api/v1")

# Setup OpenAPI configuration
setup_openapi(app)

# Sanity root endpoint
@app.get("/")
def read_root():
    return {"message": "Hello v3, StudyBuddy!"}
