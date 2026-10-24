from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Optional, Dict, Any
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
        self.institution_id = institution_id

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> CurrentUser:
    if not credentials:
        # Dev fallback for testing if no auth header provided
        return CurrentUser(
            id="00000000-0000-0000-0000-000000000001",
            email="dev_admin@aicte.gov.in",
            role="system_admin",
            officer_level="NATIONAL_HEAD",
            region="CENTRAL"
        )
    
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        user_metadata = payload.get("user_metadata", {})
        app_metadata = payload.get("app_metadata", {})
        
        return CurrentUser(
            id=payload.get("sub"),
            email=payload.get("email", ""),
            role=user_metadata.get("role") or app_metadata.get("role", "aicte_officer"),
            officer_level=user_metadata.get("officer_level", "SECTION_OFFICER"),
            region=user_metadata.get("region", "NORTH"),
            institution_id=user_metadata.get("institution_id")
        )
    except Exception as e:
        raise UnauthenticatedException(f"Invalid or expired authorization token: {str(e)}")
