"""
Vision Analysis Engine — Gemini 2.5 Flash
Performs high-fidelity multi-point inspection of gold jewelry images:
  - Hallmark OCR (BIS stamps: 916, 750, 999, 585)
  - Plating detection (color inconsistency, wear-through spots)
  - Surface condition and purity estimation

SAFETY CONTRACT:
  - On any Gemini failure in PRODUCTION_MODE → raise RuntimeError (caller returns 502)
  - In dev mode → fall through to safe mock (never returns valid-gold defaults)
  - FALLBACK_VISION_RESULT must NEVER look like passable gold
"""

import asyncio
import logging
import os
import json

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from google import genai
from google.genai import types

# Load .env file so GEMINI_API_KEY is available without manual shell export
load_dotenv()

# Module-level structured logger — replaces bare print() calls
logger = logging.getLogger(__name__)

# Read configuration from environment
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
PRODUCTION_MODE = os.environ.get("PRODUCTION_MODE", "false").lower() == "true"

# Timeout in seconds for a single Gemini API call — prevents worker pool exhaustion
GEMINI_TIMEOUT_SECONDS = 25

# Initialise the Gemini client once at module load (None if key not set)
_genai_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


# ---------------------------------------------------------------------------
# Pydantic schema — defines the structured JSON Gemini must return
# ---------------------------------------------------------------------------

class VisionAnalysisResult(BaseModel):
    """Strict schema for Gemini's jewelry assessment output.
    Using Pydantic here lets us pass the schema directly to the Gemini SDK
    so the model is forced to return well-typed, validated JSON.
    """

    is_gold: bool = Field(
        description="True only if the object is actually gold jewelry. "
                    "False for screenshots, documents, animals, food, fake items."
    )
    is_jewelry: bool = Field(
        description="True only if the image contains an actual piece of jewelry. "
                    "False for screenshots, documents, faces, food, random objects."
    )
    image_class: str = Field(
        description="Exactly one of: 'jewelry', 'screenshot', 'document', "
                    "'face', 'food', 'other'. Never anything else."
    )
    jewelry_type: str = Field(
        description="One of: 'ring', 'bangle', 'chain', 'earring', 'pendant', "
                    "'necklace', 'coin', 'unknown'. Use 'unknown' if not jewelry."
    )
    hallmark_text: str = Field(
        description="Exact text of visible hallmark: '916', '750', '999', '585'. "
                    "Use 'none' if no hallmark visible. Use 'unclear' if a mark "
                    "exists but is unreadable."
    )
    hallmark_confidence: float = Field(
        description="0.0 to 1.0. How confident are you in the hallmark reading? "
                    "Use 0.0 if hallmark_text is 'none'."
    )
    surface_condition: str = Field(
        description="One of: 'good', 'scratched', 'worn', 'damaged', 'unknown'"
    )
    plating_indicators: bool = Field(
        description="True if you can see wear-through, color inconsistency, "
                    "or other indicators of gold plating over base metal."
    )
    plating_confidence: float = Field(
        description="0.0 to 1.0. Confidence that item is plated. "
                    "Use 0.0 if plating_indicators is False."
    )
    color_consistency: str = Field(
        description="One of: 'consistent_22k', 'consistent_18k', "
                    "'consistent_24k', 'inconsistent', 'unknown'"
    )
    hollow_indicators: bool = Field(
        description="True if item appears hollow (thin walls, very light for size)"
    )
    wear_level: str = Field(
        description="One of: 'none', 'light', 'medium', 'heavy'"
    )
    coin_detected: bool = Field(
        description="True if a ₹1 Indian coin is visible in the frame for scale"
    )
    purity_estimate: str = Field(
        description="Your best purity estimate: '24K', '22K', '18K', '14K', "
                    "'plated', 'not_gold', 'unknown'. "
                    "Use 'not_gold' if the item is clearly not gold at all. "
                    "Use 'unknown' if you cannot determine purity."
    )
    purity_confidence: float = Field(
        description="0.0 to 1.0. How confident are you in the purity estimate?"
    )
    surface_analysis_notes: str = Field(
        description="One or two sentences describing what you actually see "
                    "on the surface. Be specific and factual."
    )
    fraud_risk_vision: str = Field(
        description="One of: 'low', 'medium', 'high'. "
                    "High if: not gold, plated, tampered hallmark, "
                    "inconsistent color. Low only if everything checks out."
    )
    reasoning: str = Field(
        description="2-4 sentences. Explain your findings factually. "
                    "If the image is not jewelry, say so clearly. "
                    "Do not hedge — be direct about what you see."
    )


