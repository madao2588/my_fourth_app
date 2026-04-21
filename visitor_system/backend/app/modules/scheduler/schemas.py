from pydantic import BaseModel


class AdminExpireStaleResponse(BaseModel):
    expired_count: int
    threshold_hours: int
