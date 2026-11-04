"""End-to-end integration tests for all REST API endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_full_prescription_lifecycle(async_client: AsyncClient):
    """Test full cycle: Create -> Transcribe -> Structure -> Edit -> Voice Edit -> PDF Block -> Confirm -> PDF Download -> History."""

    # 1. Create Prescription
    res = await async_client.post("/api/prescriptions")
    assert res.status_code == 201
    rx_data = res.json()
    rx_id = rx_data["id"]
    assert rx_data["status"] == "recording"

    # 2. Transcribe (using default canned script 1 in mock)
    res = await async_client.post(f"/api/prescriptions/{rx_id}/transcribe")
    assert res.status_code == 200
    rx_data = res.json()
    assert rx_data["raw_transcript"] is not None
    assert rx_data["status"] == "structuring"

    # 3. Structure
    res = await async_client.post(f"/api/prescriptions/{rx_id}/structure")
    assert res.status_code == 200
    rx_data = res.json()
    assert rx_data["status"] == "review"
    assert rx_data["patient"]["name"]["value"] == "Rajesh Kumar"
    assert len(rx_data["medicines"]) >= 2

    # 4. Manual Update (edit patient age)
    patient_payload = rx_data["patient"]
    patient_payload["age"]["value"] = 46
    patient_payload["age"]["status"] = "doctor_corrected"
    res = await async_client.put(
        f"/api/prescriptions/{rx_id}/patient",
        json=patient_payload,
    )
    assert res.status_code == 200
    assert res.json()["patient"]["age"]["value"] == 46

    # 5. Voice Edit Command ("Change Dolo to 500")
    res = await async_client.post(
        f"/api/prescriptions/{rx_id}/voice-edit",
        json={"command": "Change Dolo to 500"},
    )
    assert res.status_code == 200
    edit_resp = res.json()
    assert edit_resp["audit_entry"]["success"] is True
    assert edit_resp["prescription"]["medicines"][0]["strength"]["value"] == "500mg"

    # 6. Attempt PDF generation BEFORE doctor confirmation -> MUST BE 403 FORBIDDEN
    res = await async_client.get(f"/api/prescriptions/{rx_id}/pdf")
    assert res.status_code == 403
    assert "Doctor confirmation is mandatory" in res.json()["detail"]

    # 7. Doctor Confirms Prescription
    res = await async_client.post(
        f"/api/prescriptions/{rx_id}/confirm",
        json={"doctor_name": "Dr. Ananya Rao", "confirm_all_reviewed": True},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "confirmed"

    # 8. Download PDF AFTER confirmation -> MUST SUCCEED (200 OK, application/pdf)
    res = await async_client.get(f"/api/prescriptions/{rx_id}/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000

    # 9. Verify History and Audit Trail
    res = await async_client.get(f"/api/prescriptions/{rx_id}/history")
    assert res.status_code == 200
    history = res.json()
    assert len(history["versions"]) >= 3
    assert len(history["edits"]) >= 2

    # 10. Submit Feedback
    res = await async_client.post(
        f"/api/prescriptions/{rx_id}/feedback",
        json={"rating": 5, "category": "accuracy", "comment": "Great extraction on Dolo and Cetirizine"},
    )
    assert res.status_code == 200
    assert res.json()["rating"] == 5

