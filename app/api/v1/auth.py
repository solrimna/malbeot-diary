# 담당 : A팀원 유가영
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse
from app.services.auth_service import AuthService

router = APIRouter()
auth_svc = AuthService()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    return await auth_svc.register(db, body)


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    token = await auth_svc.login(db, body.email, body.password)
    return {"access_token": token, "token_type": "bearer"}