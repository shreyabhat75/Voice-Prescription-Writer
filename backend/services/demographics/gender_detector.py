"""Demographic and gender detection service powered by LLM onomastic reasoning and Pydantic validation."""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

from backend.config import get_settings
from backend.models.patient import GenderDetectionResult

logger = logging.getLogger(__name__)

GENDER_REASONING_PROMPT = """You are a clinical demographic and onomastic reasoning assistant.
Analyze the patient's given name and determine the most likely gender using linguistic, cultural, and onomastic reasoning, specifically considering Indian naming conventions (Sanskrit, Hindi, Dravidian/South Indian, Muslim, Sikh, Christian) as well as global names.

CRITICAL RULES:
1. CHECK THE GIVEN (FIRST) NAME ONLY to determine gender.
2. DO NOT use the family surname (such as Rao, Sharma, Bhatt, Patel, Kapoor, Nair, Iyer, Reddy, etc.) to determine gender. Family surnames are gender-neutral and shared by everyone in a family regardless of gender.
3. Specific disambiguation examples:
   - "Shreya Bhatt" -> First name is "Shreya" -> female.
   - "Ananya Rao" -> First name is "Ananya" -> female. (Ignore surname Rao).
   - "Avanti Rao" -> First name is "Avanti" -> female. (Ignore surname Rao).
   - "Kavya Rao" -> First name is "Kavya" -> female. (Ignore surname Rao).
   - "Niharika Rao" -> First name is "Niharika" -> female. (Ignore surname Rao).
   - "Rohit Shetty" -> First name is "Rohit" -> male. (Ignore surname Shetty).
   - "Ishita Kapoor" -> First name is "Ishita" -> female. (Ignore surname Kapoor).
   - "Aditya Sinha" -> First name is "Aditya" -> male. (Ignore surname Sinha).
4. If the given name is unisex/gender-neutral (e.g. Kiran, Alex, Sam), output "unknown" or "other".
5. Output MUST match this JSON schema:
{
  "name": "<patient name>",
  "gender": "male" | "female" | "other" | "unknown",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<concise clinical and onomastic reasoning focusing on the first name>",
  "cultural_context": "<e.g. Sanskrit/Hindi origin, Tamil patronymic, etc.>"
}
"""

CANDIDATE_GEMINI_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
]

