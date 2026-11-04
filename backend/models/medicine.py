"""Medicine-specific Pydantic models."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class MedicineEditRequest(BaseModel):
    """Request body for editing a single medicine field."""

    medicine_index: int
    field_name: str
    new_value: str


class MedicineAddRequest(BaseModel):
    """Request body for adding a new medicine."""

    name: str
    strength: Optional[str] = None
    form: Optional[str] = "tablet"
    dose: Optional[str] = "1"
    frequency: Optional[str] = None
    timing: Optional[str] = None
    duration: Optional[str] = None
    route: Optional[str] = "oral"
    special_instructions: Optional[str] = None


class MedicineRemoveRequest(BaseModel):
    """Request body for removing a medicine."""

    medicine_index: Optional[int] = None
    medicine_name: Optional[str] = None
