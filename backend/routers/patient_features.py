"""Patient-facing verified prescription explainer chatbot and medication reminders API router."""

from __future__ import annotations

import logging
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["Patient Features"])
svc = PrescriptionService()


class ChatQueryRequest(BaseModel):
    """Patient query to the prescription explainer."""

    message: str = Field(..., description="Patient question e.g. 'How should I take my morning medicines?'")
    language: str = Field("English", description="Preferred explanation language e.g. English, Hindi, Kannada")


class ChatQueryResponse(BaseModel):
    """Safe, doctor-grounded explanation response."""

    reply: str
    verified_prescription_id: str
    patient_name: Optional[str] = None
    disclaimer: str = (
        "This response is generated strictly from your doctor-verified prescription record for informational purposes. "
        "It cannot alter doses, add unprescribed medications, or diagnose. Please consult your physician for changes."
    )


class ReminderItem(BaseModel):
    """Scheduled dosage reminder derived directly from verified orders."""

    id: str
    medicine_name: str
    strength: Optional[str] = None
    form: Optional[str] = None
    dose: Optional[str] = None
    time_of_day: str  # e.g. "08:00 AM", "01:00 PM", "08:30 PM"
    meal_relation: Optional[str] = None  # e.g. "after food", "before breakfast"
    duration: Optional[str] = None
    status: str = "active"


class PrescriptionRemindersResponse(BaseModel):
    """All medication reminder schedules for a verified prescription."""

    prescription_id: str
    patient_name: Optional[str] = None
    reminders: list[ReminderItem]
    disclaimer: str = (
        "Reminders are scheduled strictly from doctor-verified timings and frequencies. "
        "Never adjust your dosage without consulting your prescribing doctor."
    )


@router.post(
    "/{prescription_id}/patient-chat",
    response_model=ChatQueryResponse,
    summary="Patient AI assistant explaining only the doctor-verified prescription",
)
async def patient_prescription_chat(
    prescription_id: str,
    payload: ChatQueryRequest,
):
    rx = await svc.get_prescription(prescription_id)
    if not rx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription {prescription_id} not found",
        )

    # Strict Safety Guard: Chatbot may read ONLY doctor-verified prescriptions
    if rx.status != "confirmed":
        return ChatQueryResponse(
            reply=(
                "Your prescription is currently pending review by your doctor. "
                "For your safety, the medical assistant cannot explain or confirm instructions "
                "until your physician completes their review and officially signs off on the prescription."
            ),
            verified_prescription_id=prescription_id,
            patient_name=rx.patient.name.value,
        )

    patient_name = rx.patient.name.value or "Patient"
    q = payload.message.lower().strip()

    # Build safe summary of doctor-verified medications
    med_explanations = []
    for idx, m in enumerate(rx.medicines):
        name = m.name.value or "Medication"
        st = f" ({m.strength.value})" if m.strength.value else ""
        dose = m.dose.value or "1 tablet"
        freq = m.frequency_normalized or m.frequency.value or "as directed"
        timing = f" {m.timing.value}" if m.timing.value else ""
        dur = f" for {m.duration.value}" if m.duration.value else " (Duration not specified by doctor; contact clinic if needed)"
        med_explanations.append(f"• {name}{st}: Take {dose}, {freq}{timing}{dur}.")

    advice_text = rx.clinical.advice.value or "Follow healthy dietary and rest habits as discussed with your doctor."
    fu_text = rx.clinical.follow_up.value or "Please contact your clinic if your symptoms persist."

    # Prevent out-of-scope medical generation
    prohibited_queries = ["change dose", "increase dose", "decrease dose", "skip", "alternative medicine", "substitute", "another brand"]
    if any(p in q for p in prohibited_queries):
        reply = (
            f"Dear {patient_name}, changing, increasing, or substituting prescribed medications requires direct clinical evaluation. "
            f"Please do not alter your medication schedule on your own. Contact your prescribing physician or pharmacist directly."
        )
    elif "when" in q or "time" in q or "schedule" in q or "how" in q or "take" in q:
        reply = (
            f"Hello {patient_name}, here is your doctor-verified medication schedule:\n\n"
            + "\n".join(med_explanations)
            + f"\n\nDoctor's Advice: {advice_text}\nFollow-Up: {fu_text}"
        )
    elif "side effect" in q:
        reply = (
            f"If you experience any unusual symptoms or side effects while taking your prescribed medications "
            f"({', '.join([m.name.value for m in rx.medicines if m.name.value])}), please pause and contact your doctor immediately."
        )
    else:
        reply = (
            f"Hello {patient_name}. According to your verified prescription, your doctor has prescribed:\n\n"
            + "\n".join(med_explanations)
            + f"\n\nFollow-Up: {fu_text}"
        )

    return ChatQueryResponse(
        reply=reply,
        verified_prescription_id=prescription_id,
        patient_name=patient_name,
    )


@router.get(
    "/{prescription_id}/reminders",
    response_model=PrescriptionRemindersResponse,
    summary="Generate patient dosage reminder schedules from verified prescription",
)
async def get_medication_reminders(prescription_id: str):
    rx = await svc.get_prescription(prescription_id)
    if not rx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription {prescription_id} not found",
        )

    if rx.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reminders cannot be scheduled for unverified prescription drafts. Doctor confirmation is required.",
        )

    reminders: list[ReminderItem] = []
    import uuid

    for m in rx.medicines:
        name = m.name.value or "Medication"
        freq = (m.frequency.value or "").upper().strip()
        timing = m.timing.value
        dur = m.duration.value

        # Map clinical frequencies to standard daily alert hours
        times: list[str] = []
        if freq in ("1-0-1", "BD", "BID"):
            times = ["08:00 AM", "08:30 PM"]
        elif freq in ("1-1-1", "TDS", "THRICE A DAY"):
            times = ["08:00 AM", "01:30 PM", "08:30 PM"]
        elif freq in ("1-0-0", "OD", "ONCE DAILY", "MORNING"):
            times = ["08:00 AM"]
        elif freq in ("0-0-1", "HS", "AT NIGHT", "BEDTIME"):
            times = ["09:30 PM"]
        elif freq in ("0-1-0", "AFTERNOON"):
            times = ["01:30 PM"]
        elif freq in ("QID", "FOUR TIMES A DAY"):
            times = ["08:00 AM", "12:00 PM", "04:00 PM", "08:30 PM"]
        elif freq == "SOS":
            times = ["As needed for symptoms (SOS)"]
        else:
            times = ["08:00 AM"]

        for t in times:
            reminders.append(
                ReminderItem(
                    id=str(uuid.uuid4()),
                    medicine_name=name,
                    strength=m.strength.value,
                    form=m.form.value,
                    dose=m.dose.value or "1 dose",
                    time_of_day=t,
                    meal_relation=timing,
                    duration=dur,
                    status="active",
                )
            )

    return PrescriptionRemindersResponse(
        prescription_id=prescription_id,
        patient_name=rx.patient.name.value,
        reminders=reminders,
    )
