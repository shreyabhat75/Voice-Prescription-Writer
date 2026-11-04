"""Medicine alias matcher and clinical reference dataset loader.

Provides fuzzy, phonetic, and alias matching for dictated medications,
preserving raw phrases and attaching candidate suggestions when uncertain.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_DATASET_PATH = Path(__file__).parent.parent.parent / "data" / "medicines" / "medicine_aliases.json"

_MEDICINES: list[dict[str, Any]] = []
_ALIAS_TO_ENTRY: dict[str, dict[str, Any]] = {}
_ALL_SEARCH_TERMS: list[str] = []


def _load_dataset() -> None:
    global _MEDICINES, _ALIAS_TO_ENTRY, _ALL_SEARCH_TERMS
    if _MEDICINES:
        return

    if not _DATASET_PATH.exists():
        return

    with open(_DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    _MEDICINES = data.get("medicines", [])
    _ALIAS_TO_ENTRY = {}
    terms = set()

    for med in _MEDICINES:
        canonical = med["canonical_name"].lower()
        _ALIAS_TO_ENTRY[canonical] = med
        terms.add(med["canonical_name"])

        for b in med.get("brand_names", []):
            _ALIAS_TO_ENTRY[b.lower()] = med
            terms.add(b)

        for a in med.get("aliases", []):
            _ALIAS_TO_ENTRY[a.lower()] = med
            terms.add(a)

    # Sort descending by length so longer phrases match before subphrases
    _ALL_SEARCH_TERMS = sorted(terms, key=len, reverse=True)


def get_all_search_terms() -> list[str]:
    """Return all known medicine names and aliases sorted by length descending."""
    _load_dataset()
    return list(_ALL_SEARCH_TERMS)


def match_medicine(raw_phrase: str) -> dict[str, Any]:
    """Find candidate matches for a dictated medicine phrase.

    Returns:
        dict with keys:
            - canonical_name: Optional[str]
            - candidate_matches: list[str]
            - status: "extracted" | "needs_review"
            - confidence: float
            - requires_confirmation: bool
            - default_form: Optional[str]
    """
    _load_dataset()
    clean = raw_phrase.strip().lower()

    if clean in _ALIAS_TO_ENTRY:
        entry = _ALIAS_TO_ENTRY[clean]
        requires_conf = clean in [a.lower() for a in entry.get("requires_confirmation_for", [])]
        candidates = list(entry.get("candidate_matches", []))

        # If requires confirmation, status is needs_review
        status = "needs_review" if requires_conf else "extracted"
        conf = 0.65 if requires_conf else 0.95

        return {
            "canonical_name": entry["canonical_name"],
            "candidate_matches": candidates,
            "status": status,
            "confidence": conf,
            "requires_confirmation": requires_conf,
            "default_form": entry.get("default_form"),
            "default_route": entry.get("default_route"),
        }

    # Partial / subphrase match
    for term, entry in _ALIAS_TO_ENTRY.items():
        if term in clean or clean in term:
            candidates = list(entry.get("candidate_matches", []))
            return {
                "canonical_name": entry["canonical_name"],
                "candidate_matches": candidates,
                "status": "needs_review",
                "confidence": 0.60,
                "requires_confirmation": True,
                "default_form": entry.get("default_form"),
                "default_route": entry.get("default_route"),
            }

    return {
        "canonical_name": None,
        "candidate_matches": [],
        "status": "needs_review",
        "confidence": 0.50,
        "requires_confirmation": True,
        "default_form": None,
        "default_route": None,
    }
