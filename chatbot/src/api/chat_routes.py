from fastapi import APIRouter, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from ..chat_handler import ask_gemini_with_function_call

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    sender: str
    message: str

class ChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[ChatMessage]] = None

@router.post("/ask")
async def chat_with_bot(request: ChatRequest):
    """
    Endpoint to interact with the chatbot
    
    Args:
        request: ChatRequest containing the user's message and optional chat history
    
    Returns:
        Dictionary containing the bot's response
    """
    try:
        response = await ask_gemini_with_function_call(
            request.message, 
            [msg.dict() for msg in request.chat_history] if request.chat_history else None
        )
        
        return {
            "status": "success",
            "message": response
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 