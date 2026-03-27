import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import AsyncSessionLocal
from app.services.alarm_service import process_due_alarms

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Seoul")


async def send_due_alarm_pushes() -> None:
    try:
        async with AsyncSessionLocal() as db:
            await process_due_alarms(db)
    except Exception as error:
        logger.exception("알람 스케줄러 실행 실패: %s", error)


def start_scheduler() -> None:
    if scheduler.running:
        return

    scheduler.add_job(
        send_due_alarm_pushes,
        "interval",
        seconds=15,
        id="send_due_alarm_pushes",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info("알람 푸시 스케줄러 시작")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("알람 푸시 스케줄러 종료")