# Common Indian & Global Given Names Knowledge Base
KNOWN_GIVEN_NAMES: dict[str, tuple[str, float, str, str]] = {
    # Female
    "shreya": ("female", 0.98, "Shreya is a traditional Sanskrit female given name meaning auspicious or auspiciousness.", "Sanskrit/Hindi"),
    "ananya": ("female", 0.98, "Ananya is a classical Sanskrit female given name meaning matchless or unique.", "Sanskrit/Hindi"),
    "ishita": ("female", 0.98, "Ishita is a Sanskrit female given name meaning mastery or desired.", "Sanskrit/Hindi"),
    "pooja": ("female", 0.98, "Pooja/Puja is a widespread Indian female given name meaning worship or prayer.", "Sanskrit/Hindi"),
    "puja": ("female", 0.98, "Pooja/Puja is a widespread Indian female given name meaning worship or prayer.", "Sanskrit/Hindi"),
    "sneha": ("female", 0.98, "Sneha is a Sanskrit female given name meaning affection or maternal love.", "Sanskrit/Hindi"),
    "niharika": ("female", 0.98, "Niharika is an Indian female given name meaning nebula or dew drops.", "Sanskrit/Hindi"),
    "deepa": ("female", 0.98, "Deepa is a Sanskrit female given name meaning lamp or illumination.", "Sanskrit/Hindi"),
    "dipa": ("female", 0.98, "Deepa is a Sanskrit female given name meaning lamp or illumination.", "Sanskrit/Hindi"),
    "tara": ("female", 0.97, "Tara is widely used across Indian and international contexts as a female given name meaning star.", "Sanskrit/Global"),
    "avanti": ("female", 0.97, "Avanti is a classical Indian female name referencing the historic ancient kingdom.", "Sanskrit/Hindi"),
    "kavya": ("female", 0.98, "Kavya is a female given name of Sanskrit origin meaning poetry.", "Sanskrit/Hindi"),
    "sunita": ("female", 0.98, "Sunita is a classical Indian female given name meaning one with good morals.", "Sanskrit/Hindi"),
    "priya": ("female", 0.98, "Priya is a female given name of Sanskrit origin meaning beloved.", "Sanskrit/Hindi"),
    "kamala": ("female", 0.99, "Kamala is an epithet of Lakshmi and widely recognized as a female name.", "Sanskrit/South Asian"),
    "sana": ("female", 0.96, "Sana is a female given name of Arabic/Indian origin meaning brilliance or praise.", "Arabic/Urdu/Indian"),
    "mira": ("female", 0.97, "Mira/Meera is a renowned Indian female name celebrated for Mirabai.", "Sanskrit/Hindi"),
    "meera": ("female", 0.97, "Mira/Meera is a renowned Indian female name celebrated for Mirabai.", "Sanskrit/Hindi"),
    "diya": ("female", 0.98, "Diya is an Indian female given name meaning light or lamp.", "Sanskrit/Hindi"),
    "sahana": ("female", 0.97, "Sahana is an Indian female given name and Carnatic/Hindustani raga.", "Sanskrit/Carnatic"),
    "neha": ("female", 0.98, "Neha is a classical Sanskrit female given name meaning affection or rain.", "Sanskrit/Hindi"),
    "swati": ("female", 0.98, "Swati is an Indian female given name referencing the auspicious Nakshatra.", "Sanskrit/Hindi"),
    "aarti": ("female", 0.98, "Aarti is a common Hindu female given name meaning spiritual prayer light.", "Sanskrit/Hindi"),
    "arti": ("female", 0.98, "Aarti is a common Hindu female given name meaning spiritual prayer light.", "Sanskrit/Hindi"),
    "divya": ("female", 0.98, "Divya is a Sanskrit female given name meaning divine or heavenly brilliance.", "Sanskrit/Hindi"),
    "kavita": ("female", 0.98, "Kavita is a Sanskrit female given name meaning poem or poetry.", "Sanskrit/Hindi"),
    "rekha": ("female", 0.98, "Rekha is a classical Indian female given name meaning graceful line.", "Sanskrit/Hindi"),
    "anita": ("female", 0.98, "Anita is a widespread female given name in India and internationally.", "Sanskrit/Global"),
    "geeta": ("female", 0.98, "Geeta/Gita is an Indian female given name referencing the sacred song.", "Sanskrit/Hindi"),
    "gita": ("female", 0.98, "Geeta/Gita is an Indian female given name referencing the sacred song.", "Sanskrit/Hindi"),
    "shilpa": ("female", 0.98, "Shilpa is an Indian female given name meaning work of art.", "Sanskrit/Hindi"),
    "rashmi": ("female", 0.98, "Rashmi is an Indian female given name meaning sunbeam or ray of light.", "Sanskrit/Hindi"),
    "preeti": ("female", 0.98, "Preeti/Priti is a Sanskrit female given name meaning joy or love.", "Sanskrit/Hindi"),
    "priti": ("female", 0.98, "Preeti/Priti is a Sanskrit female given name meaning joy or love.", "Sanskrit/Hindi"),
    "shweta": ("female", 0.98, "Shweta is a Sanskrit female given name meaning white, fair, or pure.", "Sanskrit/Hindi"),
    "bhavani": ("female", 0.98, "Bhavani is a classical Sanskrit female given name and epithet of Parvati.", "Sanskrit/Hindi"),
    "lakshmi": ("female", 0.99, "Lakshmi is the Hindu goddess of wealth and a classic female given name.", "Sanskrit/Hindi"),
    "laxmi": ("female", 0.99, "Lakshmi is the Hindu goddess of wealth and a classic female given name.", "Sanskrit/Hindi"),
    "parvati": ("female", 0.99, "Parvati is a classical Hindu female given name.", "Sanskrit/Hindi"),
    "saraswati": ("female", 0.99, "Saraswati is the Hindu goddess of learning and a classic female given name.", "Sanskrit/Hindi"),
    "fatima": ("female", 0.99, "Fatima is an Arabic and Islamic female given name of high honor.", "Arabic/Islamic"),
    "ayesha": ("female", 0.98, "Ayesha is an Arabic and Islamic female given name meaning alive or thriving.", "Arabic/Islamic"),
    "zainab": ("female", 0.98, "Zainab is an Arabic and Islamic female given name.", "Arabic/Islamic"),
    "mary": ("female", 0.98, "Mary is a traditional Christian female given name.", "Hebrew/Christian"),

    # Male
    "rajesh": ("male", 0.99, "Rajesh is a traditional Sanskrit-derived Indian male name meaning ruler of kings.", "Sanskrit/Hindi"),
    "rohit": ("male", 0.98, "Rohit is a standard Indian male given name meaning red or first rays of the sun.", "Sanskrit/Hindi"),
    "arjun": ("male", 0.99, "Arjun is a revered Indian male given name from the Mahabharata.", "Sanskrit/Hindi"),
    "mohan": ("male", 0.98, "Mohan is a classical Indian masculine given name and epithet of Krishna.", "Sanskrit/Hindi"),
    "aarav": ("male", 0.98, "Aarav is a prominent modern Indian masculine given name meaning peaceful.", "Sanskrit/Hindi"),
    "rahul": ("male", 0.98, "Rahul is a traditional Indian male given name meaning conqueror of all miseries.", "Sanskrit/Pali"),
    "nikhil": ("male", 0.98, "Nikhil is a common Indian male given name meaning complete or whole.", "Sanskrit/Hindi"),
    "suresh": ("male", 0.99, "Suresh is an Indian male given name meaning ruler of the gods (Indra).", "Sanskrit/Hindi"),
    "aditya": ("male", 0.98, "Aditya is a classical Sanskrit male given name meaning belonging to Aditi or the Sun.", "Sanskrit/Hindi"),
    "gagan": ("male", 0.98, "Gagan is an Indian masculine given name meaning the sky or heavens.", "Sanskrit/Hindi"),
    "ramesh": ("male", 0.99, "Ramesh is a classical Sanskrit male given name and epithet of Vishnu.", "Sanskrit/Hindi"),
    "mahesh": ("male", 0.99, "Mahesh is a classical Sanskrit male given name and epithet of Shiva.", "Sanskrit/Hindi"),
    "dinesh": ("male", 0.98, "Dinesh is an Indian male given name meaning lord of the day (the Sun).", "Sanskrit/Hindi"),
    "rakesh": ("male", 0.98, "Rakesh is an Indian male given name meaning lord of the full moon.", "Sanskrit/Hindi"),
    "amit": ("male", 0.98, "Amit is a Sanskrit male given name meaning infinite or boundless.", "Sanskrit/Hindi"),
    "sumit": ("male", 0.98, "Sumit is an Indian male given name meaning well-measured or good friend.", "Sanskrit/Hindi"),
    "ankit": ("male", 0.98, "Ankit is an Indian male given name meaning marked or conquered.", "Sanskrit/Hindi"),
    "vikram": ("male", 0.99, "Vikram is a classical Indian male given name meaning valour or wisdom.", "Sanskrit/Hindi"),
    "vivek": ("male", 0.98, "Vivek is a Sanskrit male given name meaning discernment or wisdom.", "Sanskrit/Hindi"),
    "vijay": ("male", 0.98, "Vijay is a Sanskrit male given name meaning victory.", "Sanskrit/Hindi"),
    "ajay": ("male", 0.98, "Ajay is a Sanskrit male given name meaning invincible or unconquered.", "Sanskrit/Hindi"),
    "sanjay": ("male", 0.98, "Sanjay is a classical Indian male given name from the Mahabharata.", "Sanskrit/Hindi"),
    "anil": ("male", 0.98, "Anil is a Sanskrit male given name meaning air or wind god.", "Sanskrit/Hindi"),
    "sunil": ("male", 0.98, "Sunil is a Sanskrit male given name meaning deep blue or dark sapphire.", "Sanskrit/Hindi"),
    "ravi": ("male", 0.98, "Ravi is a classical Sanskrit male given name meaning the Sun.", "Sanskrit/Hindi"),
    "deepak": ("male", 0.98, "Deepak is an Indian male given name meaning lamp or illuminator.", "Sanskrit/Hindi"),
    "prakash": ("male", 0.98, "Prakash is an Indian male given name meaning light or illumination.", "Sanskrit/Hindi"),
    "karan": ("male", 0.98, "Karan is an Indian male given name referencing the Mahabharata hero Karna.", "Sanskrit/Hindi"),
    "alok": ("male", 0.98, "Alok is an Indian male given name meaning light or vision.", "Sanskrit/Hindi"),
    "pradeep": ("male", 0.98, "Pradeep is an Indian male given name meaning shining light.", "Sanskrit/Hindi"),
    "sandeep": ("male", 0.98, "Sandeep is an Indian male given name meaning blazing light.", "Sanskrit/Hindi"),
    "kuldeep": ("male", 0.98, "Kuldeep is an Indian male given name meaning light of the family.", "Sanskrit/Hindi"),
    "manish": ("male", 0.98, "Manish is an Indian male given name meaning lord of the mind or intellect.", "Sanskrit/Hindi"),
    "gaurav": ("male", 0.98, "Gaurav is an Indian male given name meaning honor, pride, or respect.", "Sanskrit/Hindi"),
    "saurabh": ("male", 0.98, "Saurabh is an Indian male given name meaning fragrance.", "Sanskrit/Hindi"),
    "mohammed": ("male", 0.99, "Mohammed is an Arabic and Islamic masculine given name of highest frequency.", "Arabic/Islamic"),
    "muhammad": ("male", 0.99, "Muhammad is an Arabic and Islamic masculine given name.", "Arabic/Islamic"),
    "ali": ("male", 0.98, "Ali is an Arabic and Islamic masculine given name meaning elevated.", "Arabic/Islamic"),
    "ahmed": ("male", 0.98, "Ahmed is an Arabic and Islamic masculine given name meaning highly praised.", "Arabic/Islamic"),
    "john": ("male", 0.98, "John is a traditional Christian masculine given name.", "Hebrew/Christian"),
}

