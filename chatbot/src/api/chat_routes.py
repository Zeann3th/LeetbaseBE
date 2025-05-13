from fastapi import APIRouter, HTTPException, Header
from typing import Optional, List
from pydantic import BaseModel
from ..chat_handler import ask_gemini_with_function_call

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    sender: str
    parts: str

class ChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[ChatMessage]] = None
    

@router.post("/ask")
async def chat_with_bot(request: ChatRequest, authorization: str = Header(...), x_csrf_token: str = Header(...)):
    """
    Endpoint to interact with the chatbot
    
    Args:
        request: ChatRequest containing the user's message and optional chat history
    
    Returns:
        Dictionary containing the bot's response
    """
    try:
        response, query = await ask_gemini_with_function_call(
            query=request.message, 
            authorization=authorization,
            csrf_token=x_csrf_token,
            chat_history=[msg.dict() for msg in request.chat_history] if request.chat_history else None
        )
        
        return {
            "status": "success",
            "message": response,
            "query": query
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 