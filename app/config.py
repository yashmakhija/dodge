import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://dodge:dodge@localhost:5432/dodge")
    DATA_PATH: str = os.getenv("DATA_PATH", "./data")

    LLM_API_URL: str = os.getenv("LLM_API_URL", "")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "claude-sonnet-4-20250514")
    LLM_MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "2048"))
    LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "30"))

    SQL_TIMEOUT_SECONDS: int = int(os.getenv("SQL_TIMEOUT_SECONDS", "10"))
    SQL_MAX_ROWS: int = int(os.getenv("SQL_MAX_ROWS", "50"))

    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))


config = Config()
