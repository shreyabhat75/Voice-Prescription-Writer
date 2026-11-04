"""Main normalization service that applies shorthand normalization across a PrescriptionDraft."""

from __future__ import annotations

import logging
from copy import deepcopy

from backend.models.prescription import MedicineItem, PrescriptionDraft
from backend.services.medicines.alias_matcher import match_medicine
from backend.services.normalization.shorthand import (
    normalize_frequency,
    normalize_route,
    normalize_timing,
)

logger = logging.getLogger(__name__)


class PrescriptionNormalizer:
    """Applies medical shorthand normalization to prescription drafts."""

    def normalize(self, draft: PrescriptionDraft) -> PrescriptionDraft:
        """Return a new PrescriptionDraft with normalized frequencies, routes, and timings."""
        normalized_draft = draft.model_copy(deep=True)

        for med in normalized_draft.medicines:
            self._normalize_medicine(med)

        return normalized_draft

    def _normalize_medicine(self, med: MedicineItem) -> None:
        # 1. Normalize Frequency
        freq_raw = str(med.frequency.value) if med.frequency.value is not None else None
        if freq_raw:
            code, full_desc = normalize_frequency(freq_raw)
            med.frequency_normalized = full_desc or code
        else:
            med.frequency_normalized = None

        # 2. Normalize Timing
        timing_raw = str(med.timing.value) if med.timing.value is not None else None
        if timing_raw:
            norm_timing = normalize_timing(timing_raw)
            if norm_timing:
                med.timing.value = norm_timing

        # 3. Normalize Route
        route_raw = str(med.route.value) if med.route.value is not None else None
        if route_raw:
            norm_route = normalize_route(route_raw)
            if norm_route:
                med.route.value = norm_route

        # 4. Check Medicine Alias / Candidates
        raw_name = med.name.value or (med.name.source_text if med.name else "")
        if raw_name:
            if not med.raw_phrase:
                med.raw_phrase = (med.name.source_text if med.name else None) or raw_name
            if not med.candidate_matches:
                match_res = match_medicine(raw_name)
                if match_res.get("candidate_matches"):
                    med.candidate_matches = match_res["candidate_matches"]
                    if match_res.get("requires_confirmation") or match_res.get("status") == "needs_review":
                        if med.name:
                            med.name.status = "needs_review"
                            med.name.confidence = match_res.get("confidence", 0.65)

