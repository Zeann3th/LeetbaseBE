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
    Hàm này sẽ trả về toàn bộ thông tin bài tập để hỗ trợ người dùng lựa chọn bài phù hợp.""",
    parameters={
        "type": "object",
        "properties": {},
        "required": [],
    },
)

tools = [Tool(function_declarations=[get_all_problems])]

# Khởi tạo mô hình Gemini
model = genai.GenerativeModel(model_name="gemini-2.0-flash", tools=tools)


# Hàm xử lý api lấy toàn bộ câu hỏi
def get_all_problems():
    base_url = os.getenv("BASE_URL", "http://localhost")
    port = os.getenv("PORT", "7554")
    url = f"{base_url}:{port}/v1/problems"

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()["data"]
        return {"status": 200, "data": data}
    except requests.exceptions.RequestException as e:
        return {"status": "error", "message": str(e)}


# Hàm xử lý function call
def handle_function_call(function_call):
    if function_call.name == "get_all_problems":
        return get_all_problems()
    return {"status": "error", "message": "Không xác định được hàm."}


# Hàm dùng để hỏi model
async def ask_gemini_with_function_call(query: str, chat_history=None):
    try:
        user_prompt = {"role": "user", "parts": [query]}

        # Xây dựng lại messages theo định dạng Gemini
        if chat_history:
            # messages = [{"role": "user", "parts": ["Bạn là một trợ lý ảo thông minh, thân thiện và nhiệt tình, có nhiệm vụ hỗ trợ người dùng trong quá trình luyện tập thuật toán và lập trình trên nền tảng web. Hãy trả lời ngắn gọn, dễ hiểu, dùng tiếng Việt và khuyến khích người học tiếp tục cải thiện kỹ năng."]}]
            for chat in chat_history:
                role = "user" if chat["sender"] == "user" else "model"
                messages.append({"role": role, "parts": [chat["message"]]})
            messages.append(user_prompt)
        else:
            messages = [
                # {
                #     "role": "user",
                #     "parts": [
                #         "Bạn là một trợ lý ảo thông minh, thân thiện và nhiệt tình, có nhiệm vụ hỗ trợ người dùng trong quá trình luyện tập thuật toán và lập trình trên nền tảng web. Hãy trả lời ngắn gọn, dễ hiểu, dùng tiếng Việt và khuyến khích người học tiếp tục cải thiện kỹ năng."
                #     ],
                # },
                user_prompt,
            ]

        # Gọi Gemini lần đầu
        response = model.generate_content(messages, stream=False)

        candidate = response.candidates[0]
        part = candidate.content.parts[0]

        if hasattr(part, "function_call"):
            function_call = part.function_call

            # Log request
            logger.info(f"Gemini yêu cầu gọi hàm: {function_call.name}")

            # Gọi thực thi hàm tương ứng (đồng bộ)
            result = handle_function_call(function_call)
            if result["status"] == 200:
                result = result["data"]
            else:
                result = result["message"]
            # Chuẩn bị messages mới để gửi lại cho Gemini, bao gồm cả phản hồi từ tool
            messages.append(
                {
                    "role": "user",
                    "parts": [str(result)],  # đảm bảo part là chuỗi
                }
            )
            print(messages)
            # Gọi lại Gemini với kết quả từ function_call
            # final_response = model.generate_content(messages, stream=False)

            # return {
            #     "function_call": function_call.name,
            #     "args": function_call.args,
            #     "result": result,
            #     "final_response": final_response.text,
            # }

            final_response = model.generate_content(messages, stream=False)

            # Check if response has valid parts
            if final_response.candidates and final_response.candidates[0].content.parts:
                return final_response.candidates[0].content.parts[0].text
            else:
                logger.warning(
                    "Gemini returned no valid content. Possibly an empty or incomplete tool response."
                )
                return "Xin lỗi, tôi không thể xử lý yêu cầu này ngay lúc này."

        else:
            # Không cần gọi hàm nào, chỉ là trả lời bình thường
            return {"function_call": None, "result": response.text}

    except Exception as e:
        logger.error(f"Lỗi trong quá trình xử lý Gemini: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        return {"error": str(e)}


res = asyncio.run(
    ask_gemini_with_function_call(
        "Tôi mới bắt đầu học và muốn làm các bài dạng dễ trước, bạn có gợi ý gì không?"
    )
)
print("Trả lời: ", res)
