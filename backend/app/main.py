from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.routes import user
from app.api.v1.routes.chat import router as chat_router
from app.core.database import engine, Base

# Create DB tables
Base.metadata.create_all(bind=engine)

# Initialize app
app = FastAPI()

#Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  #  React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#  Include user-related routes
app.include_router(user.router, prefix="/api/v1")

#  Include chat routes
app.include_router(chat_router,prefix="/api/v1")  # no prefix since it's already prefixed in router

#  Optional root route for sanity check
@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI"}
