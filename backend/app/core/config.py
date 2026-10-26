from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Valid8 - Verification, Approval & Licensure Integrated Dashboard"
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    # Supabase & DB
    SUPABASE_URL: str = "https://placeholder.supabase.co"
    SUPABASE_JWT_SECRET: str = "placeholder-jwt-secret"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-service-role-key"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/postgres"

    # CORS & Frontend
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Scheduler & Cron Security
    JOB_SECRET: str = ""
    SCHEDULER_ENABLED: bool = True
    DAILY_JOB_HOUR: int = 1  # hour of day, in TZ_DISPLAY, when the daily checks run

    # Local development only: when true, requests without a Bearer token act as a dev admin.
    # Must stay false in any deployed environment.
    ALLOW_DEV_AUTH: bool = False

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
            offsets = [int(x.strip()) for x in self.REMINDER_OFFSETS.split(",") if x.strip()]
            return [o for o in offsets if o > 0] or [7, 3, 1]
        except ValueError:
            return [7, 3, 1]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
