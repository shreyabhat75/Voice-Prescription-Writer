"""FastAPI entry point for the Voice Prescription Writer application."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import get_settings
from backend.database import init_db
from backend.routers.audio import audio_stream_router, router as audio_router
from backend.routers.confirmation import router as confirmation_router
from backend.routers.editing import router as editing_router
from backend.routers.feedback import router as feedback_router
from backend.routers.history import router as history_router
from backend.routers.pdf import router as pdf_router
from backend.routers.prescriptions import router as prescriptions_router
from backend.routers.structuring import router as structuring_router
from backend.routers.transcription import router as transcription_router
from backend.routers.voice_edit import router as voice_edit_router
from backend.routers.websocket_stream import router as ws_stream_router
from backend.services.stt.factory import get_stt_provider

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("voice_prescription_writer")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown events."""
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Application shutting down.")


settings = get_settings()

app = FastAPI(
    title="Voice Prescription Writer API",
    description="Clinical voice transcription, AI prescription structuring, validation, and PDF generation.",
    version="1.0.0",
    lifespan=lifespan,
)

# Open CORS configuration for seamless local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular routers
app.include_router(prescriptions_router)
app.include_router(audio_router)
app.include_router(audio_stream_router)
app.include_router(transcription_router)
app.include_router(structuring_router)
app.include_router(editing_router)
app.include_router(voice_edit_router)
app.include_router(confirmation_router)
app.include_router(pdf_router)
app.include_router(feedback_router)
app.include_router(history_router)
app.include_router(ws_stream_router)


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint specified by requirements."""
    is_demo = settings.STT_PROVIDER.lower() == "mock" or settings.LLM_PROVIDER.lower() == "mock"
    return {
        "status": "ok",
        "service": "voice-prescription-backend",
        "stt_provider": settings.STT_PROVIDER,
        "llm_provider": settings.LLM_PROVIDER,
        "demo_mode": is_demo,
        "app": settings.APP_NAME,
    }


@app.post("/api/transcribe", tags=["Transcription"])
async def direct_transcribe(
    request: Request,
    file: UploadFile | None = File(None),
):
    """Direct audio transcription endpoint per Section 5 specification:
    1. Receive audio (multipart or raw bytes).
    2. Validate uploaded audio.
    3. Preserve original recording.
    4. Send to actual STT provider.
    5. Return transcript to React.
    """
    settings = get_settings()
    upload_dir = settings.upload_path
    import uuid

    audio_bytes = b""
    extension = ".webm"

    if file:
        audio_bytes = await file.read()
        filename = file.filename or "recording.webm"
        if filename.endswith(".wav"):
            extension = ".wav"
        elif filename.endswith(".mp4"):
            extension = ".mp4"
    else:
        audio_bytes = await request.body()
        content_type = request.headers.get("content-type", "")
        if "wav" in content_type:
            extension = ".wav"
        elif "mp4" in content_type:
            extension = ".mp4"

    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty (0 bytes). Please ensure microphone recorded sound.",
        )

    file_id = str(uuid.uuid4())
    saved_path = upload_dir / f"{file_id}{extension}"
    with open(saved_path, "wb") as f:
        f.write(audio_bytes)

    # Call STT provider
    stt_provider = get_stt_provider()
    result = await stt_provider.transcribe(str(saved_path), audio_format=extension.lstrip("."))

    is_demo = result.provider == "mock"
    return {
        "status": "ok",
        "transcript": result.text,
        "provider": result.provider,
        "model": result.model,
        "latency_ms": result.latency_ms,
        "confidence": result.confidence,
        "language": result.language,
        "audio_url": f"/api/audio/{file_id}",
        "demo_mode": is_demo,
        "demo_notice": "[DEMO MODE: Mock STT Provider Active. Configure GOOGLE_APPLICATION_CREDENTIALS or DEEPGRAM_API_KEY for cloud STT]" if is_demo else None,
    }


@app.get("/", tags=["Root"])
async def root():
    """Root info endpoint."""
    return {
        "status": "ok",
        "service": "voice-prescription-backend",
        "docs_url": "/docs",
        "health_url": "/api/health",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc) or "An unexpected internal server error occurred."},
    )
