from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes import user
from app.api.v1.routes.chat import router as chat_router
from app.core.database import engine, Base
from app.api.v1.routes.quiz import router as quiz_router
from app.config.openapi import setup_openapi

# Create DB tables
Base.metadata.create_all(bind=engine)

# Initialize app
app = FastAPI()


# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    ],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes

app.include_router(user.router, prefix="/api/v1/user", tags=["User"])
app.include_router(chat_router, prefix="/api/v1/ai/chat",tags=["Chat"])  # Chat router handles its own /ai prefix
app.include_router(quiz_router, prefix="/api/v1/quiz", tags=["Quiz"])

# Setup OpenAPI configuration
setup_openapi(app)

# Sanity root endpoint
@app.get("/")
def read_root():
    return {"message": "Hello, StudyBuddy!"}
