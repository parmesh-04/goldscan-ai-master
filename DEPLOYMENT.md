# GoldScan AI — Deployment Guide

## Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Python | 3.11+ | Backend |
| Node.js | 20+ | Frontend |
| Docker + Compose | 24+ | Docker deployment (optional) |
| Gemini API key | — | Real vision analysis |

---

## Option A: Local Development (No Docker)

### 1. Clone and configure

```bash
git clone https://github.com/your-handle/goldscan-ai.git
cd goldscan-ai
```

**Backend `.env`:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set GEMINI_API_KEY
```

**Frontend `.env`:**
```bash
cp frontend/.env.example frontend/.env
# VITE_API_URL=http://localhost:8000 is already set
```

### 2. Start backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

### 3. Start frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

---

## Option B: Docker Compose (Recommended for Demo)

```bash
# 1. Set your API key
cp backend/.env.example backend/.env
# Edit backend/.env: GEMINI_API_KEY=your_key_here

# 2. Create the data directory (for SQLite persistence)
mkdir -p data

# 3. Build and start
docker-compose up --build

# App will be available at http://localhost:5173
# API at http://localhost:8000
```

**Stopping:**
```bash
docker-compose down
```

**Database is persisted** in `./data/goldscan.db` — survives container restarts.

---

## Option C: Cloud Deployment (Render + Vercel)

### Backend → Render (Free tier available)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. Set:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables in Render dashboard:
   ```
   GEMINI_API_KEY=your_key
   PRODUCTION_MODE=true
   LOG_LEVEL=INFO
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   DATABASE_URL=./goldscan.db
   ```
5. Deploy → note the URL (e.g. `https://goldscan-api.onrender.com`)

> **Note:** Render free tier spins down after 15 min of inactivity.  
> The first request after sleeping takes ~15 seconds. Acceptable for demo.

### Frontend → Vercel (Free)

1. Go to [vercel.com](https://vercel.com) → **Import Project**
2. Connect your GitHub repo
3. Set:
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Add environment variable:
   ```
   VITE_API_URL=https://goldscan-api.onrender.com
   ```
5. Deploy → Vercel gives you a free `.vercel.app` URL

---

## Running Tests

```bash
# Backend tests (41 tests)
cd backend
pip install pytest httpx
python -m pytest tests/ -v

# Expected: 41 passed, 0 failed
```

---

## Health Check

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "GoldScan AI",
  "version": "2.0.0",
  "database": "ok",
  "gemini_configured": true
}
```

---

## Security Notes

- **GEMINI_API_KEY** must only be in `backend/.env` — never in `frontend/.env`
- The frontend JS bundle does **not** contain any AI API keys (verified with `grep GEMINI frontend/dist/assets/*.js`)
- CORS is locked to `ALLOWED_ORIGINS` — wildcard `*` is disabled
- All images are processed in memory and not written to disk
- SQLite database contains applicant names and assessment results — handle per data protection requirements
