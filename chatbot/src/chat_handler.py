import os
from typing import List
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import Tool, FunctionDeclaration

load_dotenv()

# Cấu hình Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Function Declaration
schedule_meeting_fn = FunctionDeclaration(
    name="get_all_problems",
    description="Lấy toàn bộ thông tin về bài tập",
    parameters={
        "type": "object",
        "properties": {},
        "required": [],
    },
)

tools = [Tool(function_declarations=[schedule_meeting_fn])]

# Khởi tạo mô hình Gemini
model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    tools=tools
)

# Hàm xử lý api lấy toàn bộ câu hỏi
def get_all_problems():
    data = []
    # Đoạn code này để lấy dữ liệu từ database hoặc API

    
    
    return {
        "status": 200,
        "data": data
    }

# Hàm xử lý function call
def handle_function_call(function_call):
    if function_call.name == "get_all_problems":
        args = function_call.args
        return {
            "status": 200,
        }
    return {"status": "error", "message": "Không xác định được hàm."}


# Hàm dùng để hỏi model
def ask_gemini_with_function_call(user_input: str):
    response = model.generate_content(user_input)
    part = response.candidates[0].content.parts[0]

    if hasattr(part, "function_call"):
        function_call = part.function_call
        result = handle_function_call(function_call)
        
        # Đảm bảo mọi đối tượng trả về đều serializable
        return {
            "function_call": function_call.name,
            "args": function_call.args if isinstance(function_call.args, dict) else {},
            "result": result
        }
    else:
        return {
            "function_call": None,
            "result": response.text
        }
