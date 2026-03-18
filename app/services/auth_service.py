# 담당 : A팀원 유가영
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password, verify_password, create_access_token


class AuthService:

    async def register(self, db: AsyncSession, data: UserCreate) -> User:
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")

        user = User(
            email=data.email,
            password_hash=hash_password(data.password),
            nickname=data.nickname,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    async def login(self, db: AsyncSession, email: str, password: str) -> str:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 틀렸습니다.")

        return create_access_token(subject=str(user.id))
