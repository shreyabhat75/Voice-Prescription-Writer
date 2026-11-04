"""PDF generation and download API router."""

from __future__ import annotations

import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from backend.services.pdf.pdf_generator import PDFGenerationError
from backend.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["PDF Generation"])
svc = PrescriptionService()


@router.get(
    "/{prescription_id}/pdf",
    summary="Download professional prescription PDF (Strict confirmation gate enforced)",
)
async def download_prescription_pdf(prescription_id: str):
    rx = await svc.get_prescription(prescription_id)
    if not rx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription {prescription_id} not found",
        )

    if rx.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Prescription #{prescription_id} cannot be exported: Current status is '{rx.status}'. "
                f"Doctor confirmation is mandatory before generating a printable PDF prescription."
            ),
        )

    try:
        pdf_path = await svc.generate_pdf(prescription_id)
        file_name = Path(pdf_path).name
        return FileResponse(
            path=pdf_path,
            filename=file_name,
            media_type="application/pdf",
        )
    except PDFGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except Exception as e:
        logger.error("PDF generation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {e}",
        )

