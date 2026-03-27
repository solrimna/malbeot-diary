# 담당: 손설리
# Speech-to-Text
# 1: OpenAI Whisper (배치 방식) : 브라우저 녹음 완료 > 파일 전송 > /stt > 텍스트 반환
# 2: Azure SDK 실시간 스트리밍 (WebSocket) : 브라우저 마이크 > WebSocket 연결 > /ws/stt > 실시간 텍스트 반환

import io
import logging
from typing import Any

from fastapi import HTTPException
from openai import AsyncOpenAI, OpenAIError

from app.config import get_settings

settings = get_settings()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
logger = logging.getLogger(__name__)


class STTService:
    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        language: str = "ko",
    ) -> str:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename

        try:
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
            )
        except OpenAIError as e:
            logger.error(f"STT error: {e}")
            raise HTTPException(
                status_code=503,
                detail="음성 인식 서비스에 문제가 발생했어요.",
            ) from e
        return response.text

    def _get_speechsdk(self) -> Any:
        try:
            import azure.cognitiveservices.speech as speechsdk
        except ModuleNotFoundError as e:
            logger.error("Azure Speech SDK is not installed.")
            raise HTTPException(
                status_code=503,
                detail="Azure Speech SDK가 설치되지 않아 실시간 음성 인식을 사용할 수 없습니다.",
            ) from e
        return speechsdk

    def create_azure_recognizer(self):
        """Azure Speech 인식기를 생성한다."""
        speechsdk = self._get_speechsdk()

        speech_config = speechsdk.SpeechConfig(
            subscription=settings.AZURE_SPEECH_KEY,
            region=settings.AZURE_SPEECH_REGION,
        )
        speech_config.speech_recognition_language = "ko-KR"

        stream_format = speechsdk.audio.AudioStreamFormat(
            samples_per_second=16000,
            bits_per_sample=16,
            channels=1,
        )

        stream = speechsdk.audio.PushAudioInputStream(stream_format)
        audio_config = speechsdk.audio.AudioConfig(stream=stream)

        recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config,
            audio_config=audio_config,
        )
        return recognizer, stream


stt_service = STTService()
