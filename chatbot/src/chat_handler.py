import json
import os
import requests
import asyncio
import logging
from typing import List
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import Tool, FunctionDeclaration
from google.generativeai.types.content_types import ContentDict

load_dotenv()
logger = logging.getLogger(__name__)

# Cấu hình Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Function Declaration
get_all_problems = FunctionDeclaration(
    name="get_all_problems",
    description="""Gọi hàm này khi người dùng muốn xem danh sách các bài tập, 
    gợi ý luyện tập, muốn luyện tập theo chủ đề, độ khó hoặc hỏi về các bài có sẵn. 
    Hàm này sẽ trả về toàn bộ thông tin bài tập để hỗ trợ người dùng lựa chọn bài phù hợp.
    Hàm này cũng được gọi khi cần lấy thông tin về id của bài tập""",
    parameters={
        "type": "object",
        "properties": {},
        "required": [],
    },
)

add_problems_to_todo = FunctionDeclaration(
    name="add_problems_to_todo",
    description="Thêm danh sách problem IDs vào todo list của user",
    parameters={
        "type": "object",
        "properties": {
            "problems": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Danh sách problem ID cần thêm vào todo (bắt buộc phải là ID của bài tập)"
            }
        },
        "required": ["problems"],
    },
)



tools = [Tool(function_declarations=[get_all_problems, add_problems_to_todo])]

# Khởi tạo mô hình Gemini
model = genai.GenerativeModel(model_name="gemini-2.0-flash", tools=tools)

# Hàm xử lý api lấy toàn bộ câu hỏi
def get_all_problems():
    base_url = os.getenv("BASE_URL", "http://localhost")
    # port = os.getenv("PORT", "7554")
    url = f"{base_url}/v1/problems"

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()["data"]
        return {"status": 200, "data": data}
    except requests.exceptions.RequestException as e:
        return {"status": "error", "message": str(e)}

def add_problems_to_todo_api(
    problems: List[str],
    authorization: str,
    csrf_token: str
):
    base = os.getenv("BASE_URL", "http://localhost")
    # port = os.getenv("PORT", "7554")  
    url = f"{base}/v1/users/todos"
    headers = {
        "Authorization": authorization,
        "x-csrf-token": csrf_token,
        "x-service-token": "fabc5c5ea0f6b4157b3bc8e23073add1e12024f4e089e5242c8d9950506b450e011b15487096787a0bd60d566fe7fd201269d1dee4ad46989d20b00f18abbbc0"
    }
    print(problems)
    r = requests.post(url, headers=headers, json={"problems": problems})
    print(r.json())
    try:
        
        r = requests.post(url, headers=headers, json={"problems": problems})
        r.raise_for_status()
        print(r)
        return {"status": r.status_code, "data": r.json()}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Hàm xử lý function call
def handle_function_call(function_call, authorization=None, csrf_token=None):
    name = function_call.name
    if hasattr(function_call, "args"):
        args = function_call.args
    elif hasattr(function_call, "arguments_json"):
        args = json.loads(function_call.arguments_json)
    else:
        args = {}
    if name == "get_all_problems":
        return get_all_problems()
    if name == "add_problems_to_todo":
        raw = args.get("problems", [])
        problems = [str(x) for x in raw]  # ép từng phần tử về string
        return add_problems_to_todo_api(
            problems,
            authorization,
            csrf_token
        )
    return {"status": "error", "message": "Không xác định được hàm."}

# Hàm dùng để hỏi model
async def ask_gemini_with_function_call(query: str, authorization=None, csrf_token=None, chat_history=None):
    try:
        user_prompt = {"role": "user", "parts": [query]}

        # Xây dựng lại messages theo định dạng Gemini
        if chat_history:
            messages = []
            for chat in chat_history:
                role = "user" if chat["sender"] == "user" else "model"
                messages.append({"role": role, "parts": [chat["parts"]]})
            messages.append(user_prompt)
        else:
            messages = [user_prompt]

        # 1) Gọi Gemini lần đầu
        response  = model.generate_content(messages, stream=False)
        candidate = response.candidates[0]
        parts     = candidate.content.parts

        # 2) Gom hết function_call
        func_calls = [p.function_call for p in parts if hasattr(p, "function_call")]

        if func_calls:
            # 3) Xử lý mỗi function_call
            for fn in func_calls:
                logger.info(f"Gemini yêu cầu gọi hàm: {fn.name}")
                wrap = handle_function_call(fn, authorization, csrf_token)
                # unwrap
                if wrap.get("status") == 200:
                    payload = wrap["data"]
                else:
                    payload = {"error": wrap.get("message")}
                # append kết quả tool call
                messages.append({
                    "role":  "user",
                    "parts": [json.dumps(payload, ensure_ascii=False)]
                })

            # 4) Gọi lại Gemini 1 lần để trả về text hoàn chỉnh
            final_response = model.generate_content(messages, stream=False)

            # Check if response has valid parts
            if final_response.candidates and final_response.candidates[0].content.parts:
                return final_response.candidates[0].content.parts[0].text, messages
            else:
                logger.warning(
                    "Gemini returned no valid content. Possibly an empty or incomplete tool response."
                )
                return "Xin lỗi, tôi không thể xử lý yêu cầu này ngay lúc này.", messages

        else:
            # Không cần gọi hàm nào, chỉ là trả lời bình thường
            return response.text, messages

    except Exception as e:
        logger.error(f"Lỗi trong quá trình xử lý Gemini: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {"error": str(e)}
