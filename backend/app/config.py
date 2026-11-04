from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import json
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "OpsPilot"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Server / Render
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "sqlite:///./opspilot.db"
    
    # Security
    SECRET_KEY: str = "opspilot-production-grade-signing-key-32-chars-minimum"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    
    # LLM Settings
    LLM_PROVIDER: str = "deterministic"  # options: deterministic, gemini, openai
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    DEMO_MODE: bool = True
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    return json.loads(v_stripped)
                except Exception:
                    pass
            # Split comma-separated string
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ]
    
    # Rate Limiting & Safety
    MAX_REQUEST_BODY_BYTES: int = 1_000_000  # 1MB
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    model_config = {
        "env_file": ".env",
        "extra": "allow"
    }

settings = Settings()
