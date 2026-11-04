"""Voice editing service for natural doctor commands."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from backend.models.prescription import MedicineItem, PrescriptionDraft, SourceEvidence
from backend.services.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class VoiceEditService:
    """Parses voice editing commands and applies structured modifications to prescriptions."""

    def __init__(self, llm_provider: LLMProvider | None = None) -> None:
        self.llm_provider = llm_provider

    async def apply_command(
        self,
        command: str,
        draft: PrescriptionDraft,
    ) -> tuple[PrescriptionDraft, dict[str, Any]]:
        """Apply voice command to the draft.

        Returns:
            (updated_draft, audit_log_entry)
        """
        updated_draft = draft.model_copy(deep=True)
        lower_cmd = command.lower()

        audit_entry: dict[str, Any] = {
            "command": command,
            "action": "unknown",
            "field_path": None,
            "before_value": None,
            "after_value": None,
            "success": False,
            "message": "",
        }

        # 1. Pattern: "Remove [second/2nd/first/etc.] medicine" or "Remove [name]"
        remove_match = re.search(r"remove\s+(?:the\s+)?(\w+)\s+medicine", lower_cmd)
        if remove_match or "remove" in lower_cmd or "delete" in lower_cmd:
            idx_to_remove = None
            if "second" in lower_cmd or "2nd" in lower_cmd or " 2" in lower_cmd:
                idx_to_remove = 1
            elif "first" in lower_cmd or "1st" in lower_cmd or " 1" in lower_cmd:
                idx_to_remove = 0
            elif "third" in lower_cmd or "3rd" in lower_cmd or " 3" in lower_cmd:
                idx_to_remove = 2
            else:
                # Try finding medicine by name
                for idx, med in enumerate(updated_draft.medicines):
                    name_val = str(med.name.value or "").lower()
                    if name_val and name_val in lower_cmd:
                        idx_to_remove = idx
                        break

            if idx_to_remove is not None and 0 <= idx_to_remove < len(updated_draft.medicines):
                removed_med = updated_draft.medicines.pop(idx_to_remove)
                audit_entry.update({
                    "action": "remove_medicine",
                    "field_path": f"medicines[{idx_to_remove}]",
                    "before_value": removed_med.name.value,
                    "after_value": None,
                    "success": True,
                    "message": f"Removed medicine '{removed_med.name.value}'.",
                })
                return updated_draft, audit_entry

        # 2. Pattern: "Change [name] to [new_value]" or "Change [field] to [new_value]"
        change_match = re.search(r"(?:change|make|update)\s+(?:the\s+)?([a-zA-Z0-9\-_]+)\s+(?:to|as)\s+([a-zA-Z0-9\-_ ]+)", lower_cmd)
        if change_match:
            target = change_match.group(1).strip()
            new_val = change_match.group(2).strip()

            # Check if target matches medicine name (e.g. "change dolo to 500")
            for idx, med in enumerate(updated_draft.medicines):
                name_val = str(med.name.value or "").lower()
                if target in name_val or name_val in target:
                    # Changing strength / dose
                    before = med.strength.value
                    strength_val = new_val if "mg" in new_val else f"{new_val}mg"
                    med.strength = SourceEvidence(
                        value=strength_val,
                        source_text=f"Voice edit: {command}",
                        status="doctor_corrected",
                        confidence=1.0,
                    )
                    audit_entry.update({
                        "action": "update_strength",
                        "field_path": f"medicines[{idx}].strength",
                        "before_value": before,
                        "after_value": strength_val,
                        "success": True,
                        "message": f"Updated {med.name.value} strength to {strength_val}.",
                    })
                    return updated_draft, audit_entry

            # Check patient age / name
            if target == "age":
                before = updated_draft.patient.age.value
                try:
                    num_age = int(re.search(r"\d+", new_val).group(0)) # type: ignore
                    updated_draft.patient.age = SourceEvidence(
                        value=num_age,
                        source_text=f"Voice edit: {command}",
                        status="doctor_corrected",
                        confidence=1.0,
                    )
                    audit_entry.update({
                        "action": "update_patient_age",
                        "field_path": "patient.age",
                        "before_value": before,
                        "after_value": num_age,
                        "success": True,
                        "message": f"Updated patient age to {num_age}.",
                    })
                    return updated_draft, audit_entry
                except Exception:
                    pass

        # 3. Pattern: "Add [medicine]..."
        if lower_cmd.startswith("add ") or "add " in lower_cmd:
            new_med = self._parse_add_medicine_command(command)
            updated_draft.medicines.append(new_med)
            audit_entry.update({
                "action": "add_medicine",
                "field_path": f"medicines[{len(updated_draft.medicines)-1}]",
                "before_value": None,
                "after_value": new_med.name.value,
                "success": True,
                "message": f"Added medicine '{new_med.name.value}'.",
            })
            return updated_draft, audit_entry

        # Fallback to LLM provider if available
        if self.llm_provider:
            try:
                llm_res = await self.llm_provider.parse_voice_edit(
                    command=command,
                    current_prescription_json=updated_draft.model_dump_json(),
                )
                parsed = json.loads(llm_res.raw_json)
                if parsed.get("action") == "update_field":
                    # Apply parsed edit
                    pass
            except Exception as e:
                logger.error("LLM voice edit parsing error: %s", e)

        audit_entry["message"] = f"Doctor command '{command}' was ambiguous. Please specify what you would like to change or remove."
        return updated_draft, audit_entry

    def _parse_add_medicine_command(self, command: str) -> MedicineItem:
        lower = command.lower()
        words = command.split()
        med_name = words[1] if len(words) > 1 else "New Medicine"

        # Check for duration like "for 5 days"
        duration_val = None
        dur_match = re.search(r"for\s+(\d+\s+(?:days|weeks|months))", lower)
        if dur_match:
            duration_val = dur_match.group(1)

        # Check for frequency / timing
        freq_val = "OD"
        timing_val = "after food"
        if "before breakfast" in lower:
            freq_val = "OD"
            timing_val = "before breakfast (AC)"
        elif "twice" in lower or "bd" in lower:
            freq_val = "BD"
        elif "three times" in lower or "tds" in lower:
            freq_val = "TDS"

        return MedicineItem(
            name=SourceEvidence(value=med_name, source_text=f"Voice edit: {command}", status="doctor_corrected", confidence=1.0),
            strength=SourceEvidence(value=None, status="not_mentioned"),
            form=SourceEvidence(value="tablet", status="extracted", confidence=0.8),
            dose=SourceEvidence(value="1 tablet", status="extracted", confidence=0.8),
            frequency=SourceEvidence(value=freq_val, source_text=timing_val, status="doctor_corrected", confidence=1.0),
            frequency_normalized=freq_val,
            timing=SourceEvidence(value=timing_val, source_text=timing_val, status="doctor_corrected", confidence=1.0),
            duration=SourceEvidence(value=duration_val, source_text=duration_val, status="doctor_corrected" if duration_val else "not_mentioned", confidence=1.0 if duration_val else None),
            route=SourceEvidence(value="oral", status="extracted", confidence=0.8),
            special_instructions=None,
        )

