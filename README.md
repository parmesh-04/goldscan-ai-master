# GoldScan AI

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3.1-blue?style=flat&logo=react" />
  <img src="https://img.shields.io/badge/Vite-6.0.1-646CFF?style=flat&logo=vite" />
  <img src="https://img.shields.io/badge/Tailwind-3.4.15-38B2AC?style=flat&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/FastAPI-0.115.6-009688?style=flat&logo=fastapi" />
  <img src="https://img.shields.io/badge/Gemini-1.5%20Flash-4285F4?style=flat&logo=google" />
</p>

<p align="center">
  <b>AI-Powered Remote Gold Jewelry Assessment for Digital Lending</b>
</p>

GoldScan AI is a full-stack fintech solution that enables customers to perform remote gold jewelry appraisals using just their smartphone camera. The platform combines computer vision, audio analysis, and Bayesian fusion to provide instant pre-qualification reports for NBFC loan officers — reducing customer acquisition costs and democratizing access to gold loans in India.

**Built by ByteRave for TenzorX 2026 — National AI Hackathon**

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Our Solution](#our-solution)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
  - [Method 1: Quick Start (Frontend Only)](#method-1-quick-start-frontend-only)
  - [Method 2: Full Stack (Frontend + Backend)](#method-2-full-stack-frontend--backend)
  - [Method 3: Using Batch Scripts (Windows)](#method-3-using-batch-scripts-windows)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Deployment Guide](#deployment-guide)
  - [Frontend Deployment (Netlify/Vercel)](#frontend-deployment-netlifyvercel)
  - [Backend Deployment (Render/Railway)](#backend-deployment-renderrailway)
- [Demo Flow](#demo-flow)
- [Screenshots](#screenshots)
- [Future Roadmap](#future-roadmap)
- [Team](#team)

---

## Problem Statement

In India, gold loans are a critical source of liquidity, especially in semi-urban and rural areas. However, the traditional process faces significant challenges:

1. **Geographic Barriers**: Customers must visit physical branches for jewelry appraisal
2. **High Acquisition Costs**: NBFCs spend heavily on physical verification infrastructure
3. **Time Inefficiency**: Appraisal-to-disbursement can take days
4. **Fraud Risks**: Counterfeit jewelry and inflated purity claims cause losses
5. **XRF Machine Dependency**: Expensive specialized equipment limits scalability

---

## Our Solution

GoldScan AI provides a smartphone-based digital appraisal system that:

- **Eliminates Geographic Barriers**: Customers scan jewelry from home
- **Reduces Costs**: AI-powered pre-qualification filters applications before branch visits
- **Accelerates Processing**: Complete appraisal in under 3 minutes
- **Detects Fraud**: Multi-modal analysis (vision + audio + declarations) flags inconsistencies
- **Scales Infinitely**: No hardware dependencies — just a smartphone camera

### How It Works

1. **Customer** takes multi-angle photos of jewelry (including ₹1 coin for scale)
2. **AI Vision** (Gemini 1.5 Flash) analyzes images for type, purity, hallmark, and surface condition
3. **Audio Analysis** of "tap test" detects hollow or plated items
4. **Bayesian Fusion Engine** combines all signals into a confidence-weighted purity estimate
5. **Loan Calculator** computes eligibility using live gold rates and RBI's 75% LTV guideline
6. **NBFC Dashboard** presents loan officers with risk-scored applications for final approval

---

## Key Features

### 1. Customer Scan Wizard
- **Multi-angle Photo Upload**: Support for 1-5 jewelry images
- **Canvas Quality Checks**: Real-time image validation
- **Tap Test Audio Capture**: 3-second audio recording for material analysis
- **Smart Declarations**: User inputs for type, weight, and karat
- **OCR Integration**: Tesseract.js extracts text from purchase bills
- **Animated Progress**: Framer Motion-powered analysis visualization

### 2. AI Assessment Engine
- **Computer Vision (Gemini 1.5 Flash)**:
  - Jewelry type classification (ring, bangle, chain, earring, pendant, necklace, coin)
  - Hallmark detection and text extraction (BIS 916, 750, etc.)
  - Surface condition analysis (plating detection, wear level, color consistency)
  - Coin detection for scale calibration
- **Audio Analysis**: Frequency-domain tap test analysis
- **Weight Estimation**: Algorithmic calculation based on visual dimensions and declared density
- **Bayesian Fusion Engine**: Statistical model weighting vision, audio, and declarations

### 3. Results & Reporting
- **Instant Pre-Approval**: Real-time loan eligibility calculation
- **Live Gold Rates**: INR gold price feed from goldprice.org with fallback
- **Purity Visualization**: Recharts-powered posterior probability distribution
- **Risk Flagging**: Automatic detection of inconsistencies (e.g., "Hallmark reads 22K but audio suggests plated")
- **PDF Report Generation**: Shareable assessment summaries

### 4. NBFC Dashboard
- **Lead Management**: Centralized view of all incoming assessments
- **Expandable Analysis**: Deep-dive into AI reasoning and confidence scores
- **Risk Badges**: Visual indicators for high/medium/low risk applications
- **Decision Actions**: Approve/Reject/Flag for branch verification
- **Real-time Updates**: localStorage-based submission pipeline

### 5. Reliability Features
- **Graceful Fallbacks**: Deterministic analysis when APIs fail
- **Offline Mode**: Core functionality works without internet
- **Input Validation**: Strict sanitization of all user inputs
- **Error Boundaries**: Comprehensive error handling throughout

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend Framework** | React 18.3.1 | UI component architecture |
| **Build Tool** | Vite 6.0.1 | Fast development and optimized builds |
| **Styling** | Tailwind CSS 3.4.15 | Utility-first responsive design |
| **Animations** | Framer Motion 12.38.0 | Premium micro-interactions |
| **Routing** | React Router 6.28.0 | Client-side navigation |
| **AI Vision** | Google Gemini 1.5 Flash | Image analysis and classification |
| **OCR** | Tesseract.js 5.1.1 | In-browser text extraction |
| **Charts** | Recharts 2.13.3 | Data visualization |
| **Icons** | Lucide React 0.468.0 | Modern icon system |
| **Audio** | Web Audio API | Tap test signal processing |
| **Storage** | Browser localStorage | Demo data persistence |
| **Backend** | FastAPI 0.115.6 | Optional server-side processing |
| **Server** | Uvicorn 0.32.1 | ASGI server for backend |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│   │   Landing    │───▶│  Scan Wizard │───▶│   Results    │   │
│   │    Page      │    │  (5 Steps)   │    │    Page      │   │
│   └──────────────┘    └──────────────┘    └──────────────┘   │
│                               │                                 │
│                               ▼                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│   │   NBFC       │◀───│  localStorage│◀───│  Share with  │   │
│   │  Dashboard   │    │   Pipeline   │    │    NBFC      │   │
│   └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         AI PROCESSING                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│   │   Gemini     │    │   Audio      │    │   Weight     │   │
│   │   Vision     │    │   Analysis   │    │  Estimation  │   │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘   │
│          │                   │                   │            │
│          └───────────────────┼───────────────────┘            │
│                              ▼                                 │
│                    ┌──────────────────┐                        │
│                    │  Bayesian Fusion │                        │
│                    │     Engine       │                        │
│                    └────────┬─────────┘                        │
│                             ▼                                  │
│                    ┌──────────────────┐                        │
│                    │  Loan Eligibility │                        │
│                    │    Calculator    │                        │
│                    └──────────────────┘                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                      EXTERNAL SERVICES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Google AI Studio (Gemini API)      goldprice.org (Rates)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Software

| Software | Minimum Version | Download Link |
|----------|----------------|---------------|
| Node.js | 18.x LTS | [nodejs.org](https://nodejs.org/) |
| npm | 9.x | Included with Node.js |
| Python | 3.9+ | [python.org](https://python.org/) |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

### System Requirements

- **OS**: Windows 10/11, macOS 12+, or Linux (Ubuntu 20.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Browser**: Chrome 110+, Firefox 115+, Safari 16+, Edge 110+
- **Camera**: Smartphone or webcam for testing (optional)
- **Microphone**: For tap test feature (optional)

### Accounts Required

1. **Google AI Studio Account** (Free)
   - Visit: https://aistudio.google.com/
   - Sign in with Google account
   - Generate API key (free tier available)

---

## Installation & Setup

### Clone the Repository

```bash
git clone https://github.com/yourusername/goldscan-ai.git
cd goldscan-ai
```

---

### Method 1: Quick Start (Frontend Only)

This is the fastest way to run the demo. The frontend can call Gemini directly.

#### Step 1: Install Frontend Dependencies

```bash
cd frontend
npm install
```

#### Step 2: Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
# On Windows
copy .env.example .env

# On macOS/Linux
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```env
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
VITE_API_URL=http://localhost:8000
```

**How to get your Gemini API key:**
1. Go to https://aistudio.google.com/
2. Click "Get API key" in the top right
3. Click "Create API key"
4. Copy the key and paste it into your `.env` file

#### Step 3: Start the Development Server

```bash
npm run dev
```

You should see output like:
```
  VITE v6.0.1  ready in 312 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h + enter to show help
```

#### Step 4: Access the Application

Open your browser and navigate to: **http://localhost:5173/**

---

### Method 2: Full Stack (Frontend + Backend)

Use this method if you want to explore the server-side processing capabilities.

#### Step 1: Setup Frontend (as above)

Follow Steps 1-2 from Method 1 above.

#### Step 2: Setup Python Virtual Environment

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate
```

You should see `(.venv)` in your terminal prompt indicating the virtual environment is active.

#### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- FastAPI 0.115.6
- Uvicorn 0.32.1 (with standard extras)
- Pydantic 2.10.3
- python-multipart 0.0.19

#### Step 4: Configure Backend Environment

Create a `.env` file in the `backend` directory:

```bash
# On Windows
copy .env.example .env

# On macOS/Linux
cp .env.example .env
```

Edit `.env`:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PRODUCTION_MODE=false
```

#### Step 5: Start Both Servers

**Terminal 1 - Start Backend:**
```bash
cd backend
.venv\Scripts\activate  # Windows
# OR
source .venv/bin/activate  # macOS/Linux

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```

#### Step 6: Verify Setup

- Frontend: http://localhost:5173/
- Backend API: http://localhost:8000/
- Backend Docs: http://localhost:8000/docs (Swagger UI)
- Health Check: http://localhost:8000/health

---

### Method 3: Using Batch Scripts (Windows)

For Windows users, we provide convenient batch scripts.

#### Option A: Start Frontend Only

```bash
start_frontend.bat
```

This script will:
1. Navigate to the frontend directory
2. Run `npm install` (if dependencies missing)
3. Start the Vite development server
4. Open at http://localhost:5173/

#### Option B: Start Backend Only

```bash
start_backend.bat
```

This script will:
1. Navigate to the backend directory
2. Activate the virtual environment (if exists)
3. Install/update dependencies
4. Start the FastAPI server on port 8000

#### Option C: Start Both (Manual)

Open **two separate terminal windows** and run each script independently.

---

## Configuration

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_GEMINI_API_KEY` | Yes | - | Google Gemini API key for image analysis |
| `VITE_API_URL` | No | `http://localhost:8000` | Backend API base URL |

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key for vision analysis |
| `PRODUCTION_MODE` | No | `false` | When `true`, disables fallback mocks |

### CORS Configuration

The backend is pre-configured to accept requests from:
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:3000`

To add production domains, edit `backend/main.py`:

```python
allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://your-production-domain.com",  # Add this
]
```

---

## Project Structure

```
goldscan-ai/
├── frontend/                    # React + Vite Frontend
│   ├── public/                  # Static assets
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── layout/          # Layout wrappers
│   │   │   └── ui/              # Button, Card, Input components
│   │   ├── pages/               # Route-level pages
│   │   │   ├── LandingPage.jsx
│   │   │   ├── ScanWizard.jsx
│   │   │   ├── ResultsPage.jsx
│   │   │   └── DashboardPage.jsx
│   │   ├── utils/               # Helper functions
│   │   ├── App.jsx              # Main app component
│   │   ├── main.jsx             # Entry point
│   │   └── index.css            # Global styles
│   ├── .env.example             # Environment template
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── postcss.config.js
│
├── backend/                     # FastAPI Backend
│   ├── analyzer.py              # Gemini vision analysis
│   ├── fusion.py                # Bayesian fusion engine
│   ├── weight.py                # Weight estimation algorithms
│   ├── main.py                  # FastAPI application
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Environment template
│   └── .gitignore
│
├── samples/                     # Sample jewelry images (optional)
├── PRD.md                       # Product Requirements Document
├── README.md                    # This file
├── start_frontend.bat           # Windows frontend launcher
└── start_backend.bat            # Windows backend launcher
```

---

## API Documentation

### Backend Endpoints

#### Health Check
```
GET /health
```
Response:
```json
{
  "status": "ok",
  "service": "GoldScan AI",
  "version": "2.0.0"
}
```

#### Analyze Jewelry
```
POST /analyze
Content-Type: multipart/form-data
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File | Yes | Jewelry image (JPEG/PNG/WebP, max 10MB) |
| `jewelry_type` | string | No | Type: ring, bangle, chain, earring, pendant, necklace, coin |
| `declared_karat` | string | No | Purity: "24K (999)", "22K (916)", "18K (750)", "14K (585)" |
| `self_reported_weight` | string | No | Weight in grams |
| `audio_performed` | string | No | "true" if tap test completed |

**Response:**
```json
{
  "jewelryType": "ring",
  "hallmark": "916",
  "surface": "good",
  "plating": "none",
  "coinDetected": true,
  "reasoning": "Detected BIS 916 hallmark...",
  "imageClass": "jewelry",
  "weight": {
    "estimated": "4.2",
    "unit": "grams",
    "method": "volume_with_coin"
  },
  "fusion": {
    "purityEstimate": "22K",
    "confidenceScore": 0.87,
    "riskLevel": "low",
    "loanEligible": true,
    "maxLoanAmount": 12500,
    "flags": []
  },
  "audioPerformed": false
}
```

### Frontend API Integration

The frontend primarily calls Gemini directly for image analysis:

```javascript
// Example: Calling Gemini from frontend
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
        ]
      }]
    })
  }
);
```

---

## Deployment Guide

### Frontend Deployment (Netlify)

#### Step 1: Build for Production

```bash
cd frontend
npm install
npm run build
```

This creates a `dist/` folder with optimized static files.

#### Step 2: Deploy to Netlify

**Option A: Drag & Drop**
1. Go to https://app.netlify.com/drop
2. Drag the `frontend/dist` folder onto the drop zone
3. Your site is live instantly

**Option B: Git Integration**
1. Push code to GitHub
2. Connect repo to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variable: `VITE_GEMINI_API_KEY`

#### Step 3: Configure Environment Variables

In Netlify dashboard → Site settings → Environment variables:
```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel
```

Follow prompts to link to your account. Set environment variables in Vercel dashboard.

### Backend Deployment (Render)

#### Step 1: Prepare Repository

Ensure `backend/requirements.txt` is at root or backend has its own repo.

#### Step 2: Create Web Service on Render

1. Go to https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `goldscan-api`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `backend` (if monorepo)

5. Add Environment Variables:
   ```
   GEMINI_API_KEY=your_key_here
   PRODUCTION_MODE=true
   ```

6. Click "Create Web Service"

#### Step 3: Update Frontend API URL

Update `VITE_API_URL` in your deployed frontend to point to Render URL:
```
VITE_API_URL=https://goldscan-api.onrender.com
```

### Backend Deployment (Railway)

1. Go to https://railway.app/
2. New Project → Deploy from GitHub repo
3. Select your repository
4. Railway auto-detects Python and installs dependencies
5. Add environment variables in Variables tab
6. Generate domain under Settings → Domains

### Post-Deployment Checklist

- [ ] Frontend loads without console errors
- [ ] API key is properly set in environment
- [ ] Image upload works
- [ ] Analysis results display correctly
- [ ] NBFC dashboard shows submissions
- [ ] Mobile responsiveness verified
- [ ] CORS configured for production domain

---

## Demo Flow

### For Hackathon Judges - Complete Walkthrough

#### 1. Landing Page (http://localhost:5173/)

- **What to observe**: Professional UI with feature highlights
- **Key elements**: "How It Works" section, Trust indicators, "Start Gold Scan" CTA
- **Judge note**: Responsive design, modern aesthetics

#### 2. Scan Wizard (http://localhost:5173/scan)

**Step 1: Photo Upload**
- Upload 1-5 jewelry images
- **Tip**: Include a ₹1 coin in one photo for scale calibration
- **What happens**: Image quality validation runs automatically

**Step 2: Tap Test**
- Click "Record Tap Test"
- Tap jewelry on a hard surface 3 times
- **AI Analysis**: Frequency domain analysis detects hollow vs. solid

**Step 3: Declarations**
- Select jewelry type (ring, bangle, chain, etc.)
- Enter declared weight (grams)
- Select declared karat (22K, 18K, etc.)
- **Optional**: Upload purchase bill for OCR extraction

**Step 4: Review**
- Verify all inputs
- Click "Analyze Jewelry"

**Step 5: Analysis**
- Animated progress indicator
- Parallel processing: Vision + Audio + Weight estimation
- **Duration**: 5-15 seconds depending on connection

#### 3. Results Page (http://localhost:5173/result)

**Key Sections:**
- **Purity Estimate**: AI-determined karat with confidence score
- **Weight Analysis**: Estimated vs. declared weight comparison
- **Hallmark Detection**: Extracted BIS marks
- **Surface Assessment**: Plating indicators, wear analysis
- **Loan Eligibility**: Max loan amount based on 75% LTV
- **Risk Flags**: Any detected inconsistencies
- **Purity Distribution Chart**: Recharts visualization

**Action**: Click "Share with NBFC" to submit assessment

#### 4. NBFC Dashboard (http://localhost:5173/dashboard)

**What Judges Should See:**
- New assessment appears at top (ID: #GS-XXXX)
- **Risk Badge**: Color-coded (Green/Yellow/Red)
- **Expand Row**: View detailed AI reasoning
- **Decision Buttons**: Approve / Flag for Verification
- **Audit Trail**: Timestamp, confidence scores, flags

#### 5. Data Flow Verification

1. Open browser DevTools → Application → LocalStorage
2. Observe `goldscan_submissions` key
3. Verify JSON structure with complete assessment data

---

## Screenshots

*To be captured after running locally*

| Screen | URL | What to Capture |
|--------|-----|-----------------|
| Landing | `/` | Hero section, feature grid |
| Scan Wizard | `/scan` | All 5 steps of the wizard |
| Results | `/result` | Complete assessment report |
| Dashboard | `/dashboard` | NBFC interface with sample data |

**Recommended Screenshot Process:**
```bash
# 1. Start the application
npm run dev

# 2. Navigate through each screen
# 3. Use browser dev tools device toggle for mobile screenshots
# 4. Save screenshots to `/screenshots` folder
```

---

## Future Roadmap

### Phase 1: Current (Hackathon MVP)
- Vision analysis with Gemini 1.5 Flash
- Audio tap test analysis
- Basic Bayesian fusion
- Demo-grade NBFC dashboard

### Phase 2: Enhanced AI
- Edge AI for real-time photo quality guidance
- Improved weight estimation with 3D reconstruction
- Multi-language support (Hindi, Tamil, Telugu)

### Phase 3: Production Integration
- Aadhaar-based KYC integration
- Digital signature for loan agreements
- Real-time NBFC LOS (Loan Origination System) APIs

### Phase 4: Advanced Features
- Stone-studded jewelry support
- Temple jewelry complexity handling
- Blockchain-based authenticity verification
- Integration with BIS hallmark database

---

## Troubleshooting

### Common Issues

**1. `npm install` fails**
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**2. Gemini API errors**
- Verify API key is correctly set in `.env`
- Check key has not exceeded quota (free tier: 60 requests/minute)
- Confirm no extra spaces around key value

**3. Backend CORS errors**
- Ensure frontend URL is in `allow_origins` list
- Check backend is running on correct port (8000)

**4. Images not uploading**
- Verify file size is under 10MB
- Supported formats: JPEG, PNG, WebP
- Check browser console for specific error messages

**5. Audio recording fails**
- Grant microphone permissions in browser
- Use HTTPS in production (required for audio API)
- Try refresh and re-grant permissions

### Getting Help

- **Documentation**: This README and PRD.md
- **API Issues**: Check Gemini API status at https://status.google.com/
- **Code Issues**: Review browser console and terminal logs

---

## Team

**ByteRave** — TenzorX 2026 National AI Hackathon

| Role | Responsibility |
|------|---------------|
| Frontend | React, UI/UX, Animations |
| AI/ML | Gemini integration, Fusion engine |
| Backend | FastAPI, Data processing |
| Product | Requirements, Demo flow |

---

## License

This project is built for educational and hackathon demonstration purposes.

---

<p align="center">
  <b>Built with ❤️ for TenzorX 2026</b>
</p>

