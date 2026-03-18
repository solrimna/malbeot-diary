from apscheduler.schedulers.background import BackgroundScheduler
import asyncio

from app.database import AsyncSessionLocal
from app.services.alarm_service import get_due_alarms, mark_alarm_triggered

scheduler = BackgroundScheduler(timezone="Asia/Seoul")


def send_alarm(alarm):
    print(
        f"[ALARM] user_id={alarm.user_id}, "
        f"alarm_id={alarm.id}, "
        f"time={alarm.alarm_time}, "
        f"repeat_days={alarm.repeat_days}"
    )


async def check_alarms_async():
    async with AsyncSessionLocal() as db:
        due_alarms = await get_due_alarms(db)

        for alarm in due_alarms:
            send_alarm(alarm)
            await mark_alarm_triggered(db, alarm)


def check_alarms():
    asyncio.run(check_alarms_async())


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            check_alarms,
            "interval",
            minutes=1,
            id="check_alarms_job",
            replace_existing=True,
        )
        scheduler.start()
        print("[SCHEDULER] started")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] stopped")