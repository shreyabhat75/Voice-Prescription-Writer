"""ReportLab-based professional medical prescription PDF generator.

Strictly enforces doctor confirmation gate before rendering final PDF.
Follows restrained, professional medical typography with multi-page support.
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
from reportlab.pdfgen import canvas
from reportlab.platypus import HRFlowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from backend.config import get_settings
from backend.models.prescription import PrescriptionResponse


class PDFGenerationError(Exception):
    """Raised when PDF generation fails or is attempted on an unconfirmed draft."""
    pass


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for dynamic 'Page X of Y' pagination across arbitrary pages."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._saved_page_states: list[dict[str, Any]] = []

    def showPage(self) -> None:
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count: int) -> None:
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(36, 32, letter[0] - 36, 32)

        # Footer labels
        rx_meta = "Prescription Document • Confidential Medical Record"
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawString(36, 20, rx_meta)
        self.drawRightString(letter[0] - 36, 20, page_text)
        self.restoreState()


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
            # Sanitize spaces and special characters: "Tara Krishnan" -> "Tara_Krishnan"
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
        doctor_name: str = "Dr. Ananya Rao, MD",
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

        # Standard Letter, 0.5 inch margins (36 pt)
        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=44,
        )

        styles = getSampleStyleSheet()

        clinic_title_style = ParagraphStyle(
            "ClinicTitle",
            parent=styles["Heading1"],
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold",
        )
        doctor_style = ParagraphStyle(
            "DoctorSubtitle",
            parent=styles["Normal"],
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#334155"),
            fontName="Helvetica-Bold",
        )
        clinic_sub_style = ParagraphStyle(
            "ClinicSub",
            parent=styles["Normal"],
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#64748b"),
        )
        section_heading_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading3"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#0f766e"),  # Professional deep teal
            fontName="Helvetica-Bold",
            spaceBefore=6,
            spaceAfter=3,
        )
        body_style = ParagraphStyle(
            "PrescriptionBody",
            parent=styles["Normal"],
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#1e293b"),
        )
        table_header_style = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontSize=7.5,
            leading=10,
            textColor=colors.white,
            fontName="Helvetica-Bold",
            alignment=0,
        )
        table_cell_style = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#0f172a"),
        )

        elements: list[Any] = []

        # 1. Header with clinic / doctor info (only provided/verified, no fabricated address)
        header_rows = []
        if clinic_name:
            header_rows.append([Paragraph(f"<b>{clinic_name}</b>", clinic_title_style)])
        if doctor_name:
            reg_display = f" | Medical Reg. No: {reg_number}" if reg_number else ""
            header_rows.append([Paragraph(f"{doctor_name}{reg_display}", doctor_style)])

        if header_rows:
            header_table = Table(header_rows, colWidths=[540])
            header_table.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]))
            elements.append(header_table)

        elements.append(Spacer(1, 4))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0f766e"), spaceAfter=8))

        def _clean_cell(val: Any, fallback: str = "—") -> str:
            if val is None:
                return fallback
            s = str(val).strip()
            if not s or s.lower() in ("not_mentioned", "none", "null", "undefined"):
                return fallback
            return s

        # 2. Patient Demographics & Prescription Metadata
        date_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
        p_name = _clean_cell(prescription.patient.name.value, "Not specified")
        raw_age = prescription.patient.age.value
        p_age = f"{raw_age} yrs" if raw_age is not None and str(raw_age).lower() not in ("not_mentioned", "none") else "Not specified"
        p_sex = _clean_cell(prescription.patient.sex.value, "Not specified").title()
        pid_display = patient_id or prescription.permanent_patient_id or "Not specified"

        demographics_data = [
            [
                Paragraph(f"<b>Patient Name:</b> {p_name}", body_style),
                Paragraph(f"<b>Patient ID:</b> {pid_display}", body_style),
                Paragraph(f"<b>Age / Gender:</b> {p_age} / {p_sex}", body_style),
            ],
            [
                Paragraph(f"<b>Prescription ID:</b> #{prescription.id[:8]}", body_style),
                Paragraph(f"<b>Date:</b> {date_str}", body_style),
                Paragraph(f"<b>Status:</b> Doctor Confirmed (v{prescription.version})", body_style),
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
        elements.append(Spacer(1, 8))

        # 3. Clinical Symptoms & Diagnosis in separate sections (Strict non-inference)
        complaints = prescription.clinical.chief_complaints.value
        if complaints and str(complaints).strip().lower() not in ("not_mentioned", "none", "null"):
            elements.append(Paragraph("Chief Complaints & Symptoms", section_heading_style))
            elements.append(Paragraph(f"{complaints}", body_style))
            elements.append(Spacer(1, 5))

        diagnosis = prescription.clinical.diagnosis.value
        if diagnosis and str(diagnosis).strip().lower() not in ("not_mentioned", "none", "null", "not specified"):
            elements.append(Paragraph("Clinical Diagnosis", section_heading_style))
            elements.append(Paragraph(f"<b>{diagnosis}</b>", body_style))
            elements.append(Spacer(1, 5))

        # 4. Rx Heading & Medication Table (Distinct columns for all specified fields)
        elements.append(Paragraph("<font size=12><b>&#8478;</b></font> <b>Medication Orders</b>", section_heading_style))

        med_headers = [
            Paragraph("#", table_header_style),
            Paragraph("Medicine Name", table_header_style),
            Paragraph("Strength", table_header_style),
            Paragraph("Form", table_header_style),
            Paragraph("Dose", table_header_style),
            Paragraph("Route", table_header_style),
            Paragraph("Frequency", table_header_style),
            Paragraph("Food Instruction", table_header_style),
            Paragraph("Duration", table_header_style),
        ]
        med_rows = [med_headers]

        for idx, med in enumerate(prescription.medicines):
            name_txt = _clean_cell(med.name.value, f"Medicine #{idx+1}")
            strength_txt = _clean_cell(med.strength.value, "—")
            raw_form = _clean_cell(med.form.value, "—")
            form_txt = raw_form.title() if raw_form != "—" else "—"
            dose_txt = _clean_cell(med.dose.value, "—")
            raw_route = _clean_cell(med.route.value, "—")
            if raw_route != "—":
                route_txt = raw_route.upper() if raw_route.lower() in ("iv", "im") else raw_route.title()
            else:
                route_txt = "—"
            freq_txt = _clean_cell(med.frequency_normalized or med.frequency.value, "—")
            food_txt = _clean_cell(med.timing.value, "—")
            duration_txt = _clean_cell(med.duration.value, "—")

            row = [
                Paragraph(str(idx + 1), table_cell_style),
                Paragraph(f"<b>{name_txt}</b>", table_cell_style),
                Paragraph(strength_txt, table_cell_style),
                Paragraph(form_txt, table_cell_style),
                Paragraph(dose_txt, table_cell_style),
                Paragraph(route_txt, table_cell_style),
                Paragraph(freq_txt, table_cell_style),
                Paragraph(food_txt, table_cell_style),
                Paragraph(duration_txt, table_cell_style),
            ]
            med_rows.append(row)

        # Total available table width: 540 pt
        med_table = Table(med_rows, colWidths=[18, 120, 55, 50, 50, 42, 55, 85, 65], repeatRows=1)
        med_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(med_table)
        elements.append(Spacer(1, 8))

        # 5. Investigations (if present)
        investigations = prescription.clinical.investigations.value
        if investigations:
            elements.append(Paragraph("Recommended Investigations / Diagnostic Tests", section_heading_style))
            elements.append(Paragraph(f"{investigations}", body_style))
            elements.append(Spacer(1, 5))

        # 6. Advice & Follow-up
        advice = prescription.clinical.advice.value
        if advice:
            elements.append(Paragraph("Physician Advice & General Instructions", section_heading_style))
            elements.append(Paragraph(f"{advice}", body_style))
            elements.append(Spacer(1, 5))

        follow_up = prescription.clinical.follow_up.value
        if follow_up:
            elements.append(Paragraph("Follow-up Schedule", section_heading_style))
            elements.append(Paragraph(f"<b>{follow_up}</b>", body_style))
            elements.append(Spacer(1, 10))

        # 7. Doctor Review / Confirmation Block (Kept together)
        verified_date = datetime.now().strftime("%d %b %Y, %I:%M %p")
        footer_elements = [
            Spacer(1, 10),
            HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#cbd5e1"), spaceAfter=6),
            Table([
                [
                    Paragraph(
                        "<b>Doctor Verification Notice:</b><br/>"
                        "This prescription has been clinically reviewed, verified, and signed by the consulting physician.<br/>"
                        f"<i>Verified on: {verified_date}</i>",
                        body_style,
                    ),
                    Paragraph(
                        f"<b>{doctor_name}</b><br/>"
                        f"Medical Reg. No: {reg_number}<br/>"
                        "<font color='#0f766e'><b>✓ Digitally Confirmed</b></font>",
                        ParagraphStyle("Sig", parent=body_style, alignment=2),
                    ),
                ]
            ], colWidths=[360, 180])
        ]
        elements.append(KeepTogether(footer_elements))

        # Build document with NumberedCanvas for dynamic pagination
        doc.build(elements, canvasmaker=NumberedCanvas)
        return str(pdf_path)
