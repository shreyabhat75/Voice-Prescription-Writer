"""Schema and type validation for prescription drafts."""

from __future__ import annotations

from typing import Any
from backend.models.prescription import PrescriptionDraft


class SchemaValidator:
    """Validates structural conformity and data types of a PrescriptionDraft."""

    def validate(self, draft: PrescriptionDraft) -> list[dict[str, Any]]:
        issues: list[dict[str, Any]] = []

        # Validate Patient Info
        if not draft.patient.name.value:
            issues.append({
                "field": "patient.name",
                "severity": "error",
                "message": "Patient name is required.",
                "code": "MISSING_PATIENT_NAME",
            })

        if draft.patient.age.value is not None:
            try:
                age_val = float(draft.patient.age.value)
                if age_val < 0 or age_val > 130:
                    issues.append({
                        "field": "patient.age",
                        "severity": "warning",
                        "message": f"Patient age ({age_val}) is outside expected range (0-130).",
                        "code": "INVALID_AGE_RANGE",
                    })
            except (ValueError, TypeError):
                issues.append({
                    "field": "patient.age",
                    "severity": "error",
                    "message": f"Patient age '{draft.patient.age.value}' could not be parsed as a number.",
                    "code": "INVALID_AGE_TYPE",
                })

        # Validate Medicines List
        if not draft.medicines:
            issues.append({
                "field": "medicines",
                "severity": "warning",
                "message": "No medicines were extracted from the dictation.",
                "code": "EMPTY_MEDICINE_LIST",
            })

        for idx, med in enumerate(draft.medicines):
            if not med.name.value:
                issues.append({
                    "field": f"medicines[{idx}].name",
                    "medicine_index": idx,
                    "severity": "error",
                    "message": f"Medicine #{idx+1} is missing a drug name.",
                    "code": "MISSING_MEDICINE_NAME",
                })

        return issues

