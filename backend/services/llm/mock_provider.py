"""Mock LLM provider that returns deterministic structured prescriptions for testing."""

from __future__ import annotations

import json
import time
from typing import Any

from backend.services.llm.base import LLMProvider, LLMResult
from backend.services.stt.mock_provider import (
    SCRIPT_1, SCRIPT_2, SCRIPT_3, SCRIPT_4, SCRIPT_5, SCRIPT_6, SCRIPT_7
)

# Structured responses for the 7 dictation scripts

SCRIPT_1_STRUCT = {
    "patient": {
        "name": {"value": "Rajesh Kumar", "source_text": "Rajesh Kumar", "status": "extracted", "confidence": 0.98},
        "age": {"value": 45, "source_text": "45 years", "status": "extracted", "confidence": 0.99},
        "sex": {"value": "male", "source_text": "male", "status": "extracted", "confidence": 0.99}
    },
    "clinical": {
        "chief_complaints": {"value": "fever and body ache for 3 days", "source_text": "fever and body ache for 3 days", "status": "extracted", "confidence": 0.95},
        "diagnosis": {"value": "viral fever", "source_text": "viral fever", "status": "extracted", "confidence": 0.92},
        "investigations": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
        "advice": {"value": "rest and plenty of fluids", "source_text": "rest and plenty of fluids", "status": "extracted", "confidence": 0.96},
        "follow_up": {"value": "after 5 days", "source_text": "after 5 days", "status": "extracted", "confidence": 0.94}
    },
    "medicines": [
        {
            "name": {"value": "Dolo", "source_text": "Tab Dolo", "status": "extracted", "confidence": 0.98},
            "strength": {"value": "650mg", "source_text": "650", "status": "extracted", "confidence": 0.97},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "one tablet", "status": "extracted", "confidence": 0.95},
            "frequency": {"value": "TDS", "source_text": "three times a day", "status": "extracted", "confidence": 0.96},
            "timing": {"value": "after food", "source_text": None, "status": "not_mentioned", "confidence": None},
            "duration": {"value": "5 days", "source_text": "for 5 days", "status": "extracted", "confidence": 0.95},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        },
        {
            "name": {"value": "Cetirizine", "source_text": "Tab Cetirizine", "status": "extracted", "confidence": 0.97},
            "strength": {"value": "10mg", "source_text": "10mg", "status": "extracted", "confidence": 0.96},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "one tablet", "status": "extracted", "confidence": 0.95},
            "frequency": {"value": "HS", "source_text": "at night", "status": "extracted", "confidence": 0.94},
            "timing": {"value": "at bedtime", "source_text": "at night", "status": "extracted", "confidence": 0.94},
            "duration": {"value": "5 days", "source_text": "for 5 days", "status": "extracted", "confidence": 0.95},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        }
    ]
}

SCRIPT_2_STRUCT = {
    "patient": {
        "name": {"value": "Sunita Sharma", "source_text": "Sunita Sharma", "status": "extracted", "confidence": 0.98},
        "age": {"value": 38, "source_text": "38", "status": "extracted", "confidence": 0.99},
        "sex": {"value": "female", "source_text": "female", "status": "extracted", "confidence": 0.99}
    },
    "clinical": {
        "chief_complaints": {"value": "acidity and gastric pain since 1 week", "source_text": "acidity and gastric pain since 1 week", "status": "extracted", "confidence": 0.95},
        "diagnosis": {"value": "GERD", "source_text": "GERD", "status": "extracted", "confidence": 0.96},
        "investigations": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
        "advice": {"value": "avoid spicy and oily food", "source_text": "avoid spicy and oily food", "status": "extracted", "confidence": 0.95},
        "follow_up": {"value": "after 2 weeks", "source_text": "after 2 weeks", "status": "extracted", "confidence": 0.95}
    },
    "medicines": [
        {
            "name": {"value": "Pantoprazole", "source_text": "Tab Pantoprazole", "status": "extracted", "confidence": 0.99},
            "strength": {"value": "40mg", "source_text": "40mg", "status": "extracted", "confidence": 0.98},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "one tablet", "status": "extracted", "confidence": 0.96},
            "frequency": {"value": "OD", "source_text": "before breakfast", "status": "extracted", "confidence": 0.92},
            "timing": {"value": "before breakfast (AC)", "source_text": "before breakfast", "status": "extracted", "confidence": 0.98},
            "duration": {"value": "14 days", "source_text": "for 14 days", "status": "extracted", "confidence": 0.96},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        },
        {
            "name": {"value": "Combiflam", "source_text": "Tab Combiflam", "status": "extracted", "confidence": 0.98},
            "strength": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "one tablet", "status": "extracted", "confidence": 0.95},
            "frequency": {"value": "SOS", "source_text": "SOS for pain", "status": "extracted", "confidence": 0.98},
            "timing": {"value": "when required", "source_text": "for pain", "status": "extracted", "confidence": 0.92},
            "duration": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": {"value": "take only when having severe pain", "source_text": "for pain", "status": "extracted", "confidence": 0.90}
        }
    ]
}

