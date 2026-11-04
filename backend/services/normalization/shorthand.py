"""Shorthand normalization engine for medical dictations.

Maps medical abbreviations and spoken phrases (OD, BD, TDS, QID, HS, SOS, STAT, 1-0-1,
before breakfast, after food, Hindi variants) into standardized clinical representations
while preserving original spoken evidence.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "shorthand"


def _load_json_data(file_name: str) -> dict[str, Any]:
    path = DATA_DIR / file_name
    if not path.exists():
        logger.warning("Shorthand data file %s not found at %s", file_name, path)
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("Failed to load shorthand file %s: %s", file_name, e)
        return {}


FREQUENCY_CODES = _load_json_data("frequency_codes.json")
SPOKEN_VARIANTS = _load_json_data("spoken_variants.json")


def normalize_frequency(freq_str: str | None) -> tuple[str | None, str | None]:
    """Normalize a frequency string to standard code and human-readable label.

    Returns:
        (standard_code, full_description) e.g. ("TDS", "Three Times Daily (TDS)")
    """
    if not freq_str:
        return None, None

    cleaned = freq_str.strip().lower()

    # Direct code match (e.g., "TDS", "bd", "OD", "1-0-1")
    code_upper = freq_str.strip().upper()
    if code_upper in FREQUENCY_CODES:
        meta = FREQUENCY_CODES[code_upper]
        return code_upper, f"{meta.get('full', code_upper)} ({code_upper})"

    # Check dose patterns (1-0-1, etc.)
    pattern_map = SPOKEN_VARIANTS.get("dose_pattern", {})
    if cleaned in pattern_map:
        norm_pat = pattern_map[cleaned]
        return norm_pat, f"Pattern {norm_pat}"

    # Check standard spoken variants
    freq_map = SPOKEN_VARIANTS.get("frequency", {})
    if cleaned in freq_map:
        code = freq_map[cleaned]
        meta = FREQUENCY_CODES.get(code, {})
        full = meta.get("full", code)
        return code, f"{full} ({code})"

    # Check Hindi spoken variants
    hindi_map = SPOKEN_VARIANTS.get("hindi_frequency", {})
    for hindi_phrase, code in hindi_map.items():
        if hindi_phrase in cleaned:
            meta = FREQUENCY_CODES.get(code, {})
            full = meta.get("full", code)
            return code, f"{full} ({code})"

    # Regex search for numeric patterns like 1-0-1 or 1-1-1
    pattern_match = re.search(r"\b([0-2])-([0-2])-([0-2])\b", freq_str)
    if pattern_match:
        pat = pattern_match.group(0)
        return pat, f"Pattern {pat}"

    # Fallback to uppercase representation if it looks like an acronym
    if len(cleaned) <= 4 and cleaned.isalpha():
        code = cleaned.upper()
        return code, code

    return freq_str, freq_str


def normalize_timing(timing_str: str | None) -> str | None:
    """Normalize administration timing (e.g. before meals, after food)."""
    if not timing_str:
        return None

    cleaned = timing_str.strip().lower()
    timing_map = SPOKEN_VARIANTS.get("timing", {})

    if cleaned in timing_map:
        return timing_map[cleaned]

    for phrase, norm in timing_map.items():
        if phrase in cleaned:
            return norm

    # Check Hindi variants
    hindi_map = SPOKEN_VARIANTS.get("hindi_frequency", {})
    for phrase, norm in hindi_map.items():
        if phrase in cleaned and ("food" in norm or "meals" in norm):
            return norm

    return timing_str


def normalize_route(route_str: str | None) -> str | None:
    """Normalize administration route (e.g. oral, IV, IM, inhalation)."""
    if not route_str:
        return None

    raw_clean = route_str.strip()
    cleaned = raw_clean.lower()
    route_map = SPOKEN_VARIANTS.get("route", {})

    # Check case-insensitively
    for phrase, norm in route_map.items():
        if phrase.lower() == cleaned:
            return norm

    for phrase, norm in route_map.items():
        if phrase.lower() in cleaned:
            return norm

    return route_str


