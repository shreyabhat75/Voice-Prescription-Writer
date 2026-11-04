"""Unified validation pipeline orchestrating schema, source grounding, and completeness rules."""

from __future__ import annotations

import logging
from typing import Any

from backend.models.prescription import PrescriptionDraft
from backend.services.validation.completeness_validator import CompletenessValidator
from backend.services.validation.schema_validator import SchemaValidator
from backend.services.validation.source_validator import SourceValidator

logger = logging.getLogger(__name__)


class ValidationPipeline:
    """Executes multi-stage validation over a PrescriptionDraft."""

    def __init__(self) -> None:
        self.schema_validator = SchemaValidator()
        self.source_validator = SourceValidator()
        self.completeness_validator = CompletenessValidator()

    def run_validation(
        self,
        draft: PrescriptionDraft,
        raw_transcript: str | None = None,
    ) -> list[dict[str, Any]]:
        """Run all validation layers and return consolidated issues list."""
        all_issues: list[dict[str, Any]] = []

        # Layer 1: Schema & Data types
        schema_issues = self.schema_validator.validate(draft)
        all_issues.extend(schema_issues)

        # Layer 2: Source phrase grounding
        source_issues = self.source_validator.validate_and_ground(draft, raw_transcript)
        all_issues.extend(source_issues)

        # Layer 3: Completeness & Safety
        completeness_issues = self.completeness_validator.validate(draft)
        all_issues.extend(completeness_issues)

        return all_issues

