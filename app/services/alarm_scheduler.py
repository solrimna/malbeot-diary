from __future__ import annotations

import asyncio
import json
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pywebpush import WebPushException, webpush

from app.api.v1.alarm import (
    DATA_DIR,
    get_due_alarms,
    read_subscription_records,
    write_subscription_records,
)

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Seoul")


def _get_vapid_private_key_path() -> str:
    path = DATA_DIR / "vapid_private.pem"
    if not path.exists():
        raise RuntimeError("data/vapid_private.pem 파일이 없습니다.")
    return str(path)


async def send_due_alarm_pushes() -> None:
    try:
        due_alarms = await get_due_alarms(check_and_mark=True)
    except Exception as e:
        logger.exception("due 알람 조회 실패: %s", e)
        return

    if not due_alarms:
        return

    try:
        subscriptions = await read_subscription_records()
    except Exception as e:
        logger.exception("푸시 구독 목록 조회 실패: %s", e)
        return

    if not subscriptions:
        logger.info("푸시 구독이 없어 알람 푸시를 보내지 않습니다.")
        return

    try:
        vapid_private_key_path = _get_vapid_private_key_path()
    except Exception as e:
        logger.exception("VAPID 개인키 경로 확인 실패: %s", e)
        return

    vapid_claims = {
        "sub": "mailto:test@example.com"
    }

    invalid_endpoints: set[str] = set()

    for alarm in due_alarms:
        payload = {
            "title": "하루 알람",
            "body": f"{alarm['alarm_time']} 알람 시간입니다. 요일: {', '.join(alarm['days'])}",
            "alarmId": alarm["id"],
            "time": alarm["alarm_time"],
            "days": alarm["days"],
        }

        for subscription in subscriptions:
            try:
                await asyncio.to_thread(
                    webpush,
                    subscription_info=subscription,
                    data=json.dumps(payload, ensure_ascii=False),
                    vapid_private_key=vapid_private_key_path,
                    vapid_claims=vapid_claims,
                )
                logger.info(
                    "푸시 전송 성공: alarm_id=%s endpoint=%s",
                    alarm["id"],
                    subscription.get("endpoint"),
                )
            except WebPushException as exc:
                status_code = getattr(getattr(exc, "response", None), "status_code", None)
                logger.warning(
                    "푸시 전송 실패: alarm_id=%s endpoint=%s status=%s",
                    alarm["id"],
                    subscription.get("endpoint"),
                    status_code,
                )

                if status_code in {404, 410}:
                    invalid_endpoints.add(subscription.get("endpoint", ""))
            except Exception as e:
                logger.exception(
                    "푸시 전송 중 예외 발생: alarm_id=%s endpoint=%s error=%s",
                    alarm["id"],
                    subscription.get("endpoint"),
                    e,
                )

    if invalid_endpoints:
        kept = [
            item
            for item in subscriptions
            if item.get("endpoint") not in invalid_endpoints
        ]
        try:
            await write_subscription_records(kept)
            logger.info("만료된 구독 %s개 제거 완료", len(invalid_endpoints))
        except Exception as e:
            logger.exception("만료된 구독 정리 실패: %s", e)


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