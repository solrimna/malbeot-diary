from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.api.alarms import router as alarms_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="말벗 AI 일기장",
    description="음성 입력 + AI 공감 피드백 일기 서비스",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(alarms_router)

# B팀원 프론트엔드 정적 파일 서빙
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
