"""Unit tests for shorthand normalization engine."""

from __future__ import annotations

import pytest
from backend.services.normalization.shorthand import (
    normalize_frequency,
    normalize_route,
    normalize_timing,
)


def test_standard_frequency_abbreviations():
    """Verify standard frequency abbreviations are properly normalized."""
    code, desc = normalize_frequency("OD")
    assert code == "OD"
    assert "Once Daily" in desc

    code, desc = normalize_frequency("BD")
    assert code == "BD"
    assert "Twice Daily" in desc

    code, desc = normalize_frequency("TDS")
    assert code == "TDS"
    assert "Three Times Daily" in desc

    code, desc = normalize_frequency("QID")
    assert code == "QID"
    assert "Four Times Daily" in desc

    code, desc = normalize_frequency("HS")
    assert code == "HS"
    assert "At Bedtime" in desc

    code, desc = normalize_frequency("SOS")
    assert code == "SOS"
    assert "As Needed" in desc

    code, desc = normalize_frequency("STAT")
    assert code == "STAT"
    assert "Immediately" in desc


def test_spoken_phrases():
    """Verify natural spoken phrases map to clinical codes."""
    code, desc = normalize_frequency("three times a day")
    assert code == "TDS"

    code, desc = normalize_frequency("twice daily")
    assert code == "BD"

    code, desc = normalize_frequency("at night")
    assert code == "HS"

    code, desc = normalize_frequency("when needed")
    assert code == "SOS"


def test_dose_pattern():
    """Verify 1-0-1 and similar numeric patterns."""
    code, desc = normalize_frequency("1-0-1")
    assert code == "1-0-1"
    assert "1-0-1" in desc

    code, desc = normalize_frequency("one tablet morning and night")
    assert code == "1-0-1"


def test_timing_normalization():
    """Verify meal timing normalization."""
    assert "before food (AC)" in normalize_timing("before food")
    assert "before breakfast (AC)" in normalize_timing("before breakfast")
    assert "after food (PC)" in normalize_timing("after meals")


def test_route_normalization():
    """Verify medication route normalization."""
    assert normalize_route("IV") == "intravenous"
    assert normalize_route("IM") == "intramuscular"
    assert normalize_route("orally") == "oral"
    assert normalize_route("nebulizer") == "nebulization"

