from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "AICTE Approval Workflow Automation (SIH26262)"
    API_V1_PREFIX: str = "/api/v1"
    
    # Supabase & DB
    SUPABASE_URL: str = "https://placeholder.supabase.co"
    SUPABASE_JWT_SECRET: str = "placeholder-jwt-secret"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-service-role-key"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    
    # CORS & Frontend
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    
    # Scheduler & Cron Security
    JOB_SECRET: str = "dev-job-secret-token-12345"
    
    # Email / Notifications
    NOTIFY_EMAIL_ENABLED: bool = False
    SMTP_HOST: str = "smtp.example.com"
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    
    # Workflow & Localization
    TZ_DISPLAY: str = "Asia/Kolkata"
    SLA_USE_WORKING_DAYS: bool = False
    DOCUMENT_EXPIRING_DAYS: int = 30
    REMINDER_OFFSETS: str = "7,3,1"
    DELAY_MODEL_PATH: str = "models/delay_model.joblib"
    
    @property
    def reminder_offset_list(self) -> List[int]:
        try:
            return [int(x.strip()) for x in self.REMINDER_OFFSETS.split(",") if x.strip()]
        except Exception:
            return [7, 3, 1]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
