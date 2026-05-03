"""
Weight estimation module.

Key rules:
- Declaration-anchored weights must be plausibility-checked 
  against jewelry type before being trusted
- coin_detected significantly improves confidence
- Non-jewelry items return null weight (no loan calculation possible)
- Confidence values must be honest — never inflate
"""

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

PURITY_DENSITY = {
    "24K":    19.3,
    "22K":    17.7,
    "18K":    15.6,
    "14K":    13.1,
    "plated": 8.5,
    "unknown": 15.0,   # Conservative mid-point
    "not_gold": 8.0,   # Base metal assumption
}


def estimate_weight(
    jewelry_type: str,
    purity_estimate: str,
    coin_detected: bool,
    declared_weight=None,
    is_jewelry: bool = True,
) -> dict | None:
    """
    Estimate jewelry weight.
    Returns None if item is not jewelry — caller must handle this.
    """

    # Non-jewelry: return None so fusion engine knows 
    # there's no weight to calculate loan against
    if not is_jewelry:
        return None

    jtype = (jewelry_type or "unknown").lower().strip()
    base = WEIGHT_RANGES.get(jtype, WEIGHT_RANGES["unknown"])
    density = PURITY_DENSITY.get(purity_estimate, PURITY_DENSITY["unknown"])

    # ── UNCERTAINTY based on available signals ─────────────
    if coin_detected:
        uncertainty = 0.12   # Coin reference = tighter bounds
        base_confidence = 0.72
    else:
        uncertainty = 0.28   # No reference = wider bounds
        base_confidence = 0.52

    # ── DECLARATION-ANCHORED MODE ──────────────────────────
    anchor = _parse_weight(declared_weight)

    if anchor is not None:
        # Plausibility check: does the declared weight make sense
        # for this type of jewelry?
        plausible_max = base["plausible_max"]
        plausible_min = base["min"] * 0.5  # Allow some slack below min

        if anchor > plausible_max:
            # Declared weight is implausibly high for this jewelry type
            # Don't trust it — fall back to type-based with a warning
            return {
                "min": base["min"],
                "mid": base["mid"],
                "max": base["max"],
                "confidence": base_confidence * 0.7,  # Lower confidence
                "method": "type-based-declaration-rejected",
                "density": density,
                "warning": f"Declared weight {anchor}g is implausibly high "
                           f"for a {jtype}. Using type-based estimate.",
                "declaredWeight": anchor,
            }

        if anchor < plausible_min:
            # Unusually light — possible hollow item
            return {
                "min": round(anchor * 0.8, 1),
                "mid": round(anchor, 1),
                "max": round(anchor * 1.3, 1),
                "confidence": base_confidence * 0.75,
                "method": "declaration-anchored-low",
                "density": density,
                "warning": f"Declared weight {anchor}g is unusually light "
                           f"for a {jtype}. Item may be hollow.",
                "declaredWeight": anchor,
            }

        # Declaration passes plausibility — trust it with appropriate confidence
        # Coin detection boosts confidence of declaration too
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

    # ── TYPE-BASED MODE (no declaration) ──────────────────
    # Apply a purity-based density correction to the mid estimate
    # Heavier metals = potentially different mid estimate
    density_ratio = density / PURITY_DENSITY["22K"]  # Normalize to 22K baseline
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
    Safely parse a weight value.
    Returns None if invalid, zero, or missing.
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
