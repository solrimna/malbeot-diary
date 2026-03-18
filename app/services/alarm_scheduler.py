from apscheduler.schedulers.background import BackgroundScheduler

from app.database import SessionLocal
from app.services.alarm_service import get_due_alarms, mark_alarm_triggered

scheduler = BackgroundScheduler(timezone="Asia/Seoul")


def send_alarm(alarm):
    print(
        f"[ALARM] user_id={alarm.user_id}, "
        f"alarm_id={alarm.id}, "
        f"time={alarm.alarm_time}, "
        f"repeat_days={alarm.repeat_days}"
    )


def check_alarms():
    db = SessionLocal()
    try:
        due_alarms = get_due_alarms(db)

        for alarm in due_alarms:
            send_alarm(alarm)
            mark_alarm_triggered(db, alarm)

    finally:
        db.close()


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