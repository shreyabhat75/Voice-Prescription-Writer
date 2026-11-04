# Test Plan: Voice Prescription Writer

## 1. Test Strategy & Scope

The testing strategy validates the end-to-end voice prescription workflow:
1. **Unit & Rule Tests**: Shorthand normalization, Pydantic validation, source-grounding checks.
2. **Dictation Script Tests**: Automated tests evaluating all 7 medical dictations.
3. **Safety & Negative Tests**: Unspoken diagnosis hallucination prevention, unmentioned duration inference prevention, invalid JSON handling, API timeout handling.
4. **API Integration Tests**: Endpoints for audio upload, STT, structuring, editing, confirmation gate, and PDF generation.
5. **PDF Verification Tests**: Unconfirmed prescription PDF block, confirmed prescription formatting.

---

## 2. The 7 Reference Dictation Scripts

### Script 1: Basic Extraction & 1-0-1 Frequency
- **Dictation**:
  > "Patient Ramesh Kumar, male, 45 years old. Chief complaint is fever and body ache since 3 days. I am prescribing tablet Dolo 650, one tablet three times a day for 5 days. Also give tablet Cetirizine 10mg, one tablet at bedtime for 3 days."
- **Key Assertions**:
  - Patient: `Ramesh Kumar`, Age: `45`, Sex: `male`
  - Complaint: `fever and body ache since 3 days`
  - Diagnosis: `not_mentioned` (Doctor didn't state diagnosis!)
  - Medicine 1: `Dolo`, 650mg, form: `tablet`, dose: `1 tablet`, freq: `TDS` (normalized to Three Times Daily), duration: `5 days`
  - Medicine 2: `Cetirizine`, 10mg, form: `tablet`, dose: `1 tablet`, freq: `HS` (normalized to At Bedtime), duration: `3 days`

### Script 2: Before Breakfast (AC) & SOS Syrup Instruction
- **Dictation**:
  > "Patient name Priya Sharma, female, 28 years. She has acidity and throat pain. Give her tablet Pantoprazole 40mg, one tablet before breakfast for 7 days. Syrup Ascoril-LS, two teaspoons three times a day for 5 days. And tablet Combiflam SOS for pain."
- **Key Assertions**:
  - Medicine 1: `Pantoprazole`, 40mg, timing: `before breakfast (AC)`, duration: `7 days`
  - Medicine 2: `Ascoril-LS`, form: `syrup`, dose: `two teaspoons` (10ml), freq: `TDS`, duration: `5 days`
  - Medicine 3: `Combiflam`, form: `tablet`, freq: `SOS` (as needed for pain), duration: `not_mentioned` (valid for SOS)

### Script 3: Multiple Medicines, Inhalations & Investigations
- **Dictation**:
  > "Patient Suresh Reddy, male, 62 years. Complaint of cough with expectoration and breathlessness since 1 week. Diagnosis is acute exacerbation of COPD. Prescribe tablet Augmentin 625mg, one tablet BD for 7 days. Tablet Deriphyllin retard 150mg, one tablet BD for 10 days. Syrup Ambrodil-S, two teaspoons TDS for 5 days. Nebulization with Budecort 0.5mg and Duolin, twice daily for 5 days. Investigations - CBC, chest X-ray PA view, and sputum for AFB. Advice - steam inhalation, avoid cold food, plenty of warm fluids. Follow up after 5 days."
- **Key Assertions**:
  - Diagnosis: `acute exacerbation of COPD` (explicitly dictated!)
  - 4 medicine items (Augmentin, Deriphyllin retard, Ambrodil-S, Budecort/Duolin nebulization)
  - Route for Nebulization: `nebulization` / `inhalation`
  - Investigations: `CBC, chest X-ray PA view, and sputum for AFB`
  - Advice: `steam inhalation, avoid cold food, plenty of warm fluids`
  - Follow-up: `after 5 days`

### Script 4: Doctor Self-Correction & Medicine Removal
- **Dictation**:
  > "Patient Meera Patel, female, 35 years. She has migraine headache. Give tablet Sumatriptan 50mg... actually make that 25mg... one tablet SOS. Also give tablet Amitriptyline 10mg at bedtime. Wait, remove the Amitriptyline, she is already on it. Just the Sumatriptan 25mg SOS."
- **Key Assertions**:
  - Medicine list must contain ONLY 1 medicine: `Sumatriptan`
  - Strength of Sumatriptan must be `25mg`, NOT `50mg`
  - `Amitriptyline` must NOT be present in the active medicine list

### Script 5: IV Route, STAT & Conditional Dosage
- **Dictation**:
  > "Patient Arun Singh, male, 50 years. Admitted with acute gastroenteritis. Give injection Ondansetron 4mg IV STAT. Start IV fluid Normal Saline 500ml over 4 hours. Tablet Racecadotril 100mg TDS for 3 days. Syrup ORS, plenty of fluids. Give paracetamol 500mg if fever above 100 degrees."
- **Key Assertions**:
  - Medicine 1: `Ondansetron`, form: `injection`, route: `IV`, freq: `STAT`
  - Medicine 2: `Normal Saline`, form: `IV fluid`, dose: `500ml`, duration: `over 4 hours`
  - Conditional: `Paracetamol 500mg` conditional on fever > 100°F (freq: `SOS` / `conditional`)

### Script 6: Missing Duration (Strict Non-Inference Rule)
- **Dictation**:
  > "Patient Deepa Nair, female, 42 years. Diagnosis hypertension. Start tablet Amlodipine 5mg, one tablet OD. Also give tablet Ecosprin 75mg OD after food."
- **Key Assertions**:
  - Medicine 1: `Amlodipine 5mg OD` -> duration MUST BE `None` / `not_mentioned`. Never infer "30 days" or "lifelong".
  - Medicine 2: `Ecosprin 75mg OD` -> duration MUST BE `None` / `not_mentioned`.
  - Status must be `not_mentioned` or `needs_review`.

### Script 7: Code-Mixed Speech (Hindi-English Stretch Case)
- **Dictation**:
  > "Patient ka naam hai Rahul Verma, male, 30 years. Usko throat infection hai. Tab Azithromycin 500mg, one-zero-one for 3 days do. Aur gargle karne ko bolo betadine se."
- **Key Assertions**:
  - Name: `Rahul Verma`, Age: `30`, Sex: `male`
  - Complaint / Condition: `throat infection`
  - Medicine: `Azithromycin 500mg`, freq: `1-0-1` (BD / twice daily), duration: `3 days`
  - Advice: `Betadine gargle`

---

## 3. Negative & Edge Case Test Matrix

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| NEG-01 | Unmentioned diagnosis | System leaves diagnosis `not_mentioned`, does not infer illness from symptoms |
| NEG-02 | Unmentioned duration | Leaves duration `not_mentioned`, flags for doctor attention |
| NEG-03 | Unconfirmed PDF download | API returns `HTTP 403 Forbidden: Prescription not confirmed by doctor` |
| NEG-04 | Malformed LLM response | Catches JSON decode error, falls back safely with error status |
| NEG-05 | Corrupt / empty audio | Returns `HTTP 400 Bad Request` with actionable message |
| NEG-06 | STT provider timeout | Returns clear timeout error, original audio preserved |
| NEG-07 | Voice edit ambiguous | Returns clarification query without applying guessing edit |

---

## 4. Accuracy & Performance Benchmarks

- **Field Extraction Accuracy**: $> 95\%$ on reference dictations.
- **Normalization Accuracy**: $100\%$ on standardized frequency codes (OD, BD, TDS, QID, HS, SOS, STAT, 1-0-1).
- **Confirmation Safety Gate**: $100\%$ blockage rate of unconfirmed PDF generation.
- **Hallucination Rate**: $0\%$ for unstated diagnosis and unstated durations.
- **End-to-End Latency Target**: $< 3000\text{ ms}$ on local mock provider pipeline.

