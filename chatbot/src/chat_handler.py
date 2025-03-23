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
