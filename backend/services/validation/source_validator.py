"""Source-grounded verification validating that extracted fields exist in the transcript."""

from __future__ import annotations

import re
from typing import Any
from backend.models.prescription import PrescriptionDraft, SourceEvidence


def _normalize_text(text: str) -> str:
    """Normalize text for robust substring matching: lowercase, strip punctuation, collapse whitespace."""
    lower = text.lower()
    cleaned = re.sub(r"[^\w\s]", " ", lower)
    return re.sub(r"\s+", " ", cleaned).strip()


class SourceValidator:
    """Verifies that extracted fields are actually grounded in the raw transcript."""

    def validate_and_ground(
        self,
        draft: PrescriptionDraft,
        raw_transcript: str | None,
    ) -> list[dict[str, Any]]:
        issues: list[dict[str, Any]] = []

        if not raw_transcript:
            return issues

        norm_transcript = _normalize_text(raw_transcript)

        # 1. Check patient fields
        self._verify_evidence(
            draft.patient.name,
            "patient.name",
            norm_transcript,
            issues,
        )
        self._verify_evidence(
            draft.patient.age,
            "patient.age",
            norm_transcript,
            issues,
        )

        # 2. Check clinical fields
        self._verify_evidence(
            draft.clinical.diagnosis,
            "clinical.diagnosis",
            norm_transcript,
            issues,
        )

        # 3. Check medicine items
        for idx, med in enumerate(draft.medicines):
            self._verify_evidence(
                med.name,
                f"medicines[{idx}].name",
                norm_transcript,
                issues,
                idx,
            )
            self._verify_evidence(
                med.strength,
                f"medicines[{idx}].strength",
                norm_transcript,
                issues,
                idx,
            )
            self._verify_evidence(
                med.duration,
                f"medicines[{idx}].duration",
                norm_transcript,
                issues,
                idx,
            )

        return issues

    def _verify_evidence(
        self,
        evidence: SourceEvidence,
        field_path: str,
        norm_transcript: str,
        issues: list[dict[str, Any]],
        medicine_index: int | None = None,
    ) -> None:
        if evidence.status != "extracted" or not evidence.source_text:
            return

        norm_source = _normalize_text(evidence.source_text)
        if not norm_source:
            return

        # Check substring match
        if norm_source not in norm_transcript:
            # Word overlap check (in case punctuation or slight variation occurred)
            words = [w for w in norm_source.split() if len(w) > 1 or w.isdigit()]
            # If norm_source contains digits or numerical values, every number MUST be in transcript
            source_nums = [w for w in words if w.isdigit()]
            transcript_nums = [w for w in norm_transcript.split() if w.isdigit()]
            for sn in source_nums:
                if sn not in transcript_nums:
                    # Direct numerical contradiction!
                    evidence.status = "needs_review"
                    issues.append({
                        "field": field_path,
                        "severity": "warning",
                        "message": f"Numerical value '{sn}' in '{evidence.source_text}' for {field_path} was not verified in transcript.",
                        "code": "UNVERIFIED_SOURCE_TEXT",
                        **({"medicine_index": medicine_index} if medicine_index is not None else {})
                    })
                    return

            matched_words = [w for w in words if w in norm_transcript]
            overlap_ratio = len(matched_words) / len(words) if words else 0.0

            if overlap_ratio < 0.6:
                evidence.status = "needs_review"
                issue = {
                    "field": field_path,
                    "severity": "warning",
                    "message": f"Source phrase '{evidence.source_text}' for {field_path} was not verified in transcript.",
                    "code": "UNVERIFIED_SOURCE_TEXT",
                }
                if medicine_index is not None:
                    issue["medicine_index"] = medicine_index
                issues.append(issue)

