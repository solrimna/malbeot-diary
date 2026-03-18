from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.alarm import AlarmCreate, AlarmUpdate, AlarmResponse
from app.services.alarm_service import create_alarm, get_my_alarms, update_alarm

router = APIRouter(prefix="/alarms", tags=["alarms"])


@router.post("", response_model=AlarmResponse)
def create_alarm_api(payload: AlarmCreate, db: Session = Depends(get_db)):
    return create_alarm(db, payload)


@router.get("/me", response_model=list[AlarmResponse])
def get_my_alarms_api(db: Session = Depends(get_db)):
    return get_my_alarms(db)


@router.patch("/{alarm_id}", response_model=AlarmResponse)
def update_alarm_api(alarm_id: int, payload: AlarmUpdate, db: Session = Depends(get_db)):
    alarm = update_alarm(db, alarm_id, payload)

    if not alarm:
        raise HTTPException(status_code=404, detail="알람을 찾을 수 없습니다.")

    return alarm