import json
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.alarm import Alarm
from app.models.push_subscription import PushSubscription


def _get_webpush() -> tuple[Any, type[Exception]]:
    try:
        from pywebpush import WebPushException, webpush
    except ModuleNotFoundError:
        return None, Exception
    return webpush, WebPushException


async def get_due_alarms(db: AsyncSession, user_id: str | None = None):
    """
    현재 시각 기준으로 실행되어야 하는 알람 목록을 반환한다.
    user_id가 주어지면 해당 사용자의 알람만 조회한다.
    """
    now = datetime.now()
    current_time = now.strftime("%H:%M")

    weekday_map = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    today = weekday_map[now.weekday()]

    query = select(Alarm).where(Alarm.is_enabled.is_(True))

    if user_id is not None:
        query = query.where(Alarm.user_id == user_id)

    result = await db.execute(query)
    alarms = result.scalars().all()

    due_alarms = []

    for alarm in alarms:
        if not alarm.alarm_time:
            continue

        if not alarm.repeat_days:
            continue

        alarm_time_str = alarm.alarm_time.strftime("%H:%M")
        repeat_days_list = [
            day.strip() for day in alarm.repeat_days.split(",") if day.strip()
        ]

        if alarm_time_str != current_time:
            continue

        if today not in repeat_days_list:
            continue

        if alarm.last_triggered_at:
            last_triggered = alarm.last_triggered_at.replace(second=0, microsecond=0)
            current_minute = now.replace(second=0, microsecond=0)

            if last_triggered == current_minute:
                continue

        due_alarms.append(alarm)

    return due_alarms


async def trigger_alarm(db: AsyncSession, alarm: Alarm):
    """
    알람 1건을 실제 실행한다.
    - 웹 푸시 전송
    - 마지막 실행 시각 갱신
    """
    print(f"[ALARM TRIGGERED] id={alarm.id}, time={alarm.alarm_time}")

    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == str(alarm.user_id))
    )
    sub = result.scalar_one_or_none()
    settings = get_settings()
    webpush, webpush_exception = _get_webpush()

    if sub and webpush:
        try:
            payload = json.dumps(
                {
                    "title": "말벗 알람",
                    "body": f"설정한 알람 시간입니다. ({alarm.alarm_time})",
                }
            )

            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_CLAIMS_SUB},
            )
            print(f"[PUSH SENT] user_id={alarm.user_id}, time={alarm.alarm_time}")
        except webpush_exception as e:
            print(f"[PUSH FAILED] {e}")
    elif sub:
        print("[PUSH SKIPPED] pywebpush is not installed.")
    else:
        print(f"[NO SUBSCRIPTION] user_id={alarm.user_id}")

    alarm.last_triggered_at = datetime.now()

    db.add(alarm)
    await db.commit()
    await db.refresh(alarm)


async def process_due_alarms(db: AsyncSession):
    """
    현재 시점에 울려야 하는 알람들을 찾아 순서대로 실행한다.
    """
    due_alarms = await get_due_alarms(db)

    for alarm in due_alarms:
        await trigger_alarm(db, alarm)
