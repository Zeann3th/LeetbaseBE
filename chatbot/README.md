# Leetbase Chatbot API

A FastAPI-based chatbot API using Google's Gemini AI model for Leetbase platform.

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set up environment variables:

- Copy `.env.example` to `.env`
- Add your Google API key and other required variables

## Running the API

Development:

```bash
uvicorn src.api.main:app --reload --port 8000
```

Production:

```bash
uvicorn src.api.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Chatbot Endpoints

- `POST /chat/ask`
  - Send messages to the chatbot
  - Request body:
    ```json
    {
      "message": "string",
      "chat_history": [
        {
          "sender": "user|model",
          "message": "string"
        }
      ]
    }
    ```

## Environment Variables

Required environment variables:

- `GOOGLE_API_KEY`: Your Google API key for Gemini
- `BASE_URL`: Base URL for the problems API
- `PORT`: Port for the problems API

## Development

The project structure:

```
src/
├── api/
│   ├── main.py          # FastAPI application
│   └── chat_routes.py   # Chat-related routes
├── chat_handler.py      # Gemini AI integration
└── ...
```
