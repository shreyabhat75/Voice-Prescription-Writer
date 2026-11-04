"""Patient Pydantic models."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class PatientSearchRequest(BaseModel):
    """Request for searching patients."""

    name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
