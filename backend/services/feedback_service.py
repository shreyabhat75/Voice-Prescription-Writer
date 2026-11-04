"""Service for recording doctor feedback and rating on AI performance."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any

from backend.database import get_db

logger = logging.getLogger(__name__)


class FeedbackService:
    """Manages recording doctor feedback to build safety and accuracy datasets."""

    async def record_feedback(
        self,
        prescription_id: str,
        rating: int,
        category: str | None = None,
        comment: str | None = None,
    ) -> dict[str, Any]:
        record_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO feedback_records (id, prescription_id, rating, category, comment, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (record_id, prescription_id, rating, category, comment, now),
            )
            await db.commit()

        return {
            "id": record_id,
            "prescription_id": prescription_id,
            "rating": rating,
            "category": category,
            "comment": comment,
            "created_at": now,
        }

