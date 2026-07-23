/*
  Bayesian Purity Posterior — Frontend Display Helper
  
  IMPORTANT ARCHITECTURE NOTE:
  The full Bayesian fusion engine (risk flags, loan decision, overall confidence)
  runs ENTIRELY on the FastAPI backend (backend/fusion.py).
  The frontend NEVER makes its own loan decision — it only displays what the
  server returns.

  This file retains ONE function: calculatePurityPosterior()
  It is used on the ResultPage to show the purity probability chart.
  It replicates the same math as the backend for a consistent display.
  
  runFusionEngine() has been removed — use the backend /analyze endpoint.
*/

/**
 * Performs a Bayesian update on gold purity probability.
 * 
 * Math: posterior[k] ∝ prior[k] × likelihood(signal | karat=k)
 * After each signal update, the posterior is renormalized so all probs sum to 1.
 * 
 * @param {Object} visionResult — Vision analysis result from backend
 * @param {Object|null} audioResult — Audio tap-test result (optional)
 * @param {Object|null} declarations — User's self-declared karat (optional)
 * @returns {Array<{karat, probability}>} — Sorted by probability descending
 */
export function calculatePurityPosterior(visionResult, audioResult, declarations) {
  // Prior: Indian gold market distribution (World Gold Council data)
  // 22K dominates because it's the traditional purity for Indian jewelry
  let posterior = {
    "24K": 0.04,
    "22K": 0.58,
    "18K": 0.20,
    "14K": 0.09,
    "Plated": 0.09
  };

  // ── UPDATE 1: Hallmark OCR (strongest single signal) ─────────────────
  // These likelihood tables encode: P(hallmark_reading | true_karat)
  const hallmarkLikelihoods = {
    "999":    { "24K": 0.95, "22K": 0.03, "18K": 0.01,  "14K": 0.005, "Plated": 0.005 },
    "916":    { "24K": 0.03, "22K": 0.92, "18K": 0.03,  "14K": 0.01,  "Plated": 0.01  },
    "750":    { "24K": 0.01, "22K": 0.05, "18K": 0.88,  "14K": 0.05,  "Plated": 0.01  },
    "585":    { "24K": 0.01, "22K": 0.03, "18K": 0.08,  "14K": 0.83,  "Plated": 0.05  },
    "375":    { "24K": 0.01, "22K": 0.02, "18K": 0.05,  "14K": 0.10,  "Plated": 0.82  },
    "none":   { "24K": 0.05, "22K": 0.25, "18K": 0.20,  "14K": 0.15,  "Plated": 0.35  },
    "unclear":{ "24K": 0.05, "22K": 0.40, "18K": 0.25,  "14K": 0.15,  "Plated": 0.15  },
  };

  const hallmarkKey = visionResult.hallmark_text || "unclear";
  const hLikelihood = hallmarkLikelihoods[hallmarkKey] || hallmarkLikelihoods["unclear"];
  const hConf = visionResult.hallmark_confidence || 0.5;

  // Blend: if confidence is 0, hallmark adds no information (uniform 0.2 per class)
  Object.keys(posterior).forEach(k => {
    posterior[k] *= (hLikelihood[k] * hConf + (1 - hConf) * 0.2);
  });
  normalizePosterior(posterior);

  // ── UPDATE 2: Surface color consistency ──────────────────────────────
  if (visionResult.color_consistency) {
    const colorLikelihoods = {
      "consistent_22k": { "24K": 0.10, "22K": 0.75, "18K": 0.10, "14K": 0.03, "Plated": 0.02 },
      "consistent_18k": { "24K": 0.02, "22K": 0.15, "18K": 0.72, "14K": 0.08, "Plated": 0.03 },
      "consistent_24k": { "24K": 0.80, "22K": 0.12, "18K": 0.05, "14K": 0.02, "Plated": 0.01 },
      "inconsistent":   { "24K": 0.02, "22K": 0.08, "18K": 0.10, "14K": 0.10, "Plated": 0.70 },
      "unknown":        { "24K": 0.05, "22K": 0.35, "18K": 0.25, "14K": 0.15, "Plated": 0.20 },
    };
    const cLikelihood = colorLikelihoods[visionResult.color_consistency] || colorLikelihoods["unknown"];
    const cConf = 0.65;   // Surface color is a medium-strength signal

    Object.keys(posterior).forEach(k => {
      posterior[k] *= (cLikelihood[k] * cConf + (1 - cConf) * 0.2);
    });
    normalizePosterior(posterior);
  }

  // ── UPDATE 3: Plating visual indicators ──────────────────────────────
  if (visionResult.plating_indicators) {
    const pConf = visionResult.plating_confidence || 0.5;
    // Boost Plated probability proportionally to confidence; normalize pulls others down
    posterior["Plated"] *= (1 + pConf * 3);
    normalizePosterior(posterior);
  }

  // ── UPDATE 4: Audio tap-test signal ──────────────────────────────────
  if (audioResult && audioResult.materialClass) {
    const audioLikelihoods = {
      "solid_gold": { "24K": 0.25, "22K": 0.55, "18K": 0.15, "14K": 0.03, "Plated": 0.02 },
      "plated":     { "24K": 0.01, "22K": 0.04, "18K": 0.05, "14K": 0.10, "Plated": 0.80 },
      "uncertain":  { "24K": 0.05, "22K": 0.35, "18K": 0.25, "14K": 0.15, "Plated": 0.20 },
    };
    const aLikelihood = audioLikelihoods[audioResult.materialClass] || audioLikelihoods["uncertain"];
    const aConf = audioResult.confidence * 0.7;   // Discount audio slightly (environment noise)

    Object.keys(posterior).forEach(k => {
      posterior[k] *= (aLikelihood[k] * aConf + (1 - aConf) * 0.2);
    });
    normalizePosterior(posterior);
  }

  // ── UPDATE 5: Customer's declared karat (lowest-weight signal) ────────
  if (declarations && declarations.declaredKarat && declarations.declaredKarat !== "Not sure") {
    const declaredMap = {
      "24K (999)": "24K", "22K (916)": "22K",
      "18K (750)": "18K", "14K (585)": "14K"
    };
    const dk = declaredMap[declarations.declaredKarat];
    if (dk) {
      // Small boost only — self-declaration is easy to fake
      posterior[dk] *= 1.3;
      normalizePosterior(posterior);
    }
  }

  // Final normalization and sort by probability descending
  normalizePosterior(posterior);
  return Object.entries(posterior)
    .map(([karat, prob]) => ({ karat, probability: Math.round(prob * 100) }))
    .sort((a, b) => b.probability - a.probability);
}

/** Normalizes a probability object so all values sum to 1.0 (in-place). */
function normalizePosterior(posterior) {
  const total = Object.values(posterior).reduce((a, b) => a + b, 0);
  if (total > 0) {
    Object.keys(posterior).forEach(k => { posterior[k] /= total; });
  }
}
