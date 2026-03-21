from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alarm import Alarm
from app.schemas.alarm import AlarmCreate, AlarmUpdate
from app.config import TEMP_USER_ID


async def create_alarm(db: AsyncSession, payload: AlarmCreate):
    alarm = Alarm(
        user_id=TEMP_USER_ID,
        alarm_time=payload.alarm_time,
        repeat_days=payload.repeat_days,
        is_enabled=payload.is_enabled,
    )
    db.add(alarm)
    await db.commit()
    await db.refresh(alarm)
    return alarm


async def get_my_alarms(db: AsyncSession):
    result = await db.execute(
        select(Alarm)
        .where(Alarm.user_id == TEMP_USER_ID)
        .order_by(Alarm.id.desc())
    )
    return result.scalars().all()


async def update_alarm(db: AsyncSession, alarm_id: int, payload: AlarmUpdate):
    result = await db.execute(
        select(Alarm).where(
            Alarm.id == alarm_id,
            Alarm.user_id == TEMP_USER_ID,
        )
    )
    alarm = result.scalar_one_or_none()

    if alarm is None:
        return None

    if payload.alarm_time is not None:
        alarm.alarm_time = payload.alarm_time
    if payload.repeat_days is not None:
        alarm.repeat_days = payload.repeat_days
    if payload.is_enabled is not None:
        alarm.is_enabled = payload.is_enabled

    db.add(alarm)
    await db.commit()
    await db.refresh(alarm)
    return alarm


async def delete_alarm(db: AsyncSession, alarm_id: int):
    result = await db.execute(
        select(Alarm).where(
            Alarm.id == alarm_id,
            Alarm.user_id == TEMP_USER_ID,
        )
    )
    alarm = result.scalar_one_or_none()

    if alarm is None:
        return False

    await db.delete(alarm)
    await db.commit()
    return True


async def get_due_alarms(db: AsyncSession):
    result = await db.execute(select(Alarm))
    alarms = result.scalars().all()

    now = datetime.now()
    current_time = now.time()
    current_weekday = now.weekday()  # 월=0 ~ 일=6

    due_alarms = []

    for alarm in alarms:
        if not alarm.is_enabled:
            continue

        repeat_days = [int(day) for day in alarm.repeat_days.split(",") if day.strip() != ""]

        if current_weekday not in repeat_days:
            continue

        if alarm.alarm_time.hour == current_time.hour and alarm.alarm_time.minute == current_time.minute:
            if (
                alarm.last_triggered_at is None
                or alarm.last_triggered_at.date() != now.date()
                or alarm.last_triggered_at.hour != current_time.hour
                or alarm.last_triggered_at.minute != current_time.minute
            ):
                due_alarms.append(alarm)

    return due_alarms


async def trigger_alarm(db: AsyncSession, alarm: Alarm):
    print(f"[ALARM TRIGGERED] id={alarm.id}, time={alarm.alarm_time}")

    alarm.last_triggered_at = datetime.now()

    db.add(alarm)
    await db.commit()
    await db.refresh(alarm)


async def process_due_alarms(db: AsyncSession):
    due_alarms = await get_due_alarms(db)

    for alarm in due_alarms:
        await trigger_alarm(db, alarm)