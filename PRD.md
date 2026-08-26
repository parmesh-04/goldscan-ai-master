# Product Requirements Document (PRD): GoldScan AI

## 1. Document Information
- **Product Name:** GoldScan AI
- **Document Version:** 1.0
- **Status:** Approved
- **Target Market:** Indian NBFCs (Non-Banking Financial Companies)

## 2. Product Vision & Overview
### 2.1 Elevator Pitch
**GoldScan AI** is an AI-powered remote gold jewelry pre-screening tool. It allows customers to photograph their gold jewelry and tap-test it to get an instant loan pre-qualification report without physically visiting a branch. By leveraging vision AI (Gemini 2.5 Flash) and a multi-signal Bayesian fusion engine, it assesses hallmark authenticity, detects plating, and estimates weight to dramatically cut down branch appraisal time and customer acquisition costs.

### 2.2 Problem Statement
In India, gold loan borrowers (predominantly semi-urban/rural) must visit physical branches for jewelry appraisal before qualifying for a loan. This process takes 30-45 minutes per customer, requires specialized equipment, and mandates a trained valuer on-site. This results in high Customer Acquisition Costs (CAC) and limits the geographical reach of NBFCs.

### 2.3 Solution
GoldScan AI digitizes the pre-screening phase. Customers use their smartphones to:
1. Upload jewelry photos.
2. Perform an audio tap-test.
3. Declare details (karat, weight, age).
The backend's Bayesian fusion engine analyzes these signals alongside Indian market priors and flags fraud risks. Branch visits are then reserved solely for the final 75% LTV (Loan-to-Value) physical weighing and KYC verification.

## 3. Target Audience & User Personas
1. **The Borrower (Customer):** Wants a quick, hassle-free way to know if they qualify for a gold loan and how much they can get without traveling to a branch first.
2. **The Loan Officer (NBFC Staff):** Uses the GoldScan dashboard to review pre-screened applications. They need to see a clear risk score and automatically flagged anomalies to decide whether to invite the customer for final verification.
3. **The NBFC Executive:** Wants to reduce valuer overhead, lower CAC by 25-35%, and increase loan processing throughput.

## 4. Value Proposition & Business Goals
### 4.1 Key Performance Indicators (KPIs)
- **CAC Reduction:** Target a 25-35% decrease in Customer Acquisition Cost.
- **Time Savings:** Save approximately 40 minutes of valuer time per pre-screening.
- **Processing Speed:** Generate the risk-flagged NBFC pre-screening report in under 15 seconds.
- **Fraud Catch Rate:** High confidence in detecting common fraud types (e.g., gold-plated items, hallmark/surface mismatches).

## 5. Scope
### 5.1 In Scope (Phase 1 / Production-Ready)
- Multi-step customer wizard UI (React) for uploading photos, capturing audio, and entering details.
- Client-side OCR using Tesseract.js for bill parsing (privacy-preserving).
- Backend vision analysis using Gemini 2.5 Flash.
- Bayesian fusion engine incorporating OCR, surface consistency, audio resonance, and declared signals.
- Fraud risk flagging system (High/Medium severity).
- Geometric weight estimation (with ±12% accuracy if a ₹1 coin is in frame).
- NBFC officer dashboard with SQLite persistence for submissions.
- RBI-compliant Loan Eligibility calculation formula.

### 5.2 Out of Scope & Limitations (Current Version)
- **Certified Appraisal:** Not a replacement for XRF spectrometry or physical weighing. Weight estimates are for ball-park loan ranges only.
- **Aadhaar KYC:** Identity verification is not performed in Phase 1.
- **LOS Integration:** Direct API integration with existing Loan Origination Systems is deferred to later phases.
- **Priors Context:** The Bayesian priors are tightly coupled to the Indian market and will not work accurately for European or antique jewelry.

## 6. Detailed Functional Requirements (Epics & User Stories)

