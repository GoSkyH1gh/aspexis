from fastapi import HTTPException
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str


class NotFound(HTTPException):
    """Indicates that requested resource was not found"""

    def __init__(self):
        super().__init__(
            detail="Requested resource not found",
            status_code=404,
        )


class UpstreamError(HTTPException):
    """Indicates an error from an Upstream provider"""

    def __init__(self):
        super().__init__(
            detail="Recieved an error from Upstream",
            status_code=502,
        )


class UpstreamTimeoutError(HTTPException):
    """Indicates that an Upstream provider didn't provide the requested resource in time"""

    def __init__(self):
        super().__init__(
            status_code=504,
            detail="Upstream provider did not provide the requested resource in time",
        )


class ServiceAPIKeyError(HTTPException):
    """Indicates an invalid API key, backend's fault"""

    def __init__(self):
        super().__init__(
            detail="Couldn't resolve request due to invalid API key on server",
            status_code=500,
        )


class ServiceError(HTTPException):
    """Generic Exception 500"""

    def __init__(self):
        super().__init__(status_code=500, detail="Server coudn't resolve the request")


class InvalidUserUUID(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=400,
            detail="UUID couldn't be proccessed. Make sure you are using the undashed format.",
        )


class UnprocessableEntity(HTTPException):
    def __init__(self, reason: str | None = None):
        detail = "Request content was not correct"
        if reason:
            detail += f": {reason}"
        super().__init__(
            status_code=422,
            detail=detail,
        )

class Forbidden(HTTPException):
    def __init__(self, reason: str | None = None):
        detail = "Request resource is not accessible"
        if reason:
            detail += f": {reason}"
        super().__init__(
            status_code=403,
            detail=detail,
        )


class TooManyRequests(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=429,
            detail="Too many requests",
        )


class InvalidCache(BaseException):
    def __init__(self, *args):
        super().__init__(*args)
