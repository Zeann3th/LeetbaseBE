from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .chat_routes import router as chat_router

app = FastAPI(
    title="Leetbase Chatbot API",
    description="API for Leetbase's AI-powered chatbot",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat_router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to Leetbase Chatbot API",
        "status": "active",
        "version": "1.0.0"
    }
