# Product Requirements Document (PRD): GoldScan AI

## 1. Project Overview
**GoldScan AI** is a specialized fintech solution designed to bridge the gap between physical gold jewelry and remote digital lending. It enables users to perform a "digital appraisal" of their gold jewelry using a smartphone, facilitating instant pre-qualification for gold loans without requiring an immediate visit to a physical branch or an expensive XRF (X-ray fluorescence) machine.

### Mission Statement
To democratize access to gold loans in India by providing a high-trust, AI-powered remote valuation tool that reduces customer acquisition costs for NBFCs (Non-Banking Financial Companies) and saves time for borrowers.

---

## 2. Target Audience
1.  **Borrowers (B2C):** Individuals in semi-urban and rural India who own gold jewelry and need quick liquidity but face geographic or time barriers to visiting bank branches.
2.  **NBFCs & Banks (B2B):** Lending institutions looking to scale their gold loan portfolios, reduce physical appraisal overhead, and filter out low-quality or fraudulent applications before they reach the branch.

---

## 3. Core Features

### 3.1. Customer Scan Wizard (The "Scan" Flow)
*   **Photo Capture:** Multi-angle photography (5 angles) of jewelry items.
*   **Size Reference:** Integration of a "scale reference" (e.g., a ₹1 coin) to calibrate dimensions and estimate volume.
*   **Acoustic Signature (Tap Test):** Capturing the sound of jewelry tapping on a hard surface to analyze resonance patterns (solid gold vs. plated/hollow).
*   **User Declarations:** Capturing self-reported karat (purity), weight, and jewelry type.
*   **OCR Integration:** Optional scanning of purchase bills/invoices to verify provenance.

### 3.2. AI Assessment Engine
*   **Computer Vision (Gemini 1.5 Flash):**
    *   Jewelry type classification.
    *   Hallmark detection and text extraction (BIS 916, 750, etc.).
    *   Surface condition analysis (plating detection, wear level, color consistency).
*   **Audio Analysis:** Frequency-domain analysis of the "tap test" to detect base metals or hollow structures.
*   **Weight Estimation:** Algorithmic calculation of weight based on volume (extracted from vision) and declared density.
*   **Bayesian Fusion Engine:** A statistical model that weights signals (vision, audio, OCR, declarations) to produce a final purity estimate and fraud risk score.

### 3.3. Result & Reporting
*   **Instant Pre-Approval:** Calculation of loan eligibility based on:
    *   Estimated gold weight.
    *   Verified purity (Karat).
    *   Live MCX (Multi Commodity Exchange) gold rates.
    *   Regulatory LTV (Loan-to-Value) ratios (typically 75%).
*   **Risk Dashboarding:** Flagging inconsistencies (e.g., "Hallmark reads 22K but audio suggests plated metal").

### 3.4. NBFC Dashboard
*   **Lead Management:** A centralized view for loan officers to review incoming remote assessments.
*   **Deep-Dive Analysis:** Expandable rows showing AI reasoning, confidence scores for each signal, and raw imagery.
*   **Workflow Actions:** Capabilities to "Approve & Send to LOS (Loan Origination System)" or "Flag for Branch Verification."

---

## 4. Technical Stack
*   **Frontend:** React.js, Vite, Tailwind CSS, Framer Motion (for premium animations).
*   **State Management:** React Hooks, localStorage (for demo persistence).
*   **AI Vision:** Google Gemini 1.5 Flash API.
*   **OCR:** Tesseract.js (In-browser OCR).
*   **Data Visualization:** Recharts (for purity probability distributions).
*   **Backend (Optional):** Python FastAPI (for advanced logic and server-side processing).

---

## 5. User Journey
1.  **Landing:** User learns about the benefits and "How it Works" via a scrollyteller interface.
2.  **Scan:** User follows the step-by-step wizard to capture data.
3.  **Analyze:** System runs parallel AI models and the Fusion Engine.
4.  **Result:** User receives a pre-qualification report with a loan range.
5.  **Dashboard:** Loan officer reviews the application and initiates the final KYC/disbursement process.

---

## 6. Success Metrics (KPIs)
*   **Assessment Accuracy:** Variance between AI-estimated weight/purity and physical appraisal.
*   **Processing Time:** Reducing the end-to-end appraisal-to-pre-approval time to < 3 minutes.
*   **Fraud Detection:** Accuracy in identifying "known fake" samples (plated or brass-filled jewelry).
*   **User Conversion:** Percentage of users who complete the scan flow after starting.

---

## 7. Roadmap & Future Scope
*   **Phase 1 (Current):** Hackathon MVP with vision, audio, and basic fusion.
*   **Phase 2:** Real-time edge-AI for better photo quality guidance.
*   **Phase 3:** Integration with Aadhaar-based KYC for full remote onboarding.
*   **Phase 4:** Support for more complex jewelry types (stone-studded, intricate temple jewelry).
