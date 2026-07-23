"""
GoldScan AI Backend — FastAPI Core

This is the single entry point for all API requests.
It coordinates:
  1. Input validation (file type, size, declared fields)
  2. Vision analysis via Gemini 2.5 Flash (analyzer.py)
  3. Weight estimation (weight.py)
  4. Bayesian risk fusion (fusion.py)
  5. SQLite persistence (database.py)

Environment variables (see .env.example):
  GEMINI_API_KEY       — required for real vision analysis
  PRODUCTION_MODE      — 'true' disables all dev mocks
  DATABASE_URL         — SQLite file path (default: ./goldscan.db)
  ALLOWED_ORIGINS      — comma-separated list of allowed CORS origins
  LOG_LEVEL            — Python logging level (default: INFO)
"""

import logging
import os
import traceback
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from analyzer import analyze_image
from database import delete_submission, get_submissions, init_db, mark_reviewed, save_submission
from fusion import run_fusion_engine
from weight import estimate_weight

# Load .env file first so all os.environ.get() calls below find the values
load_dotenv()

# Configure structured logging for the whole app
log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# App lifecycle — run DB initialisation exactly once on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan: initialises the SQLite database schema before
    accepting requests, and cleans up on shutdown.
    """
    logger.info("GoldScan AI starting up...")
    await init_db()   # Creates tables if they don't exist
    yield
    logger.info("GoldScan AI shutting down.")


# ---------------------------------------------------------------------------
# App instance and CORS
# ---------------------------------------------------------------------------

app = FastAPI(
    title="GoldScan AI Backend",
    version="2.0.0",
    description="Multi-modal AI system for gold jewelry pre-screening",
    lifespan=lifespan,
)

# Read allowed origins from env — never hardcode production domains in code
_raw_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Input validation constants
# ---------------------------------------------------------------------------

VALID_JEWELRY_TYPES = {
    "ring", "bangle", "chain", "earring",
    "pendant", "necklace", "coin", "unknown"
}
VALID_KARAT_DECLARATIONS = {
    "24K (999)", "22K (916)", "18K (750)",
    "14K (585)", "unknown", ""
}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024   # 10 MB hard limit
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


# ---------------------------------------------------------------------------
# Pydantic models for request/response documentation and validation
# ---------------------------------------------------------------------------

class SubmissionSaveRequest(BaseModel):
    """Body sent from frontend after a completed analysis — saves to DB."""
    applicantName: str = Field(default="", max_length=100)
    location: str = Field(default="", max_length=100)
    notes: str = Field(default="", max_length=500)
    resultJson: dict = Field(description="Full analysis result object")


class HealthResponse(BaseModel):
    """Response shape for the /health endpoint."""
    status: str
    service: str
    version: str
    database: str
    gemini_configured: bool


# ---------------------------------------------------------------------------
# Middleware: attach a unique request ID to every log line
# ---------------------------------------------------------------------------

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """
    Injects a unique X-Request-ID header into every response.
    This lets us correlate frontend errors with backend log entries.
    """
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    logger.info("→ %s %s [req:%s]", request.method, request.url.path, request_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health():
    """
    Health check endpoint — verifies DB connectivity and Gemini configuration.
    Suitable for Docker health-check and uptime monitoring.
    """
    from analyzer import GEMINI_API_KEY

    # Check DB is reachable by running a trivial query
    db_status = "ok"
    try:
        await get_submissions(limit=1)
    except Exception as exc:
        db_status = f"error: {exc}"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "service": "GoldScan AI",
        "version": "2.0.0",
        "database": db_status,
        "gemini_configured": bool(GEMINI_API_KEY),
    }


# ---------------------------------------------------------------------------
# Main analysis endpoint
# ---------------------------------------------------------------------------

@app.post("/analyze", tags=["Analysis"])
async def analyze(
    request: Request,
    image: UploadFile = File(..., description="Jewelry photo (JPEG/PNG/WebP)"),
    jewelry_type: str = Form("unknown"),
    declared_karat: str = Form(""),
    self_reported_weight: str = Form(""),
    audio_performed: str = Form("false"),
):
    """
    Primary assessment endpoint: accepts a jewelry photo and metadata,
    runs Gemini vision + Bayesian fusion, and returns the full risk report.

    Steps:
      1. Validate image (type, size)
      2. Sanitize form fields
      3. Call Gemini 2.5 Flash vision analysis
      4. Estimate weight using jewelry-type profile
      5. Run Bayesian fusion engine
      6. Return structured assessment
    """
    req_id = getattr(request.state, "request_id", "?")

    # ── Step 1: MIME type validation ──────────────────────────────────────
    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "INVALID_FILE_TYPE",
                "message": (
                    f"File type '{image.content_type}' is not supported. "
                    "Please upload a JPEG, PNG, or WebP image."
                ),
            }
        )

    # ── Step 2: Read and size-check the image ────────────────────────────
    image_bytes = await image.read()

    if len(image_bytes) < 1000:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "FILE_TOO_SMALL",
                "message": "Image file is too small. Please upload a clear photo (min 1 KB).",
            }
        )
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "FILE_TOO_LARGE",
                "message": "Image must be under 10 MB. Please compress and retry.",
            }
        )

    # ── Step 3: Sanitize form fields ────────────────────────────────────
    # Reject unknown jewelry types silently — don't trust raw frontend strings
    jewelry_type_clean = jewelry_type.lower().strip()
    if jewelry_type_clean not in VALID_JEWELRY_TYPES:
        jewelry_type_clean = "unknown"

    declared_karat_clean = declared_karat.strip()
    if declared_karat_clean not in VALID_KARAT_DECLARATIONS:
        declared_karat_clean = ""

    # Validate self-reported weight is a positive number in plausible range
    weight_clean = ""
    if self_reported_weight.strip():
        try:
            w = float(self_reported_weight.strip())
            if 0 < w <= 500:   # 500g is an extreme upper bound for wearable jewelry
                weight_clean = str(round(w, 2))
        except ValueError:
            pass   # Invalid weight — ignore it, don't crash

    audio_was_performed = audio_performed.lower() in ("true", "1", "yes")

    declarations = {
        "jewelryType": jewelry_type_clean,
        "declaredKarat": declared_karat_clean,
        "selfReportedWeight": weight_clean,
    }

    # ── Step 4: Gemini vision analysis ──────────────────────────────────
    logger.info("Starting vision analysis [req:%s] type=%s", req_id, jewelry_type_clean)
    try:
        vision = await analyze_image(
            image_bytes,
            image.content_type,
            image.filename or "upload.jpg"
        )
    except Exception as exc:
        logger.error("Vision analysis failed [req:%s]: %s", req_id, exc)
        raise HTTPException(
            status_code=502,
            detail={
                "error": "VISION_ANALYSIS_FAILED",
                "message": "Image analysis service is temporarily unavailable. Please try again in a moment.",
            }
        )

    # ── Step 5: Weight estimation ────────────────────────────────────────
    # Use vision's detected jewelry type if it's more specific than user's declaration
    effective_type = (
        vision.get("jewelry_type", jewelry_type_clean)
        if vision.get("jewelry_type") not in (None, "unknown")
        else jewelry_type_clean
    )

    weight = estimate_weight(
        jewelry_type=effective_type,
        purity_estimate=vision.get("purity_estimate", "unknown"),
        coin_detected=vision.get("coin_detected", False),
        declared_weight=weight_clean,
        is_jewelry=vision.get("is_jewelry", True),
    )

    # ── Step 6: Bayesian fusion ──────────────────────────────────────────
    # Audio signal comes from the frontend (recorded before this API call)
    # The backend receives it as a JSON blob in the audio_result parameter
    # (currently None — the frontend sends audio results alongside the analysis)
    audio = None

    logger.info("Running fusion engine [req:%s]", req_id)
    try:
        fusion = run_fusion_engine(vision, audio, weight, declarations)
    except Exception as exc:
        logger.error("Fusion engine failed [req:%s]: %s", req_id, exc)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "FUSION_ENGINE_FAILED",
                "message": "Risk assessment failed internally. Please try again.",
            }
        )

    logger.info(
        "Analysis complete [req:%s]: decision=%s risk=%s purity=%s",
        req_id, fusion.get("loanDecision"), fusion.get("riskLevel"), fusion.get("finalPurity")
    )

    # ── Response — expose only what the frontend legitimately needs ──────
    return {
        "jewelryType": vision.get("jewelry_type", "unknown"),
        "hallmark": vision.get("hallmark_text", "none"),
        "surface": vision.get("surface_condition", "unknown"),
        "plating": "detected" if vision.get("plating_indicators") else "none",
        "coinDetected": vision.get("coin_detected", False),
        "reasoning": vision.get("reasoning", ""),
        "imageClass": vision.get("image_class", "jewelry"),
        "weight": weight,
        "fusion": fusion,
        "audioPerformed": audio_was_performed,
    }


# ---------------------------------------------------------------------------
# Submission persistence endpoints (replaces frontend LocalStorage)
# ---------------------------------------------------------------------------

@app.post("/submissions", tags=["Submissions"])
async def create_submission(body: SubmissionSaveRequest):
    """
    Persists a completed assessment to the database.
    Called by the frontend after the user taps 'Share with NBFC'.
    Returns the server-generated submission ID and short app ID.
    """
    try:
        result_with_meta = {
            **body.resultJson,
            "declarations": {
                "applicantName": body.applicantName,
                "location": body.location,
                "notes": body.notes,
            },
        }
        submission_id, app_id = await save_submission(result_with_meta)
        return {"id": submission_id, "appId": app_id}
    except Exception as exc:
        logger.error("Failed to save submission: %s", exc)
        raise HTTPException(status_code=500, detail={"error": "SAVE_FAILED", "message": str(exc)})


@app.get("/submissions", tags=["Submissions"])
async def list_submissions(limit: int = 50):
    """
    Returns recent submissions for the NBFC loan officer dashboard.
    Results are ordered newest-first.
    """
    try:
        return await get_submissions(limit=limit)
    except Exception as exc:
        logger.error("Failed to fetch submissions: %s", exc)
        raise HTTPException(status_code=500, detail={"error": "FETCH_FAILED", "message": str(exc)})


@app.delete("/submissions/{submission_id}", tags=["Submissions"])
async def remove_submission(submission_id: str):
    """
    Deletes a submission by ID. Used by loan officers to clear processed applications.
    """
    deleted = await delete_submission(submission_id)
    if not deleted:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Submission not found."})
    return {"deleted": True}


@app.post("/submissions/{submission_id}/review", tags=["Submissions"])
async def review_submission(submission_id: str):
    """
    Marks a submission as reviewed by a loan officer.
    """
    updated = await mark_reviewed(submission_id)
    if not updated:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Submission not found."})
    return {"reviewed": True}


# ---------------------------------------------------------------------------
# Global error handler — never expose raw stack traces to the client
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Safety net: catches any unhandled exception and returns a clean JSON 500.
    Logs the full traceback server-side for debugging.
    """
    req_id = getattr(request.state, "request_id", "?")
    logger.error("Unhandled exception [req:%s]: %s", req_id, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please try again.",
            "requestId": req_id,   # Lets the user report this ID for support
        },
    )
