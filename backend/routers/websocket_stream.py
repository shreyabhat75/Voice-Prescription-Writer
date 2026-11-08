"""Real-time WebSocket audio streaming router for low-latency clinical transcription."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.config import get_settings
from backend.database import get_db
from backend.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket Audio Streaming"])
svc = PrescriptionService()


def is_ws_connected(ws: Any) -> bool:
    """Safely check if a websockets connection is open across websockets library versions."""
    if ws is None:
        return False
    state = getattr(ws, "state", None)
    if state is not None:
        return str(state).endswith("OPEN") or state == 1
    return bool(getattr(ws, "open", not getattr(ws, "closed", True)))


@router.websocket("/ws/transcribe/{prescription_id}")
async def websocket_transcribe(websocket: WebSocket, prescription_id: str):
    """Bidirectional WebSocket streaming endpoint for live audio dictation."""
    await websocket.accept()
    logger.info("Live WebSocket audio streaming connected for prescription %s", prescription_id)

    rx = await svc.get_prescription(prescription_id)
    if not rx:
        await websocket.send_json({
            "type": "error",
            "message": f"Prescription {prescription_id} not found."
        })
        await websocket.close(code=1008)
        return

    # Extract chosen language from query parameters
    selected_lang = websocket.query_params.get("language", "en-IN").strip()
    dg_lang = "kn" if selected_lang == "kn" else "en-IN"
    dg_model = "nova-2" if dg_lang == "kn" else "nova-2-medical"

    settings = get_settings()
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    audio_chunks: list[bytes] = []
    final_transcript_parts: list[str] = []
    latest_interim: list[str] = []
    deepgram_ws = None
    receiver_task_handle = None
    auto_structure_requested = False

    # Connect to Deepgram Live Streaming if API key is present
    use_deepgram = bool(settings.DEEPGRAM_API_KEY and settings.STT_PROVIDER.lower() == "deepgram")

    if use_deepgram:
        try:
            import websockets

            headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}
            # Use non-boosted acoustic hints to prevent phantom drug insertions (e.g. Amlodipine hallucination)
            medical_keywords = [
                "tablet", "capsule", "syrup", "injection", "nebulization",
                "TDS", "BD", "OD", "SOS", "stat", "IV", "IM",
                "aadmele", "munche", "khali pet", "beligge", "sanje", "raatri", "dinagalu"
            ]
            kw_param = "&keywords=" + "&keywords=".join(medical_keywords)
            dg_url = (
                f"wss://api.deepgram.com/v1/listen?"
                f"model={dg_model}&language={dg_lang}&punctuate=true&interim_results=true&smart_format=true{kw_param}"
            )

            try:
                deepgram_ws = await websockets.connect(dg_url, additional_headers=headers)
            except Exception:
                if dg_model != "nova-2":
                    logger.warning("Could not connect to nova-2-medical, falling back to nova-2...")
                    dg_url = (
                        f"wss://api.deepgram.com/v1/listen?"
                        f"model=nova-2&language={dg_lang}&punctuate=true&interim_results=true&smart_format=true{kw_param}"
                    )
                    deepgram_ws = await websockets.connect(dg_url, additional_headers=headers)

            async def dg_receiver():
                try:
                    async for raw_msg in deepgram_ws:
                        msg_data = json.loads(raw_msg)
                        channel = msg_data.get("channel", {})
                        alts = channel.get("alternatives", [])
                        if alts:
                            text = alts[0].get("transcript", "").strip()
                            is_final = msg_data.get("is_final", False)
                            if text:
                                if is_final:
                                    final_transcript_parts.append(text)
                                    latest_interim.clear()
                                else:
                                    latest_interim.clear()
                                    latest_interim.append(text)

                                await websocket.send_json({
                                    "type": "transcript",
                                    "text": text,
                                    "is_final": is_final,
                                })
                except Exception as ex:
                    logger.debug("Deepgram live listener ended: %s", ex)

            receiver_task_handle = asyncio.create_task(dg_receiver())

        except Exception as e:
            logger.warning("Failed to initialize Deepgram WebSocket live stream: %s. Using local buffer.", e)
            use_deepgram = False

    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                chunk = message["bytes"]
                audio_chunks.append(chunk)

                if is_ws_connected(deepgram_ws):
                    try:
                        await deepgram_ws.send(chunk)
                    except Exception as e:
                        logger.debug("Failed sending chunk to Deepgram WebSocket: %s", e)
                else:
                    # Echo acknowledgment for mock/local testing
                    await websocket.send_json({
                        "type": "chunk_received",
                        "size": len(chunk),
                    })

            elif "text" in message and message["text"]:
                try:
                    ctrl = json.loads(message["text"])
                except Exception:
                    ctrl = {"type": message["text"]}

                if ctrl.get("type") in ("stop", "finalize", "eos"):
                    auto_structure_requested = bool(ctrl.get("auto_structure", False))
                    logger.info("Received stop signal from client for prescription %s (auto_structure=%s)", prescription_id, auto_structure_requested)
                    break

    except WebSocketDisconnect:
        logger.info("Client disconnected from streaming WebSocket for %s", prescription_id)
    except Exception as e:
        logger.error("Error during live WebSocket streaming: %s", e)

    # Clean up Deepgram connection gracefully
    if is_ws_connected(deepgram_ws):
        try:
            await deepgram_ws.send(json.dumps({"type": "CloseStream"}))
            # Allow Deepgram up to 1.2s to deliver trailing transcripts
            if receiver_task_handle and not receiver_task_handle.done():
                try:
                    await asyncio.wait_for(asyncio.shield(receiver_task_handle), timeout=1.2)
                except (asyncio.TimeoutError, Exception):
                    pass
            await deepgram_ws.close()
        except Exception:
            pass

    if receiver_task_handle and not receiver_task_handle.done():
        receiver_task_handle.cancel()

    # Reconcile trailing interim speech that was not finalized
    if latest_interim and latest_interim[0]:
        trailing = latest_interim[0].strip()
        last_final = final_transcript_parts[-1] if final_transcript_parts else ""
        if trailing and trailing not in last_final:
            final_transcript_parts.append(trailing)

    # Process and finalize accumulated audio
    if not audio_chunks:
        logger.info("No audio chunks received during live stream session.")
        await websocket.close()
        return

    full_audio_bytes = b"".join(audio_chunks)
    audio_id = str(uuid.uuid4())
    audio_path = upload_dir / f"{audio_id}.webm"
    with open(audio_path, "wb") as f:
        f.write(full_audio_bytes)

    now = datetime.now().isoformat()
    audio_url = f"/api/audio/{audio_id}"

    # Build full transcript
    full_transcript = " ".join(final_transcript_parts).strip()

    # If stream produced no transcript or is suspiciously short for audio > 3s, run provider transcribe fallback
    if not full_transcript or (len(full_audio_bytes) > 40000 and len(full_transcript.split()) < 3):
        try:
            stt_res = await svc.stt_provider.transcribe(str(audio_path), audio_format="webm")
            if stt_res.text.strip():
                full_transcript = stt_res.text.strip()
        except Exception as ex:
            logger.warning("STT transcription fallback failed: %s", ex)

    # Persist audio record & transcript in SQLite
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO audio_records (id, prescription_id, file_path, format, size_bytes, created_at)
            VALUES (?, ?, ?, 'webm', ?, ?)
            """,
            (audio_id, prescription_id, str(audio_path), len(full_audio_bytes), now),
        )
        if full_transcript:
            await db.execute(
                """
                INSERT INTO transcripts (id, prescription_id, provider, model, raw_text, created_at)
                VALUES (?, ?, 'streaming', 'live', ?, ?)
                """,
                (str(uuid.uuid4()), prescription_id, full_transcript, now),
            )
            await db.execute(
                """
                UPDATE prescriptions
                SET raw_transcript = ?, audio_url = ?, status = 'structuring', updated_at = ?
                WHERE id = ?
                """,
                (full_transcript, audio_url, now, prescription_id),
            )
        else:
            await db.execute(
                """
                UPDATE prescriptions
                SET audio_url = ?, updated_at = ?
                WHERE id = ?
                """,
                (audio_url, now, prescription_id),
            )
        await db.commit()

    # Send completion notification to client
    if full_transcript:
        if auto_structure_requested:
            try:
                structured_rx = await svc.structure_prescription(prescription_id, transcript_override=full_transcript)
                try:
                    await websocket.send_json({
                        "type": "completed",
                        "transcript": full_transcript,
                        "raw_transcript": full_transcript,
                        "prescription": structured_rx.model_dump(mode="json"),
                    })
                except Exception:
                    pass
            except Exception as e:
                logger.error("Failed to structure streamed prescription: %s", e)
                try:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Structuring failed: {e}",
                        "transcript": full_transcript,
                        "raw_transcript": full_transcript,
                    })
                except Exception:
                    pass
        else:
            # Standard doctor review & edit workflow before extraction
            try:
                await websocket.send_json({
                    "type": "transcription_complete",
                    "transcript": full_transcript,
                    "raw_transcript": full_transcript,
                    "audio_url": audio_url,
                    "message": "Live speech recognition complete. You can review or edit the transcript before generating clinical prescription.",
                })
            except Exception:
                pass
    else:
        try:
            await websocket.send_json({
                "type": "transcription_complete",
                "transcript": "",
                "raw_transcript": "",
                "message": "Audio saved but no clear speech was recognized. Please try dictating again.",
            })
        except Exception:
            pass

    try:
        await websocket.close()
    except Exception:
        pass
