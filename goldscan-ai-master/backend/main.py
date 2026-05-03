import traceback
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from analyzer import analyze_image
from fusion import run_fusion_engine
from weight import estimate_weight

app = FastAPI(title="GoldScan AI Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        # Add your production domain here:
        # "https://yourdomain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Valid options — never trust raw frontend strings
VALID_JEWELRY_TYPES = {
    "ring", "bangle", "chain", "earring", 
    "pendant", "necklace", "coin", "unknown"
}
VALID_KARAT_DECLARATIONS = {
    "24K (999)", "22K (916)", "18K (750)", 
    "14K (585)", "unknown", ""
}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "GoldScan AI", "version": "2.0.0"}


@app.post("/analyze")
async def analyze(
    image: UploadFile = File(...),
    jewelry_type: str = Form("unknown"),
    declared_karat: str = Form(""),
    self_reported_weight: str = Form(""),
    audio_performed: str = Form("false"),  # Frontend must explicitly say if audio was done
):
    # ── INPUT VALIDATION ──────────────────────────────────

    # 1. MIME type check
    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "INVALID_FILE_TYPE",
                "message": f"File type '{image.content_type}' not supported. "
                           f"Upload a JPEG, PNG, or WebP image.",
            }
        )

    # 2. Read and size-check image
    image_bytes = await image.read()
    if len(image_bytes) < 1000:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "FILE_TOO_SMALL",
                "message": "Image file is too small. Please upload a clear photo.",
            }
        )
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "FILE_TOO_LARGE",
                "message": "Image must be under 10MB.",
            }
        )

    # 3. Sanitize jewelry_type — reject unknown values
    jewelry_type_clean = jewelry_type.lower().strip()
    if jewelry_type_clean not in VALID_JEWELRY_TYPES:
        jewelry_type_clean = "unknown"

    # 4. Sanitize declared_karat
    declared_karat_clean = declared_karat.strip()
    if declared_karat_clean not in VALID_KARAT_DECLARATIONS:
        declared_karat_clean = ""

    # 5. Sanitize and validate self_reported_weight
    weight_clean = ""
    if self_reported_weight.strip():
        try:
            w = float(self_reported_weight.strip())
            if w <= 0 or w > 500:
                # 500g is an extreme upper bound for any wearable jewelry
                raise ValueError("Weight out of plausible range")
            weight_clean = str(round(w, 2))
        except ValueError:
            # Invalid weight — just ignore it, don't crash
            weight_clean = ""

    # 6. Parse audio_performed flag
    audio_was_performed = audio_performed.lower() in ("true", "1", "yes")

    # ── DECLARATIONS OBJECT ───────────────────────────────
    declarations = {
        "jewelryType": jewelry_type_clean,
        "declaredKarat": declared_karat_clean,
        "selfReportedWeight": weight_clean,
    }

    # ── VISION ANALYSIS ───────────────────────────────────
    try:
        vision = await analyze_image(
            image_bytes, 
            image.content_type, 
            image.filename or "upload.jpg"
        )
    except Exception as e:
        traceback.print_exc()
        # CRITICAL: Never fall through to fusion with a faked vision result
        # Return a safe explicit error instead
        raise HTTPException(
            status_code=502,
            detail={
                "error": "VISION_ANALYSIS_FAILED",
                "message": "Image analysis service unavailable. Please try again.",
            }
        )

    # ── AUDIO RESULT ──────────────────────────────────────
    # Audio is None unless the frontend explicitly confirmed it was performed
    # and provided results. We never fake an audio score.
    audio = None
    # Future: if audio file is submitted as a second UploadFile,
    # process it here and set audio = audio_analysis_result

    # ── WEIGHT ESTIMATION ─────────────────────────────────
    # Use vision's jewelry_type if it's more specific than the declared type
    vision_jewelry_type = vision.get("jewelry_type", jewelry_type_clean)
    effective_jewelry_type = (
        vision_jewelry_type 
        if vision_jewelry_type != "unknown" 
        else jewelry_type_clean
    )

    weight = estimate_weight(
        jewelry_type=effective_jewelry_type,
        purity_estimate=vision.get("purity_estimate", "unknown"),
        coin_detected=vision.get("coin_detected", False),
        declared_weight=weight_clean,
        is_jewelry=vision.get("is_jewelry", True),
    )

    # ── FUSION ENGINE ─────────────────────────────────────
    try:
        fusion = run_fusion_engine(vision, audio, weight, declarations)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={
                "error": "FUSION_ENGINE_FAILED",
                "message": "Risk assessment failed. Please try again.",
            }
        )

    # ── RESPONSE ──────────────────────────────────────────
    # IMPORTANT: Never expose raw vision internals to frontend
    # Only return what the frontend legitimately needs to display
    return {
        # Curated vision fields — not the raw dump
        "jewelryType": vision.get("jewelry_type", "unknown"),
        "hallmark": vision.get("hallmark_text", "none"),
        "surface": vision.get("surface_condition", "unknown"),
        "plating": "detected" if vision.get("plating_indicators") else "none",
        "coinDetected": vision.get("coin_detected", False),
        "reasoning": vision.get("reasoning", ""),
        "imageClass": vision.get("image_class", "jewelry"),

        # Weight result
        "weight": weight,

        # Fusion result — the authoritative output
        "fusion": fusion,

        # Explicitly tell frontend whether audio was part of this analysis
        "audioPerformed": audio_was_performed,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Catch-all: never let an unhandled exception expose stack traces
    or cause the frontend to receive a non-JSON 500 response.
    """
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please try again.",
        }
    )