# ---------------------------------------------------------------------------
# Safe fallback — used ONLY in dev mode when Gemini is unavailable
# Intentionally pessimistic: is_gold=False, fraud_risk=high
# This prevents a mocked result from accidentally pre-approving a loan
# ---------------------------------------------------------------------------
SAFE_FALLBACK_VISION_RESULT = {
    "is_gold": False,
    "is_jewelry": False,
    "image_class": "unknown",
    "jewelry_type": "unknown",
    "hallmark_text": "none",
    "hallmark_confidence": 0.0,
    "surface_condition": "unknown",
    "plating_indicators": False,
    "plating_confidence": 0.0,
    "color_consistency": "unknown",
    "hollow_indicators": False,
    "wear_level": "unknown",
    "coin_detected": False,
    "purity_estimate": "unknown",      # NOT '22K' — genuinely unknown
    "purity_confidence": 0.0,          # Zero confidence because it's a fallback
    "surface_analysis_notes": "Analysis unavailable — AI service offline.",
    "fraud_risk_vision": "high",       # Conservative: always flag as high risk
    "reasoning": (
        "Vision analysis service is currently unavailable. "
        "This result cannot be used for loan decisions. "
        "Please retry or proceed to branch verification."
    ),
}

# Development mock for a known-good 22K bangle (used when no API key is set)
DEV_MOCK_RESULT = {
    "is_gold": True,
    "is_jewelry": True,
    "image_class": "jewelry",
    "jewelry_type": "bangle",
    "hallmark_text": "916",
    "hallmark_confidence": 0.75,
    "surface_condition": "good",
    "plating_indicators": False,
    "plating_confidence": 0.05,
    "color_consistency": "consistent_22k",
    "hollow_indicators": False,
    "wear_level": "light",
    "coin_detected": False,
    "purity_estimate": "22K",
    "purity_confidence": 0.78,
    "surface_analysis_notes": "Surface consistent with 22K gold. Hallmark clearly visible.",
    "fraud_risk_vision": "low",
    "reasoning": (
        "[DEV MOCK] Hallmark and surface analysis suggest 22K gold. "
        "No plating indicators detected. This is a development mock result."
    ),
}


# ---------------------------------------------------------------------------
# Prompt sent to Gemini with every image
# ---------------------------------------------------------------------------
GEMINI_PROMPT = """
You are a gold jewelry authentication system for an Indian gold loan NBFC.
Analyze this image and return a structured assessment.

CRITICAL RULES — read carefully before responding:

1. FIRST determine if this is actually a photo of jewelry.
   - If it is a screenshot, document, UI, photo of a phone screen,
     computer screen, or anything that is not a physical jewelry item:
     set is_jewelry=false, is_gold=false, image_class="screenshot"
     or "document" as appropriate.
   - If it is a photo of a person's face, food, animal, or random object:
     set is_jewelry=false, is_gold=false, image_class="other".

2. For actual jewelry images:
   - Look carefully for BIS hallmarks (916, 750, 999, 585).
   - Assess gold color: 22K is deep yellow-orange, 18K is lighter yellow,
     24K is very deep orange-gold.
   - Look for plating indicators: wear-through spots, different color
     underneath scratches, uneven color.
   - If you cannot see a hallmark clearly, set hallmark_text="none"
     or "unclear" — do not guess.

3. CONSISTENCY RULE — your scores must agree with your finding:
   - If purity_estimate="not_gold", fraud_risk_vision must be "high".
   - If is_jewelry=false, set fraud_risk_vision="high".
   - Never give a high purity_confidence AND flag high fraud risk
     at the same time — they contradict each other.

4. Be direct. Do not hedge with phrases like "it could be" or "might be".
   State what you observe.

Respond only with the JSON structure matching the schema.
"""


# ---------------------------------------------------------------------------
# Core analysis function with timeout + exponential-backoff retry
# ---------------------------------------------------------------------------

# Retry on transient network/rate-limit errors: up to 3 attempts, 1s→4s→16s backoff
@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=16),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def _call_gemini_with_retry(image_bytes: bytes, mime_type: str) -> dict:
    """
    Makes a single Gemini API call wrapped in a 25-second timeout.
    The @retry decorator above will re-call this on failure (429, 503, etc.)
    up to 3 times with exponential backoff.
    """
    # asyncio.wait_for raises asyncio.TimeoutError if Gemini is too slow
    response = await asyncio.wait_for(
        asyncio.get_event_loop().run_in_executor(
            None,  # Use default thread pool for the blocking SDK call
            lambda: _genai_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    GEMINI_PROMPT,
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=VisionAnalysisResult,
                    temperature=0.1,   # Low temperature = deterministic, factual responses
                ),
            )
        ),
        timeout=GEMINI_TIMEOUT_SECONDS,
    )
    return json.loads(response.text)


