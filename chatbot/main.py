import uvicorn
from src.api.main import app  # Import ứng dụng FastAPI từ src/api/main.py

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000) 