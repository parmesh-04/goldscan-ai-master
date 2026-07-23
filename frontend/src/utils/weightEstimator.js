/*
  Weight Estimation — Jewelry Profile + Declaration Anchoring
  
  Used for the frontend weight display chart. The definitive weight estimate
  for loan calculation comes from the backend, but this utility is also used
  when displaying the weight breakdown in the ResultPage.

  Density values match the PRD exactly:
    24K: 19.32 g/cm³ | 22K: 17.73 | 18K: 15.58 | Plated: 8.50

  Uncertainty bands:
    ±12% with coin in frame (scale reference) | ±22% without
*/

// Expected weight ranges per jewelry type (grams), from Indian market appraisal data
export const JEWELRY_PROFILES = {
  ring:     { solid: { min: 4,  mid: 7,   max: 12 }, hollow: { min: 2,  mid: 4,   max: 7  }, plated: { min: 2,  mid: 3.5, max: 6  } },
  bangle:   { solid: { min: 18, mid: 28,  max: 45 }, hollow: { min: 8,  mid: 15,  max: 25 }, plated: { min: 6,  mid: 12,  max: 20 } },
  chain:    { solid: { min: 10, mid: 18,  max: 30 }, hollow: { min: 5,  mid: 10,  max: 18 }, plated: { min: 4,  mid: 8,   max: 15 } },
  earring:  { solid: { min: 3,  mid: 5,   max: 9  }, hollow: { min: 1,  mid: 3,   max: 5  }, plated: { min: 1,  mid: 2,   max: 4  } },
  pendant:  { solid: { min: 3,  mid: 6,   max: 12 }, hollow: { min: 2,  mid: 4,   max: 8  }, plated: { min: 1,  mid: 3,   max: 6  } },
  necklace: { solid: { min: 25, mid: 38,  max: 60 }, hollow: { min: 12, mid: 22,  max: 35 }, plated: { min: 8,  mid: 15,  max: 25 } },
  coin:     { solid: { min: 8,  mid: 10,  max: 12 }, hollow: { min: 8,  mid: 10,  max: 12 }, plated: { min: 6,  mid: 8,   max: 10 } },
};

// Gold alloy densities — exact PRD specification values (g/cm³)
export const DENSITY_BY_PURITY = {
  "24K":    19.32,
  "22K":    17.73,
  "18K":    15.58,
  "14K":    13.07,
  "plated": 8.50,
  "unknown": 15.00,   // Conservative mid-point when purity is unverified
};

/**
 * Estimates jewelry weight using type profile, structure inference, and
 * optional declaration anchoring.
 * 
 * @param {string} jewelryType — e.g. 'ring', 'bangle', 'unknown'
 * @param {string} purityEstimate — e.g. '22K', 'plated', 'unknown'
 * @param {boolean} hollowIndicator — True if vision detected hollow construction
 * @param {boolean} coinDetected — True if ₹1 coin visible for scale calibration
 * @param {string|number|null} declaredWeight — Customer's self-reported weight (grams)
 * @param {string} wearLevel — 'none' | 'light' | 'moderate' | 'heavy'
 * @returns {{ min, mid, max, confidence, structure, density, method, coinCalibrated }}
 */
export function estimateWeight(
  jewelryType,
  purityEstimate,
  hollowIndicator,
  coinDetected,
  declaredWeight,
  wearLevel = "none"
) {
  const type = (jewelryType || "unknown").toLowerCase();

  // Determine construction type: hollow items are much lighter than solid ones
  const structure = hollowIndicator ? "hollow"
    : purityEstimate === "plated" ? "plated"
    : "solid";

  // Fall back to ring/solid profile if jewelry type is unrecognized
  const profile = JEWELRY_PROFILES[type]?.[structure] || JEWELRY_PROFILES.ring.solid;

  // Coin in frame gives pixel-to-mm scale → tighter uncertainty (PRD: ±12%)
  const uncertaintyFactor = coinDetected ? 0.12 : 0.22;

  // Worn items may have lost material — apply a small reduction
  const wearAdjust = { none: 1.00, light: 0.98, moderate: 0.95, heavy: 0.90 };
  const wearFactor = wearAdjust[wearLevel] || 1.0;

  let mid = profile.mid * wearFactor;
  let min = profile.min * wearFactor;
  let max = profile.max * wearFactor;

  // ── Declaration anchoring ────────────────────────────────────────────
  // If customer provides weight, use it as anchor — but cross-validate against profile
  if (declaredWeight && parseFloat(declaredWeight) > 0) {
    const dw = parseFloat(declaredWeight);
    const profileMid = profile.mid;
    const deviation = Math.abs(dw - profileMid) / profileMid;

    if (deviation < 0.40) {
      // Plausible declaration — trust it and tighten bands around the anchor
      mid = dw;
      min = Math.round(dw * (1 - uncertaintyFactor) * 10) / 10;
      max = Math.round(dw * (1 + uncertaintyFactor) * 10) / 10;
    } else {
      // Suspicious deviation — widen band to straddle both estimate and declaration
      mid = (dw + profileMid) / 2;
      min = Math.min(dw, profileMid) * 0.85;
      max = Math.max(dw, profileMid) * 1.15;
    }
  } else {
    // No declaration — just round the profile values
    min = Math.round(min * 10) / 10;
    max = Math.round(max * 10) / 10;
    mid = Math.round(mid * 10) / 10;
  }

  // Confidence accumulates from available signals
  let confidence = 0.50;                           // Base confidence
  if (coinDetected) confidence += 0.18;            // Scale reference = big boost
  if (declaredWeight) confidence += 0.12;          // Customer declaration = moderate boost
  if (structure !== "unknown") confidence += 0.08; // Known structure = small boost
  if (wearLevel === "none" || wearLevel === "light") confidence += 0.05;
  confidence = Math.min(0.91, confidence);

  return {
    min: Math.round(min * 10) / 10,
    mid: Math.round(mid * 10) / 10,
    max: Math.round(max * 10) / 10,
    confidence: Math.round(confidence * 100),
    structure,
    density: DENSITY_BY_PURITY[purityEstimate] || 15.0,
    method: declaredWeight ? "declaration-anchored + profile validated" : "jewelry-profile + structure inference",
    coinCalibrated: coinDetected,
  };
}