async def analyze_image(image_bytes: bytes, mime_type: str, filename: str) -> dict:
    """
    Public entry point for vision analysis.
    Returns a validated vision result dict.
    - In PRODUCTION_MODE: raises RuntimeError if Gemini is unavailable (caller sends 502)
    - In dev mode: falls through to a safe conservative mock
    """

    if GEMINI_API_KEY and _genai_client:
        try:
            raw = await _call_gemini_with_retry(image_bytes, mime_type)
            validated = _validate_and_fix_vision_result(raw)
            logger.info("Gemini analysis complete: jewelry=%s purity=%s risk=%s",
                        validated.get("jewelry_type"),
                        validated.get("purity_estimate"),
                        validated.get("fraud_risk_vision"))
            return validated

        except asyncio.TimeoutError:
            logger.error("Gemini API timed out after %ds", GEMINI_TIMEOUT_SECONDS)
            if PRODUCTION_MODE:
                raise RuntimeError("Vision analysis timed out. Please retry.")

        except Exception as exc:
            logger.error("Gemini API failed: %s: %s", type(exc).__name__, exc)
            if PRODUCTION_MODE:
                raise RuntimeError(f"Vision analysis unavailable: {exc}")

    # ── DEV FALLBACK ────────────────────────────────────────────────────
    if PRODUCTION_MODE:
        # Production with no API key is a config error — fail loudly
        raise RuntimeError("GEMINI_API_KEY not set in production mode.")

    logger.warning("Using development mock vision result (no API key or Gemini unreachable).")

    lowered = (filename or "").lower()

    # Detect screenshots/documents by filename — returns safe (high-risk) result
    if any(term in lowered for term in ["screenshot", "screen", "capture", "snap",
                                         "document", "doc", "pdf", "ui", "app"]):
        return {
            **SAFE_FALLBACK_VISION_RESULT,
            "image_class": "screenshot",
            "reasoning": "[DEV MOCK] Filename suggests this is a screenshot, not jewelry.",
        }

    # Non-gold object detection by filename keyword
    if any(term in lowered for term in ["dog", "cat", "person", "food", "fake", "not_gold", "random"]):
        return {
            **SAFE_FALLBACK_VISION_RESULT,
            "is_jewelry": True,
            "image_class": "jewelry",
            "jewelry_type": "unknown",
            "purity_estimate": "not_gold",
            "fraud_risk_vision": "high",
            "reasoning": "[DEV MOCK] Filename suggests non-gold or fake item.",
        }

    # Plated item detection by filename keyword
    if any(term in lowered for term in ["plated", "brass", "fake_gold"]):
        return {
            **DEV_MOCK_RESULT,
            "plating_indicators": True,
            "plating_confidence": 0.75,
            "color_consistency": "inconsistent",
            "purity_estimate": "plated",
            "purity_confidence": 0.70,
            "fraud_risk_vision": "high",
            "reasoning": "[DEV MOCK] Filename suggests plated item.",
        }

    # Default dev mock: 22K bangle with optional type from filename
    result = dict(DEV_MOCK_RESULT)
    for jtype in ["ring", "bangle", "chain", "earring", "pendant", "necklace", "coin"]:
        if jtype in lowered:
            result["jewelry_type"] = jtype
            break

    return result


# ---------------------------------------------------------------------------
# Post-processing: enforce business rules that Gemini might violate
# ---------------------------------------------------------------------------

def _validate_and_fix_vision_result(raw: dict) -> dict:
    """
    Applies consistency rules to Gemini's output.
    Gemini can occasionally return contradictory values (e.g. high purity confidence
    AND high fraud risk). This function catches and corrects them before they
    reach the fusion engine.
    """

    result = dict(raw)

    # Rule 1: Non-jewelry images → force all gold-related fields to safe defaults
    if not result.get("is_jewelry", True):
        result["fraud_risk_vision"] = "high"
        result["is_gold"] = False
        result["purity_estimate"] = "not_gold"
        result["purity_confidence"] = min(result.get("purity_confidence", 0.9), 0.20)
        result["hallmark_text"] = "none"
        result["hallmark_confidence"] = 0.0

    # Rule 2: not_gold purity → ensure is_gold=False and high fraud risk
    if result.get("purity_estimate") == "not_gold":
        result["is_gold"] = False
        result["fraud_risk_vision"] = "high"

    # Rule 3: Plating with >50% confidence → escalate fraud risk from 'low' to at least 'medium'
    if result.get("plating_indicators") and result.get("plating_confidence", 0) > 0.5:
        if result.get("fraud_risk_vision") == "low":
            result["fraud_risk_vision"] = "medium"

    # Rule 4: No readable hallmark → zero out hallmark confidence to avoid false signals
    if result.get("hallmark_text") in ("none", "unclear", None):
        result["hallmark_confidence"] = 0.0

    # Rule 5: Clamp all confidence floats to [0.0, 1.0] — model sometimes returns 1.1 etc.
    for float_field in ["hallmark_confidence", "plating_confidence", "purity_confidence"]:
        val = result.get(float_field, 0.0)
        result[float_field] = max(0.0, min(1.0, float(val)))

    # Rule 6: Validate image_class enum value
    valid_classes = {"jewelry", "screenshot", "document", "face", "food", "other"}
    if result.get("image_class") not in valid_classes:
        result["image_class"] = "other"
        result["is_jewelry"] = False

    return result
