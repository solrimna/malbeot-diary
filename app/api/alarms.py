from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.schemas.alarm import AlarmCreate, AlarmUpdate, AlarmResponse
from app.services.alarm_service import (
    create_alarm,
    get_my_alarms,
    update_alarm,
    delete_alarm,
)

router = APIRouter(prefix="/alarms", tags=["alarms"])


async def get_db():
    async with AsyncSessionLocal() as db:
        yield db


@router.post("/", response_model=AlarmResponse)
async def create_alarm_api(
    payload: AlarmCreate,
    db: AsyncSession = Depends(get_db),
):
    return await create_alarm(db, payload)


@router.get("/", response_model=list[AlarmResponse])
async def get_my_alarms_api(
    db: AsyncSession = Depends(get_db),
):
    return await get_my_alarms(db)


@router.put("/{alarm_id}", response_model=AlarmResponse)
async def update_alarm_api(
    alarm_id: int,
    payload: AlarmUpdate,
    db: AsyncSession = Depends(get_db),
):
    alarm = await update_alarm(db, alarm_id, payload)
    if alarm is None:
        raise HTTPException(status_code=404, detail="Alarm not found")
    return alarm


@router.delete("/{alarm_id}")
async def delete_alarm_api(
    alarm_id: int,
    db: AsyncSession = Depends(get_db),
):
    success = await delete_alarm(db, alarm_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alarm not found")
    return {"message": "Alarm deleted successfully"}