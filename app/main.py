from fastapi import FastAPI
from app.database import Base, engine
from app.api.alarms import router as alarms_router
from app.models import alarm
from app.services.alarm_scheduler import start_scheduler, stop_scheduler

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.include_router(alarms_router)


@app.on_event("startup")
def on_startup():
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown():
    stop_scheduler()


@app.get("/")
def root():
    return {"message": "ok"}