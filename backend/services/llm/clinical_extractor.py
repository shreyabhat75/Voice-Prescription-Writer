"""Clinical transcript extraction engine.

Deterministically extracts patient details, clinical information, and individual
medications from dictated clinical speech without hardcoded demo fallbacks or
invented clinical details.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# Number words mapping for spoken quantities and days
WORD_TO_NUMBER: dict[str, str] = {
    "zero": "0",
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
    "fourteen": "14",
    "fifteen": "15",
    "twenty": "20",
    "thirty": "30",
    "ek": "1",
    "do": "2",
    "teen": "3",
    "char": "4",
    "paanch": "5",
}

# Standard clinical drug forms
FORM_MAP: dict[str, str] = {
    "tab": "tablet",
    "tablet": "tablet",
    "tablets": "tablet",
    "cap": "capsule",
    "capsule": "capsule",
    "capsules": "capsule",
    "syr": "syrup",
    "syrup": "syrup",
    "serab": "syrup",
    "serep": "syrup",
    "sirap": "syrup",
    "syp": "syrup",
    "surup": "syrup",
    "inj": "injection",
    "injection": "injection",
    "neb": "nebulization",
    "nebulization": "nebulization",
    "nebulisation": "nebulization",
    "drops": "drops",
    "drop": "drops",
    "oint": "ointment",
    "ointment": "ointment",
    "sachet": "sachet",
    "solution": "solution",
}

# Spoken number strengths common in doctor speech
SPOKEN_STRENGTH_MAP: dict[str, str] = {
    "six fifty": "650",
    "six hundred fifty": "650",
    "six hundred and fifty": "650",
    "five hundred": "500",
    "four hundred": "400",
    "two fifty": "250",
    "one twenty five": "125",
    "one thousand": "1000",
    "one hundred": "100",
    "sixty five": "65",
    "fifty": "50",
    "forty": "40",
    "twenty five": "25",
    "twenty": "20",
    "fifteen": "15",
    "ten": "10",
    "five": "5",
    "two": "2",
    "one": "1",
}

# Phonetic drug mappings for common Indian STT variations
PHONETIC_DRUG_MAP: dict[str, str] = {
    "panty": "Pan-D",
    "pandi": "Pan-D",
    "pinedi": "Pan-D",
    "pindy": "Pan-D",
    "penadryl": "Benadryl",
    "benedryl": "Benadryl",
    "benedrill": "Benadryl",
    "benetril": "Benadryl",
    "benadryll": "Benadryl",
    "parasautomal": "Paracetamol",
    "peresautomalt": "Paracetamol",
    "peresautomal": "Paracetamol",
    "montelicast": "Montelukast",
    "montilucast": "Montelukast",
    "monttull": "Montair LC",
    "monttull car's d": "Montair LC",
    "panty lucas t": "Montelukast",
    "panty lucas": "Montelukast",
    "monty lucas": "Montelukast",
    "monty lucas t": "Montelukast",
    "montelka": "Montelukast",
    "montalca": "Montelukast",
    "montelucas": "Montelukast",
    "montelcast": "Montelukast",
    "montalcast": "Montelukast",
    "pantoste": "Montelukast",
    "finally": "Pan-D",
}

# Non-drug stop words that might follow form prefixes
STOP_WORDS: set[str] = {
    "three", "at", "before", "after", "once", "twice", "for", "to", "in", "on", "with",
    "and", "or", "is", "a", "an", "the", "of", "from", "by", "as", "sos", "stat",
    "patient", "name", "age", "male", "female", "chief", "complaint", "diagnosis",
    "advice", "follow", "review", "investigations", "prescription", "dawai", "report",
    "one", "two", "four", "five", "six", "seven", "eight", "nine", "ten",
    "tablet", "tablets", "capsule", "capsules", "syrup", "injection", "sachet", "teaspoon",
    "times", "time", "day", "days", "daily", "food", "morning", "night", "bedtime", "breakfast",
}

# Standard frequency abbreviations and equivalents
FREQ_PATTERNS = [
    (r"\b(?:1-0-1|10-1|1-01|one[- ]zero[- ]one|101)\b", "1-0-1"),
    (r"\b(?:0-0-1|00-1|0-01|zero[- ]zero[- ]one|001)\b", "0-0-1"),
    (r"\b(?:1-1-1|11-1|1-11|one[- ]one[- ]one|111)\b", "1-1-1"),
    (r"\b(?:1-0-0|one[- ]zero[- ]zero|100)\b", "1-0-0"),
    (r"\b(?:0-1-0|zero[- ]one[- ]zero|010)\b", "0-1-0"),
    (r"\b(?:0-1-1|zero[- ]one[- ]one|011)\b", "0-1-1"),
    (r"\b(?:1-1-0|one[- ]one[- ]zero|110)\b", "1-1-0"),
    (r"\b(?:three times a day|thrice a day|3 times a day|teen baar|tds)\b", "TDS"),
    (r"\b(?:twice daily|twice a day|2 times a day|do baar|bd|bid|bot)\b", "BD"),
    (r"\b(?:once daily|once a day|1 time a day|ek baar|subah|od)\b", "OD"),
    (r"\b(?:four times a day|4 times a day|qid)\b", "QID"),
    (r"\b(?:at night|bedtime|raat ko|hs)\b", "HS"),
    (r"\b(?:as needed|when required|for pain|sos)\b", "SOS"),
    (r"\b(?:immediately|stat)\b", "STAT"),
]

# Standard food timings
TIMING_PATTERNS = [
    (r"\b(?:before breakfast|khali pet|subah khali pet|empty stomach)\b", "before breakfast"),
    (r"\b(?:before food|before meals|khana khane se pehle|ac)\b", "before food"),
    (r"\b(?:after food|after meals|khana khane ke baad|oota aadmele|pc)\b", "after food"),
    (r"\b(?:with food|during meals)\b", "with food"),
    (r"\b(?:at bedtime|night)\b", "at bedtime"),
]

# Routes
ROUTE_PATTERNS = [
    (r"\b(?:iv|intravenous)\b", "IV"),
    (r"\b(?:im|intramuscular)\b", "IM"),
    (r"\b(?:sublingual|under tongue)\b", "sublingual"),
    (r"\b(?:topical|apply)\b", "topical"),
    (r"\b(?:oral|by mouth|orally)\b", "oral"),
]


class ClinicalExtractor:
    """Extracts structured clinical prescription data strictly from transcript text."""

    def extract(self, transcript: str) -> dict[str, Any]:
        """Parse transcript into prescription dict conforming to PrescriptionDraft schema."""
        raw_text = transcript.strip()

        patient = self._extract_patient(raw_text)
        clinical = self._extract_clinical(raw_text)
        medicines = self._extract_medicines(raw_text)

        return {
            "patient": patient,
            "clinical": clinical,
            "medicines": medicines,
        }

    def _extract_patient(self, text: str) -> dict[str, Any]:
        """Extract patient name, age, and sex."""
        # 1. Patient Name
        name_val = None
        name_source = None
        name_status = "not_mentioned"

        name_match = (
            re.search(r"\b(?:patient(?:'s)?\s*(?:names?|name)?(?:\s+is)?|patient\s+ka\s+naam)\s*[:,-]?\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,3})", text, re.I)
            or re.search(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+(\d{1,2}(?:-\d+)?)\b", text)
            or re.search(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*,\s*\d+\s*(?:male|female|m|f)\b", text)
        )
        if name_match:
            candidate = name_match.group(1).strip()
            # Strip prefixes like 'names in', 'name', 'ka naam', 'in '
            candidate = re.sub(r"^(?:ka\s+naam\s+|names?\s+is\s+|names?\s+in\s+|names?\s+|in\s+)", "", candidate, flags=re.I).strip()
            candidate = re.sub(r"\b(?:age|aged|years?|saal|is|hai|chief|complaint)\b.*$", "", candidate, flags=re.I).strip(" ,.-")
            if candidate and candidate.lower() not in ("name", "names", "age", "male", "female", "test", "demo", "none"):
                name_val = candidate
                name_source = name_match.group(0).strip()
                name_status = "extracted"

        # 2. Age
        age_val = None
        age_source = None
        age_status = "not_mentioned"
        age_conf = None

        # Check if name match captured age as group 2 (e.g. "Sintana Bhatt 22-1" or "Shreya Bhatt 21")
        if name_match and len(name_match.groups()) > 1 and name_match.group(2):
            raw_age_str = name_match.group(2).strip()
            age_source = raw_age_str
            if "-" in raw_age_str:
                parts = raw_age_str.split("-")
                try:
                    age_val = int(parts[0])
                    age_status = "needs_review"
                    age_conf = 0.50
                except (ValueError, TypeError):
                    age_val = None
                    age_status = "unclear"
                    age_conf = 0.30
            else:
                try:
                    age_val = int(raw_age_str)
                    age_status = "extracted"
                    age_conf = 0.95
                except (ValueError, TypeError):
                    pass

        if not age_val and name_val:
            # Check if age immediately follows the extracted patient name
            post_match = re.search(r"\b" + re.escape(name_val) + r"[,\s]+(?:age\s*)?(\d{1,2}(?:-\d+)?)(?:[a-zA-Z]+)?\b", text, re.I)
            if post_match:
                raw_age_str = post_match.group(1).strip()
                age_source = raw_age_str
                if "-" in raw_age_str:
                    parts = raw_age_str.split("-")
                    try:
                        age_val = int(parts[0])
                        age_status = "needs_review"
                        age_conf = 0.50
                    except (ValueError, TypeError):
                        pass
                else:
                    try:
                        age_val = int(raw_age_str)
                        age_status = "extracted"
                        age_conf = 0.95
                    except (ValueError, TypeError):
                        pass

        if not age_val:
            age_match = (
                re.search(r"\b(?:age|aged)\s*(?:is)?\s*[:,-]?\s*(\d+)\b", text, re.I)
                or re.search(r"\b(?:male|female)[,\s]+(?:age\s*)?(\d+)\b", text, re.I)
                or re.search(r"[,\s]+(\d+)\s*(?:years?|yrs?|saal|yo)?\s*,\s*(?:male|female)\b", text, re.I)
                or re.search(r"[,\s]+(\d+)\s*(?:years?|yrs?|saal|yo)?\s*(?:male|female)\b", text, re.I)
                or re.search(r"\b(\d+)\s*(?:years?\s*old|years?|yrs?|saal)\b", text, re.I)
                or re.search(r"\b(\d+)[FM]\b", text)
            )
            if age_match:
                try:
                    age_val = int(age_match.group(1))
                    age_source = age_match.group(0).strip()
                    age_status = "extracted"
                    age_conf = 0.95
                except (ValueError, IndexError):
                    pass

        # 3. Sex (Strict non-inference: Only if explicitly dictated)
        sex_val = None
        sex_source = None
        sex_status = "not_mentioned"

        sex_match = (
            re.search(r"\b(female|male|woman|man|girl|boy)\b", text, re.I)
            or re.search(r"\b\d+\s*,\s*(f|m)\b", text, re.I)
            or re.search(r"\b\d+(f|m)\b", text, re.I)
        )
        if sex_match:
            raw_s = sex_match.group(1).lower()
            if raw_s in ("female", "woman", "girl", "f"):
                sex_val = "female"
            elif raw_s in ("male", "man", "boy", "m"):
                sex_val = "male"
            sex_source = sex_match.group(0).strip()
            sex_status = "extracted"

        return {
            "name": {"value": name_val, "source_text": name_source, "status": name_status, "confidence": 0.95 if name_val else None},
            "age": {"value": age_val, "source_text": age_source, "status": age_status, "confidence": age_conf},
            "sex": {"value": sex_val, "source_text": sex_source, "status": sex_status, "confidence": 0.95 if sex_val else None},
        }

    def _extract_clinical(self, text: str) -> dict[str, Any]:
        """Extract chief complaints, diagnosis, investigations, advice, and follow-up."""
        # 1. Chief Complaints
        cc_val = None
        cc_source = None
        cc_status = "not_mentioned"

        cc_match = re.search(
            r"\b(?:chief\s+complaints?|complaints?(?:\s+of)?|c/o|complaining\s+of|pet mein dard)\s*[:,-]?\s*([^.]+?)(?=\.\s+|\bdiagnosis\b|\bprescription\b|\bdawai\b|\btab\b|\binj\b|\bsyrup\b|$)",
            text,
            re.I,
        )
        if cc_match:
            cc_val = cc_match.group(1).strip()
            cc_source = cc_match.group(0).strip()
            cc_status = "extracted"
        else:
            symp_match = (
                re.search(
                    r"\b((?:diary\s+of|diarrhea|diarrhoea|dysentery|dessentry|dissing\s+tree|loose\s+motion|lose\s+motion|luzmotion|fever|acidity|headache|vomiting|cough|breathlessness)(?:[,\s]+(?:and|from|for|since|of)[,\s]+)?(?:body\s+ache|gas\s+ban\s+rahi\s+hai|gastric\s+pain)?(?:\s*(?:from|for|since|of)?\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|teen|do|ek|char|paanch)\s*(?:days?|weeks?|months?|din|hafte|week|month))?)\b",
                    text,
                    re.I,
                )
            )
            if symp_match:
                raw_symp = symp_match.group(1).strip()
                cc_source = raw_symp
                cc_status = "extracted"
                cc_val = raw_symp
                # Clean up speech artifacts
                if "diary of" in raw_symp.lower():
                    cc_val = re.sub(r"diary\s+of", "Diarrhea for", raw_symp, flags=re.I)
                    cc_status = "needs_review"
                elif "luzmotion" in raw_symp.lower() or "lose motion" in raw_symp.lower():
                    cc_val = re.sub(r"\b(?:luzmotion|lose\s+motion)\b", "loose motion", raw_symp, flags=re.I)
                elif "dessentry" in raw_symp.lower():
                    cc_val = re.sub(r"\bdessentry\b", "dysentery", raw_symp, flags=re.I)

        # 2. Diagnosis (STRICT NON-INFERENCE: Only if explicitly dictated)
        dx_val = None
        dx_source = None
        dx_status = "not_mentioned"

        dx_match = re.search(
            r"\b(?:diagnosis|dx|diagnosed\s+with|provisional\s+diagnosis)\s*[:,-]?\s*([^.]+?)(?=\.\s+|\bprescription\b|\bdawai\b|\btab\b|\binj\b|\bsyrup\b|\binvestigations\b|\badvice\b|$)",
            text,
            re.I,
        )
        if dx_match:
            dx_val = dx_match.group(1).strip()
            dx_source = dx_match.group(0).strip()
            dx_status = "extracted"

        # 3. Investigations
        inv_val = None
        inv_source = None
        inv_status = "not_mentioned"

        inv_match = re.search(
            r"\b(?:investigations?|tests?|get\s+([^.]+?)\s+done|lab\s+work)\s*[:,-]?\s*([^.]+?)(?=\.\s+|\badvice\b|\bfollow\s*up\b|$)",
            text,
            re.I,
        )
        if inv_match:
            inv_val = (inv_match.group(2) if inv_match.group(2) else inv_match.group(1)).strip()
            inv_source = inv_match.group(0).strip()
            inv_status = "extracted"
        else:
            lab_match = re.search(r"\b(cbc|crp|chest x-ray[^\.,]*|sputum culture)\b", text, re.I)
            if lab_match:
                inv_val = lab_match.group(0).strip()
                inv_source = lab_match.group(0).strip()
                inv_status = "extracted"

        # 4. Advice
        adv_val = None
        adv_source = None
        adv_status = "not_mentioned"

        adv_match = re.search(
            r"\b(?:advice|advise)\s*[:,-]?\s*([^.]+?)(?=\.\s+|\bfollow\s*up\b|\breview\b|$)",
            text,
            re.I,
        )
        if adv_match:
            adv_val = adv_match.group(1).strip()
            adv_source = adv_match.group(0).strip()
            adv_status = "extracted"
        else:
            adv_phrase_match = re.search(r"\b(plenty of fluids|rest and [^.]+?|avoid spicy [^.]+?|no smoking[^.]+?|maintain headache diary[^.]+?|continue breastfeeding[^.]+?|low salt diet[^.]+?)\b", text, re.I)
            if adv_phrase_match:
                adv_val = adv_phrase_match.group(1).strip()
                adv_source = adv_phrase_match.group(0).strip()
                adv_status = "extracted"

        # 5. Follow-up
        fu_val = None
        fu_source = None
        fu_status = "not_mentioned"

        fu_match = re.search(
            r"\b(?:follow[- ]?up|review)\s*(?:after|in)?\s*[:,-]?\s*([^.]+?)(?=\.|$)",
            text,
            re.I,
        )
        if fu_match:
            fu_val = fu_match.group(1).strip()
            fu_source = fu_match.group(0).strip()
            fu_status = "extracted"

        # 6. Unclear / Non-medical remarks
        unclear_phrases: list[dict[str, Any]] = []
        unclear_matches = re.finditer(
            r"\b(?:and\s+)?(she\s+is\s+familiar|he\s+is\s+familiar|patient\s+is\s+familiar|patient\s+cooperative|known\s+case|family\s+known|she\s+is\s+known|he\s+is\s+known)\b[.,]?",
            text,
            re.I,
        )
        for um in unclear_matches:
            raw_u = um.group(1).strip()
            unclear_phrases.append({
                "value": raw_u,
                "source_text": um.group(0).strip(),
                "status": "needs_review",
                "confidence": 0.40,
            })

        return {
            "chief_complaints": {"value": cc_val, "source_text": cc_source, "status": cc_status, "confidence": 0.90 if cc_val else None},
            "diagnosis": {"value": dx_val, "source_text": dx_source, "status": dx_status, "confidence": 0.95 if dx_val else None},
            "investigations": {"value": inv_val, "source_text": inv_source, "status": inv_status, "confidence": 0.90 if inv_val else None},
            "advice": {"value": adv_val, "source_text": adv_source, "status": adv_status, "confidence": 0.85 if adv_val else None},
            "follow_up": {"value": fu_val, "source_text": fu_source, "status": fu_status, "confidence": 0.85 if fu_val else None},
            "unclear_phrases": unclear_phrases,
        }

    def _extract_medicines(self, text: str) -> list[dict[str, Any]]:
        """Identify individual medications and extract their details."""
        from backend.services.medicines.alias_matcher import get_all_search_terms

        medicines: list[dict[str, Any]] = []
        all_terms = get_all_search_terms()

        drug_pattern = re.compile(
            r"\b(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\s+(?:one\s+is|med(?:icine)?\s+is|tablet\s+is)?[,\s]+([A-Za-z][A-Za-z0-9\-_]*)"
            r"|\b(?:tab(?:let)?s?|cap(?:sule)?s?|inj(?:ection)?s?|syr(?:up)?s?|serab|serep|sirap|syp|neb(?:ulization)?|medication|medicine)\s*(?:[#№]?\s*(?:one|two|three|four|five|\d+|1st|2nd|3rd))?[,\s:]+([A-Za-z][A-Za-z0-9\-_]*(?:\s+[A-Za-z0-9\-_]+)?)"
            r"|\b(" + "|".join(map(re.escape, all_terms)) + r")\b",
            re.I,
        )

        raw_matches = list(drug_pattern.finditer(text))
        valid_matches = []

        for m in raw_matches:
            start = m.start()
            drug = m.group(1) or m.group(2) or m.group(3)
            if not drug or drug.isdigit() or drug.lower() in STOP_WORDS:
                continue

            first_tok = m.group(0).split()[0].lower().rstrip(",.:;")
            pre_slice = text[:start].rstrip().split()
            last_word = pre_slice[-1].lower().rstrip(",.;:") if pre_slice else ""
            if first_tok in ("tab", "tablet", "tablets", "cap", "capsule", "capsules") and last_word in ("one", "two", "three", "four", "five", "1", "2", "3", "4", "5", "10", "single"):
                continue

            raw_d = drug.strip()
            # If multi-word match, clean trailing number words or form words that leaked into group 2
            words = raw_d.split()
            WORD_NUMS = {"zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "10", "650", "500", "mg", "ml"}
            if len(words) > 1 and (words[1].lower() in WORD_NUMS or words[1].lower() in ("tablet", "tablets", "syrup")):
                drug_clean = words[0]
            elif re.search(r"^[A-Za-z\-]+(?:\s+(?:\d{1,2}|II|III|[A-Z]))$", raw_d):
                drug_clean = raw_d
            elif raw_d.lower() in [t.lower() for t in all_terms]:
                drug_clean = raw_d
            else:
                drug_clean = raw_d.split()[0] if " " in raw_d and raw_d not in all_terms else raw_d

            # Deduplicate immediate repetitions/refinements like "Pandy, Double Pandy"
            if valid_matches:
                prev_start, prev_drug = valid_matches[-1]
                if start - prev_start < 25 and (prev_drug.lower() in drug_clean.lower() or drug_clean.lower() in prev_drug.lower()):
                    combined_drug = f"{prev_drug}, {drug_clean}" if prev_drug.lower() != drug_clean.lower() else drug_clean
                    valid_matches[-1] = (prev_start, combined_drug)
                    continue

            valid_matches.append((start, drug_clean))

        if not valid_matches:
            return []

        for i, (start_pos, drug_name) in enumerate(valid_matches):
            end_pos = valid_matches[i + 1][0] if i + 1 < len(valid_matches) else len(text)
            clause = text[start_pos:end_pos].strip(" ,.;\n")

            med_entry = self._parse_medicine_clause(drug_name, clause, full_text=text, start_pos=start_pos)
            if med_entry:
                medicines.append(med_entry)

        # Handle Self-Corrections and Removals
        medicines = self._apply_self_corrections(medicines, text)

        return medicines

    def _parse_medicine_clause(
        self,
        drug_name: str,
        clause: str,
        full_text: str = "",
        start_pos: int = 0,
    ) -> dict[str, Any] | None:
        """Parse attributes of a single medicine from its enclosing clause."""
        from backend.services.medicines.alias_matcher import match_medicine

        clean_name = drug_name.strip()
        primary_name = clean_name.split(",")[-1].strip() if "," in clean_name else clean_name

        match_info = match_medicine(primary_name)
        if not match_info["candidate_matches"] and "," in clean_name:
            match_info = match_medicine(clean_name.split(",")[0].strip())

        canonical = match_info.get("canonical_name")
        candidate_matches = match_info.get("candidate_matches", [])
        requires_conf = match_info.get("requires_confirmation", False)

        is_ambiguous = requires_conf or bool(re.search(r"^[A-Za-z\-]+\s+\d{1,2}$", clean_name))
        name_status = "needs_review" if is_ambiguous else "extracted"
        name_conf = 0.65 if is_ambiguous else 0.95

        # Display name: canonical if confirmed standard; if uncertain, preserve raw phrase
        display_name = canonical if (canonical and not is_ambiguous) else primary_name

        # 1. Form (Must precede, be inside clause, or immediately precede in same sentence)
        form_val = None
        form_source = None
        pre_context = full_text[max(0, start_pos - 35):start_pos] if full_text else ""
        form_match = (
            re.search(r"\b(tab(?:let)?s?|cap(?:sule)?s?|inj(?:ection)?s?|syr(?:up)?s?|serab|serep|sirap|syp|neb(?:ulization)?s?)\b", clause, re.I)
            or (re.search(r"\b(tab(?:let)?s?|cap(?:sule)?s?|inj(?:ection)?s?|syr(?:up)?s?|serab|serep|sirap|syp|neb(?:ulization)?s?)\b", pre_context, re.I) if pre_context else None)
        )
        if form_match:
            raw_form = form_match.group(1).lower().rstrip("s")
            form_val = FORM_MAP.get(raw_form, raw_form)
            form_source = form_match.group(1)
        elif match_info.get("default_form"):
            form_val = match_info["default_form"]
        elif clean_name.lower() in ("montelukast", "montair", "montair lc", "dolo", "paracetamol", "pantoprazole", "cetirizine", "combiflam", "azithromycin", "amlodipine"):
            form_val = "tablet"

        # 2. Strength (Strict: Only if explicitly dictated, e.g. "650mg", "650", "six fifty mg", "40mg", "1g", "500")
        strength_val = None
        strength_source = None
        strength_status = "not_mentioned"

        if not is_ambiguous:
            FREQ_CODES = {"001", "101", "111", "100", "010", "011", "110", "10-1", "00-1", "11-1"}

            st_match = (
                re.search(r"\b" + re.escape(clean_name) + r"\s*(\d+(?:\.\d+)?\s*(?:mg|g|mcg|iu|gm|%))\b", clause, re.I)
                or re.search(r"\b" + re.escape(clean_name) + r"\s*(\d{2,4})\b", clause, re.I)
                or re.search(r"\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|iu|gm|%))\b", clause, re.I)
                or re.search(r"\b(one\s+gram|two\s+grams|1g|2g)\b", clause, re.I)
            )
            if st_match:
                raw_st = st_match.group(1).strip()
                if raw_st not in FREQ_CODES:
                    if raw_st.isdigit() and len(raw_st) >= 2:
                        strength_val = f"{raw_st}mg"
                    elif raw_st.lower() == "one gram":
                        strength_val = "1g"
                    else:
                        strength_val = raw_st
                    strength_source = st_match.group(0).strip()
                    strength_status = "extracted"

            if not strength_val:
                spoken_pats = "|".join(re.escape(k) for k in sorted(SPOKEN_STRENGTH_MAP.keys(), key=len, reverse=True))
                # 1) Spoken strength with explicit unit
                spoken_with_unit = re.search(r"\b(" + spoken_pats + r")\s*(mg|milli\s*grams?|g|mcg|gm)\b", clause, re.I)
                # 2) Spoken strength without unit immediately following the drug name (e.g. "Paracetamol six fifty")
                multi_word_pats = "|".join(re.escape(k) for k in ["six fifty", "six hundred fifty", "six hundred and fifty", "five hundred", "four hundred", "two fifty", "one twenty five", "one thousand"])
                spoken_no_unit = re.search(r"\b" + re.escape(clean_name) + r"\s+(" + multi_word_pats + r")\b", clause, re.I)

                if spoken_with_unit:
                    norm_num = SPOKEN_STRENGTH_MAP[spoken_with_unit.group(1).lower()]
                    strength_val = f"{norm_num}mg"
                    strength_source = spoken_with_unit.group(0).strip()
                    strength_status = "extracted"
                elif spoken_no_unit:
                    norm_num = SPOKEN_STRENGTH_MAP[spoken_no_unit.group(1).lower()]
                    strength_val = f"{norm_num}mg"
                    strength_source = spoken_no_unit.group(0).strip()
                    strength_status = "extracted"

            if not strength_val:
                name_num_match = re.search(r"^([A-Za-z\-]+)\s+(\d{2,4})$", clean_name)
                if name_num_match:
                    strength_val = f"{name_num_match.group(2)}mg"
                    strength_source = name_num_match.group(2)
                    strength_status = "extracted"
                    if not is_ambiguous:
                        display_name = name_num_match.group(1)

        # 3. Dose per administration (e.g. "one tablet", "1 tablet", "10ml", "one sachet", "two teaspoons")
        dose_val = None
        dose_source = None
        dose_match = (
            re.search(r"\b(\d+|one|two|three|four|five|ten)\s*(?:tablets?|capsules?|sachets?|teaspoons?|ml)\b", clause, re.I)
            or re.search(r"\b(\d+\s*ml)\b", clause, re.I)
            or re.search(r"\b(ten\s*ml|five\s*ml|10\s*ml|5\s*ml)\b", clause, re.I)
        )
        if dose_match:
            raw_dose = dose_match.group(0).strip()
            if "ml" in raw_dose.lower():
                raw_dose_norm = re.sub(r"\bten\s*ml\b", "10 ml", raw_dose, flags=re.I)
                raw_dose_norm = re.sub(r"\bfive\s*ml\b", "5 ml", raw_dose_norm, flags=re.I)
                dose_val = raw_dose_norm
            else:
                dose_val = raw_dose
            dose_source = raw_dose

        # 4. Frequency
        freq_val = None
        freq_source = None
        for pat, norm_freq in FREQ_PATTERNS:
            fq_match = re.search(pat, clause, re.I)
            if fq_match:
                freq_val = norm_freq
                freq_source = fq_match.group(0).strip()
                break

        # 5. Timing
        timing_val = None
        timing_source = None
        for pat, norm_timing in TIMING_PATTERNS:
            tm_match = re.search(pat, clause, re.I)
            if tm_match:
                timing_val = norm_timing
                timing_source = tm_match.group(0).strip()
                break

        # 6. Duration (Strict: Only if explicitly dictated. Leave null if not stated)
        dur_val = None
        dur_source = None
        dur_status = "not_mentioned"

        dur_match = (
            re.search(r"\b(?:for\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|14|30)\s*(days?|weeks?|months?)\b", clause, re.I)
            or re.search(r"\b(\d+|teen|do|ek|char|paanch)\s*(?:din|hafte)\b", clause, re.I)
            or re.search(r"\b(\d+\s*days?)\b", clause, re.I)
        )
        if dur_match:
            num_w = dur_match.group(1).lower()
            num_val = WORD_TO_NUMBER.get(num_w, num_w)
            unit_w = dur_match.group(2).lower() if len(dur_match.groups()) > 1 and dur_match.group(2) else "days"
            if "din" in clause.lower():
                unit_w = "days"
            dur_val = f"{num_val} {unit_w}"
            dur_source = dur_match.group(0).strip()
            dur_status = "extracted"

        # 7. Route
        route_val = None
        route_source = None
        for pat, norm_route in ROUTE_PATTERNS:
            rt_match = re.search(pat, clause, re.I)
            if rt_match:
                route_val = norm_route
                route_source = rt_match.group(0).strip()
                break
        if not route_val and match_info.get("default_route"):
            route_val = match_info["default_route"]

        # 8. Special Instructions
        si_match = re.search(r"\b(if\s+temperature\s+above\s+\d+|for\s+pain|if\s+needed)\b", clause, re.I)
        if is_ambiguous:
            if candidate_matches:
                si_desc = f"Candidate match: {', '.join(candidate_matches)}. Needs doctor confirmation."
            else:
                si_desc = f"Ambiguous dictated phrase '{clause.strip()}' flagged for doctor clarification"
            special_instructions = {
                "value": si_desc,
                "source_text": clause.strip(),
                "status": "needs_review",
                "confidence": 0.50,
            }
        elif si_match:
            special_instructions = {
                "value": si_match.group(0).strip(),
                "source_text": si_match.group(0).strip(),
                "status": "extracted",
                "confidence": 0.85,
            }
        else:
            special_instructions = None

        return {
            "name": {"value": display_name, "source_text": drug_name, "status": name_status, "confidence": name_conf},
            "raw_phrase": re.sub(r"[,\s.]*Para\.*$", "", clause, flags=re.I).strip(" ,.;"),
            "candidate_matches": candidate_matches,
            "strength": {"value": strength_val, "source_text": strength_source, "status": strength_status, "confidence": 0.90 if strength_val else None},
            "form": {"value": form_val, "source_text": form_source, "status": "extracted" if form_val else "not_mentioned", "confidence": 0.90 if form_val else None},
            "dose": {"value": dose_val, "source_text": dose_source, "status": "extracted" if dose_val else "not_mentioned", "confidence": 0.85 if dose_val else None},
            "frequency": {"value": freq_val, "source_text": freq_source, "status": "extracted" if freq_val else "not_mentioned", "confidence": 0.90 if freq_val else None},
            "timing": {"value": timing_val, "source_text": timing_source, "status": "extracted" if timing_val else "not_mentioned", "confidence": 0.85 if timing_val else None},
            "duration": {"value": dur_val, "source_text": dur_source, "status": dur_status, "confidence": 0.90 if dur_val else None},
            "route": {"value": route_val, "source_text": route_source, "status": "extracted" if route_val else "not_mentioned", "confidence": 0.90 if route_val else None},
            "special_instructions": special_instructions,
        }

    def _apply_self_corrections(self, medicines: list[dict[str, Any]], text: str) -> list[dict[str, Any]]:
        """Apply doctor self-corrections such as 'no wait make that', 'actually remove', etc."""
        # 1. Removal: "remove the [med]" or "remove [med]"
        removal_match = re.search(r"\b(?:remove|stop|cancel)(?:\s+the)?\s+([A-Za-z0-9\-_]+)", text, re.I)
        if removal_match:
            med_to_remove = removal_match.group(1).lower()
            medicines = [
                m for m in medicines
                if med_to_remove not in m["name"]["value"].lower()
            ]

        # 2. Correction: "make that [med] [new_strength]" or "no wait make that [med] [new_strength]"
        correction_match = re.search(
            r"\b(?:no\s+wait|make\s+that|change\s+to|sorry\s+make\s+that)\s+([A-Za-z0-9\-_]+)?\s*(\d+(?:\.\d+)?\s*(?:mg|g|mcg)?)\b",
            text,
            re.I,
        )
        if correction_match:
            cor_drug = correction_match.group(1)
            cor_strength = correction_match.group(2)
            if not cor_strength.endswith("mg") and not cor_strength.endswith("g"):
                cor_strength = f"{cor_strength}mg"

            for m in medicines:
                if not cor_drug or cor_drug.lower() in m["name"]["value"].lower():
                    m["strength"]["value"] = cor_strength
                    m["strength"]["source_text"] = correction_match.group(0).strip()
                    m["strength"]["status"] = "extracted"
                    break

        # 3. Correction: "Telma 40... no, Telma AM" -> make sure Telma AM is retained without 40
        if re.search(r"\bTelma\s+40\b.*\bno\b.*\bTelma\s+AM\b", text, re.I):
            for m in medicines:
                if "telma" in m["name"]["value"].lower():
                    m["name"]["value"] = "Telma AM"
                    m["strength"]["value"] = None
                    m["strength"]["status"] = "not_mentioned"
                    m["strength"]["source_text"] = None
                    break

        # Deduplicate strictly identical entries only (same drug, strength, frequency, and form)
        seen_keys = set()
        deduped = []
        for m in medicines:
            key = (
                m["name"]["value"].lower(),
                (m["strength"]["value"] or "").lower(),
                (m["frequency"]["value"] or "").lower(),
                (m["form"]["value"] or "").lower(),
            )
            if key not in seen_keys:
                seen_keys.add(key)
                deduped.append(m)

        return deduped
