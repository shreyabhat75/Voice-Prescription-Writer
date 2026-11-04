"""ReportLab-based professional medical prescription PDF generator.

Strictly enforces doctor confirmation gate before rendering final PDF.
"""

from __future__ import annotations

import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from backend.config import get_settings
from backend.models.prescription import PrescriptionResponse


class PDFGenerationError(Exception):
    """Raised when PDF generation fails or is attempted on an unconfirmed draft."""
    pass


class PrescriptionPDFGenerator:
    """Generates clinical PDF documents for confirmed prescriptions."""

    def __init__(self, output_dir: str | None = None) -> None:
        settings = get_settings()
        self.output_dir = Path(output_dir or settings.PDF_OUTPUT_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def get_pdf_download_filename(
        patient_name: str | None,
        rx_date_str: str | None = None,
        prescription_id: str = "",
    ) -> str:
        """Format sanitized filename as PatientName_YYYY-MM-DD.pdf per clinical requirements."""
        clean_name = (patient_name or "").strip()
        if not clean_name or clean_name.lower() in ("demo patient", "unnamed patient", "not specified"):
            clean_name = f"Prescription_{prescription_id[:8]}" if prescription_id else "Prescription"
        else:
            # Sanitize spaces and special characters: "Shreya Bhatt" -> "Shreya_Bhatt"
            clean_name = re.sub(r"[^\w\-]", "_", clean_name)
            clean_name = re.sub(r"_+", "_", clean_name).strip("_")

        # Consistent YYYY-MM-DD date
        date_part = datetime.now().strftime("%Y-%m-%d")
        if rx_date_str:
            try:
                clean_date = rx_date_str.split("T")[0]
                if len(clean_date) == 10 and clean_date[4] == "-" and clean_date[7] == "-":
                    date_part = clean_date
            except Exception:
                pass

        return f"{clean_name}_{date_part}.pdf"

    def generate(
        self,
        prescription: PrescriptionResponse,
        clinic_name: str = "Apex Healthcare Multispecialty Clinic",
        doctor_name: str = "Dr. Ananya Rao, MD (General Medicine)",
        reg_number: str = "MCI-IND-849204",
        patient_id: str | None = None,
    ) -> str:
        """Generate a PDF for the prescription.

        Raises:
            PDFGenerationError: If the prescription is not in 'confirmed' status.
        """
        # Strict clinical confirmation gate
        if prescription.status != "confirmed":
            raise PDFGenerationError(
                f"Cannot generate PDF: Prescription #{prescription.id} is in status '{prescription.status}'. "
                f"Doctor confirmation is compulsory before printing or exporting a final prescription."
            )

        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        pdf_path = self.output_dir / f"prescription_{prescription.id}_{timestamp_str}.pdf"

        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()

        # Custom styles
        clinic_title_style = ParagraphStyle(
            "ClinicTitle",
            parent=styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#1e3a8a"),  # Deep blue
            fontName="Helvetica-Bold",
        )
        doctor_style = ParagraphStyle(
            "DoctorSubtitle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#334155"),
        )
        section_heading_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading3"],
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#0f766e"),  # Teal
            fontName="Helvetica-Bold",
            spaceBefore=8,
            spaceAfter=4,
        )
        body_style = ParagraphStyle(
            "PrescriptionBody",
            parent=styles["Normal"],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#1e293b"),
        )
        table_header_style = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.white,
            fontName="Helvetica-Bold",
        )
        table_cell_style = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#0f172a"),
        )

        elements: list[Any] = []

        # 1. Header & Clinic Info
        elements.append(Paragraph(clinic_name, clinic_title_style))
        elements.append(Paragraph(f"{doctor_name} | Reg No: {reg_number}", doctor_style))
        elements.append(Paragraph("104 Medical Enclave, Indiranagar, Bengaluru, KA - 560038 | Tel: +91 80 2525 9900", doctor_style))
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1e3a8a"), spaceAfter=10))

        # 2. Patient Demographics & Date Box
        date_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
        p_name = prescription.patient.name.value or "Not Specified"
        p_age = f"{prescription.patient.age.value} yrs" if prescription.patient.age.value is not None else "Not provided"
        p_sex = (prescription.patient.sex.value or "Not provided").title()
        pid_display = patient_id or prescription.permanent_patient_id or "--"

        demographics_data = [
            [
                Paragraph(f"<b>Patient Name:</b> {p_name}", body_style),
                Paragraph(f"<b>Patient ID:</b> {pid_display}", body_style),
                Paragraph(f"<b>Age / Sex:</b> {p_age} / {p_sex}", body_style),
            ],
            [
                Paragraph(f"<b>Prescription ID:</b> #{prescription.id[:8]}", body_style),
                Paragraph(f"<b>Date:</b> {date_str}", body_style),
                Paragraph(f"<b>Status:</b> Verified (v{prescription.version})", body_style),
            ]
        ]
        demo_table = Table(demographics_data, colWidths=[200, 160, 180])
        demo_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(demo_table)
        elements.append(Spacer(1, 10))

        # 3. Clinical Symptoms & Diagnosis (Only if present!)
        complaints = prescription.clinical.chief_complaints.value
        if complaints:
            elements.append(Paragraph("Chief Complaints & Clinical Presentation:", section_heading_style))
            elements.append(Paragraph(f"{complaints}", body_style))
            elements.append(Spacer(1, 6))

        diagnosis = prescription.clinical.diagnosis.value
        if diagnosis:
            elements.append(Paragraph("Clinical Diagnosis:", section_heading_style))
            elements.append(Paragraph(f"<b>{diagnosis}</b>", body_style))
            elements.append(Spacer(1, 6))

        # 4. Rx Symbol & Medicine Table
        elements.append(Paragraph("<font size=14><b>&#8478;</b></font> <b>Medication Orders</b>", section_heading_style))

        med_headers = [
            Paragraph("#", table_header_style),
            Paragraph("Medicine Name", table_header_style),
            Paragraph("Strength", table_header_style),
            Paragraph("Form", table_header_style),
            Paragraph("Dose & Route", table_header_style),
            Paragraph("Frequency & Timing", table_header_style),
            Paragraph("Duration", table_header_style),
        ]
        med_rows = [med_headers]

        for idx, med in enumerate(prescription.medicines):
            name_txt = med.name.value or "Unspecified"
            strength_txt = med.strength.value or "--"
            form_txt = (med.form.value or "tab").title()
            dose_route = f"{med.dose.value or '1 unit'} ({med.route.value or 'oral'})"
            freq_timing = f"{med.frequency_normalized or med.frequency.value or '--'}"
            if med.timing.value:
                freq_timing += f" - {med.timing.value}"
            duration_txt = med.duration.value or "--"

            row = [
                Paragraph(str(idx + 1), table_cell_style),
                Paragraph(f"<b>{name_txt}</b>", table_cell_style),
                Paragraph(str(strength_txt), table_cell_style),
                Paragraph(str(form_txt), table_cell_style),
                Paragraph(str(dose_route), table_cell_style),
                Paragraph(str(freq_timing), table_cell_style),
                Paragraph(str(duration_txt), table_cell_style),
            ]
            med_rows.append(row)

        med_table = Table(med_rows, colWidths=[20, 130, 60, 50, 90, 130, 60], repeatRows=1)
        med_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(med_table)
        elements.append(Spacer(1, 10))

        # 5. Investigations (if present)
        investigations = prescription.clinical.investigations.value
        if investigations:
            elements.append(Paragraph("Recommended Investigations / Lab Tests:", section_heading_style))
            elements.append(Paragraph(f"{investigations}", body_style))
            elements.append(Spacer(1, 6))

        # 6. Advice & General Measures
        advice = prescription.clinical.advice.value
        if advice:
            elements.append(Paragraph("Physician Advice & Dietary Guidance:", section_heading_style))
            elements.append(Paragraph(f"{advice}", body_style))
            elements.append(Spacer(1, 6))

        # 7. Follow Up
        follow_up = prescription.clinical.follow_up.value
        if follow_up:
            elements.append(Paragraph("Follow-up Review:", section_heading_style))
            elements.append(Paragraph(f"<b>{follow_up}</b>", body_style))
            elements.append(Spacer(1, 14))

        # 8. Sign-off Footer
        footer_elements = [
            HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8),
            Table([
                [
                    Paragraph("<i>Digitally reviewed and approved via Voice Prescription Writer.</i>", body_style),
                    Paragraph(f"<b>{doctor_name}</b><br/>Signature Validated", ParagraphStyle("Sig", parent=body_style, alignment=2)),
                ]
            ], colWidths=[360, 180])
        ]
        elements.append(KeepTogether(footer_elements))

        doc.build(elements)
        return str(pdf_path)

