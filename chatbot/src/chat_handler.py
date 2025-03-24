import ollama
import asyncio

class ChatHandler:
    def __init__(self):
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_all_questions",
                    "description": "Get all questions from database",
                    "parameters": {"type": "object"},
                },
            }
        ]
    async def run(self, model: str, query: str):
        client = ollama.AsyncClient()
        messages = [{
            "role": "user",
            "content": query
        }]
        response = await client.chat(
            model=model,
            messages=messages
        )
        print(response)
        return response

bot = ChatHandler()

async def main():
    response = await bot.run("llama3.1", "What is the current weather in New York City?")
    return response
print(asyncio.run(main()))