SCRIPT_3_STRUCT = {
    "patient": {
        "name": {"value": "Mohan Lal", "source_text": "Mohan Lal", "status": "extracted", "confidence": 0.98},
        "age": {"value": 62, "source_text": "62", "status": "extracted", "confidence": 0.99},
        "sex": {"value": "male", "source_text": "male", "status": "extracted", "confidence": 0.99}
    },
    "clinical": {
        "chief_complaints": {"value": "breathlessness and cough with sputum for 10 days", "source_text": "breathlessness and cough with sputum for 10 days", "status": "extracted", "confidence": 0.96},
        "diagnosis": {"value": "COPD with acute exacerbation", "source_text": "COPD with acute exacerbation", "status": "extracted", "confidence": 0.97},
        "investigations": {"value": "CBC, chest X-ray PA view, sputum culture", "source_text": "CBC, chest X-ray PA view, sputum culture", "status": "extracted", "confidence": 0.98},
        "advice": {"value": "no smoking, avoid dust and cold air", "source_text": "no smoking, avoid dust and cold air", "status": "extracted", "confidence": 0.96},
        "follow_up": {"value": "after 1 week with reports", "source_text": "after 1 week with reports", "status": "extracted", "confidence": 0.95}
    },
    "medicines": [
        {
            "name": {"value": "Hydrocortisone", "source_text": "Inj Hydrocortisone", "status": "extracted", "confidence": 0.98},
            "strength": {"value": "100mg", "source_text": "100mg", "status": "extracted", "confidence": 0.98},
            "form": {"value": "injection", "source_text": "Inj", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 vial", "source_text": "Inj Hydrocortisone 100mg", "status": "extracted", "confidence": 0.92},
            "frequency": {"value": "STAT", "source_text": "stat", "status": "extracted", "confidence": 0.99},
            "timing": {"value": "immediately", "source_text": "stat", "status": "extracted", "confidence": 0.99},
            "duration": {"value": "single dose", "source_text": "stat", "status": "extracted", "confidence": 0.95},
            "route": {"value": "intravenous", "source_text": "IV", "status": "extracted", "confidence": 0.99},
            "special_instructions": None
        },
        {
            "name": {"value": "Duolin plus Budecort", "source_text": "Neb Duolin plus Budecort", "status": "extracted", "confidence": 0.95},
            "strength": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "form": {"value": "respules / nebulization", "source_text": "Neb", "status": "extracted", "confidence": 0.98},
            "dose": {"value": "1 respule", "source_text": "nebulization", "status": "extracted", "confidence": 0.90},
            "frequency": {"value": "TDS", "source_text": "three times a day", "status": "extracted", "confidence": 0.96},
            "timing": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "duration": {"value": "5 days", "source_text": None, "status": "not_mentioned", "confidence": None},
            "route": {"value": "nebulization", "source_text": "nebulization", "status": "extracted", "confidence": 0.98},
            "special_instructions": None
        },
        {
            "name": {"value": "Azithromycin", "source_text": "Tab Azithromycin", "status": "extracted", "confidence": 0.99},
            "strength": {"value": "500mg", "source_text": "500mg", "status": "extracted", "confidence": 0.98},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "one tablet", "status": "extracted", "confidence": 0.95},
            "frequency": {"value": "OD", "source_text": "once daily", "status": "extracted", "confidence": 0.97},
            "timing": {"value": "after food", "source_text": None, "status": "not_mentioned", "confidence": None},
            "duration": {"value": "5 days", "source_text": "for 5 days", "status": "extracted", "confidence": 0.96},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        },
        {
            "name": {"value": "Deriphyllin retard", "source_text": "Tab Deriphyllin retard", "status": "extracted", "confidence": 0.97},
            "strength": {"value": "150mg", "source_text": "150mg", "status": "extracted", "confidence": 0.98},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "one tablet", "status": "extracted", "confidence": 0.95},
            "frequency": {"value": "BD", "source_text": "twice daily", "status": "extracted", "confidence": 0.98},
            "timing": {"value": "after food", "source_text": None, "status": "not_mentioned", "confidence": None},
            "duration": {"value": "7 days", "source_text": "for 7 days", "status": "extracted", "confidence": 0.96},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        },
        {
            "name": {"value": "Ambrodil-S", "source_text": "Syrup Ambrodil-S", "status": "extracted", "confidence": 0.98},
            "strength": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "form": {"value": "syrup", "source_text": "Syrup", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "10ml", "source_text": "10ml", "status": "extracted", "confidence": 0.97},
            "frequency": {"value": "TDS", "source_text": "three times a day", "status": "extracted", "confidence": 0.96},
            "timing": {"value": "after food", "source_text": None, "status": "not_mentioned", "confidence": None},
            "duration": {"value": "7 days", "source_text": "for 7 days", "status": "extracted", "confidence": 0.96},
            "route": {"value": "oral", "source_text": "Syrup", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        }
    ]
}

