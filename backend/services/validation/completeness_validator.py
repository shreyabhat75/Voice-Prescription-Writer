"""Completeness and clinical safety validation for prescription drafts."""

from __future__ import annotations

from typing import Any
from backend.models.prescription import PrescriptionDraft


class CompletenessValidator:
    """Flags clinically critical omissions or ambiguities for doctor review."""

    def validate(self, draft: PrescriptionDraft) -> list[dict[str, Any]]:
        issues: list[dict[str, Any]] = []

        # 1. Check patient age
        if draft.patient.age.status == "needs_review":
            issues.append({
                "field": "patient.age",
                "severity": "warning",
                "message": f"Patient age '{draft.patient.age.source_text}' is ambiguous and requires doctor review.",
                "code": "AMBIGUOUS_PATIENT_AGE",
            })

        # 2. Check patient sex
        if draft.patient.sex.status == "not_mentioned":
            issues.append({
                "field": "patient.sex",
                "severity": "info",
                "message": "Patient sex was not dictated.",
                "code": "PATIENT_SEX_NOT_DICTATED",
            })

        # 3. Check chief complaints
        if draft.clinical.chief_complaints.status == "needs_review":
            issues.append({
                "field": "clinical.chief_complaints",
                "severity": "warning",
                "message": f"Chief complaint '{draft.clinical.chief_complaints.source_text}' requires doctor confirmation.",
                "code": "AMBIGUOUS_CHIEF_COMPLAINT",
            })

        # 4. Check diagnosis
        if draft.clinical.diagnosis.status == "not_mentioned":
            issues.append({
                "field": "clinical.diagnosis",
                "severity": "info",
                "message": "Diagnosis was not explicitly dictated. (Strict non-inference: left empty)",
                "code": "DIAGNOSIS_NOT_DICTATED",
            })

        # 5. Check unclear phrases
        for p in draft.clinical.unclear_phrases:
            issues.append({
                "field": "clinical.unclear_phrases",
                "severity": "info",
                "message": f"Unclear remark '{p.value}' detected in dictation. Excluded from medical advice; review recommended.",
                "code": "UNCLEAR_DICTATION_PHRASE",
            })

        # 6. Check medicine details
        for idx, med in enumerate(draft.medicines):
            med_name = med.name.value or f"Medicine #{idx+1}"

            # Uncertain candidate matches
            if med.candidate_matches and med.name.status in ("needs_review", "unclear"):
                issues.append({
                    "field": f"medicines[{idx}].name",
                    "medicine_index": idx,
                    "severity": "warning",
                    "message": f"Medication '{med_name}' has candidate interpretations: {', '.join(med.candidate_matches)}. Doctor confirmation required.",
                    "code": "UNCERTAIN_MEDICINE_MATCH",
                })
            elif med.name.status in ("needs_review", "unclear"):
                issues.append({
                    "field": f"medicines[{idx}].name",
                    "medicine_index": idx,
                    "severity": "warning",
                    "message": f"Medication item #{idx+1} '{med_name}' is ambiguous and requires doctor review.",
                    "code": "AMBIGUOUS_MEDICATION",
                })

            # Missing strength
            if med.strength.status == "not_mentioned":
                # Some medications don't have separate strength (e.g. combination syrups, ORS, inhalers)
                form_val = (med.form.value or "").lower()
                if "syrup" not in form_val and "solution" not in form_val and "respule" not in form_val:
                    issues.append({
                        "field": f"medicines[{idx}].strength",
                        "medicine_index": idx,
                        "severity": "warning",
                        "message": f"Strength for '{med_name}' was not mentioned.",
                        "code": "MISSING_STRENGTH",
                    })

            # Missing frequency
            if med.frequency.status == "not_mentioned":
                issues.append({
                    "field": f"medicines[{idx}].frequency",
                    "medicine_index": idx,
                    "severity": "warning",
                    "message": f"Frequency for '{med_name}' was not mentioned.",
                    "code": "MISSING_FREQUENCY",
                })

            # Missing duration (flag as info/review for non-SOS and non-STAT)
            freq_val = (med.frequency.value or "").upper()
            if freq_val not in ["SOS", "STAT", "PRN"]:
                if med.duration.status == "not_mentioned":
                    issues.append({
                        "field": f"medicines[{idx}].duration",
                        "medicine_index": idx,
                        "severity": "warning",
                        "message": f"Duration for '{med_name}' was not mentioned (Non-inference rule applied).",
                        "code": "MISSING_DURATION",
                    })

        return issues

