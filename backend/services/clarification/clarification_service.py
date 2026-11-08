"""Intelligent clarification service generating focused doctor queries for ambiguous or missing fields."""

from __future__ import annotations

import re
from typing import Any
from backend.models.prescription import PrescriptionDraft


class ClarificationService:
    """Generates targeted, courteous questions for doctors when critical fields require clarification."""

    def generate_questions(
        self,
        draft: PrescriptionDraft,
        validation_issues: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        questions: list[dict[str, Any]] = []

        # 1. Check patient name if unclear
        if draft.patient.name.status == "unclear":
            questions.append({
                "field": "patient.name",
                "question": "Doctor, I couldn't clearly catch the patient's name. Could you please repeat it?",
                "original_value": draft.patient.name.value,
            })

        # 1b. Check patient age if ambiguous (e.g. 22-1)
        if draft.patient.age.status == "needs_review":
            questions.append({
                "field": "patient.age",
                "question": f"Doctor, please clarify the patient's age (dictated as '{draft.patient.age.source_text}') - is the age {draft.patient.age.value}, or a case/room number?",
                "original_value": draft.patient.age.source_text,
            })

        # 1c. Check chief complaints if ambiguous (e.g. Diary of 3 days)
        if draft.clinical.chief_complaints.status == "needs_review":
            questions.append({
                "field": "clinical.chief_complaints",
                "question": f"Doctor, please confirm if the chief complaint dictated as '{draft.clinical.chief_complaints.source_text}' should be recorded as '{draft.clinical.chief_complaints.value}'.",
                "original_value": draft.clinical.chief_complaints.source_text,
            })

        # 1d. Check unclear non-medical remarks (e.g. "she is familiar")
        for p in draft.clinical.unclear_phrases:
            questions.append({
                "field": "clinical.unclear_phrases",
                "question": f"Doctor, please clarify the remark '{p.value}' - was this intended as clinical advice or a general note?",
                "original_value": p.value,
            })

        # 2. Check medicine fields from validation issues or statuses
        for idx, med in enumerate(draft.medicines):
            med_name = med.name.value or f"Medicine #{idx+1}"

            # Uncertain candidate matches ("Do you mean this?")
            if med.candidate_matches and med.name.status in ("needs_review", "unclear"):
                cand_list = ", ".join(f"'{c}'" for c in med.candidate_matches)
                questions.append({
                    "field": f"medicines[{idx}].name",
                    "medicine_index": idx,
                    "question": f"Doctor, did you mean {cand_list} for item #{idx+1} ('{med.raw_phrase or med_name}')?",
                    "original_value": med.name.value,
                })
            # Unclear or ambiguous medicine name
            elif med.name.status in ("unclear", "needs_review"):
                if re.search(r"\d", med.name.value or ""):
                    q_text = f"Doctor, please clarify the phrase '{med_name}' (item #{idx+1}) - was this a second medication, a dosage, or an enumeration for subsequent drugs?"
                else:
                    q_text = f"Doctor, I couldn't clearly identify the medication name for item #{idx+1} ('{med_name}'). Could you please clarify?"
                questions.append({
                    "field": f"medicines[{idx}].name",
                    "medicine_index": idx,
                    "question": q_text,
                    "original_value": med.name.value,
                })

            # Hedged or unclear frequency (e.g. "maybe twice daily", "need to confirm")
            if med.frequency.status in ("unclear", "needs_review") and med.frequency.source_text:
                questions.append({
                    "field": f"medicines[{idx}].frequency",
                    "medicine_index": idx,
                    "question": f"Doctor, for {med_name}, did you mean {med.frequency.value}? (dictated with uncertainty as '{med.frequency.source_text}')",
                    "original_value": med.frequency.value,
                })

            # Conflicting timing/instruction resolution
            if med.special_instructions and "conflict" in str(med.special_instructions).lower():
                questions.append({
                    "field": f"medicines[{idx}].timing",
                    "medicine_index": idx,
                    "question": f"Doctor, for {med_name}, conflicting instructions were dictated ('{med.special_instructions}'). Please confirm the final timing.",
                    "original_value": med.timing.value,
                })

            # Unclear or missing strength
            if med.strength.status == "unclear":
                questions.append({
                    "field": f"medicines[{idx}].strength",
                    "medicine_index": idx,
                    "question": f"Doctor, could you please repeat the strength for {med_name}?",
                    "original_value": med.strength.value,
                })

            # Unclear duration for acute medications
            freq_code = (med.frequency.value or "").upper()
            if freq_code not in ["SOS", "STAT", "PRN"]:
                if med.duration.status == "unclear":
                    questions.append({
                        "field": f"medicines[{idx}].duration",
                        "medicine_index": idx,
                        "question": f"Doctor, I couldn't clearly understand the duration for {med_name}. Could you please repeat that instruction?",
                        "original_value": med.duration.value,
                    })

        return questions

