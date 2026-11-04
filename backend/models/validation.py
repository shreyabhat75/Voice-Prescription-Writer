"""Validation result Pydantic models."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel


class ValidationIssue(BaseModel):
    """A single validation finding."""

    severity: Literal["error", "warning", "info"]
    field_path: str
    message: str
    suggestion: Optional[str] = None


class ValidationResult(BaseModel):
    """Aggregate validation result."""

    is_valid: bool
    issues: list[ValidationIssue]
    checked_at: str