# Masculine Sanskrit exceptions ending in -a
MASCULINE_A_ENDING_NAMES = {
    "rama", "krishna", "shiva", "aditya", "surya", "chandra", "gautama", "shankar", "rudra", "indra",
    "bheema", "bhima", "arjuna", "karna", "madhava", "keshava", "narayana", "govinda", "damodara"
}

# Common family surnames / caste tokens that should be excluded when analyzing given names
SURNAME_TOKENS = {
    "rao", "sharma", "bhatt", "patel", "reddy", "nair", "iyer", "iyengar", "kapoor", "gupta", "singh",
    "verma", "joshi", "shukla", "mishra", "tiwari", "pandey", "yadav", "choudhary", "chowdhury", "mukherjee",
    "banerjee", "chatterjee", "bose", "ghosh", "das", "sen", "dutta", "shetty", "hegde", "gowda", "pai",
    "kamath", "prabhu", "kulkarni", "deshmukh", "patil", "pawar", "shinde", "joshi", "bhat", "menon",
    "pillai", "kurup", "nambiar", "varma", "khan", "syed", "sheikh", "qureshi", "ansari", "fernandes",
    "d'souza", "dsouza", "pinto", "lobo", "rodrigues", "pereira", "albuquerque", "sinha", "raina"
}


