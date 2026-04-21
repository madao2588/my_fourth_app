from pydantic import BaseModel, Field


class AdminCheckInRequest(BaseModel):
    access_code: str = Field(..., min_length=6, max_length=6)


class AdminExpireRequest(BaseModel):
    access_code: str = Field(..., min_length=6, max_length=6)


class AdminInspectRequest(BaseModel):
    access_code: str = Field(..., min_length=6, max_length=6)
