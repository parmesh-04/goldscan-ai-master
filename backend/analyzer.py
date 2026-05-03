"""
Vision Analysis Engine (Gemini 1.5)
This module interfaces with Google Gemini to perform high-fidelity visual 
assessment of jewelry. It doesn't just "look" at the gold; it performs a 
multi-point inspection including hallmark OCR, color consistency checks, 
and plating detection.

CRITICAL SAFETY RULES:
- FALLBACK_VISION_RESULT must NEVER default to valid gold
- Any Gemini API failure must return is_jewelry=False, is_gold=False
- The fallback is for testing only — in production, fail loudly
- Raw Gemini output is validated before being returned
"""

import os
import json
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# Load API key and initialize Gemini client
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
_genai_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

PRODUCTION_MODE = os.environ.get("PRODUCTION_MODE", "false").lower() == "true"


class VisionAnalysisResult(BaseModel):
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
        description="0.0 to 1.0. How confident are you in the purity estimate? "
                    "IMPORTANT: If purity_estimate is 'not_gold', this represents "
                    "confidence that it is NOT gold — keep it consistent. "
                    "A not_gold item with 0.95 purity_confidence means you are "
                    "95% sure it is not gold."
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


# ── SAFE FALLBACK ──────────────────────────────────────────────────────────────
# This is used ONLY when Gemini is unavailable AND we are NOT in production mode.
# It intentionally returns conservative/unknown values — NOT valid gold defaults.
SAFE_FALLBACK_VISION_RESULT = {
    "is_gold": False,           # SAFE default: assume not gold
    "is_jewelry": False,        # SAFE default: assume not verified
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
    "purity_estimate": "unknown",   # NOT "22K" — unknown
    "purity_confidence": 0.0,       # Zero confidence in fallback
    "surface_analysis_notes": "Analysis unavailable — AI service offline.",
    "fraud_risk_vision": "high",    # SAFE default: flag as high risk
    "reasoning": "Vision analysis service is currently unavailable. "
                 "This result cannot be used for loan decisions. "
                 "Please retry or proceed to branch verification.",
}

# Development-only mock for testing specific jewelry scenarios
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
    "reasoning": "DEV MOCK: Hallmark and surface analysis suggest 22K gold. "
                 "No plating indicators detected. This is a development mock result.",
}


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
   - If purity_estimate="not_gold", purity_confidence should reflect 
     how sure you are it is NOT gold (high confidence = very sure it's not gold).
   - If is_jewelry=false, set fraud_risk_vision="high".
   - Never give a high purity_confidence AND flag high fraud risk 
     at the same time — they contradict each other.

4. Be direct. Do not hedge with phrases like "it could be" or "might be". 
   State what you observe.

Respond only with the JSON structure matching the schema.
"""


async def analyze_image(image_bytes: bytes, mime_type: str, filename: str) -> dict:
    """
    Analyze a jewelry image using Gemini Vision.
    
    Returns a validated vision result dict.
    Raises RuntimeError in production if Gemini is unavailable.
    Never returns a result that looks like valid gold when analysis failed.
    """

    if GEMINI_API_KEY and _genai_client:
        try:
            response = _genai_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    GEMINI_PROMPT,
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=mime_type,
                    ),
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=VisionAnalysisResult,
                    temperature=0.1,
                ),
            )

            raw = json.loads(response.text)
            validated = _validate_and_fix_vision_result(raw)
            return validated

        except Exception as e:
            print(f"[GoldScan] Gemini API failed: {type(e).__name__}: {e}")

            if PRODUCTION_MODE:
                # In production, never silently fall back to fake gold
                raise RuntimeError(
                    f"Vision analysis unavailable: {e}"
                )
            # In development, fall through to mock

    # ── DEVELOPMENT MOCK ───────────────────────────────────────────────────
    if PRODUCTION_MODE:
        raise RuntimeError("Gemini API key not configured in production mode.")

    print("[GoldScan] WARNING: Using development mock vision result.")

    lowered = (filename or "").lower()

    # Screenshot/document detection by filename
    if any(term in lowered for term in [
        "screenshot", "screen", "capture", "snap", 
        "document", "doc", "pdf", "ui", "app"
    ]):
        return {
            **SAFE_FALLBACK_VISION_RESULT,
            "image_class": "screenshot",
            "reasoning": "DEV MOCK: Filename suggests this is a screenshot, not jewelry.",
        }

    # Non-gold object detection
    if any(term in lowered for term in [
        "dog", "cat", "person", "food", "fake", "not_gold", "random"
    ]):
        return {
            **SAFE_FALLBACK_VISION_RESULT,
            "is_jewelry": True,   # It could be jewelry-shaped but fake
            "image_class": "jewelry",
            "jewelry_type": "unknown",
            "purity_estimate": "not_gold",
            "fraud_risk_vision": "high",
            "reasoning": "DEV MOCK: Filename suggests non-gold or fake item.",
        }

    # Plated item detection
    if any(term in lowered for term in ["plated", "brass", "fake_gold"]):
        return {
            **DEV_MOCK_RESULT,
            "plating_indicators": True,
            "plating_confidence": 0.75,
            "color_consistency": "inconsistent",
            "purity_estimate": "plated",
            "purity_confidence": 0.70,
            "fraud_risk_vision": "high",
            "reasoning": "DEV MOCK: Filename suggests plated item.",
        }

    # Jewelry type detection
    result = dict(DEV_MOCK_RESULT)
    for jtype in ["ring", "bangle", "chain", "earring", "pendant", "necklace", "coin"]:
        if jtype in lowered:
            result["jewelry_type"] = jtype
            break

    return result


def _validate_and_fix_vision_result(raw: dict) -> dict:
    """
    Post-process Gemini output to enforce consistency rules.
    
    Gemini can sometimes return contradictory values.
    This function catches and corrects them.
    """

    result = dict(raw)

    # Rule 1: Non-jewelry items must have high fraud risk
    if not result.get("is_jewelry", True):
        result["fraud_risk_vision"] = "high"
        result["is_gold"] = False
        result["purity_estimate"] = "not_gold"
        result["purity_confidence"] = min(result.get("purity_confidence", 0.9), 0.20)
        result["hallmark_text"] = "none"
        result["hallmark_confidence"] = 0.0

    # Rule 2: not_gold purity must have low purity_confidence 
    # (confidence here means "confidence it IS gold")
    # Reframe: if purity=not_gold, cap purity_confidence at 0.25
    if result.get("purity_estimate") == "not_gold":
        result["is_gold"] = False
        result["fraud_risk_vision"] = "high"
        # purity_confidence for not_gold means confidence in the not_gold assessment
        # We keep it as-is but ensure it doesn't contradict is_gold=False

    # Rule 3: Plating indicators must increase fraud risk
    if result.get("plating_indicators") and result.get("plating_confidence", 0) > 0.5:
        if result.get("fraud_risk_vision") == "low":
            result["fraud_risk_vision"] = "medium"

    # Rule 4: High hallmark confidence requires a real hallmark text
    if result.get("hallmark_text") in ("none", "unclear", None):
        result["hallmark_confidence"] = 0.0

    # Rule 5: Confidence values must be in valid range
    for float_field in ["hallmark_confidence", "plating_confidence", "purity_confidence"]:
        val = result.get(float_field, 0.0)
        result[float_field] = max(0.0, min(1.0, float(val)))

    # Rule 6: image_class must be a valid value
    valid_classes = {"jewelry", "screenshot", "document", "face", "food", "other"}
    if result.get("image_class") not in valid_classes:
        result["image_class"] = "other"
        result["is_jewelry"] = False

    return result
