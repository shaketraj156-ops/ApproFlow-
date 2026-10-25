from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Optional, Dict, Any
from uuid import UUID
from app.core.config import settings
from app.core.exceptions import UnauthenticatedException

security_bearer = HTTPBearer(auto_error=False)

class CurrentUser:
    def __init__(
        self,
        id: str,
        email: str,
        role: str,
        officer_level: Optional[str] = None,
        region: Optional[str] = None,
        institution_id: Optional[str] = None
    ):
        self.id = id
        self.email = email
        self.role = role
        self.officer_level = officer_level
        self.region = region
        # Compared against UUID columns, so keep it a UUID; a malformed value means "no institution".
        try:
            self.institution_id = UUID(str(institution_id)) if institution_id else None
        except ValueError:
            self.institution_id = None

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> CurrentUser:
    if not credentials:
        if settings.ALLOW_DEV_AUTH:
            return CurrentUser(
                id="00000000-0000-0000-0000-000000000001",
                email="dev_admin@aicte.gov.in",
                role="system_admin",
                officer_level="NATIONAL_HEAD",
                region="CENTRAL"
            )
        raise UnauthenticatedException("Missing Authorization header")
    
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        # user_metadata is editable by the user themselves in Supabase, so authorization
        # attributes are read from app_metadata only (server-controlled).
        app_metadata = payload.get("app_metadata") or {}
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("token has no subject")

        return CurrentUser(
            id=user_id,
            email=payload.get("email", ""),
            role=app_metadata.get("role", "institution_staff"),
            officer_level=app_metadata.get("officer_level"),
            region=app_metadata.get("region"),
            institution_id=app_metadata.get("institution_id")
        )
    except Exception:
        raise UnauthenticatedException("Invalid or expired authorization token")
