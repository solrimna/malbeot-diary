from datetime import time, datetime
from typing import Optional

from pydantic import BaseModel


class AlarmCreate(BaseModel):
    alarm_time: time
    repeat_days: str
    is_enabled: bool = True


class AlarmUpdate(BaseModel):
    alarm_time: Optional[time] = None
    repeat_days: Optional[str] = None
    is_enabled: Optional[bool] = None


class AlarmResponse(BaseModel):
    id: int
    user_id: int
    alarm_time: time
    repeat_days: str
    is_enabled: bool
    created_at: datetime
    last_triggered_at: Optional[datetime] = None

    class Config:
        from_attributes = True