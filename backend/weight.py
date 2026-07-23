"""
Geometric Weight Estimation & Plausibility Engine

Estimates gold weight without a physical scale using:
  1. Jewelry-type profile ranges (min/mid/max grams — derived from industry data)
  2. Purity-based density (higher karat = denser = heavier for same volume)
  3. Anchor-based refinement when the customer provides a declared weight
  4. Coin-detected flag tightens the uncertainty band (±12% vs ±22%)

Density values match PRD exactly:
  24K: 19.32 g/cm³ | 22K: 17.73 | 18K: 15.58 | Plated: 8.50
"""

# Expected weight ranges per jewelry type (grams)
# Source: industry auction/appraisal averages for Indian market
WEIGHT_RANGES = {
    "ring":     {"min": 2,  "mid": 5,   "max": 12,  "plausible_max": 20},
    "bangle":   {"min": 10, "mid": 22,  "max": 45,  "plausible_max": 80},
    "chain":    {"min": 5,  "mid": 14,  "max": 30,  "plausible_max": 60},
    "earring":  {"min": 1,  "mid": 4,   "max": 10,  "plausible_max": 20},
    "pendant":  {"min": 2,  "mid": 5,   "max": 12,  "plausible_max": 25},
    "necklace": {"min": 15, "mid": 30,  "max": 60,  "plausible_max": 100},
    "coin":     {"min": 8,  "mid": 10,  "max": 12,  "plausible_max": 35},
    "unknown":  {"min": 3,  "mid": 10,  "max": 30,  "plausible_max": 100},
}

# Exact PRD density values (g/cm³) — do not round these
PURITY_DENSITY = {
    "24K":      19.32,
    "22K":      17.73,
    "18K":      15.58,
    "14K":      13.07,
    "plated":   8.50,
    "unknown":  15.00,   # Conservative mid-point when purity is unverified
    "not_gold": 8.00,    # Approximate base metal (brass/copper) density
}


def estimate_weight(
    jewelry_type: str,
    purity_estimate: str,
    coin_detected: bool,
    declared_weight=None,
    is_jewelry: bool = True,
) -> dict | None:
    """
    Estimate the weight of a piece of jewelry.

    Returns a dict with keys: min, mid, max, confidence, method, density.
    Returns None if the item is not jewelry (caller must handle this case).
    """

    # Non-jewelry items have no estimable weight → fusion engine gets None
    if not is_jewelry:
        return None

    jtype = (jewelry_type or "unknown").lower().strip()
    base = WEIGHT_RANGES.get(jtype, WEIGHT_RANGES["unknown"])
    density = PURITY_DENSITY.get(purity_estimate, PURITY_DENSITY["unknown"])

    # Coin in frame gives us a pixel-to-mm scale reference → tighter bounds
    if coin_detected:
        uncertainty = 0.12        # ±12% uncertainty band (PRD spec)
        base_confidence = 0.72
    else:
        uncertainty = 0.22        # ±22% uncertainty without scale reference (PRD spec)
        base_confidence = 0.52

    # Parse declared weight from the customer's self-report
    anchor = _parse_weight(declared_weight)

    if anchor is not None:
        # ── Declaration-anchored mode ──────────────────────────────────
        # Validate that the declared weight is physically plausible
        plausible_max = base["plausible_max"]
        plausible_min = base["min"] * 0.5   # Allow some slack for very delicate items

        if anchor > plausible_max:
            # Declaration is implausibly heavy — reject it and use type-based estimate
            return {
                "min": base["min"],
                "mid": base["mid"],
                "max": base["max"],
                "confidence": round(base_confidence * 0.7, 3),
                "method": "type-based-declaration-rejected",
                "density": density,
                "warning": (
                    f"Declared weight {anchor}g is implausibly high for a {jtype}. "
                    "Using type-based estimate instead."
                ),
                "declaredWeight": anchor,
            }

        if anchor < plausible_min:
            # Unusually light → item may be hollow; note the warning
            return {
                "min": round(anchor * 0.8, 1),
                "mid": round(anchor, 1),
                "max": round(anchor * 1.3, 1),
                "confidence": round(base_confidence * 0.75, 3),
                "method": "declaration-anchored-low",
                "density": density,
                "warning": (
                    f"Declared weight {anchor}g is unusually light for a {jtype}. "
                    "Item may be hollow."
                ),
                "declaredWeight": anchor,
            }

        # Declaration is plausible — use it as the central anchor with the uncertainty band
        declaration_confidence = 0.78 if coin_detected else 0.62
        return {
            "min": round(anchor * (1 - uncertainty), 1),
            "mid": round(anchor, 1),
            "max": round(anchor * (1 + uncertainty), 1),
            "confidence": declaration_confidence,
            "method": "declaration-anchored",
            "density": density,
            "declaredWeight": anchor,
        }

    # ── Type-based mode (no declaration available) ─────────────────────
    # Apply a density correction relative to the 22K baseline
    # (a 18K piece is physically lighter than a 22K piece of same geometry)
    density_ratio = density / PURITY_DENSITY["22K"]
    adjusted_mid = round(base["mid"] * density_ratio, 1)
    adjusted_mid = max(base["min"], min(base["max"], adjusted_mid))

    return {
        "min": base["min"],
        "mid": adjusted_mid,
        "max": base["max"],
        "confidence": base_confidence,
        "method": "type-based",
        "density": density,
        "declaredWeight": None,
    }


def _parse_weight(value) -> float | None:
    """
    Safely parse a weight value from any input type.
    Returns None if the value is missing, zero, or non-numeric.
    """
    if value is None:
        return None
    try:
        w = float(str(value).strip())
        if w <= 0:
            return None
        return w
    except (TypeError, ValueError):
        return None
