"""Doctor feedback Pydantic models."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    """Request body for submitting feedback."""

    prescription_id: str
    rating: int = Field(..., ge=1, le=5)
    category: Optional[str] = None
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    """Feedback record returned by the API."""

    id: str
    prescription_id: str
    rating: int
    category: Optional[str] = None
    comment: Optional[str] = None
    created_at: str
