"""Audio upload and streaming API router."""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse

from backend.config import get_settings
from backend.models.prescription import PrescriptionResponse
from backend.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["Audio"])
audio_stream_router = APIRouter(prefix="/api/audio", tags=["Audio Streaming"])
svc = PrescriptionService()


@router.post(
    "/{prescription_id}/upload-audio",
    response_model=PrescriptionResponse,
    summary="Upload browser recorded audio for a prescription",
)
async def upload_audio(
    prescription_id: str,
    request: Request,
    file: UploadFile | None = File(None),
    audio: UploadFile | None = File(None),
) -> PrescriptionResponse:
    rx = await svc.get_prescription(prescription_id)
    if not rx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription {prescription_id} not found",
        )

    settings = get_settings()
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    audio_bytes = b""
    extension = ".webm"

    upload_item = file or audio
    if upload_item:
        audio_bytes = await upload_item.read()
        filename = upload_item.filename or "recording.webm"
        if filename.endswith(".wav"):
            extension = ".wav"
        elif filename.endswith(".mp4"):
            extension = ".mp4"
        elif filename.endswith(".ogg"):
            extension = ".ogg"
    else:
        # Check if form has any other file field name
        try:
            form = await request.form()
            for v in form.values():
                if hasattr(v, "read"):
                    audio_bytes = await v.read()
                    break
        except Exception:
            pass

        if not audio_bytes:
            try:
                audio_bytes = await request.body()
            except Exception:
                pass

    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty (0 bytes).",
        )

    audio_id = str(uuid.uuid4())
    # Save with audio_id directly in filename so get_audio_file streams it with 200 OK
    dest_path = upload_dir / f"{audio_id}{extension}"
    with open(dest_path, "wb") as f:
        f.write(audio_bytes)

    now = rx.updated_at
    audio_url = f"/api/audio/{audio_id}"

    # Record in database
    from backend.database import get_db
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO audio_records (id, prescription_id, file_path, format, size_bytes, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            """,
            (audio_id, prescription_id, str(dest_path), extension.lstrip("."), len(audio_bytes)),
        )
        await db.execute(
            """
            UPDATE prescriptions
            SET audio_url = ?, status = 'transcribing', updated_at = datetime('now')
            WHERE id = ?
            """,
            (audio_url, prescription_id),
        )
        await db.commit()

    updated_rx = await svc.get_prescription(prescription_id)
    if not updated_rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return updated_rx


@audio_stream_router.get("/{audio_id}", summary="Stream uploaded audio")
async def get_audio_file(audio_id: str):
    settings = get_settings()
    upload_dir = Path(settings.UPLOAD_DIR)
    matches = list(upload_dir.glob(f"*{audio_id}*"))
    if not matches:
        raise HTTPException(status_code=404, detail=f"Audio file #{audio_id} not found on server")

    target_file = matches[0]
    media_type = "audio/webm"
    if target_file.suffix == ".wav":
        media_type = "audio/wav"
    elif target_file.suffix == ".mp4":
        media_type = "audio/mp4"

    return FileResponse(
        str(target_file),
        media_type=media_type,
        headers={"Accept-Ranges": "bytes"},
    )
