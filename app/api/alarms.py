from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.alarm import AlarmCreate, AlarmUpdate, AlarmResponse
from app.services.alarm_service import create_alarm, get_my_alarms, update_alarm

router = APIRouter(prefix="/alarms", tags=["alarms"])


@router.post("", response_model=AlarmResponse)
async def create_alarm_api(
    payload: AlarmCreate,
    db: AsyncSession = Depends(get_db),
):
    return await create_alarm(db, payload)


@router.get("/me", response_model=list[AlarmResponse])
async def get_my_alarms_api(
    db: AsyncSession = Depends(get_db),
):
    return await get_my_alarms(db)


@router.patch("/{alarm_id}", response_model=AlarmResponse)
async def update_alarm_api(
    alarm_id: int,
    payload: AlarmUpdate,
    db: AsyncSession = Depends(get_db),
):
    alarm = await update_alarm(db, alarm_id, payload)

    if not alarm:
        raise HTTPException(status_code=404, detail="알람을 찾을 수 없습니다.")

    return alarm