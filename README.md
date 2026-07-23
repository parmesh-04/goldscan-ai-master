# GoldScan AI

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3.1-blue?style=flat&logo=react" />
  <img src="https://img.shields.io/badge/FastAPI-0.115.6-009688?style=flat&logo=fastapi" />
  <img src="https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat&logo=google" />
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python" />
  <img src="https://img.shields.io/badge/Tests-41%20passed-22C891?style=flat" />
</p>

<p align="center">
  <b>AI-Powered Remote Gold Jewelry Pre-Screening for Indian NBFCs</b>
</p>

GoldScan AI lets customers photograph their gold jewelry and get an instant loan pre-qualification report — without visiting a branch. It combines **Gemini 2.5 Flash** vision AI, a multi-signal **Bayesian fusion engine**, and acoustic resonance analysis to assess hallmark authenticity, detect plating, estimate weight, and produce a risk-flagged NBFC pre-screening report in under 15 seconds.

**Built for TenzorX 2026 National AI Hackathon. Upgraded to production-ready standard for portfolio/placement.**

---

## Table of Contents

- [Problem & Solution](#problem--solution)
- [Architecture](#architecture)
- [How Bayesian Fusion Works](#how-bayesian-fusion-works)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [Limitations & Roadmap](#limitations--roadmap)

---

## Problem & Solution

**Problem:** In India, gold loan borrowers (mostly semi-urban/rural) must visit physical branches for jewelry appraisal before getting a loan. For an NBFC, each appraisal requires a trained valuer, specialized equipment, and 30–45 minutes per customer. This creates high CAC and limits reach.

**Solution:** GoldScan AI moves the *pre-screening* step to the customer's phone:
1. Customer uploads jewelry photos
2. AI analyzes hallmark, surface condition, and construction
3. Bayesian engine fuses vision + audio + declaration signals
4. NBFC officer receives a risk-scored report in the dashboard
5. Branch visit happens only for the final 75% LTV calculation and KYC

**What this saves:** ~40 minutes of valuer time per pre-screening. Estimated NBFC CAC reduction: 25–35%.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │Step1     │  │Step2     │  │Step3      │  │ResultPage     │  │
│  │Upload    │  │Audio     │  │Declare    │  │Dashboard      │  │
│  │Photos    │  │Tap-test  │  │Details    │  │               │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └──────┬────────┘  │
│       │ Tesseract   │Web Audio      │                │           │
│       │ OCR (local) │ API           │                │           │
└───────│─────────────│───────────────│────────────────│───────────┘
        │ FormData    │               │                │ GET/POST
        ▼             ▼               ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                             │
│                                                                  │
│  POST /analyze                    POST/GET/DELETE /submissions   │
│  ┌──────────────┐                ┌──────────────────────────┐   │
│  │  analyzer.py  │ Gemini 2.5    │       database.py         │   │
│  │  (Vision AI)  │────Flash────▶ │  (SQLite persistence)    │   │
│  └──────┬───────┘               └──────────────────────────┘   │
│         │                                                         │
│  ┌──────▼───────┐               ┌──────────────────────────┐   │
│  │   weight.py   │               │  Audit logs              │   │
│  │ (Estimation)  │               │  (structured logging     │   │
│  └──────┬───────┘               │   + request IDs)         │   │
│         │                        └──────────────────────────┘   │
│  ┌──────▼───────┐                                               │
│  │   fusion.py   │                                               │
│  │ (Bayesian     │                                               │
│  │  Fusion)      │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**
- **All AI runs server-side** — Gemini API key is never exposed to the browser
- **Tesseract OCR runs client-side** — bill images stay on the customer's device (privacy)
- **SQLite** — zero-infrastructure persistence, easily swapped for Postgres in production
- **Backend is the single source of truth** — frontend never makes its own loan decision

---

## How Bayesian Fusion Works

The system combines multiple independent signals into a probability distribution over gold purity using **Bayes' theorem**:

```
posterior[k] ∝ prior[k] × likelihood(signal | karat=k)
```

### Prior (Indian Market Distribution)
```
24K: 4%  |  22K: 58%  |  18K: 20%  |  14K: 9%  |  Plated: 9%
```
*(Source: World Gold Council India market data)*

### Signal Updates (applied sequentially)

| Signal | Strength | Example |
|--------|----------|---------|
| Hallmark OCR (916/750/999) | **Highest (35%)** | `916` → P(22K) jumps to ~70% |
| Surface color consistency | Medium (25%) | `consistent_22k` reinforces 22K |
| Visual plating indicators | High if positive | Wear-through → Plated boosted |
| Audio resonance | Secondary (20%) | Plated sound → AUDIO_PLATING_SIGNAL |
| Customer declaration | Lowest (8%) | Self-declared karat is weak signal |

### Fraud Risk Flags

| Flag Code | Triggers When | Severity |
|-----------|---------------|----------|
| `HALLMARK_SURFACE_MISMATCH` | 916 stamp + inconsistent color | HIGH |
| `PLATING_DETECTED` | Visual wear-through >60% confidence | HIGH |
| `DECLARATION_HALLMARK_MISMATCH` | Declared karat ≠ visible stamp | MEDIUM |
| `WEIGHT_MISMATCH` | Declared weight >30% off estimate | MEDIUM |
| `AUDIO_PLATING_SIGNAL` | Audio pattern matches base metal >65% conf | MEDIUM |
| `HOLLOW_HIGH_KARAT_MISMATCH` | 24K declared but hollow construction | MEDIUM |
| `WEAR_AGE_MISMATCH` | Heavy wear on item declared <2 years old | MEDIUM |

### Loan Decision Rules

```
risk_score ≥ 40  OR  any HIGH flag    →  REJECTED
risk_score ≥ 20  OR  any flag         →  NEEDS_VERIFICATION
else                                   →  PRE_APPROVED
```

### Loan Eligibility Formula (RBI-compliant)

```
loan_amount = weight × purity_factor × gold_price × 0.93 × 0.75
                                              ↑ making charge  ↑ LTV ratio
```

---

## Quick Start

### 1. Get a Gemini API Key

Free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

### 2. Configure Backend

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set:
#   GEMINI_API_KEY=your_key_here
```

### 3. Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

App at `http://localhost:5173`

> **No API key?** The app runs in dev mode with a safe mock — clearly labelled `[DEV MOCK]`.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health + DB + Gemini status |
| `POST` | `/analyze` | Main assessment (multipart image + form fields) |
| `POST` | `/submissions` | Persist assessment to DB for NBFC dashboard |
| `GET` | `/submissions` | List submissions (dashboard feed) |
| `DELETE` | `/submissions/{id}` | Delete a submission |
| `POST` | `/submissions/{id}/review` | Mark as reviewed by officer |

Full interactive docs: `http://localhost:8000/docs`

---

## Project Structure

```
goldscan-ai/
├── backend/
│   ├── main.py          # FastAPI app, routing, CORS, error handling
│   ├── analyzer.py      # Gemini 2.5 Flash vision analysis (retry + timeout)
│   ├── fusion.py        # Bayesian fusion engine + fraud flags + loan decision
│   ├── weight.py        # Geometric weight estimation (PRD density table)
│   ├── database.py      # SQLite persistence (aiosqlite)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── tests/
│       ├── test_fusion.py   # 18 Bayesian + flag tests
│       ├── test_weight.py   # 12 weight estimation tests
│       └── test_api.py      # 11 endpoint integration tests
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ScanPage.jsx         # 4-step wizard
│   │   │   ├── ResultPage.jsx       # Risk report display
│   │   │   ├── DashboardPage.jsx    # NBFC officer dashboard
│   │   │   └── scan/
│   │   │       └── ScanSteps.jsx    # Step components
│   │   └── utils/
│   │       ├── geminiClient.js      # Tesseract.js OCR only (no API key in browser)
│   │       ├── fusionEngine.js      # Posterior display helper (backend is authoritative)
│   │       └── weightEstimator.js   # Weight display helper
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml
├── AUDIT.md             # Phase 0 gap report (12 code + 6 logic + 8 API + 6 test gaps)
├── DEPLOYMENT.md        # Local / Docker / Render+Vercel deployment guides
├── LIMITATIONS.md       # Accuracy bounds, regulatory context, roadmap
└── README.md
```

---

## Running Tests

```bash
cd backend
pip install pytest httpx
python -m pytest tests/ -v

# Expected output: 41 passed, 0 failed
```

**What's tested:**
- All 7 fraud risk flag conditions (trigger + non-trigger)
- Bayesian posterior correctness for 916, 750, 999 hallmarks
- Probability always sums to 100
- PRD-exact density values (19.32 / 17.73 / 15.58 / 8.50)
- ±12%/±22% uncertainty band widths
- Declaration anchoring + plausibility rejection
- HTTP 400 for invalid file type, too-small, too-large
- Dev mock path (no API key → safe pessimistic result)
- `unknown` purity does NOT default to `22K` (critical regression test)

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step guides.

**TL;DR:**
```bash
# Docker Compose (recommended for demo)
cp backend/.env.example backend/.env  # Add GEMINI_API_KEY
mkdir -p data
docker-compose up --build
# Open http://localhost:5173
```

---

## Security Notes

| Issue | Mitigation |
|-------|-----------|
| Gemini API key exposure | Key is **backend-only** — never in browser bundle |
| SQL injection | Parameterized queries via aiosqlite |
| CORS | Locked to `ALLOWED_ORIGINS` env var — no wildcard |
| File upload | MIME type + size validation before processing |
| Error exposure | Global handler returns generic messages, logs full trace server-side |
| Request tracing | Every request gets a UUID logged in `X-Request-ID` header |

---

## Limitations & Roadmap

See [LIMITATIONS.md](./LIMITATIONS.md) for accuracy bounds, data privacy considerations, and Phase 2/3 features.

**Key limitations to know:**
- Weight accuracy: ±12% (with coin) to ±22% (without) — visual only, not XRF
- Audio signal is a secondary indicator only; environmental noise affects results
- PRE_APPROVED status is pre-screening only — final loan requires branch visit + KYC

---

*Built with ❤️ for the Indian gold lending ecosystem.*
