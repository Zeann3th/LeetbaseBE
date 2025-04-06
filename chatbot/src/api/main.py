import sys
import os
from fastapi import FastAPI
from pydantic import BaseModel

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from src.chat_handler import ask_gemini_with_function_call

app = FastAPI()

class UserQuery(BaseModel):
    text: str

@app.post("/chat")
def chat_with_bot(query: UserQuery):
    result = ask_gemini_with_function_call(query.text)
    return result
