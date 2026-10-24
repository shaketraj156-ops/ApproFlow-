from fastapi import HTTPException, status
from typing import Any, Optional, Dict

class ApproFlowException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": code,
                    "message": message,
                    "details": self.details
                }
            }
        )

class UnauthenticatedException(ApproFlowException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(status.HTTP_401_UNAUTHORIZED, "UNAUTHENTICATED", message)

class ForbiddenException(ApproFlowException):
    def __init__(self, message: str = "Access forbidden"):
        super().__init__(status.HTTP_403_FORBIDDEN, "FORBIDDEN", message)

class NotFoundException(ApproFlowException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(status.HTTP_404_NOT_FOUND, "NOT_FOUND", message)

class ValidationErrorException(ApproFlowException):
    def __init__(self, message: str = "Invalid input data", details: Optional[Dict[str, Any]] = None):
        super().__init__(status.HTTP_422_UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message, details)

class InvalidTransitionException(ApproFlowException):
    def __init__(self, message: str = "Requested workflow transition is invalid"):
        super().__init__(status.HTTP_409_CONFLICT, "INVALID_TRANSITION", message)

class EvcClashException(ApproFlowException):
    def __init__(self, message: str = "EVC expert scheduling conflict detected"):
        super().__init__(status.HTTP_409_CONFLICT, "EVC_CLASH", message)

class RateLimitedException(ApproFlowException):
    def __init__(self, message: str = "Too many requests. Please slow down"):
        super().__init__(status.HTTP_429_TOO_MANY_REQUESTS, "RATE_LIMITED", message)
