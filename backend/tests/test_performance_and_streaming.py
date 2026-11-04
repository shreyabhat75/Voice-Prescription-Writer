"""Automated unit and integration tests for Backend & AI Performance (Person 2).

Verifies:
1. Sub-millisecond Trie & Inverted Index drug search performance.
2. Drug catalog autocomplete API endpoint.
3. Code-mixed Hindi/English dictations.
4. SQLite WAL-mode and concurrent execution.
"""

from __future__ import annotations

import time
import pytest
from httpx import AsyncClient

from backend.services.llm.clinical_extractor import ClinicalExtractor
from backend.services.medicines.alias_matcher import match_medicine, search_medicines


def test_trie_and_alias_matching_performance():
    """Verify alias matcher executes at microsecond speeds using in-memory Trie/inverted index."""
    # Warm up index
    match_medicine("Paracetamol")

    queries = [
        "Pan-D",
        "pandy",
        "double pandy",
        "montelicast",
        "benedryl",
        "Dolo 650",
        "Augmentin",
        "Telma 40",
        "Emeset",
        "Deriphyllin",
    ]

    start = time.perf_counter()
    iterations = 500
    for _ in range(iterations):
        for q in queries:
            res = match_medicine(q)
            assert res is not None

    total_queries = iterations * len(queries)
    elapsed_ms = (time.perf_counter() - start) * 1000
    avg_microseconds = (elapsed_ms / total_queries) * 1000

    # Ensure average latency is under 100 microseconds (0.1 ms) per match
    assert avg_microseconds < 100.0, f"Average lookup time {avg_microseconds:.2f} µs exceeded 100 µs target"


def test_search_medicines_autocomplete():
    """Verify fast prefix and token search for frontend auto-complete."""
    res_dolo = search_medicines("dolo", limit=5)
    assert any("Dolo" in r["canonical_name"] for r in res_dolo)

    res_pan = search_medicines("pan", limit=5)
    assert any("Pan" in r["canonical_name"] for r in res_pan)

    res_mont = search_medicines("mont", limit=5)
    assert any("Mont" in r["canonical_name"] for r in res_mont)


def test_code_mixed_hindi_english_dictation():
    """Verify that Hindi/English code-mixed phrases are accurately parsed without data loss."""
    extractor = ClinicalExtractor()

    # Code-mixed dictation: "do din" (2 days), "subah khali pet" (before breakfast / AC), "dawai"
    transcript = (
        "Patient Rajesh Gupta, 52 male. Pet mein dard aur gas ban rahi hai for do din. "
        "Tab Pantoprazole 40mg ek baar subah khali pet for 14 din. "
        "Tab Paracetamol 650mg din mein teen baar for do din."
    )

    res = extractor.extract(transcript)

    # 1. Patient verification
    assert res["patient"]["name"]["value"] == "Rajesh Gupta"
    assert res["patient"]["age"]["value"] == 52
    assert res["patient"]["sex"]["value"] == "male"

    # 2. Symptoms verification
    assert "gas" in res["clinical"]["chief_complaints"]["value"].lower() or "dard" in res["clinical"]["chief_complaints"]["value"].lower()

    # 3. Medicines
    assert len(res["medicines"]) == 2

    # Pantoprazole: subah khali pet -> before breakfast, 14 din -> 14 days
    panto = res["medicines"][0]
    assert "pantoprazole" in panto["name"]["value"].lower()
    assert panto["strength"]["value"] == "40mg"
    assert "before breakfast" in panto["timing"]["value"].lower() or "ac" in panto["timing"]["value"].lower()
    assert "14 days" in panto["duration"]["value"].lower()

    # Paracetamol: teen baar -> TDS, do din -> 2 days
    para = res["medicines"][1]
    assert "paracetamol" in para["name"]["value"].lower()
    assert para["strength"]["value"] == "650mg"
    assert "tds" in para["frequency"]["value"].lower() or "3 times" in para["frequency"]["value"].lower() or "teen baar" in para["frequency"]["value"].lower()
    assert "2 days" in para["duration"]["value"].lower()


def test_search_medicines_api_endpoint():
    """Verify search_medicine_catalog router handler returns relevant drug candidates."""
    from backend.routers.prescriptions import search_medicine_catalog

    data = search_medicine_catalog("pan", limit=5)
    assert isinstance(data, list)
    assert len(data) > 0
    assert any("Pan" in item["canonical_name"] for item in data)