### Epic 1: Customer Pre-Screening Wizard
- **US 1.1 - Photo Upload:** As a customer, I want to upload clear photos of my jewelry (with an optional ₹1 coin for scale) so the AI can analyze hallmarks and surface condition.
- **US 1.2 - Audio Tap-Test:** As a customer, I want to record the sound of tapping my jewelry so the system can analyze its acoustic resonance for plating indicators.
- **US 1.3 - Declaration Form:** As a customer, I want to input my self-declared weight, karat, and age of the item.
- **US 1.4 - Bill OCR:** As a customer, I want to scan my purchase bill using my phone so the system can read details locally without sending the image to the cloud.

### Epic 2: AI Analysis & Bayesian Fusion (Backend)
- **US 2.1 - Vision AI Analysis:** As the system, I must send uploaded photos to Gemini 2.5 Flash to detect hallmarks (e.g., 916, 750) and evaluate visual surface wear/plating indicators.
- **US 2.2 - Weight Estimation:** As the system, I must estimate the item's weight using geometric inference, factoring in a ±12% uncertainty band if a reference coin is present.
- **US 2.3 - Bayesian Fusion:** As the system, I must fuse the visual, audio, and declared signals against Indian market priors (22K: 58%, etc.) to compute the posterior probability distribution of the gold's purity.
- **US 2.4 - Fraud Risk Flags:** As the system, I must trigger High/Medium risk flags (e.g., `HALLMARK_SURFACE_MISMATCH`, `PLATING_DETECTED`) if anomalies are detected between signals.

### Epic 3: NBFC Officer Dashboard
- **US 3.1 - Submissions Feed:** As a loan officer, I want to see a list of all pre-screening submissions with their overall status (`PRE_APPROVED`, `NEEDS_VERIFICATION`, `REJECTED`).
- **US 3.2 - Detailed Report:** As a loan officer, I want to click on a submission to view the full Bayesian breakdown, fraud flags, and estimated loan eligibility.
- **US 3.3 - Application Review:** As a loan officer, I want to mark applications as reviewed or delete fraudulent submissions from the database.

## 7. Loan Decision Rules & Calculation
- **Rejection Criteria:** Risk score ≥ 40 OR any `HIGH` flag → `REJECTED`
- **Verification Criteria:** Risk score ≥ 20 OR any flag → `NEEDS_VERIFICATION`
- **Pre-Approval Criteria:** Else → `PRE_APPROVED`
- **Loan Amount Formula (RBI-compliant):** `loan_amount = weight × purity_factor × gold_price × 0.93 (making charge adjustment) × 0.75 (LTV ratio)`

## 8. Non-Functional Requirements (NFRs)
### 8.1 Performance & Reliability
- Assessment turnaround time must be under 15 seconds.
- AI must run entirely server-side (except Tesseract OCR) to secure API keys.
- Fallback mock pathways for development without API keys.

### 8.2 Security & Privacy
- **API Keys:** Must be strictly backend-only.
- **Data Privacy:** Customer photos processed in memory and not permanently stored.
- **CORS:** Restricted to explicitly allowed origins.
- **Request Tracing:** All requests must include a `X-Request-ID` for audit logging.

## 9. System Architecture & Tech Stack
- **Frontend Layer:** React 18, Web Audio API, Tesseract.js.
- **Backend API:** FastAPI (Python 3.11+).
- **Vision Engine:** Gemini 2.5 Flash.
- **Database Layer:** SQLite (aiosqlite) for zero-infrastructure persistence, easily swappable to Postgres.
- **Analysis Algorithms:** Custom Bayesian Fusion (`fusion.py`) and Geometric Weight Estimation (`weight.py`).

## 10. Future Roadmap (Phase 2 / 3)
1. **Phase 2:** 3D volumetric reconstruction from multi-angle images to improve weight accuracy.
2. **Phase 3:** Aadhaar KYC integration for identity verification.
3. **Phase 3:** Core LOS API integration for direct sanction workflow.
4. **Phase 3:** Multi-lingual OCR for Hindi bill recognition.
5. **Phase 3:** Direct XRF result ingestion for branch staff to finalize the loop.