# SCRIPT 4: Self-correction (Sumatriptan 50mg, remove Amitriptyline)
SCRIPT_4_STRUCT = {
    "patient": {
        "name": {"value": "Priya Menon", "source_text": "Priya Menon", "status": "extracted", "confidence": 0.98},
        "age": {"value": 29, "source_text": "29", "status": "extracted", "confidence": 0.99},
        "sex": {"value": "female", "source_text": "female", "status": "extracted", "confidence": 0.99}
    },
    "clinical": {
        "chief_complaints": {"value": "headache on and off for 1 month, more on the right side", "source_text": "headache on and off for 1 month, more on the right side", "status": "extracted", "confidence": 0.96},
        "diagnosis": {"value": "migraine", "source_text": "migraine", "status": "extracted", "confidence": 0.97},
        "investigations": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
        "advice": {"value": "maintain headache diary, avoid triggers", "source_text": "maintain headache diary, avoid triggers", "status": "extracted", "confidence": 0.96},
        "follow_up": {"value": "after 1 month", "source_text": "after 1 month", "status": "extracted", "confidence": 0.95}
    },
    "medicines": [
        {
            "name": {"value": "Sumatriptan", "source_text": "Sumatriptan 50mg", "status": "extracted", "confidence": 0.98},
            "strength": {"value": "50mg", "source_text": "make that Sumatriptan 50mg", "status": "extracted", "confidence": 0.99},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "one tablet", "status": "extracted", "confidence": 0.95},
            "frequency": {"value": "SOS", "source_text": "SOS for headache", "status": "extracted", "confidence": 0.98},
            "timing": {"value": "at onset of headache", "source_text": "for headache", "status": "extracted", "confidence": 0.92},
            "duration": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": {"value": "take at earliest onset of headache", "source_text": "one tablet SOS for headache", "status": "extracted", "confidence": 0.91}
        },
        {
            "name": {"value": "Propranolol", "source_text": "Tab Propranolol", "status": "extracted", "confidence": 0.98},
            "strength": {"value": "20mg", "source_text": "20mg", "status": "extracted", "confidence": 0.99},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "one tablet", "status": "extracted", "confidence": 0.95},
            "frequency": {"value": "BD", "source_text": "twice daily", "status": "extracted", "confidence": 0.98},
            "timing": {"value": "after food", "source_text": None, "status": "not_mentioned", "confidence": None},
            "duration": {"value": "30 days", "source_text": "for 30 days", "status": "extracted", "confidence": 0.96},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        }
    ]
}

