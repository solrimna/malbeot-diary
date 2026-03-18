from sqlalchemy.orm import Session

from app.models.alarm import Alarm
from app.schemas.alarm import AlarmCreate, AlarmUpdate

TEMP_USER_ID = 1


def create_alarm(db: Session, payload: AlarmCreate):
    alarm = Alarm(
        user_id=TEMP_USER_ID,
        alarm_time=payload.alarm_time,
        repeat_days=payload.repeat_days,
        is_enabled=True,
    )
    db.add(alarm)
    db.commit()
    db.refresh(alarm)
    return alarm


def get_my_alarms(db: Session):
    return (
        db.query(Alarm)
        .filter(Alarm.user_id == TEMP_USER_ID)
        .order_by(Alarm.id.desc())
        .all()
    )


def update_alarm(db: Session, alarm_id: int, payload: AlarmUpdate):
    alarm = (
        db.query(Alarm)
        .filter(Alarm.id == alarm_id, Alarm.user_id == TEMP_USER_ID)
        .first()
    )

    if not alarm:
        return None

    if payload.alarm_time is not None:
        alarm.alarm_time = payload.alarm_time

    if payload.repeat_days is not None:
        alarm.repeat_days = payload.repeat_days

    if payload.is_enabled is not None:
        alarm.is_enabled = payload.is_enabled

    db.commit()
    db.refresh(alarm)
    return alarm
from datetime import datetime


def get_due_alarms(db: Session):
    now = datetime.now()
    current_time = now.strftime("%H:%M")

    weekday_map = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    today = weekday_map[now.weekday()]

    alarms = (
        db.query(Alarm)
        .filter(
            Alarm.user_id == TEMP_USER_ID,
            Alarm.is_enabled == True,
        )
        .all()
    )

    due_alarms = []

    for alarm in alarms:
        alarm_time_str = alarm.alarm_time.strftime("%H:%M")

        repeat_days_list = [day.strip() for day in alarm.repeat_days.split(",")]

        if alarm_time_str != current_time:
            continue

        if today not in repeat_days_list:
            continue

        if alarm.last_triggered_at:
            last_triggered = alarm.last_triggered_at.strftime("%Y-%m-%d %H:%M")
            now_key = now.strftime("%Y-%m-%d %H:%M")

            if last_triggered == now_key:
                continue

        due_alarms.append(alarm)

    return due_alarms


def mark_alarm_triggered(db: Session, alarm: Alarm):
    alarm.last_triggered_at = datetime.now()
    db.commit()
    db.refresh(alarm)
    return alarm
