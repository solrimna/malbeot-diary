from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import logging

from app.database import Base, engine
from app.models import alarm
from app.services.alarm_scheduler import start_scheduler, stop_scheduler
from app.api.v1.alarm import router as alarms_router

app = FastAPI()

app.include_router(alarms_router)

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    start_scheduler()

@app.on_event("shutdown")
async def on_shutdown():
    stop_scheduler()

@app.get("/")
async def root():
    return {"message": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# 루트 경로를 프론트엔드가 다 먹어버려 오류 방지
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)