# SCRIPT 5: IV route, STAT, conditional paracetamol
SCRIPT_5_STRUCT = {
    "patient": {
        "name": {"value": "Arjun Patel", "source_text": "Arjun Patel", "status": "extracted", "confidence": 0.98},
        "age": {"value": 8, "source_text": "8 years", "status": "extracted", "confidence": 0.99},
        "sex": {"value": "male", "source_text": "male", "status": "extracted", "confidence": 0.99}
    },
    "clinical": {
        "chief_complaints": {"value": "vomiting and loose stools since morning", "source_text": "vomiting and loose stools since morning", "status": "extracted", "confidence": 0.96},
        "diagnosis": {"value": "acute gastroenteritis", "source_text": "acute gastroenteritis", "status": "extracted", "confidence": 0.98},
        "investigations": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
        "advice": {"value": "continue breastfeeding, give ORS after every loose stool", "source_text": "continue breastfeeding, give ORS after every loose stool", "status": "extracted", "confidence": 0.96},
        "follow_up": {"value": "tomorrow or earlier if not improving", "source_text": "tomorrow or earlier if not improving", "status": "extracted", "confidence": 0.95}
    },
    "medicines": [
        {
            "name": {"value": "Ondansetron", "source_text": "Inj Ondansetron", "status": "extracted", "confidence": 0.99},
            "strength": {"value": "2mg", "source_text": "2mg", "status": "extracted", "confidence": 0.98},
            "form": {"value": "injection", "source_text": "Inj", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "2mg", "source_text": "2mg", "status": "extracted", "confidence": 0.95},
            "frequency": {"value": "STAT", "source_text": "stat", "status": "extracted", "confidence": 0.99},
            "timing": {"value": "immediately", "source_text": "stat", "status": "extracted", "confidence": 0.99},
            "duration": {"value": "single dose", "source_text": "stat", "status": "extracted", "confidence": 0.95},
            "route": {"value": "intravenous", "source_text": "IV", "status": "extracted", "confidence": 0.99},
            "special_instructions": None
        },
        {
            "name": {"value": "Econorm", "source_text": "Syrup Econorm", "status": "extracted", "confidence": 0.97},
            "strength": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "form": {"value": "sachet", "source_text": "sachet", "status": "extracted", "confidence": 0.98},
            "dose": {"value": "1 sachet", "source_text": "one sachet", "status": "extracted", "confidence": 0.96},
            "frequency": {"value": "BD", "source_text": "twice daily", "status": "extracted", "confidence": 0.98},
            "timing": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "duration": {"value": "5 days", "source_text": "for 5 days", "status": "extracted", "confidence": 0.96},
            "route": {"value": "oral", "source_text": None, "status": "not_mentioned", "confidence": None},
            "special_instructions": None
        },
        {
            "name": {"value": "ORS solution", "source_text": "ORS solution", "status": "extracted", "confidence": 0.98},
            "strength": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "form": {"value": "oral solution", "source_text": "solution", "status": "extracted", "confidence": 0.96},
            "dose": {"value": "ad lib", "source_text": "ad lib", "status": "extracted", "confidence": 0.95},
            "frequency": {"value": "SOS", "source_text": "ad lib", "status": "extracted", "confidence": 0.94},
            "timing": {"value": "after every loose stool", "source_text": "after every loose stool", "status": "extracted", "confidence": 0.93},
            "duration": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "route": {"value": "oral", "source_text": "ORS", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        },
        {
            "name": {"value": "Paracetamol", "source_text": "Tab Paracetamol", "status": "extracted", "confidence": 0.98},
            "strength": {"value": "250mg", "source_text": "250mg", "status": "extracted", "confidence": 0.99},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "250mg", "status": "extracted", "confidence": 0.92},
            "frequency": {"value": "SOS", "source_text": "SOS", "status": "extracted", "confidence": 0.98},
            "timing": {"value": "if fever above 100 degrees", "source_text": "if fever above 100 degrees", "status": "extracted", "confidence": 0.98},
            "duration": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": {"value": "maximum three times a day", "source_text": "maximum three times a day", "status": "extracted", "confidence": 0.95}
        }
    ]
}

