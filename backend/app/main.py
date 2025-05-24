from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.routes import user
from app.core.database import engine, Base

# Create DB tables
Base.metadata.create_all(bind=engine)

# Initialize app
app = FastAPI()

# ✅ Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080","http://localhost:5173"],  # your React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(user.router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI"}
