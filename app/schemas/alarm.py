from datetime import datetime, time
from pydantic import BaseModel, ConfigDict


class AlarmCreate(BaseModel):
    alarm_time: time
    repeat_days: str


class AlarmUpdate(BaseModel):
    alarm_time: time | None = None
    repeat_days: str | None = None
    is_enabled: bool | None = None


class AlarmResponse(BaseModel):
    id: int
    user_id: int
    alarm_time: time
    repeat_days: str
    is_enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)