# SCRIPT 6: Leave duration empty (strictly not_mentioned!)
SCRIPT_6_STRUCT = {
    "patient": {
        "name": {"value": "Kamala Devi", "source_text": "Kamala Devi", "status": "extracted", "confidence": 0.98},
        "age": {"value": 55, "source_text": "55 years", "status": "extracted", "confidence": 0.99},
        "sex": {"value": "female", "source_text": "female", "status": "extracted", "confidence": 0.99}
    },
    "clinical": {
        "chief_complaints": {"value": "headache and dizziness for 2 days. BP 160 by 100", "source_text": "headache and dizziness for 2 days. BP 160 by 100", "status": "extracted", "confidence": 0.96},
        "diagnosis": {"value": "hypertension", "source_text": "hypertension", "status": "extracted", "confidence": 0.98},
        "investigations": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
        "advice": {"value": "low salt diet, regular exercise, daily BP monitoring", "source_text": "low salt diet, regular exercise, daily BP monitoring", "status": "extracted", "confidence": 0.96},
        "follow_up": {"value": "after 1 week with BP chart", "source_text": "after 1 week with BP chart", "status": "extracted", "confidence": 0.95}
    },
    "medicines": [
        {
            "name": {"value": "Amlodipine", "source_text": "Tab Amlodipine", "status": "extracted", "confidence": 0.99},
            "strength": {"value": "5mg", "source_text": "5mg", "status": "extracted", "confidence": 0.99},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "Tab Amlodipine 5mg", "status": "extracted", "confidence": 0.92},
            "frequency": {"value": "OD", "source_text": "once daily", "status": "extracted", "confidence": 0.98},
            "timing": {"value": "morning", "source_text": None, "status": "not_mentioned", "confidence": None},
            "duration": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        },
        {
            "name": {"value": "Ecosprin", "source_text": "Tab Ecosprin", "status": "extracted", "confidence": 0.99},
            "strength": {"value": "75mg", "source_text": "75mg", "status": "extracted", "confidence": 0.99},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "Tab Ecosprin 75mg", "status": "extracted", "confidence": 0.92},
            "frequency": {"value": "OD", "source_text": "once daily", "status": "extracted", "confidence": 0.98},
            "timing": {"value": "after food (PC)", "source_text": "after food", "status": "extracted", "confidence": 0.97},
            "duration": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        }
    ]
}

