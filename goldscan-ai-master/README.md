# GoldScan AI

GoldScan AI is a full-stack hackathon demo for AI-powered remote gold jewelry assessment for lending. It helps customers scan jewelry from home, combines vision, audio, declarations, and live gold-rate data, then produces a pre-qualification report for NBFC loan officers.

Built by **ByteRave** for **TenzorX 2026 — National AI Hackathon**.

## Screenshots

Run the frontend locally and capture:

- Landing page: `http://localhost:5173/`
- Customer scan flow: `http://localhost:5173/scan`
- Result report: complete one scan and view `/result`
- NBFC dashboard: `http://localhost:5173/dashboard`

## Features

- Responsive customer scan wizard with photo upload, canvas quality checks, optional tap-test audio capture, customer declarations, and animated analysis progress.
- Gemini 1.5 Flash image analysis with a reliable offline fallback so the demo never blanks or crashes.
- Browser OCR support through Tesseract.js for optional purchase-bill text extraction.
- JavaScript weight estimation, audio material signal analysis, and Bayesian-style fusion with fraud flags.
- Live INR gold price feed from goldprice.org with fallback pricing.
- Loan eligibility calculation using purity factor and RBI-style 75% LTV.
- Recharts posterior purity distribution.
- NBFC dashboard with expandable rows, risk badges, decision badges, and localStorage submissions from customer scans.
- Optional FastAPI backend modules for teams that want a server-side demo path.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router
- AI vision: Google Gemini 1.5 Flash API
- OCR: Tesseract.js in the browser
- Audio: Web Audio API
- Charts: Recharts
- Storage: browser localStorage
- Backend: Python FastAPI, optional for local experimentation

## Setup

### Prerequisites

- Node.js 18+
- Python 3.9+ for the optional backend

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```bash
VITE_GEMINI_API_KEY=your_key_here
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:5173`.

### Free Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key**.
3. Create a free API key.
4. Add it to `frontend/.env` as `VITE_GEMINI_API_KEY=your_key_here`.

The app includes deterministic fallback analysis when the key is missing, the network fails, or Gemini returns malformed JSON.

### Optional Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The frontend demo calls Gemini directly, so the backend is optional.

## Demo Flow

1. Open the landing page and click **Start Gold Scan**.
2. Upload one to five jewelry images. If possible, include a Rs. 1 coin for scale.
3. Record the optional 3-second tap test or skip it.
4. Enter jewelry type, declared weight, declared karat, and optional bill image.
5. Run analysis and review the result page.
6. Click **Share with NBFC** to send the result to localStorage.
7. Open the NBFC dashboard to see the new `#GS-0848` row at the top.

## Team

ByteRave — TenzorX 2026
