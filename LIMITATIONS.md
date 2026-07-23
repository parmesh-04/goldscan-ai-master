# GoldScan AI — Known Limitations

GoldScan AI is a **pre-screening tool for NBFCs**, not a certified gold appraisal instrument.
The following limitations must be understood before using results for any financial decision.

---

## 1. Vision Analysis Accuracy

| Factor | Impact |
|--------|--------|
| Photo quality | Blur, low lighting, or glare reduces hallmark OCR accuracy |
| Image angle | Single-angle photos may miss hallmarks visible only from one side |
| Screen photos | Submitting screenshots of gold images will be flagged as high-risk |
| Look-alikes | Gold-tone base metals may not be flagged by color analysis alone |

**This system does not replace XRF spectrometry**, which is the certified method for gold purity verification.

---

## 2. Weight Estimation Accuracy

Weight is estimated visually using geometry inference, not physical measurement.

| Condition | Uncertainty Band |
|-----------|-----------------|
| ₹1 coin in frame for scale | ±12% |
| No scale reference | ±22% |

Weight estimates are suitable for **ball-park loan range calculation only**. Physical weighing must be performed before loan disbursement.

---

## 3. Audio Tap-Test Signal

The Web Audio API resonance test is a **secondary signal** and a **weak discriminator**:
- Environmental noise significantly affects results
- Works best in a quiet room with a hard surface
- Should be used to *raise suspicion*, never as the sole plating indicator
- Confidence is capped at 0.7 for the fusion engine (reflecting its inherent uncertainty)

---

## 4. Bayesian Priors

The system uses Indian market distribution priors (22K: 58%, 18K: 20%, etc.).
These priors are inappropriate for:
- Non-Indian jewelry (European: 18K/14K dominated)
- Antique jewelry (potentially different purity distributions)
- Industrial gold (coins, bars)

---

## 5. No KYC or Identity Verification

GoldScan AI does **not** perform Aadhaar KYC, PAN verification, or any identity check.
Applicant name and declared weight are entirely self-reported and unverified.
KYC integration is planned for Phase 3 (requires regulatory approval).

---

## 6. Data Privacy

- Customer photos are processed in memory only and are not stored permanently
- Assessment results stored in the SQLite database include applicant names
- The operator is responsible for complying with applicable data protection laws
  (IT Act 2000, DPDP Act 2023)

---

## 7. This Is Not a Loan Sanction

PRE_APPROVED status means the item has **passed automated pre-screening**.
Final loan sanction requires:
- Physical in-branch weighing
- KYC completion
- Loan officer review
- LOS (Loan Origination System) approval

---

## Phase 2 / 3 Roadmap (Not Yet Implemented)

| Feature | Phase |
|---------|-------|
| 3D volumetric reconstruction from multi-angle images | Phase 2 |
| Aadhaar KYC integration | Phase 3 |
| LOS API integration for direct sanction workflow | Phase 3 |
| Multi-lingual OCR (Hindi bill recognition) | Phase 3 |
| XRF result ingestion for branch staff | Phase 3 |