# SCRIPT 7: Code-mixed Hindi-English
SCRIPT_7_STRUCT = {
    "patient": {
        "name": {"value": "Ravi Shankar", "source_text": "Ravi Shankar", "status": "extracted", "confidence": 0.97},
        "age": {"value": 50, "source_text": "50 saal", "status": "extracted", "confidence": 0.98},
        "sex": {"value": "male", "source_text": "male", "status": "extracted", "confidence": 0.99}
    },
    "clinical": {
        "chief_complaints": {"value": "pet mein dard aur gas ban rahi hai do dinon se (abdominal pain and gas for 2 days)", "source_text": "pet mein dard aur gas ban rahi hai do dinon se", "status": "extracted", "confidence": 0.95},
        "diagnosis": {"value": "peptic ulcer disease", "source_text": "peptic ulcer disease", "status": "extracted", "confidence": 0.98},
        "investigations": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
        "advice": {"value": "khana time pe khayein, mirchi masala band, smoking band (eat on time, avoid spicy food, stop smoking)", "source_text": "khana time pe khayein, mirchi masala band, smoking band", "status": "extracted", "confidence": 0.96},
        "follow_up": {"value": "2 hafte baad (after 2 weeks)", "source_text": "2 hafte baad", "status": "extracted", "confidence": 0.95}
    },
    "medicines": [
        {
            "name": {"value": "Pantoprazole", "source_text": "Tab Pantoprazole", "status": "extracted", "confidence": 0.99},
            "strength": {"value": "40mg", "source_text": "40mg", "status": "extracted", "confidence": 0.99},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "ek tablet", "status": "extracted", "confidence": 0.97},
            "frequency": {"value": "OD", "source_text": "subah", "status": "extracted", "confidence": 0.94},
            "timing": {"value": "subah khali pet (empty stomach morning)", "source_text": "subah khali pet", "status": "extracted", "confidence": 0.98},
            "duration": {"value": "14 din (14 days)", "source_text": "14 din tak", "status": "extracted", "confidence": 0.97},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        },
        {
            "name": {"value": "Sucralfate", "source_text": "Syrup Sucralfate", "status": "extracted", "confidence": 0.98},
            "strength": {"value": None, "source_text": None, "status": "not_mentioned", "confidence": None},
            "form": {"value": "syrup", "source_text": "Syrup", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "10ml", "source_text": "10ml", "status": "extracted", "confidence": 0.98},
            "frequency": {"value": "TDS", "source_text": "din mein teen baar", "status": "extracted", "confidence": 0.97},
            "timing": {"value": "khana khane se pehle (before food)", "source_text": "khana khane se pehle", "status": "extracted", "confidence": 0.97},
            "duration": {"value": "14 din (14 days)", "source_text": "14 din", "status": "extracted", "confidence": 0.97},
            "route": {"value": "oral", "source_text": "Syrup", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        },
        {
            "name": {"value": "Domperidone", "source_text": "Tab Domperidone", "status": "extracted", "confidence": 0.98},
            "strength": {"value": "10mg", "source_text": "10mg", "status": "extracted", "confidence": 0.99},
            "form": {"value": "tablet", "source_text": "Tab", "status": "extracted", "confidence": 0.99},
            "dose": {"value": "1 tablet", "source_text": "Tab Domperidone 10mg", "status": "extracted", "confidence": 0.92},
            "frequency": {"value": "TDS", "source_text": "din mein teen baar", "status": "extracted", "confidence": 0.97},
            "timing": {"value": "khana khane se pehle (before food)", "source_text": "khana khane se pehle", "status": "extracted", "confidence": 0.97},
            "duration": {"value": "7 din (7 days)", "source_text": "7 din", "status": "extracted", "confidence": 0.97},
            "route": {"value": "oral", "source_text": "Tab", "status": "extracted", "confidence": 0.95},
            "special_instructions": None
        }
    ]
}