class GenderDetector:
    """Detects patient gender based on name using LLM reasoning with automatic model failover and onomastic heuristics."""

    @classmethod
    async def detect_gender(cls, name: str) -> GenderDetectionResult:
        """Analyze a patient name and return a validated GenderDetectionResult Pydantic model."""
        clean_name = (name or "").strip()
        # Remove common prefixes like 'Patient', 'Mr.', 'Mrs.', 'Ms.', 'Dr.'
        clean_name = re.sub(r"^(?:patient\s+|mr\.?\s+|mrs\.?\s+|ms\.?\s+|miss\s+|dr\.?\s+)", "", clean_name, flags=re.I).strip()

        if not clean_name:
            return GenderDetectionResult(
                name="",
                gender="unknown",
                confidence=0.0,
                reasoning="No patient name was provided for demographic analysis.",
                cultural_context="None",
            )

        tokens = clean_name.split()
        first_token = tokens[0].lower() if tokens else ""
        given_name = tokens[0] if tokens else clean_name

        settings = get_settings()

        # 1. Primary Strategy: Multi-Model LLM Reasoning with Automatic Failover
        if settings.GEMINI_API_KEY and settings.LLM_PROVIDER.lower() == "gemini":
            try:
                import httpx

                # Prioritize flash-lite models for ultra-fast, high-quota response
                candidate_models = [m for m in CANDIDATE_GEMINI_MODELS]

                for model in candidate_models:
                    try:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
                        headers = {"Content-Type": "application/json"}
                        payload = {
                            "contents": [
                                {
                                    "role": "user",
                                    "parts": [
                                        {
                                            "text": (
                                                f"{GENDER_REASONING_PROMPT}\n\n"
                                                f"Patient Full Name: {clean_name}\n"
                                                f"First (Given) Name: {given_name}\n\n"
                                                f"Determine gender strictly by evaluating the First Name '{given_name}' (completely ignore any family surname):"
                                            )
                                        }
                                    ],
                                }
                            ],
                            "generationConfig": {
                                "temperature": 0.0,
                                "responseMimeType": "application/json",
                            },
                        }

                        async with httpx.AsyncClient(timeout=8.0) as client:
                            resp = await client.post(url, headers=headers, json=payload)
                            if resp.status_code == 429:
                                logger.info("Gemini model %s returned status 429 for gender detection. Failover to next candidate.", model)
                                continue
                            resp.raise_for_status()
                            data = resp.json()

                        raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        # Clean markdown code blocks
                        if raw_text.startswith("```"):
                            lines = raw_text.splitlines()
                            if lines[0].startswith("```"):
                                lines = lines[1:]
                            if lines and lines[-1].startswith("```"):
                                lines = lines[:-1]
                            raw_text = "\n".join(lines).strip()

                        parsed = json.loads(raw_text)
                        return GenderDetectionResult.model_validate(parsed)
                    except Exception as model_err:
                        logger.warning("Gemini gender detection with model %s failed: %s", model, model_err)
                        continue
            except Exception as e:
                logger.warning("Gemini gender detection pipeline encountered exception: %s. Using heuristic fallback.", e)

        # 2. Resilient Linguistic & Onomastic Heuristic Fallback
        # Check explicit title / honorifics
        clean_lower = clean_name.lower()
        if any(f" {s}" in f" {clean_lower} " or clean_lower.endswith(s) for s in ("devi", "bai", "ben", "kumari")):
            return GenderDetectionResult(
                name=clean_name,
                gender="female",
                confidence=0.96,
                reasoning=f"The title/suffix in '{clean_name}' is traditionally used exclusively for females in Indian naming conventions.",
                cultural_context="Indian Honorific",
            )
        if any(f" {s}" in f" {clean_lower} " or clean_lower.endswith(s) for s in ("prasad", "bhai", "lal")):
            return GenderDetectionResult(
                name=clean_name,
                gender="male",
                confidence=0.95,
                reasoning=f"The title/honorific in '{clean_name}' is traditionally used predominantly for males in Indian naming conventions.",
                cultural_context="Indian Honorific",
            )

        # Check knowledge base on first name
        if first_token in KNOWN_GIVEN_NAMES:
            g, conf, reason, ctx = KNOWN_GIVEN_NAMES[first_token]
            return GenderDetectionResult(
                name=clean_name,
                gender=g,
                confidence=conf,
                reasoning=reason,
                cultural_context=ctx,
            )

        # Check full name tokens in knowledge base
        for t in tokens:
            t_low = t.lower()
            if t_low not in SURNAME_TOKENS and t_low in KNOWN_GIVEN_NAMES:
                g, conf, reason, ctx = KNOWN_GIVEN_NAMES[t_low]
                return GenderDetectionResult(
                    name=clean_name,
                    gender=g,
                    confidence=conf,
                    reasoning=reason,
                    cultural_context=ctx,
                )

        # Phonetic morphology and vowel-ending rules in Indian given names
        # Masculine exceptions to -a
        if first_token in MASCULINE_A_ENDING_NAMES:
            return GenderDetectionResult(
                name=clean_name,
                gender="male",
                confidence=0.95,
                reasoning=f"The given name '{tokens[0]}' is a classical Sanskrit masculine name/epithet.",
                cultural_context="Sanskrit/Indian",
            )

        # Feminine endings in Sanskrit/Hindi given names (-a, -aa, -i, -ee, -ika, -ita, -ya, -ana)
        if (
            (first_token.endswith("a") and len(first_token) >= 4 and not first_token.endswith(("ra", "na", "ma", "ga")))
            or first_token.endswith(("ika", "ita", "iya", "ya", "ana", "ani", "ali", "ati", "ee", "i", "ree", "sha", "ya"))
        ):
            return GenderDetectionResult(
                name=clean_name,
                gender="female",
                confidence=0.92,
                reasoning=f"The feminine vowel termination in given name '{tokens[0]}' indicates female gender according to Sanskrit onomastics.",
                cultural_context="Sanskrit/Indian Feminine Morphology",
            )

        # Masculine endings (-esh, -endra, -an, -it, -av, -am, -ul, -eep, -al)
        if first_token.endswith(("esh", "endra", "inder", "an", "it", "av", "am", "ul", "eep", "al", "ash", "ant", "arth")):
            return GenderDetectionResult(
                name=clean_name,
                gender="male",
                confidence=0.92,
                reasoning=f"The masculine termination in given name '{tokens[0]}' indicates male gender according to Indian onomastics.",
                cultural_context="Sanskrit/Indian Masculine Morphology",
            )

        # Default fallback for unclassified names
        return GenderDetectionResult(
            name=clean_name,
            gender="unknown",
            confidence=0.5,
            reasoning=f"Name '{clean_name}' does not exhibit strong gender-exclusive linguistic markers without additional clinical context.",
            cultural_context="Unspecified",
        )
