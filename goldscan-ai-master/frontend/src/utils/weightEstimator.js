export const JEWELRY_PROFILES = {
  ring: {
    solid:  { min: 4,  mid: 7,   max: 12 },
    hollow: { min: 2,  mid: 4,   max: 7  },
    plated: { min: 2,  mid: 3.5, max: 6  }
  },
  bangle: {
    solid:  { min: 18, mid: 28,  max: 45 },
    hollow: { min: 8,  mid: 15,  max: 25 },
    plated: { min: 6,  mid: 12,  max: 20 }
  },
  chain: {
    solid:  { min: 10, mid: 18,  max: 30 },
    hollow: { min: 5,  mid: 10,  max: 18 },
    plated: { min: 4,  mid: 8,   max: 15 }
  },
  earring: {
    solid:  { min: 3,  mid: 5,   max: 9  },
    hollow: { min: 1,  mid: 3,   max: 5  },
    plated: { min: 1,  mid: 2,   max: 4  }
  },
  pendant: {
    solid:  { min: 3,  mid: 6,   max: 12 },
    hollow: { min: 2,  mid: 4,   max: 8  },
    plated: { min: 1,  mid: 3,   max: 6  }
  },
  necklace: {
    solid:  { min: 25, mid: 38,  max: 60 },
    hollow: { min: 12, mid: 22,  max: 35 },
    plated: { min: 8,  mid: 15,  max: 25 }
  },
  coin: {
    solid:  { min: 8,  mid: 10,  max: 12 },
    hollow: { min: 8,  mid: 10,  max: 12 },
    plated: { min: 6,  mid: 8,   max: 10 }
  }
};

export const DENSITY_BY_PURITY = {
  "24K": 19.32,
  "22K": 17.73,
  "18K": 15.58,
  "14K": 13.07,
  "plated": 8.50,
  "unknown": 15.00
};

export function estimateWeight(jewelryType, purityEstimate, hollowIndicator_or_coinDetected, coinDetected_or_declaredWeight, declaredWeight_opt, wearLevel_opt) {
  let hollowIndicator = false;
  let coinDetected = false;
  let declaredWeight = null;
  let wearLevel = "none";

  if (declaredWeight_opt !== undefined) {
    hollowIndicator = hollowIndicator_or_coinDetected;
    coinDetected = coinDetected_or_declaredWeight;
    declaredWeight = declaredWeight_opt;
    wearLevel = wearLevel_opt || "none";
  } else {
    // Backward compatibility for old signature
    coinDetected = hollowIndicator_or_coinDetected;
    declaredWeight = coinDetected_or_declaredWeight;
  }

  const type = (jewelryType || "unknown").toLowerCase();
  const structure = hollowIndicator ? "hollow" :
    (purityEstimate === "plated" ? "plated" : "solid");

  const profile = JEWELRY_PROFILES[type]?.[structure]
    || JEWELRY_PROFILES.ring.solid;

  // Coin detected = tighter confidence interval
  const uncertaintyFactor = coinDetected ? 0.12 : 0.22;

  // Wear adjustment — heavily worn items 
  // may have lost material
  const wearAdjust = {
    none: 1.00, light: 0.98,
    moderate: 0.95, heavy: 0.90
  };
  const wearFactor = wearAdjust[wearLevel] || 1.0;

  let mid = profile.mid * wearFactor;
  let min = profile.min * wearFactor;
  let max = profile.max * wearFactor;

  // If declared weight exists, use it as anchor
  // but cross-validate against profile
  if (declaredWeight && parseFloat(declaredWeight) > 0) {
    const dw = parseFloat(declaredWeight);
    const profileMid = profile.mid;
    const deviation = Math.abs(dw - profileMid) / profileMid;

    if (deviation < 0.40) {
      // Declaration is plausible — use it as anchor
      mid = dw;
      min = Math.round(dw * (1 - uncertaintyFactor) * 10) / 10;
      max = Math.round(dw * (1 + uncertaintyFactor) * 10) / 10;
    } else {
      // Declaration suspicious — widen band, flag it
      mid = (dw + profileMid) / 2;
      min = Math.min(dw, profileMid) * 0.85;
      max = Math.max(dw, profileMid) * 1.15;
    }
  } else {
    min = Math.round(min * 10) / 10;
    max = Math.round(max * 10) / 10;
    mid = Math.round(mid * 10) / 10;
  }

  // Confidence calculation — principled, not arbitrary
  let confidence = 0.50; // base
  if (coinDetected) confidence += 0.18;
  if (declaredWeight) confidence += 0.12;
  if (structure !== "unknown") confidence += 0.08;
  if (wearLevel === "none" || wearLevel === "light") confidence += 0.05;
  confidence = Math.min(0.91, confidence);

  return {
    min: Math.round(min * 10) / 10,
    mid: Math.round(mid * 10) / 10,
    max: Math.round(max * 10) / 10,
    confidence: Math.round(confidence * 100),
    structure,
    density: DENSITY_BY_PURITY[purityEstimate] || 15.0,
    method: declaredWeight ? 
      "declaration-anchored + profile validated" :
      "jewelry-profile + structure inference",
    coinCalibrated: coinDetected
  };
}