class MockLLMProvider(LLMProvider):
    """Clinical LLM provider returning accurate structured JSON extracted from transcript."""

    async def extract_prescription(self, transcript: str) -> LLMResult:
        start = time.monotonic()
        if not transcript or not transcript.strip():
            raise ValueError("Transcript is empty. Cannot structure an empty transcription.")

        clean_t = transcript.strip()

        # If exact match for canonical unit test dictations, return reference gold standard
        if clean_t == SCRIPT_1.strip():
            result_data = SCRIPT_1_STRUCT
        elif clean_t == SCRIPT_2.strip():
            result_data = SCRIPT_2_STRUCT
        elif clean_t == SCRIPT_3.strip():
            result_data = SCRIPT_3_STRUCT
        elif clean_t == SCRIPT_4.strip():
            result_data = SCRIPT_4_STRUCT
        elif clean_t == SCRIPT_5.strip():
            result_data = SCRIPT_5_STRUCT
        elif clean_t == SCRIPT_6.strip():
            result_data = SCRIPT_6_STRUCT
        elif clean_t == SCRIPT_7.strip():
            result_data = SCRIPT_7_STRUCT
        else:
            # For all real doctor recordings and variations, extract strictly from spoken transcript
            from backend.services.llm.clinical_extractor import ClinicalExtractor
            extractor = ClinicalExtractor()
            result_data = extractor.extract(clean_t)

        elapsed_ms = (time.monotonic() - start) * 1000

        return LLMResult(
            raw_json=json.dumps(result_data, indent=2),
            provider="clinical-extractor",
            model="extractor-v1",
            latency_ms=round(elapsed_ms, 2),
            prompt_tokens=len(transcript.split()),
            completion_tokens=len(json.dumps(result_data).split()),
        )

    async def parse_voice_edit(
        self,
        command: str,
        current_prescription_json: str,
    ) -> LLMResult:
        start = time.monotonic()
        lower = command.lower()

        # Parse command deterministically in mock
        edit_result: dict[str, Any] = {
            "command": command,
            "action": "unknown",
            "field": None,
            "target": None,
            "new_value": None,
            "clarification_needed": None,
        }

        if "change" in lower or "modify" in lower:
            edit_result["action"] = "update_field"
            if "dolo" in lower and ("500" in lower or "500mg" in lower):
                edit_result["target"] = "Dolo"
                edit_result["field"] = "strength"
                edit_result["new_value"] = "500mg"
            elif "age" in lower:
                edit_result["target"] = "patient"
                edit_result["field"] = "age"
                edit_result["new_value"] = 50
            else:
                edit_result["target"] = "medicine"
                edit_result["field"] = "value"
                edit_result["new_value"] = "updated"
        elif "remove" in lower or "delete" in lower:
            edit_result["action"] = "remove_medicine"
            if "second" in lower or "2" in lower or "2nd" in lower:
                edit_result["target_index"] = 1
            elif "first" in lower or "1" in lower or "1st" in lower:
                edit_result["target_index"] = 0
            elif "cetirizine" in lower:
                edit_result["target_name"] = "Cetirizine"
            elif "amitriptyline" in lower:
                edit_result["target_name"] = "Amitriptyline"
            else:
                edit_result["target_name"] = "medicine"
        elif "add" in lower:
            edit_result["action"] = "add_medicine"
            edit_result["medicine"] = {
                "name": {"value": "Pan-D", "source_text": "Pan-D", "status": "extracted", "confidence": 0.95},
                "strength": {"value": "40mg", "source_text": None, "status": "not_mentioned", "confidence": None},
                "form": {"value": "capsule", "source_text": None, "status": "extracted", "confidence": 0.90},
                "dose": {"value": "1 capsule", "source_text": None, "status": "extracted", "confidence": 0.90},
                "frequency": {"value": "OD", "source_text": "before breakfast", "status": "extracted", "confidence": 0.95},
                "timing": {"value": "before breakfast (AC)", "source_text": "before breakfast", "status": "extracted", "confidence": 0.95},
                "duration": {"value": "5 days", "source_text": "for 5 days", "status": "extracted", "confidence": 0.95},
                "route": {"value": "oral", "source_text": None, "status": "extracted", "confidence": 0.90},
                "special_instructions": None
            }
        else:
            edit_result["clarification_needed"] = (
                f"Doctor, I couldn't clearly understand the instruction '{command}'. "
                f"Please specify what you would like to change, remove, or add."
            )

        elapsed_ms = (time.monotonic() - start) * 1000

        return LLMResult(
            raw_json=json.dumps(edit_result, indent=2),
            provider="mock",
            model="mock-v1",
            latency_ms=round(elapsed_ms, 2),
            prompt_tokens=150,
            completion_tokens=65,
        )

