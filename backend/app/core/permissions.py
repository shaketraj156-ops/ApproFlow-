from fastapi import Depends
from typing import List, Optional
from app.core.security import CurrentUser, get_current_user
from app.core.exceptions import ForbiddenException

def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role == "system_admin":
            return current_user
        if current_user.role not in allowed_roles:
            raise ForbiddenException(f"Role '{current_user.role}' is not authorized for this operation")
        return current_user
    return role_checker

def require_officer_levels(allowed_levels: List[str]):
    async def level_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role == "system_admin":
            return current_user
        if current_user.role != "aicte_officer":
            raise ForbiddenException("Must be an AICTE Officer")
        if current_user.officer_level not in allowed_levels:
            raise ForbiddenException(f"Officer level '{current_user.officer_level}' is not authorized")
        return current_user
    return level_checker

def verify_region_access(user: CurrentUser, target_region: Optional[str]) -> bool:
    if user.role == "system_admin" or user.officer_level == "NATIONAL_HEAD":
        return True
    if not target_region:
        return True
    return user.region == target_region
