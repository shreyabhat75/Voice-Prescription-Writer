"""Doctor feedback API router."""

from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.services.feedback_service import FeedbackService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["Feedback"])
fb_svc = FeedbackService()


class FeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    category: str | None = None
    comment: str | None = None


@router.post(
    "/{prescription_id}/feedback",
    response_model=dict[str, Any],
    summary="Submit doctor feedback and quality rating on the AI extraction",
)
async def submit_feedback(
    prescription_id: str,
    payload: FeedbackRequest,
) -> dict[str, Any]:
    try:
        return await fb_svc.record_feedback(
            prescription_id=prescription_id,
            rating=payload.rating,
            category=payload.category,
            comment=payload.comment,
        )
    except Exception as e:
        logger.error("Failed to record feedback: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record feedback: {e}",
        )

